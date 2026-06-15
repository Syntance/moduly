import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import type {
  Logger,
  NotificationTypes,
} from "@medusajs/framework/types";
import { Resend } from "resend";

type InjectedDependencies = {
  logger: Logger;
};

type Options = {
  /** Klucz API z https://resend.com/api-keys. Wymagany. */
  apiKey: string;
  /** Domyślny nadawca. Musi być zweryfikowany w Resend albo użyj "Acme <onboarding@resend.dev>" do testów. */
  from: string;
  /**
   * Opcjonalny Reply-To — np. `kontakt@lumineconcept.pl`. Mail idzie z `from`,
   * ale klient klikając "odpowiedz" pisze tutaj.
   */
  replyTo?: string;
};

/**
 * Provider dla Medusa `@medusajs/medusa/notification`. Wysyła maile przez
 * Resend API. Nie używamy oficjalnego pakietu społeczności, bo skacze w
 * kompatybilności z Medusa v2 — własna implementacja jest mniejsza
 * (50 linii) i trzyma się kontraktu `AbstractNotificationProviderService`.
 */
export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend";

  protected logger_: Logger;
  protected options_: Options;
  protected client_: Resend;

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[notification-resend] Brak apiKey w opcjach providera.",
      );
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[notification-resend] Brak from w opcjach providera.",
      );
    }
  }

  constructor({ logger }: InjectedDependencies, options: Options) {
    super();
    this.logger_ = logger;
    this.options_ = options;
    this.client_ = new Resend(options.apiKey);
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO,
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[notification-resend] Brak danych notyfikacji.",
      );
    }
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[notification-resend] Pole `to` jest wymagane.",
      );
    }

    const from = notification.from?.trim() || this.options_.from;

    const content = notification.content;
    const subject = content?.subject?.toString() ?? "";
    const html = content?.html?.toString();
    const text = content?.text?.toString();

    if (!html && !text) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[notification-resend] Notyfikacja musi zawierać content.html albo content.text.",
      );
    }

    // Resend akceptuje albo (html/text) albo (react/template). Budujemy
    // wariant html/text i castujemy do `Parameters<...>[0]` — pełny typ
    // `CreateEmailOptions` to union który wymaga `template` w jednym
    // z wariantów, nasz obiekt nie pasuje do tamtego wariantu i jest to OK.
    const payload = {
      from,
      to: notification.to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(this.options_.replyTo ? { replyTo: this.options_.replyTo } : {}),
      ...(notification.attachments?.length
        ? {
            attachments: notification.attachments.map((att) => ({
              filename: att.filename,
              content: att.content,
              ...(att.content_type ? { contentType: att.content_type } : {}),
            })),
          }
        : {}),
    } as Parameters<typeof this.client_.emails.send>[0];

    try {
      const { data, error } = await this.client_.emails.send(payload);
      if (error) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `[notification-resend] Resend zwrócił błąd: ${error.name} — ${error.message}`,
        );
      }
      this.logger_.info(
        `[notification-resend] wysłano id=${data?.id} do=${Array.isArray(notification.to) ? notification.to.join(",") : notification.to}`,
      );
      return { id: data?.id };
    } catch (err) {
      if (err instanceof MedusaError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[notification-resend] Błąd wysyłki: ${message}`,
      );
    }
  }
}

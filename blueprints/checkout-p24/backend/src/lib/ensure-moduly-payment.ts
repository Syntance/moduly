import type { MedusaContainer } from "@medusajs/framework/types";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Payment provider, który rejestrowany jest automatycznie przez moduł
 * `@medusajs/medusa/payment` (patrz [medusa-config.ts](../../medusa-config.ts)).
 *
 * Identifier `system`, id configu `default` → klucz w kontenerze to
 * `pp_system_default` (logika w `@medusajs/payment/dist/loaders/providers.js`).
 */
const SYSTEM_PAYMENT_PROVIDER_ID = "pp_system_default";
/** Pełny id providera P24 w Medusie: `pp_{provider.id}_{service.identifier}`. */
const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";

/**
 * Providery, które powinny być podpięte do każdego regionu. Bazowo systemowy
 * (tryb testowy); Przelewy24 dokładamy tylko, gdy moduł jest skonfigurowany
 * (te same envy, które rejestrują provider w `medusa-config.ts`).
 */
function getDesiredProviderIds(): string[] {
  const ids = [SYSTEM_PAYMENT_PROVIDER_ID];
  if (process.env.PRZELEWY24_MERCHANT_ID && process.env.PRZELEWY24_API_KEY) {
    ids.push(PRZELEWY24_PROVIDER_ID);
  }
  return ids;
}

export interface EnsureModulyPaymentResult {
  ok: boolean;
  messages: string[];
  updated_region_ids: string[];
  provider_id: string;
}

type RegionRow = {
  id: string;
  name?: string | null;
  countries?: Array<{ iso_2?: string }> | null;
  payment_providers?: Array<{ id?: string }> | null;
};

/**
 * Idempotentnie dokłada systemowego (manual) payment-providera do każdego
 * regionu, który go jeszcze nie ma. Bez tego `initiatePaymentSession` /
 * `cart.complete` z tym providerem zwraca „An unknown error occurred".
 */
export async function ensureModulyPayment(
  container: MedusaContainer,
): Promise<EnsureModulyPaymentResult> {
  const messages: string[] = [];
  const updated: string[] = [];

  const query = container.resolve("query") as {
    graph: (args: {
      entity: string;
      fields: string[];
      filters?: Record<string, unknown>;
    }) => Promise<{ data: RegionRow[] }>;
  };

  const { data: regions } = await query.graph({
    entity: "region",
    fields: [
      "id",
      "name",
      "countries.iso_2",
      "payment_providers.id",
    ],
  });

  if (regions.length === 0) {
    return {
      ok: false,
      messages: ["Brak regionów — utwórz region (np. Polska) w Admin."],
      updated_region_ids: [],
      provider_id: SYSTEM_PAYMENT_PROVIDER_ID,
    };
  }

  const desiredIds = getDesiredProviderIds();

  for (const region of regions) {
    const currentIds = (region.payment_providers ?? [])
      .map((p) => p?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const missing = desiredIds.filter((id) => !currentIds.includes(id));

    if (missing.length === 0) {
      messages.push(
        `Region „${region.name ?? region.id}" ma już wszystkie providery (${desiredIds.join(", ")}) — pomijam.`,
      );
      continue;
    }

    const nextIds = Array.from(new Set([...currentIds, ...desiredIds]));

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          payment_providers: nextIds,
        },
      },
    });

    updated.push(region.id);
    messages.push(
      `Region „${region.name ?? region.id}" → podpięto ${missing.join(", ")}.`,
    );
  }

  return {
    ok: true,
    messages,
    updated_region_ids: updated,
    provider_id: SYSTEM_PAYMENT_PROVIDER_ID,
  };
}

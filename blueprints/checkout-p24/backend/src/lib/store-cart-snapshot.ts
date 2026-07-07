import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { STORE_CART_REMOTE_QUERY_FIELDS } from "./store-cart-fields";
import { captureMessage } from "./sentry";

/**
 * Snapshot koszyka dla custom Store API — WYŁĄCZNIE przez `query.graph`
 * z filtrem + twardy assert id.
 *
 * Kontekst (incydent 06.07.2026): `remoteQueryObjectFromString` z polami
 * zawierającymi link cross-module (`promotions.*`) GUBIŁ filtr i zwracał
 * PIERWSZY koszyk z bazy — cudzy koszyk trafiał do UI klienta (pusty koszyk
 * po kliknięciu express, "przyklejone" zniżki po apply/remove kodu, wyciek
 * cudzych metadanych). Każdy endpoint zwracający koszyk klientowi MUSI
 * czytać go tym helperem.
 */
export async function readStoreCartSnapshot(
  scope: MedusaContainer,
  cartId: string,
  options?: { extraFields?: string[]; source?: string },
): Promise<Record<string, unknown>> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "cart",
    fields: [...STORE_CART_REMOTE_QUERY_FIELDS, ...(options?.extraFields ?? [])],
    filters: { id: cartId },
  });
  const snapshot = (data as Array<{ id?: string }>)[0];
  if (!snapshot) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart ${cartId} not found`,
    );
  }
  if (snapshot.id !== cartId) {
    captureMessage(
      `[${options?.source ?? "store-cart-snapshot"}] snapshot zwrócił inny koszyk niż żądany`,
      "error",
      {
        requested_cart_id: cartId,
        returned_cart_id: snapshot.id ?? "?",
      },
    );
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Nie udało się odczytać koszyka — spróbuj ponownie.",
    );
  }
  return snapshot as Record<string, unknown>;
}

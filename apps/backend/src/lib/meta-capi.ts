/**
 * STUB Meta Conversions API â€” podmieĹ„ na realnÄ… implementacjÄ™ przy
 * podpinaniu analityki (@moduly/analytics). API zgodne z produkcjÄ….
 */
export const CAPI_PURCHASE_SENT_KEY = "capi_purchase_sent";

export function purchaseEventId(orderId: string): string {
  return `purchase_${orderId}`;
}

export async function sendPurchaseCAPI(
  _scope: unknown,
  _order: unknown,
  _options?: { fbp?: string; fbc?: string },
): Promise<void> {
  /* no-op â€” stub */
}

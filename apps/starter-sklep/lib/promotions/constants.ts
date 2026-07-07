/** StaĹ‚e promocji dostawy â€” parytet z magazynem (moduĹ‚ promotions). */
export const MODULY_FS_PREFIX = "__moduly_fs_";

export function isShadowFreeShippingCode(code: string): boolean {
  return code.startsWith(MODULY_FS_PREFIX);
}

/** MUSI byÄ‡ identyczna ze staĹ‚Ä… backendu (backend/src/lib/express-fee.ts). */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "DopĹ‚ata ekspresowa (+50%)";

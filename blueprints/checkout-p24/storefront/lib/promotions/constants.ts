/** Stałe promocji dostawy — parytet z magazynem (moduł promotions). */
export const MODULY_FS_PREFIX = "__moduly_fs_";

export function isShadowFreeShippingCode(code: string): boolean {
  return code.startsWith(MODULY_FS_PREFIX);
}

/** MUSI być identyczna ze stałą backendu (backend/src/lib/express-fee.ts). */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "Dopłata ekspresowa (+50%)";

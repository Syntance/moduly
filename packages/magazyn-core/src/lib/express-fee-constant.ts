/**
 * Nazwa metody-dopłaty ekspresowej — JEDYNE źródło prawdy po stronie panelu.
 * MUSI być identyczna ze stałą backendu (blueprint checkout-p24:
 * backend/src/lib/express-fee.ts). Używana przez:
 * - magazyn-orders: wiersz „Dostawa" liczy cenę kuriera Z POMINIĘCIEM tej
 *   metody (inaczej dopłata express wyglądała jak koszt dostawy),
 * - magazyn-promotions: promocje „darmowa dostawa" (100% na shipping_methods)
 *   wykluczają ją target-regułą `name ne` (inaczej kod darmowej dostawy
 *   zerował także dopłatę express — bug 06.07.2026).
 */
export const EXPRESS_FEE_SHIPPING_METHOD_NAME = "Dopłata ekspresowa (+50%)";

/** Zamiennik @magazyn/core/lib/format dla checkoutu. */
export function toMinorUnitsFromDecimal(amount: number | null | undefined): number {
  if (amount == null || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

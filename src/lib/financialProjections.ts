/**
 * `financial_projections` JSONB stores money amounts as whole USD (see `_unit: "USD"`).
 * Percentage fields must not be scaled.
 */
export const FP_USD_UNIT = 'USD' as const

export function parseUsdAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n)) return 0
  return n
}

/** @deprecated Use {@link parseUsdAmount} */
export const fpMoneyFieldToRupees = parseUsdAmount

/** @deprecated Use {@link parseUsdAmount} */
export function fpLakhToRupees(value: unknown): number {
  return parseUsdAmount(value)
}

/** Read a money field from `financial_projections` as whole USD. */
export function fpMoneyFieldToUsd(value: unknown): number {
  return parseUsdAmount(value)
}

/** Max digits for budget amount inputs (excludes decimals — integer amounts only). */
export const BUDGET_INPUT_MAX_DIGITS = 10

export function sanitizeBudgetInput(value: string, maxDigits = BUDGET_INPUT_MAX_DIGITS): string {
  return value.replace(/\D/g, '').slice(0, maxDigits)
}

export function parseBudgetAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function validateBudgetRange(minStr: string, maxStr: string): string | null {
  const min = parseBudgetAmount(minStr)
  const max = parseBudgetAmount(maxStr)
  if (min != null && max != null && max < min) {
    return 'Max budget cannot be less than min budget.'
  }
  return null
}

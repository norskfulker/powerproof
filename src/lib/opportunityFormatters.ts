/** Setup range: `min`/`max` are whole USD; `formatMoney` converts to the viewer's display currency. */
export function formatSetupBounds(
  min?: number | null,
  max?: number | null,
  formatMoney: (n: number) => string,
): string {
  const nm = min != null && Number.isFinite(Number(min)) ? Number(min) : null
  const nx = max != null && Number.isFinite(Number(max)) ? Number(max) : null
  const hasMin = nm != null && nm > 0
  const hasMax = nx != null && nx > 0
  if (!hasMin && !hasMax) return '—'
  if (hasMin && hasMax) return `${formatMoney(nm!)}–${formatMoney(nx!)}`
  if (hasMax) return `Up to ${formatMoney(nx!)}`
  return formatMoney(nm!)
}

/** Monthly profit band; amounts are whole USD. */
export function formatProfitEst(
  min?: number | null,
  max?: number | null,
  formatMoney: (n: number) => string,
): string {
  const nm = min != null && Number.isFinite(Number(min)) ? Number(min) : null
  const nx = max != null && Number.isFinite(Number(max)) ? Number(max) : null
  const hasMin = nm != null && nm > 0
  const hasMax = nx != null && nx > 0
  if (!hasMin) return '—'
  if (hasMax && nx !== nm) return `${formatMoney(nm!)}–${formatMoney(nx!)}/mo`
  return `${formatMoney(nm!)}/mo`
}

/** Monthly revenue band; amounts are whole USD. */
export function formatRevEst(
  min?: number | null,
  max?: number | null,
  formatMoney: (n: number) => string,
): string {
  return formatProfitEst(min, max, formatMoney)
}

/** Payback range from stored month bounds. */
export function formatPaybackEst(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return '—'
  const a = min != null && Number.isFinite(Number(min)) ? Math.round(Number(min)) : null
  const b = max != null && Number.isFinite(Number(max)) ? Math.round(Number(max)) : null
  if (a != null && b != null && a !== b) return `${a}–${b} mo`
  return `${b ?? a ?? 0} mo`
}

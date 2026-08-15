/**
 * Platform display currency — India-only (INR).
 *
 * Opportunity setup / profit amounts in the app DB are stored in **USD** (whole dollars).
 * `useCurrency().formatMoney` / `formatSetupCost` take **USD** and convert to INR via
 * `exchange_rates` (USD-base row).
 */
export const DEFAULT_DISPLAY_CURRENCY_CODE = 'INR' as const

export const DEFAULT_DISPLAY_CURRENCY_SYMBOL = '₹' as const

export function inrToDefaultDisplayAmount(amountInr: number): number {
  if (!amountInr || Number.isNaN(amountInr)) return 0
  return amountInr
}

export function formatUsdCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `${sign}$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')}K`
  }
  return `${sign}$${Math.round(abs)}`
}

/** Whole-USD bounds → compact range for meta copy (e.g. $6K–$60K). */
export function formatUsdRangeCompactFromUsd(minUsd: number, maxUsd: number): string {
  return `${formatUsdCompact(minUsd)}–${formatUsdCompact(maxUsd)}`
}

/** Full-rupee INR bounds → compact INR range (e.g. ₹6K–₹60K). */
export function formatInrRangeAsDefaultDisplay(minInr: number, maxInr: number): string {
  return `${formatCompactMoneyAmount(minInr, 'INR')}–${formatCompactMoneyAmount(maxInr, 'INR')}`
}

export function formatInrMonthlyRangeAsDefaultDisplay(minInr: number, maxInr: number): string {
  return `${formatInrRangeAsDefaultDisplay(minInr, maxInr)}/mo`
}

function compactCurrencySymbol(code: string): string {
  switch (code) {
    case 'USD':
      return '$'
    case 'INR':
      return '₹'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'JPY':
      return '¥'
    case 'KRW':
      return '₩'
    case 'AED':
      return 'AED'
    case 'SGD':
      return 'S$'
    case 'NGN':
      return '₦'
    case 'TZS':
      return 'TSh'
    default:
      return `${code} `
  }
}

/** Compact suffix formatting for an amount already in the target currency (B/M/Cr/L/K). */
export function formatCompactMoneyAmount(
  amount: number,
  targetCurrency: string,
  symbol?: string,
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'

  const code = String(targetCurrency || DEFAULT_DISPLAY_CURRENCY_CODE).toUpperCase()
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const sym = symbol ?? compactCurrencySymbol(code)

  if (abs === 0) {
    if (code === 'JPY') return `${sign}${sym}0`
    const localeForCode = code === 'INR' ? 'en-IN' : 'en-US'
    return `${sign}${sym}${(0).toLocaleString(localeForCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (code === 'INR') {
    if (abs >= 10_000_000_000) return `${sign}${sym}${(abs / 10_000_000_000).toFixed(1).replace(/\.0$/, '')}K Cr`
    if (abs >= 10_000_000) return `${sign}${sym}${(abs / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`
    if (abs >= 100_000) return `${sign}${sym}${(abs / 100_000).toFixed(1).replace(/\.0$/, '')}L`
    if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`
    return `${sign}${sym}${Math.round(abs).toLocaleString('en-IN')}`
  }

  if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return `${sign}${sym}${Math.round(abs).toLocaleString('en-US')}`
}

/**
 * INR-base row: `amountInQuote = amountInINR * inrRates[quote]`.
 * Derive USD-base multipliers so `amountInQuote = amountInUSD * ratesUSD[quote]`.
 */
export function deriveUsdBaseFromInrBase(inrRates: Record<string, number>): Record<string, number> {
  const usdPerInr = inrRates.USD
  if (!usdPerInr || usdPerInr <= 0) return {}

  const out: Record<string, number> = { USD: 1, INR: 1 / usdPerInr }
  for (const [code, inrRate] of Object.entries(inrRates)) {
    if (code === 'INR' || code === 'USD') continue
    if (typeof inrRate === 'number' && inrRate > 0) {
      out[code] = inrRate / usdPerInr
    }
  }
  return out
}

/** Merge DB USD-base row with rates derived from the live INR-base matrix (INR row wins on overlap). */
export function buildEffectiveUsdBaseRates(
  inrRates: Record<string, number>,
  usdRatesFromDb: Record<string, number> | null | undefined,
  fallbackUsdRates: Record<string, number>,
): Record<string, number> {
  const derived = deriveUsdBaseFromInrBase(inrRates)
  const fromDb = usdRatesFromDb && typeof usdRatesFromDb === 'object' ? usdRatesFromDb : {}
  return { ...fallbackUsdRates, ...fromDb, ...derived, USD: 1 }
}

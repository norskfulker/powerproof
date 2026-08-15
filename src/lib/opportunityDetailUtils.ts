import { DEFAULT_DISPLAY_CURRENCY_CODE, formatCompactMoneyAmount } from '@/lib/displayCurrency'

/** Parse opportunity money column as USD (full dollars). */
export const toAbsolute = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(n)) return 0
  return n
}

export const capitalizeFirstLetter = (value: string): string => {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Normalize market penetration to a 0–100 percentage for display. */
export function normalizePenetrationPercent(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const str = String(raw).trim()
  if (!str) return null
  const hasPercentSign = str.includes('%')
  const num = parseFloat(str.replace(/%/g, '').replace(/,/g, ''))
  if (!Number.isFinite(num) || num < 0) return null

  let pct = num
  // Values in (0, 1] without a % sign are often decimal fractions (0.1 → 10%).
  if (!hasPercentSign && pct > 0 && pct <= 1) {
    pct = pct * 100
  }

  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10))
}

export function formatPenetrationPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`
}

/** Standalone "Section title:" lines (not full sentences) become markdown subheadings. */
const BUSINESS_OVERVIEW_INLINE_HEADING = /^([A-Z][^\n.:]{2,58}[A-Za-z0-9)]):\s*$/gm

/** Bold-only lines become subheadings when they look like section labels. */
const BUSINESS_OVERVIEW_BOLD_HEADING = /^\*\*([^*\n]{3,60})\*\*\s*$/gm

/**
 * Prepare business overview markdown for render:
 * - drops duplicate "Business Overview" title (section header is rendered separately)
 * - promotes inline section labels to `###` headings
 * - normalizes spacing around markdown headings
 */
export function normalizeBusinessOverviewMarkdown(raw: string): string {
  let text = String(raw ?? '').trim()
  if (!text) return ''

  text = text
    .replace(/^#{1,6}\s*Business Overview\s*(?:\n+|$)/i, '')
    .replace(/^\*\*Business Overview\*\*\s*(?:\n+|$)/i, '')
    .replace(/^Business Overview\s*(?:\n+|$)/i, '')
    .trim()

  text = text.replace(BUSINESS_OVERVIEW_INLINE_HEADING, '### $1')
  text = text.replace(BUSINESS_OVERVIEW_BOLD_HEADING, '### $1')
  text = text.replace(/\n(#{1,6}\s)/g, '\n\n$1')

  return text.trim()
}

export const safeJsonArray = <T = any,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

/** Derive gross margin % when `margin_pct` is unavailable (e.g. user research rows). */
export function deriveMarginPct(opp: {
  margin_pct?: number | null
  profit_derivation?: { cogs_pct?: number | null } | null
  monthly_rev_max?: number | null
  monthly_profit_max?: number | null
} | null | undefined): number {
  if (!opp) return 0
  const stored = opp.margin_pct
  if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) {
    return Number(stored)
  }
  const cogs = opp.profit_derivation?.cogs_pct
  if (cogs != null && Number.isFinite(Number(cogs))) {
    return Math.round(100 - Number(cogs))
  }
  const revMax = Number(opp.monthly_rev_max ?? 0)
  const profitMax = Number(opp.monthly_profit_max ?? 0)
  if (revMax > 0 && profitMax > 0) {
    return Math.round((profitMax / revMax) * 100)
  }
  return 0
}

/** Matches `FALLBACK_INR_BASE_RATES.USD` / platform default (~83 INR per USD). */
export const MARKET_SIZING_INR_PER_USD = 83

/** Stored on `market_intelligence.market_size_unit` after USD migration. */
export const MARKET_SIZE_UNIT_USD_M = 'usd_m' as const

/** Parse numeric market sizing field (TAM/SAM/SOM `*_cr`). */
export function parseMarketCrValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Legacy INR: values < 100k = crore; >= 100k = lakh. */
export function detectLegacyMarketSizingUnit(n: number): 'inr_crore' | 'inr_lakh' {
  return n >= 100_000 ? 'inr_lakh' : 'inr_crore'
}

export function normalizeMarketSizeUnitHint(value: unknown): typeof MARKET_SIZE_UNIT_USD_M | null {
  const s = String(value ?? '').trim().toLowerCase()
  if (s === 'usd_m' || s === 'usd millions' || s === 'usd') return MARKET_SIZE_UNIT_USD_M
  return null
}

/**
 * Convert TAM/SAM/SOM `*_cr` JSON values to whole USD for display conversion.
 * Post-migration rows use `market_size_unit: usd_m` (numeric value = USD millions).
 */
export function marketSizingCrToUsdWhole(
  raw: unknown,
  unitHint?: unknown,
  inrPerUsd: number = MARKET_SIZING_INR_PER_USD,
): number | null {
  const n = parseMarketCrValue(raw)
  if (n == null) return null

  const inrUsd = inrPerUsd > 0 ? inrPerUsd : MARKET_SIZING_INR_PER_USD

  if (normalizeMarketSizeUnitHint(unitHint) === MARKET_SIZE_UNIT_USD_M) {
    return n * 1_000_000
  }

  const legacy = detectLegacyMarketSizingUnit(n)
  if (legacy === 'inr_lakh') {
    return (n * 100_000) / inrUsd
  }
  return (n * 10_000_000) / inrUsd
}

/** Format TAM/SAM/SOM: stored USD millions → convert via USD-base rates → compact display. */
export function formatMarketCrForDisplay(
  raw: unknown,
  preferredCurrency: string,
  convertFromUSD: (amountUSD: number, targetCurrency?: string) => number,
  unitHint?: unknown,
  inrPerUsd?: number,
): string {
  const usdWhole = marketSizingCrToUsdWhole(raw, unitHint, inrPerUsd)
  if (usdWhole == null) return '—'

  const code = String(preferredCurrency || DEFAULT_DISPLAY_CURRENCY_CODE).toUpperCase()
  const converted = convertFromUSD(usdWhole, code)
  return formatCompactMoneyAmount(converted, code)
}

/** Scale word/suffix after a USD amount in prose (e.g. $1.2 million, $50K). */
const USD_TEXT_SCALE: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  million: 1e6,
  b: 1e9,
  billion: 1e9,
}

/** Embedded USD amounts in AI-generated copy: $5,000 | US$500 | USD 1,200 | $1.2M | $2 million */
const USD_AMOUNT_IN_TEXT_RE =
  /(?:USD\s*|US\$|\$)\s*([\d,]+(?:\.\d+)?)(?:\s*(thousand|million|billion|[KMBkmb]))?/gi

function parseUsdAmountFromTextMatch(numPart: string, suffix?: string): number | null {
  const num = Number(String(numPart).replace(/,/g, ''))
  if (!Number.isFinite(num) || num <= 0) return null
  const scale = suffix ? (USD_TEXT_SCALE[suffix.toLowerCase()] ?? 1) : 1
  return num * scale
}

/**
 * Replace embedded USD `$` amounts in generated prose with the viewer's display currency.
 * Opportunity DB text is stored with whole-USD references; structured fields use `formatMoney` separately.
 */
export function localizeUsdAmountsInText(
  text: string,
  formatMoney: (amountUsd: number) => string,
  options?: { targetCurrency?: string },
): string {
  const raw = String(text ?? '')
  if (!raw.trim()) return raw

  const target = String(options?.targetCurrency ?? DEFAULT_DISPLAY_CURRENCY_CODE).toUpperCase()
  if (target === 'USD') return raw

  return raw.replace(USD_AMOUNT_IN_TEXT_RE, (match, numPart: string, suffix?: string) => {
    const usd = parseUsdAmountFromTextMatch(numPart, suffix)
    if (usd == null) return match
    return formatMoney(usd)
  })
}

export const formatConvertedValue = (value: unknown, formatMoney: (amount: number) => string) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'
  if (/(?:USD\s*|US\$|\$)\s*[\d,]/i.test(raw)) {
    return raw.replace(USD_AMOUNT_IN_TEXT_RE, (match, numPart: string, suffix?: string) => {
      const usd = parseUsdAmountFromTextMatch(numPart, suffix)
      if (usd == null) return match
      return formatMoney(usd)
    })
  }
  const numeric = Number(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return raw
  return formatMoney(numeric)
}

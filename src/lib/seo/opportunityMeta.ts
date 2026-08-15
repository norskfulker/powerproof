import { formatCompactMoneyAmount } from '@/lib/displayCurrency'

/** Approximate USD→INR for static SEO copy (matches legacy seed conversion in landing data). */
const SEO_USD_TO_INR = 83

type OpportunitySeoFields = {
  title: string
  tagline?: string | null
  seo_title?: string | null
  seo_description?: string | null
  setup_min?: number | null
  setup_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
}

/** DB-authored SEO field — used only when non-null and non-empty after trim. */
function pickDbSeoField(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

function usdToInrForSeo(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0
  return Math.round(amountUsd * SEO_USD_TO_INR)
}

function formatSeoInrRange(minUsd: number | null | undefined, maxUsd: number | null | undefined): string {
  const minInr = usdToInrForSeo(Number(minUsd) || 0)
  const maxInr = usdToInrForSeo(Number(maxUsd) || 0)
  if (!minInr && !maxInr) return ''
  if (!maxInr || minInr === maxInr) return formatCompactMoneyAmount(minInr, 'INR')
  return `${formatCompactMoneyAmount(minInr, 'INR')}–${formatCompactMoneyAmount(maxInr, 'INR')}`
}

/** `<title>` — prefers `seo_title` from DB; dynamic template only when absent. */
export function buildOpportunitySeoTitle(opp: Pick<OpportunitySeoFields, 'title' | 'seo_title'>): string {
  const fromDb = pickDbSeoField(opp.seo_title)
  if (fromDb) return fromDb
  return `${opp.title} — Setup Cost, Profit & Business Plan | PowerProof`
}

export function buildOpportunityOgTitle(opp: Pick<OpportunitySeoFields, 'title'>): string {
  return `${opp.title} | PowerProof`
}

/** `<meta name="description">` — prefers `seo_description` from DB; dynamic copy only when absent. */
export function buildOpportunitySeoDescription(opp: OpportunitySeoFields): string {
  const fromDb = pickDbSeoField(opp.seo_description)
  if (fromDb) return fromDb

  const tagline = opp.tagline?.trim() ?? ''
  const setup = formatSeoInrRange(opp.setup_min, opp.setup_max)
  const profit = formatSeoInrRange(opp.monthly_profit_min, opp.monthly_profit_max)

  const segments: string[] = []
  if (tagline) segments.push(tagline)
  if (setup) segments.push(`Setup cost: ${setup}`)
  if (profit) segments.push(`Monthly profit: ${profit}`)
  segments.push('Full business plan on PowerProof.')

  return segments.join('. ').replace(/\.\s*\./g, '. ')
}

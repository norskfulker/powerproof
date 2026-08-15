export type FundingOptionType = 'bootstrap' | 'debt' | 'equity' | 'grant' | 'revenue_based'

export type FundingOptionsData = {
  summary?: string
  options?: Array<{
    type?: FundingOptionType | string
    label?: string
    source_name?: string
    amount_range_usd_min?: number
    amount_range_usd_max?: number
    when_to_apply?: string
    interest_or_dilution?: string
    approval_timeline?: string
    eligibility_bar?: 'low' | 'medium' | 'high' | string
    pros?: string[]
    cons?: string[]
    url?: string | null
    best_for?: string
  }>
}

export type RiskMatrixRiskItem = {
  category?: string
  risk?: string
  description?: string
  probability?: 'low' | 'medium' | 'high' | string
  /** Alias emitted by some models */
  likelihood?: 'low' | 'medium' | 'high' | string
  impact?: 'low' | 'medium' | 'high' | 'critical' | string
  risk_score?: 'low' | 'medium' | 'high' | 'critical' | string
  mitigation?: string
  early_warning_sign?: string
  early_warning?: string
}

export type RiskMatrixData = {
  overall_risk?: 'low' | 'medium' | 'high' | string
  risks?: RiskMatrixRiskItem[]
}

export type UnitEconomicsDeepData = {
  cac_by_channel?: Array<{ channel?: string; cac_usd?: number; notes?: string }>
  avg_ltv_usd?: number
  ltv_cac_ratio?: number
  gross_margin_pct?: number
  contribution_margin_usd?: number
  break_even_units_per_month?: number
  break_even_revenue_usd?: number
  payback_period_months?: number
  notes?: string
}

export type ToolStackItem = {
  category?: string
  name?: string
  purpose?: string
  cost_usd_per_month?: number
  free_tier_available?: boolean
  priority?: 'must_have' | 'nice_to_have' | string
  url?: string
  notes?: string
}

export type SaturationLevel = 'low' | 'medium' | 'high' | 'extreme'

export type PainPoint = {
  pain: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  current_workaround: string
  how_this_business_solves_it: string
  willingness_to_pay: 'low' | 'medium' | 'high'
}

export type MarketVerdict = {
  verdict: 'bullish' | 'cautious' | 'bearish'
  urgency_score: number
  timing_note: string
  why_now: string[]
  why_not_yet: string[]
  verdict_summary: string
}

export type FutureOutlook = {
  outlook: 'bright' | 'moderate' | 'uncertain' | 'declining'
  year3_potential: string
  year5_potential: string
  tailwinds: string[]
  headwinds: string[]
  disruption_risk: 'low' | 'medium' | 'high'
  disruption_note: string
  megatrend_alignment: string[]
  future_verdict: string
}

function normalizePainPointSeverity(value: unknown): PainPoint['severity'] {
  const v = String(value ?? '').toLowerCase().trim()
  if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

function normalizeWillingnessToPay(value: unknown): PainPoint['willingness_to_pay'] {
  const v = String(value ?? '').toLowerCase().trim()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

export function parsePainPoints(raw: unknown): PainPoint[] | null {
  const parsed = parseOppJsonField<PainPoint[]>(raw)
  if (!parsed || !Array.isArray(parsed)) return null
  const items = parsed
    .filter((p) => String(p?.pain ?? '').trim())
    .map((p) => ({
      pain: String(p.pain ?? '').trim(),
      severity: normalizePainPointSeverity(p.severity),
      current_workaround: String(p.current_workaround ?? ''),
      how_this_business_solves_it: String(p.how_this_business_solves_it ?? ''),
      willingness_to_pay: normalizeWillingnessToPay(p.willingness_to_pay),
    }))
  return items.length > 0 ? items : null
}

export function parseMarketVerdict(raw: unknown): MarketVerdict | null {
  const parsed = parseOppJsonField<MarketVerdict>(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (!parsed.verdict && !parsed.verdict_summary) return null
  return parsed
}

export function parseFutureOutlook(raw: unknown): FutureOutlook | null {
  const parsed = parseOppJsonField<FutureOutlook>(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (!parsed.outlook && !parsed.future_verdict) return null
  return parsed
}

export function parseSaturationLevel(raw: unknown): SaturationLevel | null {
  const level = String(raw ?? '').trim().toLowerCase()
  if (level === 'low' || level === 'medium' || level === 'high' || level === 'extreme') {
    return level
  }
  return null
}

export function parseOppJsonField<T>(raw: unknown): T | null {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as T
  if (Array.isArray(raw)) return raw as T
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return null
  }
}

export function formatFundingRange(
  min: number | undefined,
  max: number | undefined,
  formatMoney: (n: number) => string,
): string | null {
  const a = min != null && Number.isFinite(min) ? min : null
  const b = max != null && Number.isFinite(max) ? max : null
  if (a == null && b == null) return null
  if (a != null && b != null && a !== b) return `${formatMoney(a)}–${formatMoney(b)}`
  return formatMoney(a ?? b ?? 0)
}

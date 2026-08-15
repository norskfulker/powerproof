import { POWERPROOF_COMPOSER_MODEL_LABELS, resolveAiModelId, type AIModelId } from '@/lib/aiModels'

export const MARKET_TEST_COUNTRY = 'India'

/** Default model tier — matches `test-the-market` edge function. */
export const MARKET_TEST_DEFAULT_MODEL: AIModelId = 'gemini-2.5-flash'

/** Fixed credits per model (not multiplier-based). */
export const MARKET_TEST_AI_MODEL_CREDIT_COSTS: Record<AIModelId, number> = {
  'gemini-2.5-flash-lite': 25,
  'gemini-2.5-flash': 48,
  'gemini-2.5-pro': 64,
}

/** User-facing model names in the composer picker — aligned with research. */
export const MARKET_TEST_AI_MODEL_LABELS: Record<AIModelId, string> = {
  ...POWERPROOF_COMPOSER_MODEL_LABELS,
}

/** @deprecated Use `marketTestCreditCostForModel` — kept for legacy imports. */
export const MARKET_TEST_CREDIT_COST = MARKET_TEST_AI_MODEL_CREDIT_COSTS[MARKET_TEST_DEFAULT_MODEL]

export function marketTestCreditCostForModel(modelId: AIModelId): number {
  return MARKET_TEST_AI_MODEL_CREDIT_COSTS[modelId] ?? MARKET_TEST_CREDIT_COST
}

export function marketTestModelLabel(modelId: AIModelId): string {
  return MARKET_TEST_AI_MODEL_LABELS[modelId] ?? POWERPROOF_COMPOSER_MODEL_LABELS[MARKET_TEST_DEFAULT_MODEL]
}

export function marketTestModelLabelFromUsed(
  modelUsed: string | null | undefined,
): string | null {
  if (!modelUsed?.trim()) return null
  const id = resolveAiModelId(modelUsed)
  return marketTestModelLabel(id)
}

/** e.g. "Deep Dive analysis" on the result header. */
export function marketTestAnalysisHeading(
  modelUsed: string | null | undefined,
  modelLabel?: string | null,
): string | null {
  const label = modelLabel?.trim() || marketTestModelLabelFromUsed(modelUsed)
  return label ? `${label} analysis` : null
}

export type MarketTestVerdict = 'go' | 'proceed_with_caution' | 'red_flag'

export type DemandSignalStrength = 'strong' | 'moderate' | 'weak'

export type RedFlagSeverity = 'critical' | 'high' | 'medium'

export type MarketTestDemandSignal = {
  signal: string
  evidence: string
  strength: DemandSignalStrength
}

export type MarketTestRedFlag = {
  flag: string
  evidence: string
  severity: RedFlagSeverity
}

export type MarketTestPastFailure = {
  company: string | null
  what_happened: string
  lesson: string
}

export type MarketTestPastSuccess = {
  company: string | null
  what_worked: string
  lesson: string
}

export type MarketTestResult = {
  id: string
  query?: string
  user_opportunity_id?: string | null
  generation_status?: string
  verdict: MarketTestVerdict
  verdict_label: string
  market_reality_score: number
  honest_verdict: string
  demand_signals: MarketTestDemandSignal[]
  red_flags: MarketTestRedFlag[]
  past_failures: MarketTestPastFailure[]
  past_successes: MarketTestPastSuccess[]
  pros: string[]
  cons: string[]
  country?: string
  model_used?: string
  model_label?: string
  credits_used?: number
  credits_remaining?: number
  created_at?: string
}

export type MarketTestStreamEvent =
  | { type: 'status'; message: string; phase?: string; id?: string; market_test_id?: string }
  | { type: 'ping'; ts: number }
  | { type: 'done' } & MarketTestResult
  | { type: 'error'; message: string; code?: string }

export class MarketTestInsufficientCreditsError extends Error {
  readonly code = 'insufficient_credits'
  readonly currentCredits: number
  readonly requiredCredits: number

  constructor(message: string, currentCredits: number, requiredCredits: number) {
    super(message)
    this.name = 'MarketTestInsufficientCreditsError'
    this.currentCredits = currentCredits
    this.requiredCredits = requiredCredits
  }
}

export class MarketTestRateLimitError extends Error {
  readonly code = 'rate_limit'

  constructor(message = "You've run too many tests today. Try again later.") {
    super(message)
    this.name = 'MarketTestRateLimitError'
  }
}

export class MarketTestGenerationFailedError extends Error {
  readonly code = 'generation_failed'

  constructor(message = "Something went wrong. Your credits weren't charged.") {
    super(message)
    this.name = 'MarketTestGenerationFailedError'
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => asString(item)).filter(Boolean)
}

function normalizeStrength(value: unknown): DemandSignalStrength {
  const v = asString(value).toLowerCase()
  if (v === 'strong' || v === 'moderate' || v === 'weak') return v
  return 'moderate'
}

function normalizeSeverity(value: unknown): RedFlagSeverity {
  const v = asString(value).toLowerCase()
  if (v === 'critical' || v === 'high' || v === 'medium') return v
  return 'medium'
}

function normalizeVerdict(value: unknown): MarketTestVerdict {
  const v = asString(value).toLowerCase()
  if (v === 'go' || v === 'proceed_with_caution' || v === 'red_flag') return v
  return 'proceed_with_caution'
}

export function normalizeMarketTestResult(
  row: Record<string, unknown>,
): MarketTestResult | null {
  const id = asString(row.id)
  if (!id) return null

  const scoreRaw = row.market_reality_score
  const score =
    typeof scoreRaw === 'number'
      ? Math.min(100, Math.max(0, Math.round(scoreRaw)))
      : Number.parseInt(String(scoreRaw ?? ''), 10)

  const demandSignals = Array.isArray(row.demand_signals)
    ? row.demand_signals.map((item) => {
        const o = item as Record<string, unknown>
        return {
          signal: asString(o.signal),
          evidence: asString(o.evidence),
          strength: normalizeStrength(o.strength),
        }
      })
    : []

  const redFlags = Array.isArray(row.red_flags)
    ? row.red_flags.map((item) => {
        const o = item as Record<string, unknown>
        return {
          flag: asString(o.flag),
          evidence: asString(o.evidence),
          severity: normalizeSeverity(o.severity),
        }
      })
    : []

  const pastFailures = Array.isArray(row.past_failures)
    ? row.past_failures.map((item) => {
        const o = item as Record<string, unknown>
        return {
          company: asString(o.company) || null,
          what_happened: asString(o.what_happened),
          lesson: asString(o.lesson),
        }
      })
    : []

  const pastSuccesses = Array.isArray(row.past_successes)
    ? row.past_successes.map((item) => {
        const o = item as Record<string, unknown>
        return {
          company: asString(o.company) || null,
          what_worked: asString(o.what_worked),
          lesson: asString(o.lesson),
        }
      })
    : []

  return {
    id,
    query: asString(row.query) || undefined,
    user_opportunity_id: asString(row.user_opportunity_id) || null,
    generation_status: asString(row.generation_status) || undefined,
    verdict: normalizeVerdict(row.verdict),
    verdict_label: asString(row.verdict_label) || 'Market reality check',
    market_reality_score: Number.isFinite(score) ? score : 0,
    honest_verdict: asString(row.honest_verdict),
    demand_signals: demandSignals.filter((s) => s.signal),
    red_flags: redFlags.filter((s) => s.flag),
    past_failures: pastFailures.filter((s) => s.what_happened),
    past_successes: pastSuccesses.filter((s) => s.what_worked),
    pros: asStringArray(row.pros),
    cons: asStringArray(row.cons),
    country: asString(row.country) || undefined,
    model_used: asString(row.model_used) || undefined,
    model_label:
      asString(row.model_label) ||
      marketTestModelLabelFromUsed(asString(row.model_used) || null) ||
      undefined,
    credits_used: typeof row.credits_used === 'number' ? row.credits_used : undefined,
    created_at: asString(row.created_at) || undefined,
  }
}

export function marketTestVerdictTone(
  verdict: MarketTestVerdict,
): 'green' | 'amber' | 'red' {
  if (verdict === 'go') return 'green'
  if (verdict === 'red_flag') return 'red'
  return 'amber'
}

export function marketTestVerdictHeading(verdict: MarketTestVerdict): string {
  if (verdict === 'go') return 'Go'
  if (verdict === 'red_flag') return 'Red Flag'
  return 'Proceed with Caution'
}

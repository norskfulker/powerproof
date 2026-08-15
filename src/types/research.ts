// Clarification wizard
export interface ClarifyQuestion {
  id: string
  text: string
  type: 'single_select' | 'multi_select' | 'checkbox' | 'text'
  options?: string[]
  required: boolean
}

export interface ClarifyAnswer {
  question_id: string
  question_text: string
  answer: string | string[]
}

export interface ClarifyRound {
  round: number
  questions: ClarifyQuestion[]
  answers: ClarifyAnswer[]
}

export type ClarifyNeedsMoreResponse = {
  status: 'needs_more'
  round: number
  questions: ClarifyQuestion[]
}

export type ClarifyReadyResponse = {
  status: 'ready'
  refined_prompt: string
  summary: string
  round: number
  byok: boolean
  saturation: SaturationData | null
}

export type ClarifyResearchPromptResponse = ClarifyNeedsMoreResponse | ClarifyReadyResponse

export type ClarificationDraftStatus = 'in_progress' | 'ready' | 'converted' | 'abandoned'

export interface ClarificationDraft {
  id: string
  original_query: string
  country: string
  current_round: number
  session: ClarifyRound[]
  pending_questions: ClarifyQuestion[] | null
  refined_prompt: string | null
  summary: string | null
  status: ClarificationDraftStatus
  updated_at: string
}

export interface SaturationData {
  verdict: 'Saturated' | 'Competitive but Viable' | 'Blue Ocean'
  score: number
  reasons: string[]
  show_warning: boolean
  score_penalties: {
    market_momentum: number
    ease: number
    profitability: number
  }
}

export type LocationTierSuitability = 'excellent' | 'good' | 'moderate' | 'poor'

export type LocationTier = {
  tier_score: number
  suitability: LocationTierSuitability
  rationale: string
  best_cities: string[]
  challenges: string
}

export type LocationTiers = {
  tier1: LocationTier
  tier2: LocationTier
  tier3: LocationTier
}

export type ExpertTipStructured = {
  title: string
  body: string
}

export type UserResearchOpportunityFields = {
  state_tags?: string[]
  location_tiers?: LocationTiers
  expert_tips_structured?: ExpertTipStructured[]
  target_customer_pills?: string[]
  pros?: string[]
  cons?: string[]
}

function parseJsonValue(value: unknown): unknown {
  if (value == null) return value
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function parseStringArrayField(value: unknown): string[] {
  const raw = parseJsonValue(value)
  if (!Array.isArray(raw)) return []
  return raw.map((item) => String(item ?? '').trim()).filter(Boolean)
}

export function parseExpertTipsStructured(value: unknown): ExpertTipStructured[] {
  const raw = parseJsonValue(value)
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const title = String((item as { title?: unknown }).title ?? '').trim()
        const body = String((item as { body?: unknown }).body ?? '').trim()
        if (!title && !body) return null
        return { title, body }
      })
      .filter((item): item is ExpertTipStructured => item != null)
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, unknown>).flatMap(([category, tips]) => {
      if (!Array.isArray(tips)) return []
      return tips
        .map((tip) => {
          const body = String(tip ?? '').trim()
          if (!body) return null
          return { title: category, body }
        })
        .filter((item): item is ExpertTipStructured => item != null)
    })
  }
  return []
}

function parseLocationTier(value: unknown): LocationTier | null {
  if (!value || typeof value !== 'object') return null
  const tier = value as Record<string, unknown>
  const tierScore = Number(tier.tier_score)
  const suitability = String(tier.suitability ?? '').trim().toLowerCase()
  const rationale = String(tier.rationale ?? '').trim()
  const challenges = String(tier.challenges ?? '').trim()
  const bestCities = parseStringArrayField(tier.best_cities)
  if (
    !Number.isFinite(tierScore) &&
    !rationale &&
    !challenges &&
    bestCities.length === 0 &&
    !suitability
  ) {
    return null
  }
  const normalizedSuitability: LocationTierSuitability =
    suitability === 'excellent' ||
    suitability === 'good' ||
    suitability === 'moderate' ||
    suitability === 'poor'
      ? suitability
      : 'moderate'
  return {
    tier_score: Number.isFinite(tierScore) ? tierScore : 0,
    suitability: normalizedSuitability,
    rationale,
    best_cities: bestCities,
    challenges,
  }
}

export function parseLocationTiers(value: unknown): LocationTiers | null {
  const raw = parseJsonValue(value)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const tier1 = parseLocationTier(obj.tier1)
  const tier2 = parseLocationTier(obj.tier2)
  const tier3 = parseLocationTier(obj.tier3)
  if (!tier1 && !tier2 && !tier3) return null
  return {
    tier1: tier1 ?? {
      tier_score: 0,
      suitability: 'moderate',
      rationale: '',
      best_cities: [],
      challenges: '',
    },
    tier2: tier2 ?? {
      tier_score: 0,
      suitability: 'moderate',
      rationale: '',
      best_cities: [],
      challenges: '',
    },
    tier3: tier3 ?? {
      tier_score: 0,
      suitability: 'moderate',
      rationale: '',
      best_cities: [],
      challenges: '',
    },
  }
}

export interface BriefingCompetitor {
  name: string
  strength: string
  weakness: string
}

export interface BriefingResult {
  business_type: string
  location: string
  stage: string
  competitors: BriefingCompetitor[]
  market_size: string | null
  market_gap: string | null
  recent_threats: string | null
  asymmetric_advantage: string | null
  battlefield_summary: string | null
  primary_goal: string | null
  main_threat: string | null
  regulatory_reality?: string | null
  cost_to_first_revenue?: string | null
  customer_acquisition_reality?: string | null
  top_failure_modes?: string[] | null
  hidden_gatekeepers?: string | null
  whats_working_now?: string | null
}

export interface IntelPayload {
  competitors: BriefingCompetitor[]
  market_size: string
  market_gap: string
  recent_threats: string
  asymmetric_advantage: string
  stage_assessment: string
  battlefield_summary: string
}

export interface InferredContext {
  business_type: string
  location: string
  stage: string
  intel: IntelPayload
}

export interface PlaybookQuestionsResponse {
  mode: 'briefing'
  briefing: BriefingResult
  country: string
  model: string
  inferred_context: InferredContext
  extracted_context: WarRoomExtractedContext | null
}

export type PlaybookPhaseName = 'CAPTURE' | 'DOMINATE' | 'FORTIFY' | 'SCALE'

export interface PlaybookRedFlag {
  flag: string
  detail: string
}

export interface PlaybookStep {
  step_order: number
  war_move_name: string
  phase: PlaybookPhaseName | string
  phase_number: number
  title: string
  the_move: string
  why_it_works: string
  weapon: string
  kill_metric: string
  timeline: string
  /** Legacy free-text cost — fallback when `cost_estimate_usd` is absent. */
  cost_estimate?: string | null
  /** Whole USD integer — preferred; display via `formatMoney`. */
  cost_estimate_usd?: number | null
  red_flag: string
  assumption_flagged?: string | null
  is_checked: boolean
}

export interface ThirtyDaySprintObject {
  week_1?: string | null
  week_2?: string | null
  week_3?: string | null
  week_4?: string | null
}

export interface UserPlaybook {
  id: string
  project_id: string
  business_name: string
  /** Founder brief from War Room composer (stored on user_playbooks). */
  business_description?: string | null
  business_type?: string | null
  country?: string | null
  city?: string | null
  industry?: string | null
  context_answers: Record<string, unknown>
  steps: PlaybookStep[]
  generation_status: 'pending' | 'complete' | 'failed' | 'clarifying'
  credits_used: number
  model_used?: string | null
  steps_checked: number
  created_at: string
  edge_declaration?: string | null
  founder_honest_take?: string | null
  thirty_day_sprint?: string | ThirtyDaySprintObject | null
  red_flags?: PlaybookRedFlag[]
  step_count?: number | null
  clarify_state?: import('@/types/clarifyState').ClarifyStatePersisted | null
}

export interface WarRoomExtractedContext {
  name: string
  business_type?: string | null
  industry: string | null
  category: string | null
  city: string | null
  state?: string | null
  country: string
  description: string | null
  operational_status: string | null
  slug: string
}

/** Payload shape from generate-playbook `done` SSE event. */
export interface GeneratePlaybookDonePayload {
  id: string
  country?: string
  model?: string
  model_used?: string
  /** User's original War Room prompt (also persisted on `user_playbooks.business_description`). */
  business_description?: string
  credits_used?: number
  edge_declaration?: string
  founder_honest_take?: string
  thirty_day_sprint?: string | ThirtyDaySprintObject
  red_flags?: PlaybookRedFlag[]
  steps?: unknown[]
}

export type Role = 'user' | 'admin' | 'super_admin'
export type OpportunityStatus = 'draft' | 'live' | 'archived'
export type BadgeType = 'trending' | 'hot' | 'low' | 'new' | 'global'
export type EaseLevel = 'Easy' | 'Medium' | 'Hard'
export type Source = 'india' | 'global'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'

/** Canonical `opportunities.machinery_list` JSON item (normalized in DB). */
export type MachineryItem = {
  name: string
  qty: number
  cost_approx: number
  category: string
  mandatory: string
  new_or_used: string
  purpose: string
  sourcing: string
}

/** Canonical `opportunities.raw_materials` JSON item (normalized in DB). */
export type RawMaterialItem = {
  name: string
  category: string
  cost_per_unit: string
  rate_per_unit: number
  source: string
  notes: string
  unit: string
  frequency: string
}

export type RevenueStreamModel =
  | 'recurring'
  | 'transactional'
  | 'passive'
  | 'one-time'
  | 'licensing'
  | 'commission'
  | 'freemium'
  | 'marketplace'

export type RevenueStreamFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'annual'
  | 'per-event'
  | 'per-project'

export type RevenueStream = {
  label: string
  model: RevenueStreamModel
  pct_of_revenue: number
  avg_ticket_usd: number
  frequency: RevenueStreamFrequency
  description: string
  growth_potential: 'low' | 'medium' | 'high'
  dependency: string
  unlock_at: string
}

export type MarketingChannelType =
  | 'social'
  | 'digital_ads'
  | 'content'
  | 'seo'
  | 'guerrilla'
  | 'offline_print'
  | 'offline_ooh'
  | 'pr'
  | 'referral'
  | 'influencer'
  | 'community'
  | 'email'
  | 'event'

export type MarketingChannel = {
  name: string
  type: MarketingChannelType
  budget_usd: number
  priority: 'primary' | 'secondary' | 'experimental'
  rationale: string
  tactics: string[]
  dos: string[]
  donts: string[]
  success_rate: 'low' | 'medium' | 'high'
  failure_mode: string
  timeline: string
  kpi: string
  platform_setup?: string
  ad_creative_idea?: string
}

export type MarketingBudgetMilestoneChannel = {
  name: string
  action: string
  budget_usd: number
}

export type MarketingBudgetMilestone = {
  total_usd: number
  focus: string
  /** Edge function returns channel objects; legacy rows may use plain strings. */
  channels?: Array<string | MarketingBudgetMilestoneChannel>
}

export type MarketingPsychologyLever = {
  lever: string
  application: string
}

export type MarketingStrategy = {
  total_budget_usd: number
  budget_split: string
  primary_hook: string
  channels: MarketingChannel[]
  guerrilla_play: {
    idea: string
    execution: string
    expected_impact: string
  }
  launch_sequence: Array<{
    week: string
    action: string
    goal: string
  }>
  retention_strategy: string
  referral_mechanic: string
  social_proof_angles?: string[]
  psychology_levers?: MarketingPsychologyLever[]
  budget_milestones?: {
    month_1?: MarketingBudgetMilestone
    month_6?: MarketingBudgetMilestone
    month_12?: MarketingBudgetMilestone
    month_18?: MarketingBudgetMilestone
  }
}

export type ResearchCompetitors = {
  king_of_market: {
    name: string
    why_they_win: string
    their_weakness: string
    your_exploit: string
  }
  direct: Array<{
    name: string
    type: 'local' | 'national' | 'international' | string
    strength: string
    weakness: string
    market_share_est: string
    pricing: string
    not_doing: string
  }>
  indirect: Array<{
    name: string
    threat_level: 'low' | 'medium' | 'high'
    reason: string
  }>
  your_advantages: string[]
  what_to_do: string[]
  threats: string[]
  badge_context?: string
}

export type ResearchDemandTrend = {
  label: string
  unit: string
  data: Array<{ period: string; value: number }>
  trend_direction: 'rising' | 'falling' | 'stable' | 'seasonal'
  trend_note: string
  peak_period: string
  trough_period: string
}

export type ResearchSpaceLocation = {
  needed: boolean
  type: string
  min_sqft: number
  max_sqft: number
  ideal_location: string
  avoid: string
  rent_tier1_usd: number
  rent_tier2_usd: number
  rent_tier3_usd: number
  lease_terms: string
  fit_out_cost_usd: number
  footfall_requirement: 'low' | 'medium' | 'high'
  notes: string
}

export type CalculatorBillingModel = 'per_unit_daily' | 'subscription_cumulative'

/** Public opportunity calculator defaults (JSON on `opportunities.calculator_config`). */
export type OpportunityCalculatorConfig = {
  /** Daily transactional (×30) vs active subscribers (no ×30). Null → per_unit_daily. */
  billing_model?: CalculatorBillingModel | null
  cogs_label?: string
  cogs_slider_min?: number
  cogs_slider_max?: number
  cogs_editable?: boolean
  revenue?: {
    /** Preferred: calibrated per opportunity (USD). */
    avg_bill?: number
    units_per_day_low?: number
    units_per_day_high?: number
    driver_label?: string
    default_daily_customers?: number
    default_avg_bill?: number
    default_working_days?: number
    unit_label?: string
    bill_label?: string
  }
  emi?: {
    default_loan_amount?: number
    default_interest_rate?: number
    default_tenure_months?: number
    /** Preferred: annual % (matches AI / edge JSON). */
    interest_rate_pct?: number
  }
  _derived?: boolean
  /** Legacy / admin-only nested settings */
  financials?: Record<string, unknown>
} | null

export interface Profile {
  id: string
  email: string
  full_name: string | null
  username?: string | null
  display_name?: string | null
  bio?: string | null
  avatar_url: string | null
  website?: string | null
  location_city?: string | null
  location_state?: string | null
  employment_status?: string | null
  phone: string | null
  city: string | null
  state: string | null
  onboarding_completed?: boolean | null
  onboarding_step?: number | null
  /** True after first-time research opportunity reveal onboarding finishes. */
  onboarding?: boolean | null
  budget_range?: string | null
  preferred_categories?: string[] | null
  preferred_state?: string | null
  /** ISO country code or country name for discovery / pricing context */
  home_country?: string | null
  preferred_currency?: string | null
  /** DB check: gemini-2.5-flash-lite | gemini-2.5-flash | gemini-2.5-pro */
  preferred_ai_model?: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | null
  role: Role
  referral_code?: string | null
  referred_by_user_id?: string | null
  notif_weekly_trending: boolean
  notif_saved_category: boolean
  notif_govt_alerts: boolean
  display_setup_cost?: boolean
  display_description?: boolean
  investors_list_unlocked_at?: string | null
  created_at: string
  updated_at: string
}

export interface DbWebsiteScanHistory {
  id: string
  user_id: string
  url: string
  normalized_url: string
  final_url: string | null
  status: number
  /** Progressive scan lifecycle: running while Gemini passes are in flight. */
  scan_status?: 'running' | 'complete' | 'error'
  duration_ms: number
  page_count: number
  site_title: string | null
  seo_score: number
  business_score: number
  competitor_score: number
  roadmap_score: number
  report: unknown
  crawl_payload: unknown | null
  crawl_source: 'fresh' | 'cache' | 'inhouse' | null
  crawl_at: string | null
  firecrawl_job_id: string | null
  created_at: string
}

export interface DbCategory {
  id: string
  slug: string
  name: string
  icon: string
  tagline: string | null
  heat: number
  color: string
  opp_count: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SetupCostDerivation {
  items: { label: string; amount_usd: number }[]
  subtotal: number
  optimistic: number
  buffer: number
  note: string
}

export interface ProfitDerivation {
  formula: string
  billing_model: string
  avg_bill: number
  units_low: number
  units_high: number
  driver_label: string
  rev_low: number
  rev_high: number
  cogs_pct: number
  gross_low: number
  gross_high: number
  opex: number
  note: string
}

export interface EffortScorecard {
  capital_intensity: number
  skill_barrier: number
  regulatory_burden: number
  operational_complexity: number
  time_to_first_revenue: number
  avg: number
  weights: Record<string, number>
  notes: string
  note: string
}

export interface DbOpportunity {
  id: string
  slug: string
  title: string
  tagline?: string | null
  full_desc: string | null
  category_slug: string | null
  badge: BadgeType | null
  badge_label: string | null
  source: Source
  country: string | null
  country_flag: string | null
  /** Always `"USD"` — financial columns are whole-USD integers. */
  currency: 'USD'
  /** Always `"$"` — use `useCurrency().formatMoney()` for display in the user's currency. */
  currency_symbol: '$'
  /** Whole USD integers — use `formatMoney()` from `useCurrency` to display. */
  setup_min: number | null
  /** Whole USD integers — use `formatMoney()` from `useCurrency` to display. */
  setup_max: number | null
  monthly_rev_min?: number | null
  monthly_rev_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
  license_cost_min?: number | null
  license_cost_max?: number | null
  /** Generated column — read only, do not send on INSERT/UPDATE. */
  margin_pct: number | null
  calculator_config?: OpportunityCalculatorConfig
  ease: EaseLevel | null
  setup_cost_derivation?: SetupCostDerivation | null
  profit_derivation?: ProfitDerivation | null
  effort_scorecard?: EffortScorecard | null
  ease_score?: number | null
  score: number
  score_label: string
  trend_velocity: number
  is_locked: boolean
  status: OpportunityStatus
  govt_schemes: string[]
  tags: string[]
  subsidy_pct: number | null
  view_count: number
  save_count: number
  unlock_click_count: number
  created_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  machinery_list?: MachineryItem[] | null
  raw_materials?: RawMaterialItem[] | null
  revenue_streams?: RevenueStream[] | null
  marketing_strategy?: MarketingStrategy | null
  // joined
  category_name?: string
  category_icon?: string
}

/** Private `user_opportunities` row (subset + JSON fields used by detail UI). */

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

export interface DbUserOpportunity {
  id: string
  user_id: string
  project_id?: string | null
  slug: string
  title: string
  tagline?: string | null
  full_desc?: string | null
  category_slug?: string | null
  country?: string | null
  badge?: string | null
  badge_label?: string | null
  ease?: string | null
  score?: number | null
  score_breakdown?: Record<string, unknown> | null
  fit_index?: number | null
  fit_verdict?: string | null
  research_style?: string | null
  setup_min?: number | null
  setup_max?: number | null
  monthly_rev_min?: number | null
  monthly_rev_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
  payback_months_min?: number | null
  payback_months_max?: number | null
  setup_cost_derivation?: SetupCostDerivation | null
  profit_derivation?: ProfitDerivation | null
  effort_scorecard?: EffortScorecard | null
  ease_score?: number | null
  calculator_config?: OpportunityCalculatorConfig
  financial_projections?: Record<string, unknown> | null
  machinery_list?: MachineryItem[] | null
  raw_materials?: RawMaterialItem[] | null
  revenue_streams?: RevenueStream[] | null
  marketing_strategy?: MarketingStrategy | null
  competitors?: ResearchCompetitors | null
  demand_trend?: ResearchDemandTrend | null
  space_location?: ResearchSpaceLocation | null
  research_query?: string | null
  model_used?: string | null
  byok_used?: boolean | null
  research_status?: string | null
  research_version?: number | null
  research_context?: Record<string, unknown> | null
  re_research_sections?: string[] | null
  re_research_prompt?: string | null
  re_research_count?: number
  visibility?: 'private' | 'catalog'
  pain_points?: PainPoint[] | null
  market_verdict?: MarketVerdict | null
  future_outlook?: FutureOutlook | null
  saturation_level?: SaturationLevel | null
  saturation_note?: string | null
  is_saturated?: boolean
  pros?: string[] | null
  cons?: string[] | null
  state_tags?: string[] | null
  target_customer_pills?: string[] | null
  location_tiers?: Record<string, unknown> | null
  expert_tips_structured?: Array<{ title: string; body: string }> | null
  status?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export type ResearchTask = {
  id: string
  user_id: string
  user_opportunity_id: string
  task_type:
    | 'ponder_marketing'
    | 'ponder_competitors'
    | 'ponder_financials'
    | 'ponder_operations'
    | 'ponder_custom'
  task_label: string
  custom_prompt: string | null
  status: 'pending' | 'processing' | 'complete' | 'failed'
  credits_used: number
  result: Record<string, unknown> | null
  error_detail: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  plan: string
  billing_cycle: 'monthly' | 'yearly'
  amount_paise: number
  currency: string
  status: PaymentStatus
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  is_trial: boolean
  period_start: string | null
  period_end: string | null
  created_at: string
}

export interface PlatformSetting {
  key: string
  value: string
  description: string | null
}

/** Workspace project row (`projects` table). */
export interface Project {
  id: string
  user_id: string
  source: string | null
  name: string | null
  slug: string | null
  category: string | null
  gstin: string | null
  gst_data: unknown | null
  is_gst_verified: boolean | null
  gst_status: string | null
  gst_verified_at: string | null
  operational_status: string | null
  city: string | null
  state: string | null
  country: string | null
  country_iso: string | null
  whatsapp_number: string | null
  email: string | null
  phone: string | null
  is_public: boolean | null
  public_page_views: number | null
  public_page_enabled: boolean | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

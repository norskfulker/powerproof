import type { Persona } from '@/types/persona'

export interface RoadmapPhasePreview {
  title: string
  tagline: string
  weeks: string
}

export type PreviewSaturationVerdict = 'Saturated' | 'Competitive but Viable' | 'Blue Ocean'

export interface PreviewResult {
  title: string
  tagline: string
  persona: Persona | string
  market_snapshot: string
  opportunity_score: number
  saturation_verdict: PreviewSaturationVerdict
  saturation_reason: string
  revenue_hint: string
  top_competitors: string[]
  one_big_risk: string
  one_big_opportunity: string
  roadmap_preview: {
    total_weeks: number
    phases: RoadmapPhasePreview[]
    first_milestone: {
      title: string
      tasks: string[]
    }
  }
}

export type PreviewResearchState = 'idle' | 'loading' | 'result' | 'error' | 'rate_limited' | 'vague'

export type PreviewVagueQueryResponse = {
  error: 'vague_query'
  message: string
  suggestion: string | null
  code: 'vague_query'
}

export type PreviewResearchResponse = {
  preview: PreviewResult
  session_token: string | null
  remaining: number
}

export type PreviewRateLimitedResponse = {
  error: 'rate_limited'
  message: string
  code: 'preview_limit_reached'
}

export type ClaimPreviewSessionResult = {
  opportunity_id: string | null
  slug?: string | null
  already_claimed: boolean
  error?: string
}

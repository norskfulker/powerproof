import type { SaturationData } from '@/types/research'

export function getSaturationMeterTone(score: number): string {
  if (score <= 40) return 'bg-emerald-500'
  if (score <= 64) return 'bg-amber-500'
  return 'bg-red-500'
}

export function getSaturationLabel(score: number): string {
  if (score <= 40) return 'Low Saturation'
  if (score <= 64) return 'Moderate Saturation'
  if (score <= 79) return 'High Saturation'
  return 'Market Saturated'
}

export function getVerdictTone(verdict: SaturationData['verdict'] | string | null | undefined): {
  badge: string
  card: string
} {
  if (verdict === 'Saturated') {
    return {
      badge: 'text-red-500 border-red-500/30 bg-red-500/10',
      card: 'border-red-500/20 bg-red-500/[0.04]',
    }
  }
  if (verdict === 'Competitive but Viable') {
    return {
      badge: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
      card: 'border-amber-500/20 bg-amber-500/[0.04]',
    }
  }
  return {
    badge: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
    card: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  }
}

export function normalizeSaturationData(raw: unknown): SaturationData | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (typeof value.score !== 'number' || !Array.isArray(value.reasons)) return null
  if (
    value.verdict !== 'Saturated' &&
    value.verdict !== 'Competitive but Viable' &&
    value.verdict !== 'Blue Ocean'
  ) {
    return null
  }
  const scorePenalties =
    value.score_penalties && typeof value.score_penalties === 'object'
      ? (value.score_penalties as Record<string, unknown>)
      : {}
  return {
    verdict: value.verdict,
    score: value.score,
    reasons: value.reasons.filter((item): item is string => typeof item === 'string'),
    show_warning: Boolean(value.show_warning),
    score_penalties: {
      market_momentum:
        typeof scorePenalties.market_momentum === 'number' ? scorePenalties.market_momentum : 0,
      ease: typeof scorePenalties.ease === 'number' ? scorePenalties.ease : 0,
      profitability: typeof scorePenalties.profitability === 'number' ? scorePenalties.profitability : 0,
    },
  }
}


import { cn } from '@/lib/utils'

/** Canonical fit-score dimensions (fixed order). Aggregate score = integer average 0–100. */

export const FIT_SCORE_KEYS = [
  'profitability',
  'ease',
  'govt_support',
  'market_momentum',
] as const

export type FitScoreKey = (typeof FIT_SCORE_KEYS)[number]

export type FitScoreBreakdown = Partial<Record<FitScoreKey, number>>

export type ScoreDimensionMeta = { label: string }

export const SCORE_DIMENSION_META: Record<FitScoreKey, ScoreDimensionMeta> = {
  profitability: {
    label: 'Ability to generate Profit',
  },
  ease: {
    label: 'Ability to execute',
  },
  govt_support: {
    label: 'Government Support',
  },
  market_momentum: {
    label: 'Market Demand',
  },
}

function clampScoreComponent(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** Parse DB / API `score_breakdown` (JSON string, nested object, or flat map) into a flat record for FIT_SCORE_KEYS. */
export function normalizeScoreBreakdown(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  let cur: unknown = raw
  if (typeof cur === 'string') {
    const s = cur.trim()
    if (!s || s === 'null') return null
    try {
      cur = JSON.parse(s)
    } catch {
      return null
    }
  }
  if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return null
  let o = cur as Record<string, unknown>
  const nested = o.fit ?? o.fit_score ?? o.dimensions ?? o.scores
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    o = nested as Record<string, unknown>
  }
  if (Array.isArray(o.dimensions)) {
    const flat: Record<string, unknown> = {}
    for (const item of o.dimensions as unknown[]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const row = item as Record<string, unknown>
      const k = String(row.key ?? row.id ?? row.dimension ?? '').trim()
      if (!k) continue
      const val = row.value ?? row.score ?? row.val
      if (val != null) flat[k] = val
    }
    if (Object.keys(flat).length) return flat
  }
  return o
}

export function hasCanonicalScoreBreakdown(breakdown: unknown): breakdown is Record<string, unknown> {
  const normalized = normalizeScoreBreakdown(breakdown)
  if (!normalized) return false
  const o = normalized
  return FIT_SCORE_KEYS.every((k) => {
    const v = o[k]
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n)
  })
}

/** Headline score + all four breakdown dimensions present (0–100 scale, no scaling). */
export function isFitScoreDisplayValid(score: unknown, breakdown: unknown): boolean {
  if (score == null || score === '') return false
  const n = typeof score === 'number' ? score : Number(score)
  if (!Number.isFinite(n)) return false
  return hasCanonicalScoreBreakdown(breakdown)
}

/** DB `score` / `fit_index` when valid; null → show skeleton, do not derive from partial breakdown. */
export function getValidatedFitScore(score: unknown, _breakdown?: unknown): number | null {
  if (!isFitScoreDisplayValid(score, _breakdown)) return null
  const n = typeof score === 'number' ? score : Number(score)
  return Math.round(clampScoreComponent(n))
}

export type FitDimensionBarTone = {
  fill: string
  track: string
}

export type FitScoreTier = 'high' | 'medium' | 'low' | 'worst'

/** High ≥80, Medium ≥65, Low ≥50, Worst &lt;50. */
export function getFitScoreTier(val: number): FitScoreTier {
  const v = clampScoreComponent(val)
  if (v >= 80) return 'high'
  if (v >= 65) return 'medium'
  if (v >= 50) return 'low'
  return 'worst'
}

export const FIT_SCORE_TIER_LABEL: Record<FitScoreTier, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  worst: 'Worst',
}

/** Semantic bar fill + track for fit score tiers (not primary). */
export function getFitDimensionBarTone(val: number): FitDimensionBarTone {
  const tier = getFitScoreTier(val)
  if (tier === 'high') {
    return { fill: 'hsl(var(--success))', track: 'hsl(var(--success) / 0.2)' }
  }
  if (tier === 'medium') {
    return { fill: 'hsl(var(--warning))', track: 'hsl(var(--warning) / 0.2)' }
  }
  if (tier === 'low') {
    return { fill: 'hsl(var(--saffron-500))', track: 'hsl(var(--saffron-500) / 0.2)' }
  }
  return { fill: 'hsl(var(--destructive))', track: 'hsl(var(--destructive) / 0.2)' }
}

export function getFitScoreTierBadgeVariant(
  tier: FitScoreTier,
): 'green' | 'amber' | 'orange' | 'red' {
  if (tier === 'high') return 'green'
  if (tier === 'medium') return 'amber'
  if (tier === 'low') return 'orange'
  return 'red'
}

/** Single dimension 0–100 for display bars (accepts raw JSON / nested shapes). */
export function getFitDimensionValue(breakdown: Record<string, unknown> | null | undefined | unknown, key: FitScoreKey): number {
  const flat =
    normalizeScoreBreakdown(breakdown) ??
    (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)
      ? (breakdown as Record<string, unknown>)
      : null)
  if (!flat) return 0
  const v = flat[key]
  const n = typeof v === 'number' ? v : Number(v)
  return clampScoreComponent(n)
}

/**
 * Headline fit score: average of the four canonical dimensions (missing / invalid → 0).
 * If no canonical values exist in breakdown, uses fallbackScore (typically DB `score` column).
 */
/** Admin preview: average of breakdown when complete, else fallback `score`. */
/** Badge classes for score_label text (Strong, Moderate, Weak, etc.). */
export function getScoreLabelBadgeClass(
  label: string | null | undefined,
  score?: number | null,
): string {
  const base =
    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide'
  const normalized = String(label ?? '')
    .trim()
    .toLowerCase()

  if (/strong|excellent|high|great|good/.test(normalized)) {
    return cn(base, 'border-primary/25 bg-primary/10 text-primary')
  }
  if (/moderate|medium|fair|average/.test(normalized)) {
    return cn(
      base,
      'border-[hsl(var(--saffron-500)/0.35)] bg-[hsl(var(--saffron-100))] text-[hsl(var(--saffron-600))]',
    )
  }
  if (/weak|low|poor|limited/.test(normalized)) {
    return cn(base, 'border-destructive/25 bg-destructive/10 text-destructive')
  }

  const n = score != null ? (typeof score === 'number' ? score : Number(score)) : NaN
  if (Number.isFinite(n)) {
    if (n >= 70) return cn(base, 'border-primary/25 bg-primary/10 text-primary')
    if (n >= 50) {
      return cn(
        base,
        'border-[hsl(var(--saffron-500)/0.35)] bg-[hsl(var(--saffron-100))] text-[hsl(var(--saffron-600))]',
      )
    }
    return cn(base, 'border-destructive/25 bg-destructive/10 text-destructive')
  }

  return cn(base, 'border-border-subtle bg-muted/50 text-muted-foreground')
}

export function getFitScoreDisplay(
  breakdown: Record<string, unknown> | null | undefined,
  fallbackScore?: number | null,
): number {
  const flat = breakdown ? normalizeScoreBreakdown(breakdown) ?? breakdown : null
  if (hasCanonicalScoreBreakdown(flat ?? breakdown)) {
    const src = flat ?? breakdown!
    const sum = FIT_SCORE_KEYS.reduce((acc, key) => acc + getFitDimensionValue(src, key), 0)
    return Math.round(sum / FIT_SCORE_KEYS.length)
  }
  const validated = getValidatedFitScore(fallbackScore, breakdown)
  if (validated != null) return validated
  return 0
}

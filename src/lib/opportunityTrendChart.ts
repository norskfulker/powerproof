export type TrendKind = 'rising' | 'flat' | 'falling'

export function trendKindFromVelocity(velocity: number | null | undefined): TrendKind {
  const v = Number(velocity)
  if (!Number.isFinite(v)) return 'flat'
  if (v > 5) return 'rising'
  if (v < -5) return 'falling'
  return 'flat'
}

/** Map v7 research `demand_trend.trend_direction` to metrics-bar trend kind. */
export function trendKindFromDemandDirection(
  direction: string | null | undefined,
): TrendKind {
  if (direction === 'rising') return 'rising'
  if (direction === 'falling') return 'falling'
  return 'flat'
}

export function trendLabel(kind: TrendKind): string {
  if (kind === 'rising') return '↑ RISING'
  if (kind === 'falling') return '↓ FALLING'
  return '→ FLAT'
}

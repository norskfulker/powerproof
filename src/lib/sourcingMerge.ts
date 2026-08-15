import type { SourcingCard, SourcingSourceKey } from './sourcingTypes'

// ─── Interleave ────────────────────────────────────────────────────────────
// Round-robin: indiamart → alibaba → made_in_china → 1688 → repeat
export function interleaveCards(
  bySource: Partial<Record<SourcingSourceKey, SourcingCard[]>>,
): SourcingCard[] {
  const order: SourcingSourceKey[] = ['indiamart', 'alibaba', 'made_in_china', '1688']
  const buckets = order.map((src) => bySource[src] ?? [])
  const maxLen = Math.max(...buckets.map((b) => b.length))
  const merged: SourcingCard[] = []
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (i < bucket.length) merged.push(bucket[i])
    }
  }
  return merged
}

// ─── Reliability score ─────────────────────────────────────────────────────
// Computed client-side from available fields. Higher = more reliable.
// Max possible: 100
export function reliabilityScore(card: SourcingCard): number {
  let score = 0

  // Verification (up to 40pts)
  if (card.gst_verified) score += 20
  if (card.email_verified) score += 10
  if (card.mobile_verified) score += 10

  // Listing completeness (up to 30pts)
  if (card.image_url) score += 10
  if (card.price_min !== null) score += 10
  if (card.product_description) score += 5
  if (card.specifications?.length > 0) score += 5

  // Supplier longevity (up to 30pts)
  if (card.year_established) {
    const age = new Date().getFullYear() - card.year_established
    score += Math.min(15, age * 1.5) // max 15 at 10+ years
  }
  if (card.member_since) {
    const memberYears =
      (Date.now() - new Date(card.member_since).getTime()) / (1000 * 60 * 60 * 24 * 365)
    score += Math.min(15, memberYears * 1.5) // max 15 at 10+ years
  }

  if (card.composite_score !== null) {
    score += (card.composite_score / 5) * 20
  }
  if (card.order_count !== null && card.order_count > 0) {
    score += Math.min(10, Math.log10(card.order_count + 1) * 5)
  }
  if (card.repurchase_rate) {
    const rate = parseFloat(card.repurchase_rate)
    if (!Number.isNaN(rate)) score += Math.min(10, rate / 10)
  }

  return Math.round(Math.min(100, score))
}

// ─── Sort ──────────────────────────────────────────────────────────────────

export type SourcingSortKey = 'recommended' | 'price_asc' | 'price_desc' | 'reliability'

export const SORT_OPTIONS: { value: SourcingSortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'reliability', label: 'Reliability' },
]

/** Interleaved (recommended) or globally sorted flat list for display. */
export function buildDisplayCards(
  bySource: Partial<Record<SourcingSourceKey, SourcingCard[]>>,
  sort: SourcingSortKey,
): SourcingCard[] {
  const interleaved = interleaveCards(bySource)
  if (sort === 'recommended') return interleaved
  return sortCards(interleaved, sort)
}

export function sortCards(cards: SourcingCard[], sort: SourcingSortKey): SourcingCard[] {
  if (sort === 'recommended') return cards // already interleaved

  return [...cards].sort((a, b) => {
    if (sort === 'price_asc') {
      const aP = a.price_min ?? a.price_max ?? Infinity
      const bP = b.price_min ?? b.price_max ?? Infinity
      return aP - bP
    }
    if (sort === 'price_desc') {
      const aP = a.price_min ?? a.price_max ?? -Infinity
      const bP = b.price_min ?? b.price_max ?? -Infinity
      return bP - aP
    }
    if (sort === 'reliability') {
      return reliabilityScore(b) - reliabilityScore(a)
    }
    return 0
  })
}

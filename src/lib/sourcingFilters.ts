import { buildDisplayCards, sortCards, type SourcingSortKey } from '@/lib/sourcingMerge'
import {
  SOURCE_ORDER,
  normalizeSourcingCard,
  type SourcingCard,
  type SourcingHistoryRow,
  type SourcingSourceKey,
} from '@/lib/sourcingTypes'

export type SourcingResultsFilters = {
  sources: Set<SourcingSourceKey> | null
  verifiedOnly: boolean
  sort: SourcingSortKey
  /** When true, merge products from every provided history row. */
  includeAllSearches: boolean
}

export const DEFAULT_SOURCING_RESULTS_FILTERS: SourcingResultsFilters = {
  sources: null,
  verifiedOnly: false,
  sort: 'recommended',
  includeAllSearches: false,
}

function cardsFromRow(row: SourcingHistoryRow): SourcingCard[] {
  const bySource: Partial<Record<SourcingSourceKey, SourcingCard[]>> = {}
  for (const source of SOURCE_ORDER) {
    const raw = row.results_by_source?.[source]
    if (!raw?.length) continue
    bySource[source] = raw.map((c) =>
      normalizeSourcingCard({ ...c, source: c.source ?? source }),
    )
  }
  return buildDisplayCards(bySource, 'recommended')
}

function dedupeCards(cards: SourcingCard[]): SourcingCard[] {
  const seen = new Set<string>()
  const out: SourcingCard[] = []
  for (const card of cards) {
    const key = `${card.source}::${card.product_url}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(card)
  }
  return out
}

export function collectSourcingCards(
  primary: SourcingHistoryRow,
  allRows: SourcingHistoryRow[],
  filters: SourcingResultsFilters,
): SourcingCard[] {
  const rows = filters.includeAllSearches
    ? allRows.length > 0
      ? allRows
      : [primary]
    : [primary]

  let cards = dedupeCards(rows.flatMap(cardsFromRow))

  if (filters.sources && filters.sources.size > 0) {
    cards = cards.filter((c) => filters.sources!.has(c.source))
  }

  if (filters.verifiedOnly) {
    cards = cards.filter(
      (c) => c.is_verified || c.gst_verified || c.email_verified || c.mobile_verified,
    )
  }

  return sortCards(cards, filters.sort)
}

export function countCardsBySource(
  cards: SourcingCard[],
): Record<SourcingSourceKey, number> {
  const counts = Object.fromEntries(SOURCE_ORDER.map((k) => [k, 0])) as Record<
    SourcingSourceKey,
    number
  >
  for (const card of cards) {
    counts[card.source] = (counts[card.source] ?? 0) + 1
  }
  return counts
}

/** Find a product card across one or more history rows. */
export function findCardInHistoryRows(
  rows: SourcingHistoryRow[],
  source: SourcingSourceKey,
  productUrl: string,
): SourcingCard | null {
  const target = productUrl.trim()
  if (!target) return null
  for (const row of rows) {
    for (const card of cardsFromRow(row)) {
      if (card.source === source && card.product_url === target) return card
    }
  }
  return null
}

import { buildDisplayCards } from '@/lib/sourcingMerge'
import type { SourcingSortKey } from '@/lib/sourcingMerge'
import {
  SOURCE_META,
  SOURCE_ORDER,
  normalizeSourcingCard,
  type SourcingCard,
  type SourcingHistoryRow,
  type SourcingSourceKey,
} from '@/lib/sourcingTypes'

const SOURCE_KEYS = new Set<string>(SOURCE_ORDER)

function isSourceKey(s: string): s is SourcingSourceKey {
  return SOURCE_KEYS.has(s)
}

function normalizeBucket(
  cards: SourcingCard[] | undefined,
  source: SourcingSourceKey,
): SourcingCard[] {
  if (!cards?.length) return []
  return cards.map((c) => normalizeSourcingCard({ ...c, source: c.source ?? source }))
}

/** Up to four supplier previews for a saved search (interleaved across marketplaces). */
export function getHistoryPreviewCards(row: SourcingHistoryRow, limit = 4): SourcingCard[] {
  const bySource: Partial<Record<SourcingSourceKey, SourcingCard[]>> = {
    indiamart: normalizeBucket(row.results_by_source?.indiamart, 'indiamart'),
    alibaba: normalizeBucket(row.results_by_source?.alibaba, 'alibaba'),
    made_in_china: normalizeBucket(row.results_by_source?.made_in_china, 'made_in_china'),
    '1688': normalizeBucket(row.results_by_source?.['1688'], '1688'),
  }
  return buildDisplayCards(bySource, 'recommended').slice(0, limit)
}

/** Full supplier list for a saved search (interleaved or sorted). */
export function getHistoryDisplayCards(
  row: SourcingHistoryRow,
  sort: SourcingSortKey,
): SourcingCard[] {
  const bySource: Partial<Record<SourcingSourceKey, SourcingCard[]>> = {
    indiamart: normalizeBucket(row.results_by_source?.indiamart, 'indiamart'),
    alibaba: normalizeBucket(row.results_by_source?.alibaba, 'alibaba'),
    made_in_china: normalizeBucket(row.results_by_source?.made_in_china, 'made_in_china'),
    '1688': normalizeBucket(row.results_by_source?.['1688'], '1688'),
  }
  return buildDisplayCards(bySource, sort)
}

export type SourceCountEntry = {
  key: SourcingSourceKey | string
  label: string
  count: number
  badgeBg: string
  badgeText: string
}

/** Per-marketplace counts from `counts_by_source`, ordered and labeled. */
export function getSourceCountEntries(row: SourcingHistoryRow): SourceCountEntry[] {
  const counts = row.counts_by_source ?? {}
  const keys = new Set([...SOURCE_ORDER, ...(row.sources ?? [])])
  const entries: SourceCountEntry[] = []

  for (const key of keys) {
    const count = Number(counts[key] ?? 0)
    if (!Number.isFinite(count) || count <= 0) continue
    const meta = isSourceKey(key)
      ? SOURCE_META[key]
      : { label: key, badgeBg: 'hsl(var(--muted))', badgeText: 'hsl(var(--muted-foreground))' }
    entries.push({
      key,
      label: meta.label,
      count,
      badgeBg: meta.badgeBg,
      badgeText: meta.badgeText,
    })
  }

  return entries.sort((a, b) => b.count - a.count)
}

export function formatHistoryBudget(budgetMax: number | null): string {
  if (budgetMax == null) return 'No budget cap'
  return `Budget cap $${budgetMax.toLocaleString()}`
}

/** Locale date + time for cards (no relative “ago” copy). */
export function formatSourcingTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatHistorySearchedAt(iso: string): { relative: string; absolute: string } {
  const date = new Date(iso)
  const absolute = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  let relative: string
  if (mins < 1) relative = 'Just now'
  else if (mins < 60) relative = `${mins}m ago`
  else {
    const hours = Math.floor(mins / 60)
    if (hours < 24) relative = `${hours}h ago`
    else {
      const days = Math.floor(hours / 24)
      if (days < 7) relative = `${days}d ago`
      else relative = absolute
    }
  }
  return { relative, absolute }
}

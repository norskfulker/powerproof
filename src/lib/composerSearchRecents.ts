import type { DiscoverHeroTab } from '@/lib/discoverHeroRoutes'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { scanDetailPath } from '@/lib/sidebarWorkspaceNav'

export type ComposerSearchFeature =
  | 'research'
  | 'war-room'
  | 'roadmap'
  | 'market-test'
  | 'sourcing'
  | 'opportunities'
  | 'scanner'

export type ComposerSearchRecent = {
  id: string
  query: string
  feature: ComposerSearchFeature
  href: string
  at: number
}

/** Legacy, un-scoped key. Cleared on sign-in so history never leaks between accounts. */
const LEGACY_STORAGE_KEY = 'powerproof_composer_search_recents'
const STORAGE_KEY_PREFIX = 'powerproof_composer_search_recents'
const MAX_RECENTS = 12

export const COMPOSER_SEARCH_RECENTS_EVENT = 'powerproof:composer-search-recents-updated'

/**
 * Sidebar/history recents are stored in localStorage, which is shared across every
 * account that signs in on the same browser. Scope them by the Supabase auth user id
 * so a signed-in user only ever sees their own history (mirrors `user_opportunities`,
 * which is always filtered by `user_id`).
 */
let activeRecentsUserId: string | null = null

function recentsStorageKey(): string | null {
  if (!activeRecentsUserId) return null
  return `${STORAGE_KEY_PREFIX}:${activeRecentsUserId}`
}

/**
 * Point the recents store at the currently signed-in user (or `null` when signed out).
 * Called from auth state changes so switching accounts swaps the underlying key.
 */
export function setComposerSearchRecentsUser(userId: string | null) {
  const next = userId?.trim() || null
  // Drop the pre-scoping shared key so a returning account can't read another user's history.
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
  if (next === activeRecentsUserId) return
  activeRecentsUserId = next
  notifyRecentsUpdated()
}

const FEATURE_LABELS: Record<ComposerSearchFeature, string> = {
  research: 'Research',
  'war-room': 'War Room',
  roadmap: 'Roadmap',
  'market-test': 'Market Test',
  sourcing: 'Sourcing',
  opportunities: 'Opportunities',
  scanner: 'Scanner',
}

export function composerSearchFeatureLabel(feature: ComposerSearchFeature): string {
  return FEATURE_LABELS[feature]
}

export function composerSearchFeatureFromHeroTab(
  tab: DiscoverHeroTab,
): ComposerSearchFeature | null {
  switch (tab) {
    case 'research':
      return 'research'
    case 'war-room':
      return 'war-room'
    case 'roadmap':
      return 'roadmap'
    case 'market-test':
      return 'market-test'
    case 'sourcing':
      return 'sourcing'
    case 'search':
      return 'opportunities'
    case 'scanner':
      return 'scanner'
    default:
      return null
  }
}

function notifyRecentsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COMPOSER_SEARCH_RECENTS_EVENT))
}

export function readComposerSearchRecents(): ComposerSearchRecent[] {
  const key = recentsStorageKey()
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ComposerSearchRecent[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (row) =>
          row &&
          typeof row.query === 'string' &&
          row.query.trim() &&
          typeof row.feature === 'string' &&
          typeof row.href === 'string',
      )
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

function writeComposerSearchRecents(rows: ComposerSearchRecent[]) {
  const key = recentsStorageKey()
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(rows.slice(0, MAX_RECENTS)))
    notifyRecentsUpdated()
  } catch {
    /* ignore */
  }
}

export function recordComposerSearchRecent({
  query,
  feature,
  href,
}: {
  query: string
  feature: ComposerSearchFeature
  href: string
}) {
  const trimmed = query.trim()
  if (!trimmed) return

  const existing = readComposerSearchRecents().filter(
    (row) => !(row.query === trimmed && row.feature === feature),
  )
  const next: ComposerSearchRecent = {
    id: `${feature}:${trimmed}:${Date.now()}`,
    query: trimmed,
    feature,
    href,
    at: Date.now(),
  }
  writeComposerSearchRecents([next, ...existing])
}

export function recordComposerSearchFromHeroTab(tab: DiscoverHeroTab, query: string) {
  const feature = composerSearchFeatureFromHeroTab(tab)
  if (!feature) return
  const href =
    feature === 'opportunities'
      ? `${roomPathForMode('search')}?q=${encodeURIComponent(query.trim())}`
      : roomPathForMode(tab)
  recordComposerSearchRecent({ query, feature, href })
}

export function recordResearchWorkspaceRecent({
  query,
  slug,
}: {
  query: string
  slug: string
}) {
  const trimmed = query.trim()
  const slugTrimmed = slug.trim()
  if (!trimmed || !slugTrimmed) return
  recordComposerSearchRecent({
    query: trimmed,
    feature: 'research',
    href: `/my-research/${encodeURIComponent(slugTrimmed)}`,
  })
}

/** Seeds sidebar recents from saved research when the user has none yet for Research. */
export function seedResearchWorkspaceRecentsIfEmpty(
  rows: ReadonlyArray<{ query: string; slug: string }>,
) {
  const existing = readComposerSearchRecents()
  if (existing.some((row) => row.feature === 'research')) return

  const top = rows
    .filter((row) => row.query.trim() && row.slug.trim())
    .slice(0, 8)
    .reverse()

  for (const row of top) {
    recordResearchWorkspaceRecent(row)
  }
}

export function recordScannerWorkspaceRecent({
  query,
  scanId,
}: {
  query: string
  scanId: string
}) {
  const trimmed = query.trim()
  const id = scanId.trim()
  if (!trimmed || !id) return
  recordComposerSearchRecent({
    query: trimmed,
    feature: 'scanner',
    href: scanDetailPath(id),
  })
}

/** Seeds sidebar recents from website scan history when the user has none yet for Scanner. */
export function seedScannerWorkspaceRecentsIfEmpty(
  rows: ReadonlyArray<{ query: string; scanId: string }>,
) {
  const existing = readComposerSearchRecents()
  if (existing.some((row) => row.feature === 'scanner')) return

  const top = rows
    .filter((row) => row.query.trim() && row.scanId.trim())
    .slice(0, 8)
    .reverse()

  for (const row of top) {
    recordScannerWorkspaceRecent(row)
  }
}

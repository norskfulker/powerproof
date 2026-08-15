import { discoverHeroModeFromLocation, isDiscoverHeroTabPath, type DiscoverHeroTab } from '@/lib/discoverHeroRoutes'
import { getReResearchSectionLabel, type ReResearchSectionKey } from '@/lib/reResearchSections'

/** Pending rows older than this show a “taking longer” hint (edge fn may still be running). */
export const BACKGROUND_JOB_STALE_MS = 5 * 60 * 1000

export type BackgroundJobKind = 'research' | 'playbook' | 'roadmap' | 'sourcing'

const TAB_BACKGROUND_JOB_KINDS: Record<DiscoverHeroTab, readonly BackgroundJobKind[]> = {
  search: [],
  research: ['research'],
  'war-room': ['playbook'],
  roadmap: ['roadmap'],
  sourcing: ['sourcing'],
  'market-test': [],
  scanner: [],
}

/** Which pending-job tables to poll for the current hero surface (avoids cross-tab REST fan-out). */
export function backgroundJobKindsForLocation(pathname: string, search: string): ReadonlySet<BackgroundJobKind> {
  if (!shouldPollBackgroundJobs(pathname, search)) return new Set()
  return new Set(TAB_BACKGROUND_JOB_KINDS[discoverHeroModeFromLocation(pathname, search)])
}

export function isBackgroundJobStale(createdAt: string): boolean {
  const t = Date.parse(createdAt)
  if (Number.isNaN(t)) return false
  return Date.now() - t > BACKGROUND_JOB_STALE_MS
}

export function formatReResearchSectionsLabel(sections: string[] | null | undefined): string {
  if (!sections?.length) return 'selected sections'
  const labels = sections
    .map((key) => getReResearchSectionLabel(key))
    .filter(Boolean)
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`
}

export function isReResearchJob(row: { re_research_sections?: string[] | null }): boolean {
  return Array.isArray(row.re_research_sections) && row.re_research_sections.length > 0
}

export const ACTIVE_SOURCING_TASK_STATUSES = ['pending', 'processing'] as const

/** Slug from `/my-research/:slug` when on a user research detail route. */
export function userResearchDetailSlug(pathname: string): string | null {
  const match = pathname.match(/^\/my-research\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Catalog opportunities browse — no pending-job polling or REST fan-out. */
export function shouldPollBackgroundJobs(pathname: string, search: string): boolean {
  return !isDiscoverHeroTabPath(pathname, search, 'search')
}

/** Hide the in-view pending research from global background-job polling/banners. */
export function filterActiveResearchesForPath(
  researches: { slug: string | null }[],
  pathname: string,
): typeof researches {
  const slug = userResearchDetailSlug(pathname)
  if (!slug) return researches
  return researches.filter((r) => r.slug !== slug)
}

import { isLegalPath } from '@/lib/legal'

/** Pathnames that use public marketing SEO and guest display currency. */
export const PUBLIC_MARKETING_PATHNAMES = new Set(['/blog'])

/** Public share preview: `/o/:slug` (outside `PUBLIC_MARKETING_PATHNAMES` because slug varies). */
export function isOpportunityPreviewPath(pathname: string): boolean {
  return /^\/o\/[^/]+$/.test(pathname)
}

/** Legacy catalog detail URLs — redirect to `/o/:slug` (auth-exempt for SEO consolidation). */
export function isLegacyOpportunityDetailPath(pathname: string): boolean {
  return pathname === '/opportunities' || /^\/opportunities\/[^/]+$/.test(pathname) || /^\/opportunity\/[^/]+$/.test(pathname)
}

/** Public blog index and posts (`/blog`, `/blog/:slug`). */
export function isBlogPath(pathname: string): boolean {
  return pathname === '/blog' || /^\/blog\/[^/]+$/.test(pathname)
}

/**
 * Blog, legal pages, and public opportunity previews (`/o/:slug`).
 * Used for IP-inferred guest display currency on `useCurrency` and related UX.
 */
export function isPublicMarketingPath(pathname: string): boolean {
  return (
    PUBLIC_MARKETING_PATHNAMES.has(pathname) ||
    isOpportunityPreviewPath(pathname) ||
    isLegacyOpportunityDetailPath(pathname) ||
    isBlogPath(pathname) ||
    isLegalPath(pathname)
  )
}

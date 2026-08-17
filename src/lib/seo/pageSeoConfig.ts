/**
 * Canonical SEO fallbacks for public static routes.
 * Runtime Helmet components use these as the fallback layer;
 * `useSeoSettings` / Supabase `seo_settings` may still override at runtime.
 * Build-time prerender imports the same values so meta cannot drift.
 *
 * Dynamic `/o/{slug}` and `/blog/{slug}` are intentionally excluded.
 */

export type PageSeoEntry = {
  path: string
  /** Key for `useSeoSettings` / `seo_settings.page_key` (when applicable). */
  pageKey: string
  title: string
  description: string
  canonicalPath: string
  /** Comma-separated keywords for `<meta name="keywords">`. */
  keywords?: string
  ogTitle?: string
  ogDescription?: string
  noIndex?: boolean
  /** When true, `scripts/prerender-public.ts` emits a static HTML shell for this path. */
  prerender?: boolean
}

/**
 * Static marketing + shell routes.
 */
export const PAGE_SEO_ENTRIES: PageSeoEntry[] = [
  {
    path: '/blog',
    pageKey: 'marketing_blog',
    title: 'Business Validation & Market Research Guides | PowerProof',
    description:
      'Real numbers on starting and growing a business in India — market sizing, competition, costs, and what actually works. No fluff.',
    keywords:
      'business research guides, startup validation blog, market research India blog',
    canonicalPath: '/blog',
    prerender: true,
  },
  {
    path: '/start',
    pageKey: 'start_preview',
    title: 'Free website preview | PowerProof',
    description:
      'Drop in your URL for a free SEO and market snapshot — then sign up for the full website audit.',
    keywords: 'website preview, SEO audit, competitor snapshot, PowerProof',
    canonicalPath: '/start',
  },
  {
    path: '/auth/callback',
    pageKey: 'auth_callback',
    title: 'Signing in — PowerProof',
    description: 'Completing sign in to PowerProof.',
    canonicalPath: '/auth/callback',
    noIndex: true,
    prerender: true,
  },
  {
    path: '/privacy',
    pageKey: 'privacy',
    title: 'Privacy Policy | PowerProof',
    description:
      'How PowerProof collects, uses, and protects personal information for accounts, research tools, payments, and analytics.',
    keywords: 'PowerProof privacy policy, data protection, DPDP',
    canonicalPath: '/privacy',
    prerender: true,
  },
  {
    path: '/terms',
    pageKey: 'terms',
    title: 'Terms of Service | PowerProof',
    description:
      'Terms that govern your use of PowerProof, including accounts, paid plans, AI-generated research, and acceptable use.',
    keywords: 'PowerProof terms of service, user agreement',
    canonicalPath: '/terms',
    prerender: true,
  },
  {
    path: '/room',
    pageKey: 'room',
    title: 'PowerProof Workspace',
    description: 'Your PowerProof research and execution workspace.',
    canonicalPath: '/room',
    noIndex: true,
    prerender: true,
  },
]

export const PAGE_SEO_BY_PATH: Readonly<Record<string, PageSeoEntry>> = Object.freeze(
  Object.fromEntries(PAGE_SEO_ENTRIES.map((entry) => [entry.path, entry])),
)

export const PAGE_SEO_BY_KEY: Readonly<Record<string, PageSeoEntry>> = Object.freeze(
  Object.fromEntries(PAGE_SEO_ENTRIES.map((entry) => [entry.pageKey, entry])),
)

export function getPageSeoByPath(path: string): PageSeoEntry | undefined {
  return PAGE_SEO_BY_PATH[path]
}

export function getPageSeoByKey(pageKey: string): PageSeoEntry | undefined {
  return PAGE_SEO_BY_KEY[pageKey]
}

/** Routes that receive a build-time static HTML shell. */
export const PRERENDER_PAGE_SEO_ENTRIES: PageSeoEntry[] = PAGE_SEO_ENTRIES.filter((e) => e.prerender)

/** Fallback payload shape expected by `useSeoSettings` resolvers. */
export function pageSeoToFallback(entry: PageSeoEntry): {
  title: string
  description: string
  canonicalPath: string
} {
  return {
    title: entry.title,
    description: entry.description,
    canonicalPath: entry.canonicalPath,
  }
}

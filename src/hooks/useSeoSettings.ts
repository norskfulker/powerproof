import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canSubscribeSupabaseRealtime } from '@/lib/supabaseRealtime'
import { supabase } from '@/lib/supabase'

export type SeoSettingRow = {
  id?: string
  scope: 'global' | 'page' | 'opportunity'
  page_key: string | null
  opp_slug: string | null
  title: string
  description: string | null
  canonical_path: string | null
  og_title: string | null
  og_description: string | null
  image_url: string | null
  robots_noindex: boolean
  updated_at?: string
}

export type SeoPayload = {
  title: string
  description?: string
  canonicalPath?: string
  imageUrl?: string
  noIndex?: boolean
  ogTitle?: string
  ogDescription?: string
}

export type OpportunitySeoOverrides = {
  seo_title?: string | null
  seo_description?: string | null
  seo_canonical_path?: string | null
  seo_image_url?: string | null
  seo_noindex?: boolean | null
}

const defaultGlobalSeo: SeoSettingRow = {
  scope: 'global',
  page_key: null,
  opp_slug: null,
  title: 'PowerProof Discover — India\'s Business Opportunity Platform',
  description: 'Discover curated business opportunities with setup cost, margins, and execution guidance.',
  canonical_path: '/',
  og_title: null,
  og_description: null,
  image_url: null,
  robots_noindex: false,
}

function clean<T extends string | null | undefined>(value: T): string | undefined {
  const v = String(value ?? '').trim()
  return v.length > 0 ? v : undefined
}

const SEO_SELECT =
  'id, scope, page_key, opp_slug, title, description, canonical_path, og_title, og_description, image_url, robots_noindex, updated_at'

export type UseSeoSettingsOptions = {
  /** When false, skip network — defaults only. */
  enabled?: boolean
  /** Public marketing routes: global + page scopes only. */
  marketingPages?: boolean
  /** Opportunity detail: fetch global, template, and this slug row. */
  oppSlug?: string | null
}

export function useSeoSettings(options?: UseSeoSettingsOptions) {
  const { session } = useAuth()
  const enabled = options?.enabled ?? true
  const marketingPages = options?.marketingPages ?? false
  const oppSlug = options?.oppSlug?.trim() || null

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<SeoSettingRow[]>([])

  const loadSeoSettings = useCallback(async () => {
    if (!enabled) return
    setLoading(true)

    let query = supabase.from('seo_settings').select(SEO_SELECT)

    if (oppSlug) {
      query = query.or(
        `scope.eq.global,and(scope.eq.page,page_key.eq.opportunity_detail),and(scope.eq.opportunity,opp_slug.eq.${oppSlug})`,
      )
    } else if (marketingPages) {
      query = query.or('scope.eq.global,scope.eq.page')
    } else {
      setLoading(false)
      return
    }

    const { data, error } = await query.order('scope', { ascending: true })

    if (!error) setRows((data as SeoSettingRow[]) ?? [])
    setLoading(false)
  }, [enabled, marketingPages, oppSlug])

  useEffect(() => {
    void loadSeoSettings()
  }, [loadSeoSettings])

  useEffect(() => {
    if (!enabled || !canSubscribeSupabaseRealtime(session)) return
    const channel = supabase
      .channel(`seo-settings-live-${marketingPages ? 'marketing' : oppSlug ?? 'none'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seo_settings' }, () => {
        void loadSeoSettings()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, loadSeoSettings, marketingPages, oppSlug, session])

  const seoByPageKey = useMemo(() => {
    const map = new Map<string, SeoSettingRow>()
    for (const row of rows) {
      if (row.scope === 'page' && row.page_key) map.set(row.page_key, row)
    }
    return map
  }, [rows])

  const seoByOppSlug = useMemo(() => {
    const map = new Map<string, SeoSettingRow>()
    for (const row of rows) {
      if (row.scope === 'opportunity' && row.opp_slug) map.set(row.opp_slug, row)
    }
    return map
  }, [rows])

  /** DB global row only — do not invent a synthetic global that shadows pageSeoConfig. */
  const dbGlobalSeo = useMemo(() => {
    return rows.find((r) => r.scope === 'global') ?? null
  }, [rows])

  /** Back-compat for callers that read `globalSeo` directly. */
  const globalSeo = dbGlobalSeo ?? defaultGlobalSeo

  const resolvePageSeo = useCallback(
    (pageKey: string, fallback?: SeoPayload): SeoPayload => {
      const page = seoByPageKey.get(pageKey)
      // Precedence: page row → DB global → caller fallback (pageSeoConfig) → hardcoded last resort
      const title =
        clean(page?.title) ??
        clean(dbGlobalSeo?.title) ??
        fallback?.title ??
        defaultGlobalSeo.title
      const description =
        clean(page?.description) ??
        clean(dbGlobalSeo?.description) ??
        fallback?.description
      const canonicalPath =
        clean(page?.canonical_path) ??
        clean(dbGlobalSeo?.canonical_path) ??
        fallback?.canonicalPath
      const imageUrl =
        clean(page?.image_url) ?? clean(dbGlobalSeo?.image_url) ?? fallback?.imageUrl
      const ogTitle =
        clean(page?.og_title) ?? clean(dbGlobalSeo?.og_title) ?? fallback?.ogTitle
      const ogDescription =
        clean(page?.og_description) ??
        clean(dbGlobalSeo?.og_description) ??
        fallback?.ogDescription
      return {
        title,
        description,
        canonicalPath,
        imageUrl,
        noIndex:
          page?.robots_noindex ??
          dbGlobalSeo?.robots_noindex ??
          fallback?.noIndex ??
          false,
        ogTitle,
        ogDescription,
      }
    },
    [dbGlobalSeo, seoByPageKey],
  )

  const resolveOpportunitySeo = useCallback(
    (
      pageKey: string,
      overrides: OpportunitySeoOverrides | null | undefined,
      fallback?: SeoPayload,
      oppSlug?: string | null,
    ): SeoPayload => {
      let base = resolvePageSeo(pageKey, fallback)
      const settingRow = oppSlug ? seoByOppSlug.get(oppSlug) : undefined
      if (settingRow) {
        base = {
          title: clean(settingRow.title) ?? base.title,
          description: clean(settingRow.description) ?? base.description,
          canonicalPath: clean(settingRow.canonical_path) ?? base.canonicalPath,
          imageUrl: clean(settingRow.image_url) ?? base.imageUrl,
          noIndex: settingRow.robots_noindex ?? base.noIndex,
          ogTitle: clean(settingRow.og_title) ?? base.ogTitle,
          ogDescription: clean(settingRow.og_description) ?? base.ogDescription,
        }
      }
      return {
        title: clean(overrides?.seo_title) ?? base.title,
        description: clean(overrides?.seo_description) ?? base.description,
        canonicalPath: clean(overrides?.seo_canonical_path) ?? base.canonicalPath,
        imageUrl: clean(overrides?.seo_image_url) ?? base.imageUrl,
        noIndex: overrides?.seo_noindex ?? base.noIndex ?? false,
        ogTitle: base.ogTitle,
        ogDescription: base.ogDescription,
      }
    },
    [resolvePageSeo, seoByOppSlug],
  )

  return {
    loading,
    rows,
    globalSeo,
    seoByPageKey,
    loadSeoSettings,
    resolvePageSeo,
    resolveOpportunitySeo,
  }
}

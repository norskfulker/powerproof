import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { cn } from '@/lib/utils'

type SeoPageEntryDef = { key: string; label: string }
type SeoPageGroupDef = {
  id: string
  title: string
  hint: string
  accentClass: string
  entries: SeoPageEntryDef[]
}

const SEO_PAGE_GROUPS: SeoPageGroupDef[] = [
  {
    id: 'landing',
    title: 'Landing & public preview',
    hint: 'Homepage and public opportunity preview URLs (`/o/:slug`).',
    accentClass: 'border-l-[hsl(var(--primary))]',
    entries: [
      { key: 'home', label: 'Home — /' },
      {
        key: 'opportunity_detail',
        label: 'Opportunity detail — /o/:slug (and legacy /opportunities/:slug)',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing site',
    hint: 'Public blog and other marketing surfaces.',
    accentClass: 'border-l-[hsl(var(--saffron-500))]',
    entries: [
      { key: 'marketing_blog', label: 'Blog — /blog' },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace & account',
    hint: 'Signed-in shell routes and auth callback.',
    accentClass: 'border-l-amber-700 dark:border-l-amber-600',
    entries: [
      { key: 'room', label: 'Room workspace — /room' },
      { key: 'auth_callback', label: 'Auth callback — /auth/callback' },
      { key: 'profile', label: 'Profile — /profile' },
      { key: 'analytics', label: 'Analytics — /analytics' },
    ],
  },
  {
    id: 'fallback',
    title: 'Fallback',
    hint: 'Used when no other page key matches the route.',
    accentClass: 'border-l-muted-foreground/50',
    entries: [{ key: 'default', label: 'Unmapped routes — default' }],
  },
]
type SeoSetting = {
  id?: string
  scope: 'global' | 'page' | 'opportunity'
  page_key: string | null
  opp_slug: string | null
  title: string | null
  description: string | null
  canonical_path: string | null
  og_title: string | null
  og_description: string | null
  image_url: string | null
  robots_noindex: boolean
}

const emptySeo: SeoSetting = { scope: 'global', page_key: null, opp_slug: null, title: '', description: '', canonical_path: '', og_title: '', og_description: '', image_url: '', robots_noindex: false }

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [seoRows, setSeoRows] = useState<SeoSetting[]>([])
  const [oppQuery, setOppQuery] = useState('')
  const [oppResults, setOppResults] = useState<Array<{ id: string; title: string; slug: string }>>([])
  const [selectedOpp, setSelectedOpp] = useState<{ id: string; title: string; slug: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('seo_settings').select('*')
    setSeoRows((data as SeoSetting[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const run = async () => {
      if (!oppQuery.trim()) return setOppResults([])
      const { data } = await supabase
        .from('user_opportunities')
        .select('id,title,slug')
        .eq('visibility', 'catalog')
        .or(`title.ilike.%${oppQuery.trim()}%,slug.ilike.%${oppQuery.trim()}%`)
        .limit(10)
      setOppResults((data as Array<{ id: string; title: string; slug: string }>) ?? [])
    }
    run()
  }, [oppQuery])

  const globalSeo = useMemo(() => seoRows.find((r) => r.scope === 'global') ?? emptySeo, [seoRows])
  const pageMap = useMemo(() => Object.fromEntries(seoRows.filter((r) => r.scope === 'page' && r.page_key).map((r) => [r.page_key as string, r])), [seoRows])
  const oppMap = useMemo(() => Object.fromEntries(seoRows.filter((r) => r.scope === 'opportunity' && r.opp_slug).map((r) => [r.opp_slug as string, r])), [seoRows])

  const pageOverrideIsSaved = (pageKey: string) => Boolean((pageMap[pageKey] as SeoSetting | undefined)?.id)
  const oppOverrideIsSaved = (slug: string) => Boolean((oppMap[slug] as SeoSetting | undefined)?.id)

  const saveSeo = async (row: SeoSetting) => {
    const { error } = await supabase.from('seo_settings').upsert(row)
    if (error) toast.error('Save failed', { description: error.message }); else { toast('Saved'); load() }
  }

  if (loading) return <div className="shimmer h-24 rounded-lg" />

  return (
    <>
    <div className="space-y-section-gap">
        <div className="rounded-xl border p-card-padding bg-card space-y-item-gap">
          <div className="text-section-header text-foreground">Global Defaults</div>
          <div className="space-y-item-gap">
            <label htmlFor="seo-global-title" className="text-body font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="seo-global-title"
              value={globalSeo.title ?? ''}
              onChange={(e) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', title: e.target.value }, ...prev.filter((r) => r.scope !== 'global')])}
              placeholder="Title"
            />
          </div>
          <div className="space-y-item-gap">
            <label htmlFor="seo-global-description" className="text-body font-medium text-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="seo-global-description"
              value={globalSeo.description ?? ''}
              onChange={(e) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', description: e.target.value }, ...prev.filter((r) => r.scope !== 'global')])}
              placeholder="Description"
            />
          </div>
          <div className="space-y-item-gap">
            <label htmlFor="seo-global-canonical" className="text-body font-medium text-foreground">
              Canonical path <span className="text-destructive">*</span>
            </label>
            <Input
              id="seo-global-canonical"
              value={globalSeo.canonical_path ?? ''}
              onChange={(e) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', canonical_path: e.target.value }, ...prev.filter((r) => r.scope !== 'global')])}
              placeholder="Canonical path"
            />
          </div>
          <div className="space-y-item-gap">
            <label htmlFor="seo-global-og-title" className="text-body font-medium text-foreground">
              OG title <span className="text-destructive">*</span>
            </label>
            <Input
              id="seo-global-og-title"
              value={globalSeo.og_title ?? ''}
              onChange={(e) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', og_title: e.target.value }, ...prev.filter((r) => r.scope !== 'global')])}
              placeholder="OG title"
            />
          </div>
          <div className="space-y-item-gap">
            <label htmlFor="seo-global-og-description" className="text-body font-medium text-foreground">
              OG description <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="seo-global-og-description"
              value={globalSeo.og_description ?? ''}
              onChange={(e) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', og_description: e.target.value }, ...prev.filter((r) => r.scope !== 'global')])}
              placeholder="OG description"
            />
          </div>
          <div className="space-y-item-gap">
            <span id="seo-global-image-label" className="text-body font-medium text-foreground">
              SEO image <span className="text-destructive">*</span>
            </span>
            <ImageUploader
              value={globalSeo.image_url || null}
              onChange={(v) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', image_url: v }, ...prev.filter((r) => r.scope !== 'global')])}
              bucket="opportunity-images"
              folder="branding/seo"
              label=""
            />
          </div>
          <div className="flex items-center gap-item-gap">
            <Switch
              id="seo-global-noindex"
              checked={Boolean(globalSeo.robots_noindex)}
              onCheckedChange={(v) => setSeoRows((prev) => [{ ...globalSeo, scope: 'global', robots_noindex: Boolean(v) }, ...prev.filter((r) => r.scope !== 'global')])}
            />
            <label htmlFor="seo-global-noindex" className="text-body text-muted-foreground">
              Noindex <span className="text-destructive">*</span>
            </label>
          </div>
          <Button className="min-w-[80px]" onClick={() => saveSeo({ ...globalSeo, scope: 'global', page_key: null, opp_slug: null })}>Save</Button>
        </div>
        <div className="rounded-xl border p-card-padding bg-card space-y-section-gap">
          <div>
            <div className="text-section-header text-foreground">Page overrides by area</div>
            <p className="text-body text-muted-foreground mt-1 max-w-3xl">
              Templates are grouped by product surface (landing, marketing, workspace). Each row is a{' '}
              <span className="font-mono text-xs">page_key</span> the app resolves from the URL. Badge: Present = saved override in{' '}
              <span className="font-mono text-[11px]">seo_settings</span>; Inherit = no page row yet (uses global defaults until you save).
            </p>
          </div>
          <div className="space-y-4">
            {SEO_PAGE_GROUPS.map((group) => (
              <div
                key={group.id}
                className={cn(
                  'rounded-xl border border-border-subtle bg-card/90 overflow-hidden border-l-4 shadow-[var(--shadow-sm)]',
                  group.accentClass,
                )}
              >
                <div className="border-b border-border-subtle bg-muted/30 px-4 py-3 layout-lg:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{group.title}</span>
                    <Badge variant="gray" >
                      {group.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{group.hint}</p>
                </div>
                <div className="p-2 layout-lg:p-3">
                  <Accordion type="multiple" className="w-full">
                    {group.entries.map(({ key: k, label }) => {
                      const row = (pageMap[k] as SeoSetting | undefined) ?? { ...emptySeo, scope: 'page', page_key: k }
                      const saved = pageOverrideIsSaved(k)
                      return (
                        <AccordionItem key={`${group.id}-${k}`} value={`${group.id}:${k}`}>
                          <AccordionTrigger className="text-left text-sm hover:no-underline [&>svg]:shrink-0">
                            <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 pr-2">
                              <Badge variant={saved ? 'green' : 'gray'} size="xs">
                                {saved ? 'Present' : 'Inherit'}
                              </Badge>
                              <span className="font-mono text-[11px] text-muted-foreground">{k}</span>
                              <span className="text-foreground">{label}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-item-gap pb-2">
                              <div className="space-y-item-gap">
                                <label htmlFor={`seo-page-${k}-title`} className="text-body font-medium text-foreground">
                                  Title <span className="text-destructive">*</span>
                                </label>
                                <Input
                                  id={`seo-page-${k}-title`}
                                  value={row.title ?? ''}
                                  onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, title: e.target.value }])}
                                  placeholder={`Inherits: ${globalSeo.title ?? ''}`}
                                />
                              </div>
                              <div className="space-y-item-gap">
                                <label htmlFor={`seo-page-${k}-description`} className="text-body font-medium text-foreground">
                                  Description <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  id={`seo-page-${k}-description`}
                                  value={row.description ?? ''}
                                  onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, description: e.target.value }])}
                                  placeholder={`Inherits: ${globalSeo.description ?? ''}`}
                                />
                              </div>
                              <div className="space-y-item-gap">
                                <label htmlFor={`seo-page-${k}-canonical`} className="text-body font-medium text-foreground">
                                  Canonical path <span className="text-destructive">*</span>
                                </label>
                                <Input
                                  id={`seo-page-${k}-canonical`}
                                  value={row.canonical_path ?? ''}
                                  onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, canonical_path: e.target.value }])}
                                  placeholder="Canonical path"
                                />
                              </div>
                              <div className="space-y-item-gap">
                                <label htmlFor={`seo-page-${k}-og-title`} className="text-body font-medium text-foreground">
                                  OG title <span className="text-destructive">*</span>
                                </label>
                                <Input
                                  id={`seo-page-${k}-og-title`}
                                  value={row.og_title ?? ''}
                                  onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, og_title: e.target.value }])}
                                  placeholder="OG title"
                                />
                              </div>
                              <div className="space-y-item-gap">
                                <label htmlFor={`seo-page-${k}-og-description`} className="text-body font-medium text-foreground">
                                  OG description <span className="text-destructive">*</span>
                                </label>
                                <Textarea
                                  id={`seo-page-${k}-og-description`}
                                  value={row.og_description ?? ''}
                                  onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, og_description: e.target.value }])}
                                  placeholder="OG description"
                                />
                              </div>
                              <div className="space-y-item-gap">
                                <span className="text-body font-medium text-foreground">
                                  SEO image <span className="text-destructive">*</span>
                                </span>
                                <ImageUploader
                                  value={row.image_url || null}
                                  onChange={(v) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, image_url: v }])}
                                  bucket="opportunity-images"
                                  folder="branding/seo"
                                  label=""
                                />
                              </div>
                              <div className="flex items-center gap-item-gap">
                                <Switch
                                  id={`seo-page-${k}-noindex`}
                                  checked={Boolean(row.robots_noindex)}
                                  onCheckedChange={(v) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'page' && r.page_key === k)), { ...row, robots_noindex: Boolean(v) }])}
                                />
                                <label htmlFor={`seo-page-${k}-noindex`} className="text-body text-muted-foreground">
                                  Noindex <span className="text-destructive">*</span>
                                </label>
                              </div>
                              <Button className="min-w-[80px]" onClick={() => saveSeo({ ...row, scope: 'page', page_key: k, opp_slug: null })}>Save</Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-card-padding bg-card space-y-item-gap border-l-4 border-l-teal-600 dark:border-l-teal-500">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-section-header text-foreground">Opportunity-level overrides</span>
              <Badge variant="gray" >
                opportunity
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-3xl">
              Extra SEO rows in <span className="font-mono text-[11px]">seo_settings</span> keyed by opportunity slug. Merged with the template{' '}
              <span className="font-mono text-[11px]">opportunity_detail</span> / preview and with each row&apos;s{' '}
              <span className="font-mono text-[11px]">opportunities.seo_*</span> fields. Present / Inherit uses the same rule: saved{' '}
              <span className="font-mono text-[11px]">seo_settings</span> row vs templates only.
            </p>
          </div>
          <Input value={oppQuery} onChange={(e) => setOppQuery(e.target.value)} placeholder="Search opportunities by title or slug" />
          <div className="grid layout-sm:grid-cols-2 gap-item-gap">
            {oppResults.map((opp) => (
              <button key={opp.id} type="button" className="border rounded-lg p-2 text-left" onClick={() => setSelectedOpp(opp)}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={oppOverrideIsSaved(opp.slug) ? 'green' : 'gray'} size="xs">
                    {oppOverrideIsSaved(opp.slug) ? 'Present' : 'Inherit'}
                  </Badge>
                  <div className="text-sm font-medium">{opp.title}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">{opp.slug}</div>
              </button>
            ))}
          </div>
          {selectedOpp && (() => {
            const slug = selectedOpp.slug
            const row = (oppMap[slug] as SeoSetting | undefined) ?? { ...emptySeo, scope: 'opportunity', opp_slug: slug }
            return (
              <div className="border rounded-lg p-3 space-y-item-gap">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={oppOverrideIsSaved(slug) ? 'green' : 'gray'} size="xs">
                    {oppOverrideIsSaved(slug) ? 'Present' : 'Inherit'}
                  </Badge>
                  <div className="text-sm font-medium">
                    {selectedOpp.title} <span className="text-muted-foreground font-normal">({slug})</span>
                  </div>
                </div>
                <div className="space-y-item-gap">
                  <label htmlFor={`seo-opp-${slug}-title`} className="text-body font-medium text-foreground">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`seo-opp-${slug}-title`}
                    value={row.title ?? ''}
                    onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, title: e.target.value }])}
                    placeholder={`${selectedOpp.title} — Business Opportunity in India | PowerProof`}
                  />
                </div>
                <div className="space-y-item-gap">
                  <label htmlFor={`seo-opp-${slug}-description`} className="text-body font-medium text-foreground">
                    Description <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id={`seo-opp-${slug}-description`}
                    value={row.description ?? ''}
                    onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, description: e.target.value }])}
                    placeholder={`Start a ${selectedOpp.title} business. See real financials, govt schemes, and a week-by-week launch playbook on PowerProof.`}
                  />
                </div>
                <div className="space-y-item-gap">
                  <label htmlFor={`seo-opp-${slug}-canonical`} className="text-body font-medium text-foreground">
                    Canonical path <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`seo-opp-${slug}-canonical`}
                    value={row.canonical_path ?? ''}
                    onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, canonical_path: e.target.value }])}
                    placeholder={`/o/${slug}`}
                  />
                </div>
                <div className="space-y-item-gap">
                  <label htmlFor={`seo-opp-${slug}-og-title`} className="text-body font-medium text-foreground">
                    OG title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`seo-opp-${slug}-og-title`}
                    value={row.og_title ?? ''}
                    onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, og_title: e.target.value }])}
                    placeholder="OG title"
                  />
                </div>
                <div className="space-y-item-gap">
                  <label htmlFor={`seo-opp-${slug}-og-description`} className="text-body font-medium text-foreground">
                    OG description <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id={`seo-opp-${slug}-og-description`}
                    value={row.og_description ?? ''}
                    onChange={(e) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, og_description: e.target.value }])}
                    placeholder="OG description"
                  />
                </div>
                <div className="space-y-item-gap">
                  <span className="text-body font-medium text-foreground">
                    SEO image <span className="text-destructive">*</span>
                  </span>
                  <ImageUploader
                    value={row.image_url || null}
                    onChange={(v) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, image_url: v }])}
                    bucket="opportunity-images"
                    folder="branding/seo"
                    label=""
                  />
                </div>
                <div className="flex items-center gap-item-gap">
                  <Switch
                    id={`seo-opp-${slug}-noindex`}
                    checked={Boolean(row.robots_noindex)}
                    onCheckedChange={(v) => setSeoRows((prev) => [...prev.filter((r) => !(r.scope === 'opportunity' && r.opp_slug === slug)), { ...row, robots_noindex: Boolean(v) }])}
                  />
                  <label htmlFor={`seo-opp-${slug}-noindex`} className="text-body text-muted-foreground">
                    Noindex <span className="text-destructive">*</span>
                  </label>
                </div>
                <Button className="min-w-[80px]" onClick={() => saveSeo({ ...row, scope: 'opportunity', opp_slug: slug, page_key: null })}>Save</Button>
              </div>
            )
          })()}
        </div>
    </div>
    </>
  )
}


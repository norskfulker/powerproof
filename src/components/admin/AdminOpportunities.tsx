import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { resolveOpportunityStatusChip } from '@/lib/opportunityLabels'
import { getCompletenessScore } from '@/lib/opportunityCompleteness'
import { useCurrency } from '@/hooks/useCurrency'

type OppRow = {
  id: string
  slug: string
  title: string
  category_slug: string | null
  country: string | null
  status: string | null
  badge: string | null
  badge_label: string | null
  score: number | null
  setup_min: number | null
  setup_max: number | null
  margin_pct: number | null
  monthly_rev_min: number | null
  monthly_rev_max: number | null
  monthly_profit_min: number | null
  monthly_profit_max: number | null
  payback_months_min: number | null
  payback_months_max: number | null
  headcount: any | null
  is_locked: boolean | null
  view_count: number | null
  save_count: number | null
  interested_count: number | null
  created_at: string
  hero_image_url?: string | null
  logo_url?: string | null
  tagline?: string | null
  full_desc?: string | null
  machinery_list?: any[] | null
  raw_materials?: any[] | null
  licenses_required?: any[] | null
  faqs?: any[] | null
  govt_scheme_details?: any[] | null
  market_demographics?: any | null
  financial_projections?: unknown | null
  score_breakdown?: unknown | null
  pros?: string[] | null
  cons?: string[] | null
  setup_cost_breakdown?: unknown | null
  location_suitability?: string[] | null
  state_tags?: string[] | null
  similar_slugs?: string[] | null
  target_customer_pills?: string[] | null
}

const PAGE_SIZE = 20

const getMissingDetails = (o: OppRow): string[] => {
  const missing: string[] = []
  if (!o.hero_image_url || !String(o.hero_image_url).trim()) missing.push('hero image')
  if (!o.tagline || !String(o.tagline).trim()) missing.push('tagline')
  if (!o.full_desc || String(o.full_desc).trim().length < 20) missing.push('overview')
  if (!(o.setup_min && o.setup_max)) missing.push('setup range')
  if (!(o.monthly_rev_min && o.monthly_rev_max)) missing.push('revenue range')
  if (!(o.monthly_profit_min && o.monthly_profit_max)) missing.push('profit range')
  if (!(o.payback_months_min && o.payback_months_max)) missing.push('payback')
  if (o.score == null) missing.push('score')
  if (!o.headcount || !Number((o.headcount as any)?.total ?? 0)) missing.push('team')
  if (!Array.isArray(o.machinery_list) || o.machinery_list.length === 0) missing.push('machinery')
  if (!Array.isArray(o.raw_materials) || o.raw_materials.length === 0) missing.push('materials')
  if (!Array.isArray(o.licenses_required) || o.licenses_required.length === 0) missing.push('licenses')
  if (!Array.isArray(o.faqs) || o.faqs.length === 0) missing.push('faqs')
  if (!Array.isArray(o.govt_scheme_details) || o.govt_scheme_details.length === 0) missing.push('schemes')
  if (!o.market_demographics) missing.push('demographics')
  return missing
}

const AdminOpportunities = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate()
  const { formatSetupCost, formatMoney } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [opps, setOpps] = useState<OppRow[]>([])
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([])

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [category, setCategory] = useState<'all' | string>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'score'>('created_at')
  const [page, setPage] = useState(1)
  const [missingHeroOnly, setMissingHeroOnly] = useState(false)
  const [lowScoreOnly, setLowScoreOnly] = useState(false)
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [countryFilter, setCountryFilter] = useState<'all' | string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [confirmDeleteOpp, setConfirmDeleteOpp] = useState<OppRow | null>(null)

  const load = async () => {
    setLoading(true)
    const [oppRes, catRes] = await Promise.all([
      supabase
        .from('user_opportunities')
        .select('*')
        .eq('visibility', 'catalog')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('slug,name').order('name', { ascending: true }),
    ])

    if (oppRes.error) toast('Failed to load opportunities', { description: oppRes.error.message })
    if (catRes.error) toast('Failed to load categories', { description: catRes.error.message })

    setOpps((oppRes.data as OppRow[]) ?? [])
    setCategories((catRes.data as any[])?.map(c => ({ slug: c.slug, name: c.name })) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const countryOptions = useMemo(() => {
    const s = new Set<string>()
    for (const o of opps) {
      const c = (o.country ?? '').trim()
      if (c) s.add(c)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [opps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let items = [...opps]
    if (q) {
      items = items.filter((o) =>
        `${o.title ?? ''} ${o.slug ?? ''} ${o.category_slug ?? ''} ${o.country ?? ''}`.toLowerCase().includes(q),
      )
    }
    if (status !== 'all') items = items.filter(o => (o.status ?? '') === status)
    if (category !== 'all') items = items.filter(o => (o.category_slug ?? '') === category)
    if (countryFilter !== 'all') items = items.filter((o) => (o.country ?? '') === countryFilter)
    if (missingHeroOnly) {
      items = items.filter((o) => !o.hero_image_url || String(o.hero_image_url).trim() === '')
    }
    if (lowScoreOnly) {
      items = items.filter((o) => (o.score ?? 0) < 55)
    }
    if (incompleteOnly) {
      items = items.filter((o) => getCompletenessScore(o as Record<string, unknown>).score < 80)
    }

    const sorters: Record<typeof sortBy, (a: OppRow, b: OppRow) => number> = {
      created_at: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      title: (a, b) => (a.title ?? '').localeCompare(b.title ?? ''),
      score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
    }
    items.sort(sorters[sortBy])

    return items
  }, [opps, search, status, category, sortBy, countryFilter, missingHeroOnly, lowScoreOnly, incompleteOnly])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, status, category, sortBy, countryFilter, missingHeroOnly, lowScoreOnly, incompleteOnly])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [search, status, category, countryFilter, missingHeroOnly, lowScoreOnly, incompleteOnly, sortBy])

  const toggleStatus = async (o: OppRow) => {
    const nextStatus = o.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('user_opportunities')
      .update({ status: nextStatus })
      .eq('id', o.id)
      .eq('visibility', 'catalog')
    if (error) {
      toast('Update failed', { description: error.message })
      return
    }
    setOpps(prev => prev.map(x => (x.id === o.id ? { ...x, status: nextStatus } : x)))
    toast('✓ Updated', { description: `${o.title} → ${nextStatus}` })
  }

  const bulkUpdate = async (ids: string[], patch: Record<string, unknown>) => {
    if (ids.length === 0) return
    const { error } = await supabase
      .from('user_opportunities')
      .update(patch)
      .in('id', ids)
      .eq('visibility', 'catalog')
    if (error) {
      toast('Bulk update failed', { description: error.message })
      return
    }
    setOpps((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, ...patch } : x)))
    setSelectedIds(new Set())
    toast('✓ Bulk update', { description: `${ids.length} opportunity(ies) updated` })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectPage = () => {
    const ids = pageItems.map((o) => o.id)
    const allOnPage = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPage) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const doDeleteOpp = async () => {
    if (!confirmDeleteOpp) return
    const o = confirmDeleteOpp
    setConfirmDeleteOpp(null)
    const { error } = await supabase
      .from('user_opportunities')
      .delete()
      .eq('id', o.id)
      .eq('visibility', 'catalog')
    if (error) {
      toast('Delete failed', { description: error.message })
      return
    }
    setOpps(prev => prev.filter(x => x.id !== o.id))
    toast('✓ Deleted', { description: o.title })
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900">Opportunities</h1>
            <div className="text-[13px] text-gray-600">{opps.length} total</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={load}
              variant="secondary"
              size="md"
              style={{ boxShadow: 'none' }}
            >
              Refresh
            </Button>
            <Button as="link" to="/admin/opportunities/new" variant="primary" size="md">
              Add New Opportunity
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={load} variant="secondary" size="md" style={{ boxShadow: 'none' }}>
            Refresh
          </Button>
          <Button as="link" to="/admin/opportunities/new" variant="primary" size="md">
            Add New Opportunity
          </Button>
        </div>
      )}

      <div className="bg-background rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or slug..."
          className="border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-[260px] bg-background"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border border-border-default rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Status: All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-border-default rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Category: All</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border border-border-default rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="created_at">Sort: Created At</option>
          <option value="title">Sort: Title</option>
          <option value="score">Sort: Score</option>
        </select>

        {countryOptions.length > 0 && (
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="border border-border-default rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Country: All</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={missingHeroOnly}
            onChange={(e) => setMissingHeroOnly(e.target.checked)}
            className="rounded border-border-default"
          />
          Missing hero
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowScoreOnly}
            onChange={(e) => setLowScoreOnly(e.target.checked)}
            className="rounded border-border-default"
          />
          Score &lt; 55
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incompleteOnly}
            onChange={(e) => setIncompleteOnly(e.target.checked)}
            className="rounded border-border-default"
          />
          Incomplete (&lt;80%)
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm">
          <span className="font-semibold text-gray-800">{selectedIds.size} selected</span>
          {[
            { label: 'Set status: Published', patch: { status: 'published' } },
            { label: 'Set status: Draft', patch: { status: 'draft' } },
            { label: 'Badge: trending', patch: { badge: 'trending' } },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => void bulkUpdate([...selectedIds], a.patch)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-background text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="bg-background rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[36px_2fr_1.1fr_0.7fr_0.55fr_0.55fr_1fr_0.6fr_1.1fr_0.9fr_0.7fr_0.7fr_0.7fr_1.4fr_1.2fr] gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={pageItems.length > 0 && pageItems.every((o) => selectedIds.has(o.id))}
              onChange={toggleSelectPage}
              aria-label="Select page"
              className="rounded border-border-default"
            />
          </div>
          <div>Title</div>
          <div>Category</div>
          <div>Status</div>
          <div>Score</div>
          <div>%</div>
          <div>Setup Cost</div>
          <div>Margin</div>
          <div>Monthly Rev</div>
          <div>Breakeven</div>
          <div>Team</div>
          <div>Views</div>
          <div>Interest</div>
          <div>Missing</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : pageItems.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No results.</div>
        ) : (
          pageItems.map((o) => (
            (() => {
              const missing = getMissingDetails(o)
              const { score: completeScore, missing: completeMissing } = getCompletenessScore(o as Record<string, unknown>)
              const completeColor =
                completeScore >= 80 ? 'text-success' : completeScore >= 50 ? 'text-warning' : 'text-destructive'
              const chip = resolveOpportunityStatusChip(o.badge, o.badge_label)
              return (
            <div
              key={o.id}
              className="grid grid-cols-[36px_2fr_1.1fr_0.7fr_0.55fr_0.55fr_1fr_0.6fr_1.1fr_0.9fr_0.7fr_0.7fr_0.7fr_1.4fr_1.2fr] gap-3 px-4 py-3 text-sm border-b border-gray-100 items-center"
            >
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                  aria-label={`Select ${o.title}`}
                  className="rounded border-border-default"
                />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{o.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] text-gray-500 font-semibold truncate">/{o.slug}</span>
                  {chip ? (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-gray-200"
                      style={{ background: chip.bg, color: chip.color }}
                      title={o.badge ?? undefined}
                    >
                      {chip.label}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-gray-700 truncate">
                {categories.find(c => c.slug === o.category_slug)?.name ?? o.category_slug ?? '—'}
              </div>
              <div className="text-gray-700">{o.status ?? '—'}</div>
              <div className="font-semibold text-gray-900">{o.score ?? '—'}</div>
              <div className="font-semibold">
                <span
                  className={`text-xs font-bold ${completeColor}`}
                  title={completeMissing.length ? `Missing: ${completeMissing.join(', ')}` : 'Complete'}
                >
                  {completeScore}%
                </span>
              </div>
              <div className="font-semibold text-gray-900 text-[12px]">
                {o.setup_min && o.setup_max ? formatSetupCost(o.setup_min, o.setup_max) : '—'}
              </div>
              <div className="font-semibold text-gray-900">{o.margin_pct === null || o.margin_pct === undefined ? '—' : `${o.margin_pct}%`}</div>
              <div className="font-semibold text-gray-900 text-[12px]">
                {o.monthly_rev_min && o.monthly_rev_max
                  ? `${formatMoney(o.monthly_rev_min)}–${formatMoney(o.monthly_rev_max)}`
                  : '—'}
              </div>
              <div className="font-semibold text-gray-900 text-[12px]">
                {o.payback_months_min && o.payback_months_max ? `${o.payback_months_min}-${o.payback_months_max} mo` : '—'}
              </div>
              <div className="font-semibold text-gray-900 text-[12px]">
                {o.headcount?.total ? `${o.headcount.total} ppl` : '—'}
              </div>
              <div className="font-semibold text-gray-500">—</div>
              <div className="font-semibold text-gray-500">—</div>
              <div className="min-w-0">
                {missing.length === 0 ? (
                  <span className="text-[11px] font-semibold text-success bg-success-bg border border-success-bg px-2 py-1 rounded-md">
                    Complete
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[11px] font-semibold text-warning bg-warning-bg border border-saffron-100 px-2 py-1 rounded-md">
                      {missing.length} missing
                    </span>
                    {missing.slice(0, 2).map((m) => (
                      <span key={m} className="text-[10px] text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                        {m}
                      </span>
                    ))}
                    {missing.length > 2 && (
                      <span className="text-[10px] text-gray-500">+{missing.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/opportunities/${o.id}`)}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(o)}
                  className="text-gray-700 hover:underline text-sm"
                >
                  Toggle
                </button>
                <button type="button" onClick={() => setConfirmDeleteOpp(o)} className="text-destructive hover:underline text-sm">
                  Delete
                </button>
              </div>
            </div>
              )
            })()
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          Page {page} of {totalPages} ({filtered.length} results)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-lg border border-border-default bg-background disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-2 rounded-lg border border-border-default bg-background disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmDeleteOpp}
        title={`Delete "${confirmDeleteOpp?.title ?? ''}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void doDeleteOpp()}
        onCancel={() => setConfirmDeleteOpp(null)}
      />
    </div>
  )
}

export default AdminOpportunities

/**
 * Admin opportunity editor: prioritized checklist of missing / weak fields.
 * Aligns with editable public-catalog fields on `public.user_opportunities`.
 */
import { COMPLETENESS_SCROLL_TARGETS, getCompletenessScore } from '@/lib/opportunityCompleteness'

export type EditorChecklistPriority = 'p0' | 'p1' | 'p2'

export type EditorChecklistItem = {
  id: string
  label: string
  priority: EditorChecklistPriority
  done: boolean
  tab: string
  anchorId: string
  hint?: string
  /** When set, "Jump" navigates here (related admin surface, e.g. Playbook). */
  navigateTo?: string
}

function safeParseJson<T = Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null
  if (typeof v === 'object' && !Array.isArray(v)) return v as T
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

/** High-impact rows from opportunityCompleteness (weight 10 or 5 in original scoring). */
const COMPLETENESS_P1_LABELS = new Set([
  'Revenue & Profit',
  'Score Breakdown',
  'Financial Projections',
  'Full Description',
  'FAQs',
  'Pros & Cons',
  'Rent Profile',
  'Headcount',
  'Govt Scheme Details',
  'Setup Cost Breakdown',
  'Licenses Required',
  'Location Suitability',
])

function completenessTarget(label: string): { tab: string; anchorId: string } {
  return COMPLETENESS_SCROLL_TARGETS[label] ?? { tab: 'core', anchorId: 'sec-core-identity' }
}

/**
 * Returns checklist rows (including done rows) for counts; filter `.done` for "missing only".
 */
export function getAdminOpportunityEditorChecklist(
  form: Record<string, unknown> | null | undefined,
): EditorChecklistItem[] {
  const out: EditorChecklistItem[] = []
  const seen = new Set<string>()
  const add = (row: EditorChecklistItem) => {
    if (seen.has(row.id)) return
    seen.add(row.id)
    out.push(row)
  }

  if (!form) return out

  // --- P0: launch / detail-page blockers (matches editor "publish" bar intent) ---
  const p0 = (id: string, label: string, done: boolean, tab: string, anchorId: string, hint?: string) =>
    add({ id, label, priority: 'p0', done, tab, anchorId, hint })

  p0(
    'title',
    'Title',
    Boolean(form.title && String(form.title).trim()),
    'core',
    'sec-core-identity',
  )
  p0(
    'slug',
    'Slug',
    Boolean(form.slug && String(form.slug).trim()),
    'core',
    'sec-core-identity',
  )
  p0('category', 'Category', Boolean(form.category_slug), 'core', 'sec-core-identity')
  p0(
    'tagline',
    'Tagline',
    Boolean(form.tagline && String(form.tagline).trim()),
    'core',
    'sec-core-identity',
  )
  p0(
    'full_desc',
    'Overview (full description)',
    Boolean(form.full_desc && String(form.full_desc).trim().length >= 80),
    'content',
    'sec-full-desc',
  )
  p0(
    'setup_range',
    'Setup investment range',
    Boolean(form.setup_min != null && form.setup_max != null),
    'financials',
    'sec-investment',
  )
  p0(
    'revenue_range',
    'Monthly revenue range',
    Boolean(form.monthly_rev_min != null && form.monthly_rev_max != null),
    'financials',
    'sec-revenue',
  )
  p0(
    'profit_range',
    'Monthly profit range',
    Boolean(form.monthly_profit_min != null && form.monthly_profit_max != null),
    'financials',
    'sec-profit',
  )
  p0(
    'payback',
    'Payback range (months)',
    Boolean(form.payback_months_min != null && form.payback_months_max != null),
    'financials',
    'sec-breakeven',
  )
  p0('score', 'Fit score (headline)', form.score != null && Number.isFinite(Number(form.score)), 'financials', 'sec-fit-score')

  p0('hero', 'Hero image', Boolean(form.hero_image_url), 'core', 'sec-hero-image')

  const machinery = Array.isArray(form.machinery_list) ? form.machinery_list : []
  p0('machinery', 'Machinery list', machinery.length > 0, 'setup-cost-breakdown', 'sec-machinery')

  const raws = Array.isArray(form.raw_materials) ? form.raw_materials : []
  p0('raw_materials', 'Raw materials', raws.length > 0, 'setup-cost-breakdown', 'sec-machinery')

  const licenses = Array.isArray(form.licenses_required) ? form.licenses_required : []
  p0('licenses', 'Licenses required (list)', licenses.length > 0, 'compliance', 'sec-licenses')

  const faqs = form.faqs
  const faqsOk = Array.isArray(faqs) ? faqs.length > 0 : Boolean(faqs)
  p0('faqs', 'FAQs', faqsOk, 'content', 'sec-faqs')

  const md = safeParseJson<Record<string, unknown>>(form.market_demographics)
  if (!md) {
    p0('market_demographics', 'Market demographics', false, 'competition', 'sec-competition')
  } else {
    const hasAny = (k: string) => md[k] != null && String(md[k]).trim() !== ''
    p0('market_size_cr', 'Market size (₹ Cr)', hasAny('market_size_cr'), 'competition', 'sec-competition')
    p0('market_cagr', 'Market CAGR', hasAny('market_cagr'), 'competition', 'sec-competition')
  }

  if (licenses.length > 0) {
    const incomplete = licenses.some((l: Record<string, unknown>) => {
      const nameOk = String(l?.name ?? '').trim().length > 0
      const authOk = String(l?.authority ?? '').trim().length > 0
      return !(nameOk && authOk)
    })
    p0(
      'licenses_rows',
      'License rows (name + authority)',
      !incomplete,
      'compliance',
      'sec-licenses',
      'Each license needs name and authority.',
    )
  }

  if (raws.length > 0) {
    const incomplete = raws.some((r: Record<string, unknown>) => String(r?.name ?? '').trim().length === 0)
    p0(
      'raw_material_rows',
      'Raw material rows (name)',
      !incomplete,
      'setup-cost-breakdown',
      'sec-machinery',
    )
  }

  // --- P1: strong detail quality ---
  const p1 = (id: string, label: string, done: boolean, tab: string, anchorId: string, hint?: string) =>
    add({ id, label, priority: 'p1', done, tab, anchorId, hint })

  p1(
    'tagline',
    'Tagline',
    Boolean(form.tagline && String(form.tagline).trim().length >= 20),
    'content',
    'sec-full-desc',
    'Punchy one-liner for cards and SEO snippets.',
  )

  const breakdown = form.score_breakdown
  const breakdownOk =
    breakdown != null &&
    typeof breakdown === 'object' &&
    !Array.isArray(breakdown) &&
    Object.keys(breakdown as object).length > 0
  p1('score_breakdown', 'Fit score breakdown JSON', breakdownOk, 'financials', 'sec-fit-score')

  p1(
    'financial_projections',
    'Financial projections',
    Boolean(form.financial_projections),
    'financials',
    'sec-financial-projections',
  )

  const competitors = form.competitors
  const compOk =
    (Array.isArray(competitors) && competitors.length > 0) ||
    (competitors && typeof competitors === 'object' && !Array.isArray(competitors) && Object.keys(competitors).length > 0)
  p1('competitors', 'Competitors', Boolean(compOk), 'competition', 'sec-competition')

  const trend = form.market_trend_5yr
  const trendOk =
    trend != null &&
    (typeof trend === 'string' ? trend.trim().length > 0 : typeof trend === 'object' && Object.keys(trend as object).length > 0)
  p1('market_trend_5yr', '5-year market trend', Boolean(trendOk), 'competition', 'sec-competition')

  // DB column present on opportunities (optional narrative / signals).
  const mi = form.market_intelligence
  const miOk = mi != null && (typeof mi === 'object' ? Object.keys(mi as object).length > 0 : String(mi).trim().length > 0)
  p1('market_intelligence', 'Market intelligence (JSON)', Boolean(miOk), 'competition', 'sec-competition', 'Column on opportunities; not yet a dedicated editor tab.')

  /** Already covered by explicit P0 / P1 rows above (avoid duplicate chips). */
  const SKIP_COMPLETENESS_LABELS = new Set([
    'Full Description',
    'FAQs',
    'Revenue & Profit',
    'Licenses Required',
    'Machinery List',
  ])

  const { missing: completenessMissing } = getCompletenessScore(form)
  for (const label of completenessMissing) {
    if (SKIP_COMPLETENESS_LABELS.has(label)) continue
    const id = `comp:${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    if (seen.has(id)) continue
    const priority: EditorChecklistPriority = COMPLETENESS_P1_LABELS.has(label) ? 'p1' : 'p2'
    const t = completenessTarget(label)
    add({
      id,
      label,
      priority,
      done: false,
      tab: t.tab,
      anchorId: t.anchorId,
    })
  }

  // --- P2: SEO / polish ---
  const p2 = (id: string, label: string, done: boolean, tab: string, anchorId: string, hint?: string) =>
    add({ id, label, priority: 'p2', done, tab, anchorId, hint })

  p2(
    'seo_title',
    'SEO title',
    Boolean(form.seo_title && String(form.seo_title).trim()),
    'other',
    'sec-seo-extra',
    'Optional; often edited via Core JSON or Other tab.',
  )
  p2(
    'seo_description',
    'SEO description',
    Boolean(form.seo_description && String(form.seo_description).trim()),
    'other',
    'sec-seo-extra',
  )

  return out
}

export function groupChecklistByPriority(items: EditorChecklistItem[]) {
  const pending = items.filter((i) => !i.done)
  return {
    p0: pending.filter((i) => i.priority === 'p0'),
    p1: pending.filter((i) => i.priority === 'p1'),
    p2: pending.filter((i) => i.priority === 'p2'),
    doneCount: items.filter((i) => i.done).length,
    total: items.length,
  }
}

import { supabase } from '@/lib/supabase'
import { fuzzyScore } from '@/lib/fuzzy'
import { SETUP_BUDGET_USD } from '@/lib/opportunityBudgetUsd'
import type { DiscoverFilters } from '@/types/discovery'

export const PUBLIC_CATALOG_EXCLUDED_SLUG = 'ancggh'
const PUBLIC_CATALOG_PAGE_SIZE = 1000

export type PublicCatalogFeedRow = {
  id: string
  slug: string
  title: string
  tagline?: string | null
  full_desc?: string | null
  country?: string | null
  category_slug?: string | null
  setup_min?: number | null
  setup_max?: number | null
  monthly_rev_min?: number | null
  monthly_rev_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
  margin_pct?: number | null
  score?: number | null
  ease?: string | null
  created_at?: string | null
}

export type PublicCatalogFacetRow = Pick<
  PublicCatalogFeedRow,
  'category_slug' | 'setup_min' | 'setup_max'
>

const PUBLIC_CATALOG_FEED_SELECT = [
  'id',
  'slug',
  'title',
  'tagline',
  'full_desc',
  'country',
  'category_slug',
  'setup_min',
  'setup_max',
  'monthly_rev_min',
  'monthly_rev_max',
  'monthly_profit_min',
  'monthly_profit_max',
  'margin_pct',
  'score',
  'ease',
  'created_at',
].join(',')

function numeric(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function setupLow(row: PublicCatalogFeedRow): number {
  return numeric(row.setup_min)
}

function setupHigh(row: PublicCatalogFeedRow): number {
  return numeric(row.setup_max ?? row.setup_min)
}

function derivedMargin(row: PublicCatalogFeedRow): number {
  const stored = numeric(row.margin_pct)
  if (stored > 0) return stored
  const revenue = numeric(row.monthly_rev_max ?? row.monthly_rev_min)
  const profit = numeric(row.monthly_profit_max ?? row.monthly_profit_min)
  return revenue > 0 && profit > 0 ? (profit / revenue) * 100 : 0
}

function matchesBudget(row: PublicCatalogFeedRow, budget: DiscoverFilters['budget']): boolean {
  if (budget === 'all') return true
  const low = setupLow(row)
  const high = setupHigh(row)
  if (budget === 'under_1l') return high <= SETUP_BUDGET_USD.under1lMax
  if (budget === '1l_5l') {
    return low <= SETUP_BUDGET_USD.l1to5Max && high >= SETUP_BUDGET_USD.l1to5Min
  }
  if (budget === '5l_20l') {
    return low <= SETUP_BUDGET_USD.l5to20Max && high >= SETUP_BUDGET_USD.l5to20Min
  }
  return low >= SETUP_BUDGET_USD.above20Min
}

function searchScore(row: PublicCatalogFeedRow, search: string): number {
  const term = search.trim()
  if (!term) return 0
  const haystacks = [row.title, row.tagline, row.full_desc]
  return Math.max(
    ...haystacks.map((value) => fuzzyScore(String(value ?? ''), term)),
  )
}

function sortRows(
  rows: PublicCatalogFeedRow[],
  sort: DiscoverFilters['sort'],
  search: string,
): PublicCatalogFeedRow[] {
  return [...rows].sort((a, b) => {
    if (search.trim()) {
      const matchDelta = searchScore(b, search) - searchScore(a, search)
      if (matchDelta !== 0) return matchDelta
    }
    if (sort === 'setup_asc') return setupLow(a) - setupLow(b)
    if (sort === 'margin_desc') return derivedMargin(b) - derivedMargin(a)
    const scoreDelta = numeric(b.score) - numeric(a.score)
    if (scoreDelta !== 0) return scoreDelta
    return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  })
}

export async function fetchPublicCatalogRows(): Promise<PublicCatalogFeedRow[]> {
  const rows: PublicCatalogFeedRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('user_opportunities')
      .select(PUBLIC_CATALOG_FEED_SELECT)
      .eq('visibility', 'catalog')
      .eq('status', 'published')
      .eq('research_status', 'complete')
      .neq('slug', PUBLIC_CATALOG_EXCLUDED_SLUG)
      .order('created_at', { ascending: false })
      .range(offset, offset + PUBLIC_CATALOG_PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as PublicCatalogFeedRow[]
    rows.push(...page)
    if (page.length < PUBLIC_CATALOG_PAGE_SIZE) break
    offset += PUBLIC_CATALOG_PAGE_SIZE
  }

  return rows
}

export async function fetchPublicCatalogFacetRows(
  categorySlug?: string,
): Promise<PublicCatalogFacetRow[]> {
  const rows: PublicCatalogFacetRow[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from('user_opportunities')
      .select('category_slug,setup_min,setup_max')
      .eq('visibility', 'catalog')
      .eq('status', 'published')
      .eq('research_status', 'complete')
      .neq('slug', PUBLIC_CATALOG_EXCLUDED_SLUG)
      .range(offset, offset + PUBLIC_CATALOG_PAGE_SIZE - 1)

    if (categorySlug) query = query.eq('category_slug', categorySlug)
    const { data, error } = await query
    if (error) throw error
    const page = (data ?? []) as PublicCatalogFacetRow[]
    rows.push(...page)
    if (page.length < PUBLIC_CATALOG_PAGE_SIZE) break
    offset += PUBLIC_CATALOG_PAGE_SIZE
  }

  return rows
}

export async function fetchPublicCatalogFeedPage(
  filters: DiscoverFilters,
  search: string,
  page: number,
  pageSize: number,
): Promise<{ rows: PublicCatalogFeedRow[]; totalCount: number }> {
  const term = search.trim().toLocaleLowerCase()
  const allRows = await fetchPublicCatalogRows()
  const filtered = allRows.filter((row) => {
    if (filters.category !== 'all' && row.category_slug !== filters.category) return false
    if (!matchesBudget(row, filters.budget)) return false
    if (!term) return true
    // Global / catalog search matches titles only (not tagline or description).
    return String(row.title ?? '')
      .toLocaleLowerCase()
      .includes(term)
  })
  const sorted = sortRows(filtered, filters.sort, search)
  const from = Math.max(0, page) * pageSize
  return {
    rows: sorted.slice(from, from + pageSize),
    totalCount: sorted.length,
  }
}

export function derivePublicCatalogMargin(row: PublicCatalogFeedRow): number | null {
  const margin = derivedMargin(row)
  return margin > 0 ? Math.round(margin) : null
}

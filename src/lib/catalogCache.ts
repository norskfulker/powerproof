import type { FilterOptions } from '@/hooks/useFilterOptions'
import {
  fetchPublicCatalogFacetRows,
  type PublicCatalogFacetRow,
} from '@/lib/publicCatalog'
import { SETUP_BUDGET_USD } from '@/lib/opportunityBudgetUsd'

export type CategoryCountRow = {
  category_slug?: string
  opportunity_count?: number
}

let categoryCountsCache: CategoryCountRow[] | null = null
let categoryCountsInflight: Promise<CategoryCountRow[]> | null = null
let facetRowsCache: PublicCatalogFacetRow[] | null = null
let facetRowsInflight: Promise<PublicCatalogFacetRow[]> | null = null

let globalFilterOptionsCache: FilterOptions | null = null
let globalFilterOptionsInflight: Promise<FilterOptions | null> | null = null

const categoryFilterOptionsCache = new Map<string, FilterOptions>()
const categoryFilterOptionsInflight = new Map<string, Promise<FilterOptions | null>>()

function loadFacetRows(): Promise<PublicCatalogFacetRow[]> {
  if (facetRowsCache) return Promise.resolve(facetRowsCache)
  if (!facetRowsInflight) {
    facetRowsInflight = fetchPublicCatalogFacetRows()
      .then((rows) => {
        facetRowsCache = rows
        return rows
      })
      .finally(() => {
        facetRowsInflight = null
      })
  }
  return facetRowsInflight
}

function finiteAmount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function buildFilterOptions(rows: PublicCatalogFacetRow[]): FilterOptions {
  const bounds = rows.map((row) => ({
    min: finiteAmount(row.setup_min),
    max: finiteAmount(row.setup_max ?? row.setup_min),
  }))
  const positive = bounds.flatMap(({ min, max }) => [min, max]).filter((value) => value > 0)
  return {
    has_under_1l: bounds.some(({ max }) => max > 0 && max <= SETUP_BUDGET_USD.under1lMax),
    has_1l_5l: bounds.some(
      ({ min, max }) =>
        min <= SETUP_BUDGET_USD.l1to5Max && max >= SETUP_BUDGET_USD.l1to5Min,
    ),
    has_5l_20l: bounds.some(
      ({ min, max }) =>
        min <= SETUP_BUDGET_USD.l5to20Max && max >= SETUP_BUDGET_USD.l5to20Min,
    ),
    has_above_20l: bounds.some(({ min }) => min >= SETUP_BUDGET_USD.above20Min),
    min_budget: positive.length > 0 ? Math.min(...positive) : 0,
    max_budget: positive.length > 0 ? Math.max(...positive) : 0,
  }
}

/** Public catalog category counts — cached for the session. */
export async function getCategoryCounts(): Promise<CategoryCountRow[]> {
  if (categoryCountsCache) return categoryCountsCache
  if (!categoryCountsInflight) {
    categoryCountsInflight = loadFacetRows()
      .then((rows) => {
        const counts = new Map<string, number>()
        for (const row of rows) {
          const slug = String(row.category_slug ?? '').trim()
          if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
        }
        categoryCountsCache = [...counts.entries()].map(
          ([category_slug, opportunity_count]) => ({
            category_slug,
            opportunity_count,
          }),
        )
        return categoryCountsCache
      })
      .finally(() => {
        categoryCountsInflight = null
      })
  }
  return categoryCountsInflight
}

export async function getGlobalFilterOptions(): Promise<FilterOptions | null> {
  if (globalFilterOptionsCache) return globalFilterOptionsCache
  if (!globalFilterOptionsInflight) {
    globalFilterOptionsInflight = loadFacetRows()
      .then((rows) => {
        globalFilterOptionsCache = buildFilterOptions(rows)
        return globalFilterOptionsCache
      })
      .finally(() => {
        globalFilterOptionsInflight = null
      })
  }
  return globalFilterOptionsInflight
}

export async function getCategoryFilterOptions(
  categorySlug: string,
): Promise<FilterOptions | null> {
  const cached = categoryFilterOptionsCache.get(categorySlug)
  if (cached) return cached

  let inflight = categoryFilterOptionsInflight.get(categorySlug)
  if (!inflight) {
    inflight = loadFacetRows()
      .then((rows) => {
        const options = buildFilterOptions(
          rows.filter((row) => row.category_slug === categorySlug),
        )
        categoryFilterOptionsCache.set(categorySlug, options)
        return options
      })
      .finally(() => {
        categoryFilterOptionsInflight.delete(categorySlug)
      })
    categoryFilterOptionsInflight.set(categorySlug, inflight)
  }
  return inflight
}

/** Fire public catalog reads — call only when the opportunities tab is active. */
export function warmCatalogCache() {
  void getCategoryCounts().catch(() => {
    // The active category consumer owns the visible error state.
  })
}

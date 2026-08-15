import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Filter,
  Loader2,
  PackageSearch,
  ShieldCheck,
} from '@/lib/icons'

import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/button'
import { SourcingSupplierCardGrid } from '@/components/sourcing/SourcingSupplierCardGrid'
import { NotFoundState } from '@/components/NotFoundState'
import { internalPageSectionFrameClass } from '@/components/shared/InternalPageDataTabs'
import { useAuth } from '@/contexts/AuthContext'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { landingSignInTo } from '@/lib/authLanding'
import {
  collectSourcingCards,
  countCardsBySource,
  DEFAULT_SOURCING_RESULTS_FILTERS,
  type SourcingResultsFilters,
} from '@/lib/sourcingFilters'
import { SORT_OPTIONS, type SourcingSortKey } from '@/lib/sourcingMerge'
import {
  sourcingProductPath,
  sourcingRoomPath,
  sourcingSearchResultsPath,
} from '@/lib/sourcingRoutes'
import { formatHistoryBudget, formatSourcingTimestamp } from '@/lib/sourcingHistoryDetails'
import { SOURCE_META, SOURCE_ORDER, type SourcingCard, type SourcingHistoryRow, type SourcingSourceKey } from '@/lib/sourcingTypes'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { SourcingProductLocationState } from '@/pages/sourcing/SourcingProductPage'

const PAGE_SIZE = 24

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border-subtle bg-background text-foreground/80 hover:border-primary/30 hover:bg-primary/5',
      )}
    >
      {active ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
      <span>{children}</span>
      {count != null ? (
        <span className="tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </button>
  )
}

export default function SourcingSearchResultsPage() {
  const { searchId } = useParams<{ searchId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setTrail } = useNavbarTrail()

  const [primary, setPrimary] = useState<SourcingHistoryRow | null>(null)
  const [allRows, setAllRows] = useState<SourcingHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filters, setFilters] = useState<SourcingResultsFilters>(DEFAULT_SOURCING_RESULTS_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setTrail(primary?.keyword ? `Source · ${primary.keyword}` : 'Source products')
    return () => setTrail(null)
  }, [primary?.keyword, setTrail])

  const load = useCallback(async () => {
    if (!searchId || !user?.id) return
    setLoading(true)
    setNotFound(false)

    const [primaryRes, listRes] = await Promise.all([
      supabase
        .from('sourcing_search_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('search_id', searchId)
        .maybeSingle(),
      supabase
        .from('sourcing_search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(50),
    ])

    if (primaryRes.error || !primaryRes.data) {
      setPrimary(null)
      setNotFound(true)
      setAllRows([])
      setLoading(false)
      return
    }

    setPrimary(primaryRes.data as SourcingHistoryRow)
    setAllRows((listRes.data as SourcingHistoryRow[]) ?? [])
    setNotFound(false)
    setLoading(false)
  }, [searchId, user?.id])

  useEffect(() => {
    if (!searchId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    if (!user?.id) {
      navigate(landingSignInTo(sourcingSearchResultsPath(searchId)), { replace: true })
      return
    }
    void load()
  }, [load, navigate, searchId, user?.id])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setFilters(DEFAULT_SOURCING_RESULTS_FILTERS)
  }, [searchId])

  const unfilteredForCounts = useMemo(() => {
    if (!primary) return []
    return collectSourcingCards(primary, allRows, {
      ...filters,
      sources: null,
      verifiedOnly: false,
      sort: 'recommended',
    })
  }, [primary, allRows, filters.includeAllSearches])

  const sourceCounts = useMemo(
    () => countCardsBySource(unfilteredForCounts),
    [unfilteredForCounts],
  )

  const displayCards = useMemo(() => {
    if (!primary) return []
    return collectSourcingCards(primary, allRows, filters)
  }, [primary, allRows, filters])

  const visibleCards = displayCards.slice(0, visibleCount)
  const otherSearches = allRows.filter((r) => r.search_id !== searchId)

  const openProduct = (card: SourcingCard) => {
    if (!primary) return
    const state: SourcingProductLocationState = {
      card,
      keyword: primary.keyword,
    }
    navigate(sourcingProductPath(primary.search_id, card), { state })
  }

  const toggleSource = (source: SourcingSourceKey) => {
    setFilters((prev) => {
      const next = new Set(prev.sources ?? [])
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return {
        ...prev,
        sources: next.size === 0 ? null : next,
      }
    })
    setVisibleCount(PAGE_SIZE)
  }

  const filterPanel = (
    <aside className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
      </div>

      <FilterSection title="Scope">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={!filters.includeAllSearches}
            onClick={() => {
              setFilters((f) => ({ ...f, includeAllSearches: false }))
              setVisibleCount(PAGE_SIZE)
            }}
          >
            This search
          </FilterChip>
          <FilterChip
            active={filters.includeAllSearches}
            onClick={() => {
              setFilters((f) => ({ ...f, includeAllSearches: true }))
              setVisibleCount(PAGE_SIZE)
            }}
            count={allRows.length > 1 ? allRows.length : undefined}
          >
            All searches
          </FilterChip>
        </div>
      </FilterSection>

      <FilterSection title="Marketplace">
        <div className="flex flex-col gap-1.5">
          {SOURCE_ORDER.map((source) => {
            const meta = SOURCE_META[source]
            const count = sourceCounts[source] ?? 0
            const active = filters.sources?.has(source) ?? false
            return (
              <button
                key={source}
                type="button"
                disabled={count === 0}
                onClick={() => toggleSource(source)}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] transition-colors',
                  active
                    ? 'border-primary/35 bg-primary/8 text-foreground'
                    : 'border-border-subtle/80 bg-background text-foreground/80 hover:bg-muted/40',
                  count === 0 && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
                  >
                    {meta.label}
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </button>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="Quality">
        <FilterChip
          active={filters.verifiedOnly}
          onClick={() => {
            setFilters((f) => ({ ...f, verifiedOnly: !f.verifiedOnly }))
            setVisibleCount(PAGE_SIZE)
          }}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Verified only
        </FilterChip>
      </FilterSection>

      <FilterSection title="Sort">
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, sort: opt.value }))
                setVisibleCount(PAGE_SIZE)
              }}
              className={cn(
                'rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors',
                filters.sort === opt.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {(filters.sources || filters.verifiedOnly || filters.includeAllSearches || filters.sort !== 'recommended') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilters(DEFAULT_SOURCING_RESULTS_FILTERS)
            setVisibleCount(PAGE_SIZE)
          }}
        >
          Clear filters
        </Button>
      )}
    </aside>
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound || !primary) {
    return (
          <NotFoundState message="This sourcing search may have been deleted or you don’t have access.">
            <Button type="button" variant="primary" onClick={() => navigate(sourcingRoomPath())}>
              Back to sourcing
            </Button>
          </NotFoundState>
    )
  }

  return (
    <>
      <Seo
        title={`${primary.keyword} · Sourcing | PowerProof`}
        description={`Supplier results for ${primary.keyword}`}
        canonicalPath={sourcingSearchResultsPath(primary.search_id)}
        noIndex
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-5">
        <div className="flex flex-col gap-3 px-4 layout-sm:px-6 layout-lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2"
              onClick={() => navigate(sourcingRoomPath())}
            >
              <ArrowLeft className="h-4 w-4" />
              My sources
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground layout-sm:text-2xl">
              {primary.keyword}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {displayCards.length} product{displayCards.length === 1 ? '' : 's'}
              {' · '}
              {formatHistoryBudget(primary.budget_max)}
              {primary.searched_at ? ` · ${formatSourcingTimestamp(primary.searched_at)}` : ''}
            </p>
          </div>

          {otherSearches.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your full search results
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {otherSearches.map((row) => (
                  <Link
                    key={row.search_id}
                    to={sourcingSearchResultsPath(row.search_id)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-background px-3 text-[11px] font-semibold text-foreground/80 transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-foreground"
                  >
                    <PackageSearch className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="max-w-[10rem] truncate">{row.keyword}</span>
                    <span className="tabular-nums text-muted-foreground">{row.total_results}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn(internalPageSectionFrameClass, 'border-y px-4 py-4 layout-sm:px-6 layout-lg:px-8')}>
        <div className="flex items-center justify-between gap-3 layout-lg:hidden">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter className="h-3.5 w-3.5" />
            {filtersOpen ? 'Hide filters' : 'Filters'}
          </Button>
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="sr-only">Sort</span>
            <select
              value={filters.sort}
              onChange={(e) => {
                setFilters((f) => ({ ...f, sort: e.target.value as SourcingSortKey }))
                setVisibleCount(PAGE_SIZE)
              }}
              className="h-8 rounded-full border border-border-subtle bg-background px-3 text-[11px] font-semibold text-foreground outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtersOpen ? <div className="layout-lg:hidden">{filterPanel}</div> : null}

        <div className="grid grid-cols-1 gap-5 layout-lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden layout-lg:block">{filterPanel}</div>

          <div className="flex min-w-0 flex-col gap-4">
            {displayCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-subtle bg-muted/20 px-6 py-12 text-center">
                <PackageSearch className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No products match these filters</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Try clearing filters or including all searches.
                </p>
              </div>
            ) : (
              <>
                <SourcingSupplierCardGrid
                  cards={visibleCards}
                  onCardClick={openProduct}
                  layoutKey={`${primary.search_id}-${filters.sort}-${filters.includeAllSearches}-${visibleCount}`}
                  className="layout-sm:grid-cols-2 layout-lg:grid-cols-3 layout-xl:grid-cols-4"
                />
                {displayCards.length > visibleCount ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-dashed border-primary/35 bg-primary/5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Load more ({displayCards.length - visibleCount} remaining)
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
} from '@/lib/icons'

import { useCategories } from '@/hooks/useCategories'
import { OpportunitiesFilterPopover } from '@/components/discover/OpportunitiesFilterPopover'
import { InvestorsFullWidthSeparator } from '@/components/investors/InvestorsFullWidthSeparator'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/hooks/useCurrency'
import type { DiscoverFilters } from '@/types/discovery'
import { warmCatalogCache } from '@/lib/catalogCache'
import { fuzzyScore } from '@/lib/fuzzy'
import {
  derivePublicCatalogMargin,
  fetchPublicCatalogFeedPage,
  type PublicCatalogFeedRow,
} from '@/lib/publicCatalog'
import {
  discoverHeroSectionsStackClassName,
} from '@/components/discover/discoverHeroTokens'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
  sortByWorkspaceColumn,
  useDiscoverHeroWorkspaceLayout,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import {
  workspaceFinancialMetrics,
  workspaceFinancialSortValues,
} from '@/components/discover/DiscoverHeroMetricStrip'
import { cn } from '@/lib/utils'

export type HeroOppChip = {
  id: string
  slug: string
  title: string
  country?: string | null
  category_slug?: string | null
  setup_min?: number | null
  setup_max?: number | null
  monthly_rev_min?: number | null
  monthly_rev_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
  is_locked?: boolean | null
  margin_pct?: number | null
  trend_velocity?: number | null
  score?: number | null
  ease?: string | null
}

type ExpandedGroup = 'catalog' | null

/** Browse waterfall — first page + each “load more” server fetch. */
const HERO_OPP_BROWSE_PAGE_SIZE = 16
/** Search — client-side substring matching across the complete public catalog. */
const HERO_OPP_SEARCH_PAGE_SIZE = 40
const LOADING_SKELETON_COUNT = 6

const PANEL_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
}

const GRID_STAGGER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.06 },
  },
}

const DEFAULT_HERO_FILTERS: DiscoverFilters = {
  budget: 'all',
  category: 'all',
  sort: 'trending',
  search: '',
}

type HeroFeedPage = { rows: HeroOppChip[]; totalCount: number }

function mergeOpportunityRows(existing: HeroOppChip[], incoming: HeroOppChip[]): HeroOppChip[] {
  if (!incoming.length) return existing
  const byId = new Map(existing.map((o) => [o.id, o]))
  for (const row of incoming) {
    if (!byId.has(row.id)) byId.set(row.id, row)
  }
  return [...byId.values()]
}

async function fetchHeroOpportunityFeedPage(
  filters: DiscoverFilters,
  searchTerm: string,
  pageNum: number,
  pageSize: number,
): Promise<HeroFeedPage> {
  try {
    const result = await fetchPublicCatalogFeedPage(
      filters,
      searchTerm,
      pageNum,
      pageSize,
    )
    return {
      rows: normalizeHeroOpps(result.rows as unknown as Record<string, unknown>[]),
      totalCount: result.totalCount,
    }
  } catch (error) {
    console.error('[DiscoverHeroOpportunityChips] catalog query error:', error)
    return { rows: [], totalCount: 0 }
  }
}

function normalizeHeroOpps(rows: Record<string, unknown>[]): HeroOppChip[] {
  return rows
    .map((o) => ({
      id: String(o.id ?? ''),
      slug: String(o.slug ?? ''),
      title: String(o.title ?? '').trim(),
      country: (o.country as string | null | undefined) ?? null,
      category_slug: (o.category_slug as string | null | undefined) ?? null,
      setup_min: o.setup_min as number | null | undefined,
      setup_max: o.setup_max as number | null | undefined,
      monthly_rev_min: o.monthly_rev_min as number | null | undefined,
      monthly_rev_max: o.monthly_rev_max as number | null | undefined,
      monthly_profit_min: o.monthly_profit_min as number | null | undefined,
      monthly_profit_max: o.monthly_profit_max as number | null | undefined,
      is_locked: false,
      margin_pct: derivePublicCatalogMargin(o as unknown as PublicCatalogFeedRow),
      trend_velocity: null,
      score: o.score as number | null | undefined,
      ease: (o.ease as string | null | undefined) ?? null,
    }))
    .filter((o) => o.id && o.slug && o.title)
}

function searchMatchScore(opp: HeroOppChip, searchQuery: string): number {
  const term = searchQuery.trim()
  if (!term) return 0
  const score = fuzzyScore(String(opp.title ?? ''), term)
  return Number.isFinite(score) ? score : -Infinity
}

function OpportunityHeroChip({
  opp,
  tourCard = false,
  categoryIcon,
}: {
  opp: HeroOppChip
  tourCard?: boolean
  categoryIcon?: string | null
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { formatMoney } = useCurrency()
  const { layout } = useDiscoverHeroWorkspaceLayout()
  const metrics = workspaceFinancialMetrics(opp, formatMoney)

  const openOpportunity = () => {
    navigate(`/o/${opp.slug}`, {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

  return (
    <DiscoverHeroWorkspaceItem
      title={opp.title}
      categorySlug={opp.category_slug}
      categoryIcon={categoryIcon}
      metrics={metrics}
      effort={opp.ease}
      onActivate={openOpportunity}
      tourAttr={tourCard ? 'opp-card' : undefined}
      actions={
        layout === 'table' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              openOpportunity()
            }}
          >
            Open
          </Button>
        ) : undefined
      }
    />
  )
}

type CategoryChipVariant = 'primary' | 'success' | 'danger'

const CATEGORY_CHIP_VARIANT_STYLES: Record<
  CategoryChipVariant,
  { active: string; inactive: string; countActive: string; countInactive: string }
> = {
  success: {
    active: 'border-success/40 bg-success/10 text-success',
    inactive:
      'border-success/25 bg-success/5 text-success hover:border-success/40 hover:bg-success/10',
    countActive: 'bg-success/15 text-success',
    countInactive: 'bg-success/10 text-success',
  },
  primary: {
    active: 'border-primary/35 bg-primary/10 text-primary',
    inactive:
      'border-primary/25 bg-primary/5 text-primary hover:border-primary/40 hover:bg-primary/10',
    countActive: 'bg-primary/15 text-primary',
    countInactive: 'bg-primary/10 text-primary',
  },
  danger: {
    active: 'border-destructive/40 bg-destructive/10 text-destructive',
    inactive:
      'border-destructive/25 bg-destructive/5 text-destructive hover:border-destructive/40 hover:bg-destructive/10',
    countActive: 'bg-destructive/15 text-destructive',
    countInactive: 'bg-destructive/10 text-destructive',
  },
}

function CategoryChip({
  active,
  onClick,
  icon,
  label,
  count,
  variant = 'primary',
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count?: number
  variant?: CategoryChipVariant
}) {
  const styles = CATEGORY_CHIP_VARIANT_STYLES[variant]
  const showCount = count != null && count > 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={label}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-full border text-[11px] font-semibold transition-[colors,padding,gap]',
        active ? styles.active : styles.inactive,
        active
          ? 'gap-1.5 px-2.5 max-layout-sm:gap-1.5 max-layout-sm:px-2.5'
          : 'gap-1.5 px-2.5 max-layout-sm:gap-0 max-layout-sm:px-2',
      )}
    >
      {icon}
      <span
        className={cn(
          'max-layout-sm:max-w-0 max-layout-sm:overflow-hidden max-layout-sm:opacity-0 max-layout-sm:transition-[max-width,opacity] max-layout-sm:duration-200',
          active && 'max-layout-sm:max-w-[12rem] max-layout-sm:opacity-100',
        )}
      >
        {label}
      </span>
      {showCount ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums max-layout-sm:max-w-0 max-layout-sm:overflow-hidden max-layout-sm:px-0 max-layout-sm:opacity-0 max-layout-sm:transition-[max-width,opacity,padding] max-layout-sm:duration-200',
            active && 'max-layout-sm:max-w-none max-layout-sm:px-1.5 max-layout-sm:opacity-100',
            active ? styles.countActive : styles.countInactive,
          )}
        >
          {count}
        </span>
      ) : null}
      <ChevronDown
        className={cn(
          'h-3 w-3 shrink-0 transition-[transform,opacity,max-width] max-layout-sm:max-w-0 max-layout-sm:opacity-0 max-layout-sm:duration-200',
          active && 'rotate-180 max-layout-sm:max-w-[0.75rem] max-layout-sm:opacity-100',
        )}
        aria-hidden
      />
    </button>
  )
}

function OpportunityChipGrid({
  items,
  loading,
  searchQuery = '',
  listResetKey = '',
  hideLoadMore = false,
  fullWidthMobile: _fullWidthMobile = false,
  hasMoreOnServer = false,
  loadingMore = false,
  serverTotalCount = null,
  onRequestMore,
  lucideBySlug,
}: {
  items: HeroOppChip[]
  loading?: boolean
  searchQuery?: string
  /** When this changes, visible chip count resets (new search/filter). Appends keep scroll position. */
  listResetKey?: string
  hideLoadMore?: boolean
  fullWidthMobile?: boolean
  hasMoreOnServer?: boolean
  loadingMore?: boolean
  serverTotalCount?: number | null
  onRequestMore?: () => void
  lucideBySlug?: ReadonlyMap<string, string>
}) {
  const { sortKey, sortDir } = useDiscoverHeroWorkspaceLayout()

  const searchTerm = searchQuery.trim()
  const isSearching = searchTerm.length > 0

  const sortedItems = useMemo(
    () =>
      sortByWorkspaceColumn(items, sortKey, sortDir, (opp) =>
        workspaceFinancialSortValues({
          title: opp.title,
          setup_min: opp.setup_min,
          setup_max: opp.setup_max,
          monthly_rev_min: opp.monthly_rev_min,
          monthly_rev_max: opp.monthly_rev_max,
          monthly_profit_min: opp.monthly_profit_min,
          monthly_profit_max: opp.monthly_profit_max,
          margin_pct: opp.margin_pct,
        }),
      ),
    [items, sortKey, sortDir],
  )

  if (loading) {
    return <DiscoverHeroBoxLoadingSkeleton count={LOADING_SKELETON_COUNT} columns="metrics" />
  }

  if (sortedItems.length === 0) {
    if (isSearching) return null
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-0.5 text-[11px] text-muted-foreground"
      >
        No opportunities match your filters.
      </motion.p>
    )
  }

  const remainingServer =
    serverTotalCount != null ? Math.max(0, serverTotalCount - sortedItems.length) : 0

  return (
    <motion.div
      className="overflow-visible"
      variants={GRID_STAGGER}
      initial="hidden"
      animate="visible"
    >
      <DiscoverHeroWorkspaceTable
        ariaLabel="Opportunity catalog"
        columns="metrics"
        listResetKey={listResetKey}
        hasMore={!hideLoadMore && hasMoreOnServer}
        onLoadMore={onRequestMore}
        loadingMore={loadingMore}
        remainingCount={remainingServer}
      >
        {sortedItems.map((opp, index) => (
          <OpportunityHeroChip
            key={opp.id}
            opp={opp}
            tourCard={index === 0}
            categoryIcon={opp.category_slug ? lucideBySlug?.get(opp.category_slug) : undefined}
          />
        ))}
      </DiscoverHeroWorkspaceTable>
    </motion.div>
  )
}

export type DiscoverHeroOpportunityWorkspaceSlots = {
  /** Filter controls — place in the section title row. */
  filters: ReactNode
  /** Catalog grid / empty / loading — without the filter chrome. */
  content: ReactNode
  isSearching: boolean
  loading: boolean
  isEmpty: boolean
}

export type DiscoverHeroOpportunityChipsProps = {
  /** Hero search box — filters catalog and workspace results by title. */
  searchQuery?: string
  /** Fit within opportunities viewport — cap chip rows, no overflow scroll. */
  compact?: boolean
  /** Admin preview: skip fetch and show an empty catalog. */
  forceEmpty?: boolean
  /** Split tabs, filter, and cards into separate hero sections (Discover hero layout). */
  children?: (slots: DiscoverHeroOpportunityWorkspaceSlots) => ReactNode
}

/** Expandable opportunity chips below the discover hero search. */
export function DiscoverHeroOpportunityChips({
  searchQuery = '',
  compact = false,
  forceEmpty = false,
  children,
}: DiscoverHeroOpportunityChipsProps) {
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories(true)

  useEffect(() => {
    warmCatalogCache()
  }, [])
  const searchTerm = searchQuery.trim()
  const isSearching = searchTerm.length > 0

  const expanded: ExpandedGroup = 'catalog'
  const [initialPanelReady, setInitialPanelReady] = useState(true)
  const poolInFlightRef = useRef(false)
  const poolGenerationRef = useRef(0)
  const [oppPool, setOppPool] = useState<HeroOppChip[]>([])
  const [listResetKey, setListResetKey] = useState('browse:0')
  const [poolPage, setPoolPage] = useState(0)
  const [poolTotalCount, setPoolTotalCount] = useState<number | null>(null)
  const loadCatalogPageRef = useRef<
    (pageNum: number, append: boolean) => Promise<void>
  >(() => Promise.resolve())
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolLoadingMore, setPoolLoadingMore] = useState(false)
  const [heroFilters, setHeroFilters] = useState<DiscoverFilters>(DEFAULT_HERO_FILTERS)

  const catalogOpps = useMemo(() => {
    if (searchTerm) {
      return [...oppPool].sort(
        (a, b) => searchMatchScore(b, searchTerm) - searchMatchScore(a, searchTerm),
      )
    }
    return oppPool
  }, [oppPool, searchTerm])

  const poolPageSize = isSearching ? HERO_OPP_SEARCH_PAGE_SIZE : HERO_OPP_BROWSE_PAGE_SIZE
  const hasMoreOnServer = poolTotalCount != null && oppPool.length < poolTotalCount

  const loadCatalogPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (poolInFlightRef.current) return
      poolInFlightRef.current = true
      if (pageNum === 0) setPoolLoading(true)
      else setPoolLoadingMore(true)

      try {
        const { rows, totalCount } = await fetchHeroOpportunityFeedPage(
          heroFilters,
          searchTerm,
          pageNum,
          poolPageSize,
        )
        setPoolTotalCount(totalCount)
        setOppPool((prev) => (append ? mergeOpportunityRows(prev, rows) : rows))
      } catch {
        if (!append) {
          setOppPool([])
          setPoolTotalCount(0)
        }
      } finally {
        poolInFlightRef.current = false
        setPoolLoading(false)
        setPoolLoadingMore(false)
      }
    },
    [heroFilters, searchTerm, poolPageSize],
  )

  const browseFeedKey = useMemo(
    () =>
      JSON.stringify({
        budget: heroFilters.budget,
        category: heroFilters.category,
      }),
    [heroFilters.budget, heroFilters.category],
  )

  loadCatalogPageRef.current = loadCatalogPage

  const shouldLoadCatalog = !forceEmpty && (expanded === 'catalog' || isSearching)

  const resetCatalogFeed = useCallback((nextListResetKey: string) => {
    poolGenerationRef.current += 1
    setPoolPage(0)
    setOppPool([])
    setPoolTotalCount(null)
    setListResetKey(nextListResetKey)
  }, [])

  useEffect(() => {
    if (!forceEmpty) return
    resetCatalogFeed('preview:empty')
    setPoolTotalCount(0)
    setPoolLoading(false)
  }, [forceEmpty, resetCatalogFeed])

  useEffect(() => {
    if (!shouldLoadCatalog || !initialPanelReady || isSearching) return

    resetCatalogFeed(`browse:${browseFeedKey}`)
    const gen = poolGenerationRef.current
    void loadCatalogPageRef.current(0, false).then(() => {
      if (gen !== poolGenerationRef.current) return
    })
  }, [shouldLoadCatalog, initialPanelReady, browseFeedKey, isSearching, resetCatalogFeed])

  useEffect(() => {
    if (!shouldLoadCatalog || !initialPanelReady || !isSearching) return

    setPoolLoading(true)
    const term = searchTerm
    resetCatalogFeed(`search:${term}`)
    const gen = poolGenerationRef.current
    void loadCatalogPageRef.current(0, false).then(() => {
      if (gen !== poolGenerationRef.current) return
    })
  }, [shouldLoadCatalog, initialPanelReady, isSearching, searchTerm, resetCatalogFeed])

  const loadMoreCatalog = useCallback(() => {
    if (!hasMoreOnServer || poolLoadingMore || poolLoading) return
    const nextPage = poolPage + 1
    setPoolPage(nextPage)
    void loadCatalogPage(nextPage, true)
  }, [hasMoreOnServer, poolLoadingMore, poolLoading, poolPage, loadCatalogPage])

  const patchHeroFilters = (patch: Partial<DiscoverFilters>) => {
    setHeroFilters((prev) => ({ ...prev, ...patch }))
  }

  const lucideBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      if (category.slug && category.lucide) map.set(category.slug, category.lucide)
    }
    return map
  }, [categories])

  const chipsLoading = poolLoading && catalogOpps.length === 0
  const panelOpen = expanded !== null || isSearching

  const filterSlot = !isSearching ? (
    <OpportunitiesFilterPopover
      filters={heroFilters}
      onFiltersChange={patchHeroFilters}
      categories={categories}
      categoriesLoading={categoriesLoading}
      categoriesError={categoriesError}
    />
  ) : null

  const gridSlot = (
    <AnimatePresence initial={false} mode="wait">
      {expanded || isSearching ? (
        <motion.div
          key="panel-catalog"
          initial={PANEL_MOTION.initial}
          animate={PANEL_MOTION.animate}
          exit={PANEL_MOTION.exit}
          className={cn(
            'w-full',
            compact ? 'min-h-0 flex-1 overflow-y-auto overscroll-y-auto' : 'overflow-visible',
          )}
        >
          <OpportunityChipGrid
            items={catalogOpps}
            loading={chipsLoading}
            searchQuery={searchQuery}
            listResetKey={listResetKey}
            hideLoadMore={false}
            fullWidthMobile
            hasMoreOnServer={hasMoreOnServer}
            loadingMore={poolLoadingMore}
            serverTotalCount={
              isSearching ? catalogOpps.length : poolTotalCount
            }
            onRequestMore={loadMoreCatalog}
            lucideBySlug={lucideBySlug}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  const contentSlot = (
    <div
      className={cn(
        'flex flex-col',
        compact && panelOpen ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-visible',
      )}
    >
      {gridSlot}
    </div>
  )

  if (children) {
    return children({
      filters: filterSlot,
      content: contentSlot,
      isSearching,
      loading: chipsLoading,
      isEmpty: !chipsLoading && catalogOpps.length === 0,
    })
  }

  return (
    <div
      className={cn(
        discoverHeroSectionsStackClassName,
        compact && panelOpen ? 'min-h-0 flex-1 overflow-hidden' : 'overflow-visible',
      )}
    >
      {filterSlot ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-3 py-3">
            {filterSlot}
          </div>
          <InvestorsFullWidthSeparator className="mb-5" />
        </>
      ) : null}
      {contentSlot}
    </div>
  )
}

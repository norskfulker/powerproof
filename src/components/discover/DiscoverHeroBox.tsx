import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DiscoverHeroWorkspaceSortKey = 'title' | 'cost' | 'revenue' | 'margin'
export type DiscoverHeroWorkspaceSortDir = 'asc' | 'desc'

export type DiscoverHeroWorkspaceSortValues = {
  title: string
  cost: number | null
  revenue: number | null
  margin: number | null
}

export function compareWorkspaceSortValues(
  a: DiscoverHeroWorkspaceSortValues,
  b: DiscoverHeroWorkspaceSortValues,
  key: DiscoverHeroWorkspaceSortKey,
  dir: DiscoverHeroWorkspaceSortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1
  if (key === 'title') {
    return mul * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  }
  const av = a[key]
  const bv = b[key]
  const aEmpty = av == null || !Number.isFinite(av)
  const bEmpty = bv == null || !Number.isFinite(bv)
  if (aEmpty && bEmpty) return mul * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (av === bv) return mul * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  return mul * (av! - bv!)
}

export function sortByWorkspaceColumn<T>(
  rows: readonly T[],
  key: DiscoverHeroWorkspaceSortKey | null,
  dir: DiscoverHeroWorkspaceSortDir,
  getValues: (row: T) => DiscoverHeroWorkspaceSortValues,
): T[] {
  if (!key) return [...rows]
  return [...rows].sort((a, b) => compareWorkspaceSortValues(getValues(a), getValues(b), key, dir))
}

/** Discover hero content shell — no card chrome (border / fill / shadow). */
export const discoverHeroBoxOuterClassName = 'w-full min-w-0'

/** @deprecated Inner nested layer removed — same as outer surface. */
export const discoverHeroBoxInnerSurfaceClassName = discoverHeroBoxOuterClassName

/** @deprecated Use discoverHeroBoxOuterClassName */
export const discoverHeroBoxSurfaceClassName = discoverHeroBoxOuterClassName

/** Vertical stack of separate hero boxes — flush under composer (no gap). */
export const discoverHeroBoxStackClassName =
  'flex w-full min-w-0 flex-col gap-0'

export type DiscoverHeroWorkspaceLayout = 'grid' | 'table'

const WORKSPACE_LAYOUT_STORAGE_KEY = 'powerproof_discover_hero_workspace_layout'

function readStoredWorkspaceLayout(): DiscoverHeroWorkspaceLayout {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)
    if (raw === 'grid' || raw === 'table') return raw
  } catch {
    /* ignore */
  }
  return 'grid'
}

function writeStoredWorkspaceLayout(layout: DiscoverHeroWorkspaceLayout) {
  try {
    window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, layout)
  } catch {
    /* ignore */
  }
}

type DiscoverHeroWorkspaceLayoutContextValue = {
  layout: DiscoverHeroWorkspaceLayout
  setLayout: (next: DiscoverHeroWorkspaceLayout) => void
  sortKey: DiscoverHeroWorkspaceSortKey | null
  sortDir: DiscoverHeroWorkspaceSortDir
  toggleSort: (key: DiscoverHeroWorkspaceSortKey) => void
}

const DiscoverHeroWorkspaceLayoutContext =
  createContext<DiscoverHeroWorkspaceLayoutContextValue | null>(null)

const DEFAULT_LAYOUT_CONTEXT: DiscoverHeroWorkspaceLayoutContextValue = {
  layout: 'grid',
  setLayout: () => {},
  sortKey: null,
  sortDir: 'asc',
  toggleSort: () => {},
}

export type DiscoverHeroWorkspaceMetricColumns = {
  labels: [string, string, string]
  metaLabel?: string | null
}

export const FINANCIAL_WORKSPACE_METRIC_COLUMNS: DiscoverHeroWorkspaceMetricColumns = {
  labels: ['Cost', 'Revenue', 'Margin'],
  metaLabel: 'Effort',
}

export const SCAN_WORKSPACE_METRIC_COLUMNS: DiscoverHeroWorkspaceMetricColumns = {
  labels: ['SEO', 'Business', 'Competitor'],
  metaLabel: 'Pages',
}

export const MARKET_TEST_WORKSPACE_METRIC_COLUMNS: DiscoverHeroWorkspaceMetricColumns = {
  labels: ['Score', 'Verdict', 'Status'],
  metaLabel: null,
}

export const SOURCING_WORKSPACE_METRIC_COLUMNS: DiscoverHeroWorkspaceMetricColumns = {
  labels: ['Budget', 'Suppliers', 'Sources'],
  metaLabel: null,
}

export const INVESTOR_WORKSPACE_METRIC_COLUMNS: DiscoverHeroWorkspaceMetricColumns = {
  labels: ['Type', 'HQ', 'Check'],
  metaLabel: 'Stages',
}

const DiscoverHeroWorkspaceMetricColumnsContext =
  createContext<DiscoverHeroWorkspaceMetricColumns>(FINANCIAL_WORKSPACE_METRIC_COLUMNS)

export function useDiscoverHeroWorkspaceMetricColumns() {
  return useContext(DiscoverHeroWorkspaceMetricColumnsContext)
}

export function useDiscoverHeroWorkspaceLayout(): DiscoverHeroWorkspaceLayoutContextValue {
  return useContext(DiscoverHeroWorkspaceLayoutContext) ?? DEFAULT_LAYOUT_CONTEXT
}

/** Mobile always uses grid; desktop respects the layout switcher. */
export function useDiscoverHeroWorkspaceLayoutView(): DiscoverHeroWorkspaceLayoutContextValue & {
  canSwitchLayout: boolean
} {
  const ctx = useDiscoverHeroWorkspaceLayout()
  const isMobile = useIsMobile()
  return useMemo(
    () => ({
      ...ctx,
      layout: isMobile ? 'grid' : ctx.layout,
      canSwitchLayout: !isMobile,
    }),
    [ctx, isMobile],
  )
}

export const discoverHeroGridInitialCount = 3

export const discoverHeroWorkspaceExpandButtonClassName = cn(
  'inline-flex h-9 w-fit items-center justify-center rounded-full border border-dashed border-primary/35 px-5',
  'bg-primary/5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10',
  'disabled:pointer-events-none disabled:opacity-50',
)

export function DiscoverHeroWorkspaceExpandButton({
  remaining,
  onExpand,
  disabled = false,
  loading = false,
}: {
  remaining: number
  onExpand: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        onClick={onExpand}
        disabled={disabled || loading}
        aria-busy={loading}
        className={discoverHeroWorkspaceExpandButtonClassName}
        aria-label={`Show ${remaining} more items`}
      >
        {loading ? 'Loading…' : `Show more (${remaining})`}
      </button>
    </div>
  )
}

export function useDiscoverHeroWorkspaceLayoutOptional() {
  return useContext(DiscoverHeroWorkspaceLayoutContext)
}

export function DiscoverHeroWorkspaceLayoutProvider({
  children,
}: {
  children: ReactNode
}) {
  const parent = useContext(DiscoverHeroWorkspaceLayoutContext)
  const [layout, setLayoutState] = useState<DiscoverHeroWorkspaceLayout>(readStoredWorkspaceLayout)
  const [sortKey, setSortKey] = useState<DiscoverHeroWorkspaceSortKey | null>(null)
  const [sortDir, setSortDir] = useState<DiscoverHeroWorkspaceSortDir>('asc')

  const setLayout = useCallback((next: DiscoverHeroWorkspaceLayout) => {
    setLayoutState(next)
    writeStoredWorkspaceLayout(next)
  }, [])

  const toggleSort = useCallback((key: DiscoverHeroWorkspaceSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const value = useMemo(
    () => ({ layout, setLayout, sortKey, sortDir, toggleSort }),
    [layout, setLayout, sortKey, sortDir, toggleSort],
  )

  if (parent) return <>{children}</>
  return (
    <DiscoverHeroWorkspaceLayoutContext.Provider value={value}>
      {children}
    </DiscoverHeroWorkspaceLayoutContext.Provider>
  )
}

/** Card grid inside `DiscoverHeroBox` — 1 col mobile, 3 cols from layout-sm up. */
export const discoverHeroBoxGridClassName =
  'grid w-full min-w-0 grid-cols-1 gap-4 layout-sm:grid-cols-3'

/** Workspace history row shell — use RoomHeroCard from '@/components/shared/RoomHeroCard'. */
export const discoverHeroWorkspaceCardShellClassName = cn(
  'w-full min-w-0 border-0 border-b border-border-subtle bg-card shadow-none last:border-b-0',
  'flex min-h-[4.5rem] flex-col rounded-none',
)

export function DiscoverHeroBoxStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(discoverHeroBoxStackClassName, className)}>{children}</div>
}

export const discoverHeroBoxHeaderClassName = 'pb-1.5 pt-0.5 layout-sm:pb-2'

export const discoverHeroBoxTitleClassName = 'font-display text-[13px] font-semibold tracking-normal text-foreground'

export const discoverHeroBoxDescriptionClassName =
  'mt-0.5 text-[12px] leading-snug text-muted-foreground'

export const discoverHeroBoxBodyClassName = 'min-w-0'

export const discoverHeroBoxInnerClassName = 'min-w-0'

/** Compact search field for filtering workspace cards inside `DiscoverHeroBox`. */
export const discoverHeroBoxSearchInputClassName =
  'h-9 rounded-md border border-border-subtle/80 bg-muted/20 text-[13px] placeholder:text-muted-foreground/70 hover:shadow-none focus-visible:shadow-none'

/** Short inline search — sits in the workspace section title row (right side). */
export const discoverHeroBoxSearchInputInlineClassName =
  'h-8 rounded-lg border border-border-subtle/80 bg-muted/15 text-[12px] placeholder:text-muted-foreground/65 hover:shadow-none focus-visible:shadow-none'

export const discoverHeroBoxSearchInputInlineWrapClassName =
  'w-[7.25rem] shrink-0 sm:w-[8.75rem]'

const layoutSwitcherButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function DiscoverHeroWorkspaceLayoutSwitcher({
  className,
}: {
  className?: string
}) {
  const { layout, setLayout, canSwitchLayout } = useDiscoverHeroWorkspaceLayoutView()

  if (!canSwitchLayout) return null

  return (
    <div
      role="group"
      aria-label="Workspace layout"
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg border border-border-subtle/80 bg-muted/30 p-0.5',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={layout === 'grid'}
        aria-label="Grid layout"
        title="Grid"
        onClick={() => setLayout('grid')}
        className={cn(
          layoutSwitcherButtonClassName,
          layout === 'grid' && 'bg-background text-foreground shadow-sm',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={layout === 'table'}
        aria-label="Table layout"
        title="Table"
        onClick={() => setLayout('table')}
        className={cn(
          layoutSwitcherButtonClassName,
          layout === 'table' && 'bg-background text-foreground shadow-sm',
        )}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

const workspaceTableHeaderCellClassName =
  'px-3 py-2.5 text-left font-display text-[13px] font-semibold leading-tight tracking-tight text-muted-foreground'

export const metricsDesktopOnlyColClassName = 'hidden layout-sm:table-cell'

function WorkspaceSortHeaderButton({
  label,
  column,
  className,
}: {
  label: string
  column: DiscoverHeroWorkspaceSortKey
  className?: string
}) {
  const { sortKey, sortDir, toggleSort } = useDiscoverHeroWorkspaceLayout()
  const active = sortKey === column
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      type="button"
      className={cn(
        workspaceTableHeaderCellClassName,
        'inline-flex w-full items-center gap-1 transition-colors hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
      onClick={() => toggleSort(column)}
      aria-label={`Sort by ${label}`}
      aria-pressed={active}
    >
      <span>{label}</span>
      <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    </button>
  )
}

function MetricsTableColGroup({ showMeta = true }: { showMeta?: boolean }) {
  return (
    <colgroup>
      <col style={{ width: showMeta ? '26%' : '36%' }} />
      <col style={{ width: showMeta ? '11%' : '14%' }} />
      <col style={{ width: showMeta ? '13%' : '16%' }} />
      <col style={{ width: showMeta ? '10%' : '14%' }} />
      {showMeta ? <col style={{ width: '22%' }} /> : null}
      <col style={{ width: showMeta ? '18%' : '20%' }} />
    </colgroup>
  )
}

function MetricsTableHeaderRow({ showMeta = true }: { showMeta?: boolean }) {
  const metricColumns = useDiscoverHeroWorkspaceMetricColumns()
  const sortKeys: DiscoverHeroWorkspaceSortKey[] = ['title', 'cost', 'revenue', 'margin']

  return (
    <tr>
      <th scope="col" className="p-0">
        <WorkspaceSortHeaderButton label="Title" column="title" />
      </th>
      {metricColumns.labels.map((label, index) => (
        <th key={label} scope="col" className={cn('p-0', metricsDesktopOnlyColClassName)}>
          <WorkspaceSortHeaderButton label={label} column={sortKeys[index + 1]!} />
        </th>
      ))}
      {showMeta && metricColumns.metaLabel ? (
        <th scope="col" className={workspaceTableHeaderCellClassName}>
          {metricColumns.metaLabel}
        </th>
      ) : null}
      <th scope="col" className={cn(workspaceTableHeaderCellClassName, 'text-right')}>
        Action
      </th>
    </tr>
  )
}

/** Workspace items — grid of cards or semantic table, driven by the layout switcher. */
export function DiscoverHeroWorkspaceTable({
  children,
  className,
  ariaLabel = 'Workspace items',
  columns = 'cards',
  listResetKey,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  remainingCount,
  expandDisabled = false,
  metricColumns = FINANCIAL_WORKSPACE_METRIC_COLUMNS,
  initialVisibleCount,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
  /** `metrics` = title / cost / revenue / margin / effort / action. `cards` = title / action wrapping full cards. */
  columns?: 'cards' | 'metrics'
  /** When this changes, the visible slice resets to the initial count. */
  listResetKey?: string | number
  /** More items available beyond those already passed as children. */
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  /** Remaining count for server-backed lists (used after local items are fully shown). */
  remainingCount?: number
  expandDisabled?: boolean
  /** Column labels for metrics table mode. */
  metricColumns?: DiscoverHeroWorkspaceMetricColumns
  /** Visible items before “Show more”. `0` shows the full list. */
  initialVisibleCount?: number
}) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const items = Children.toArray(children)
  const [listExpanded, setListExpanded] = useState(false)
  const showMetaColumn = metricColumns.metaLabel != null
  const visibleCap =
    initialVisibleCount != null && initialVisibleCount <= 0
      ? items.length
      : (initialVisibleCount ?? discoverHeroGridInitialCount)

  useEffect(() => {
    setListExpanded(false)
  }, [listResetKey, ariaLabel])

  const localHidden =
    !listExpanded && items.length > visibleCap ? items.length - visibleCap : 0
  const visibleItems = localHidden > 0 ? items.slice(0, visibleCap) : items

  const serverRemaining = Math.max(0, remainingCount ?? 0)
  const expandRemaining = localHidden > 0 ? localHidden : serverRemaining
  const showExpandButton = localHidden > 0 || hasMore || loadingMore

  const handleExpand = () => {
    if (localHidden > 0) {
      setListExpanded(true)
      return
    }
    if (hasMore && onLoadMore) {
      setListExpanded(true)
      onLoadMore()
    }
  }

  const expandButton = showExpandButton ? (
    <DiscoverHeroWorkspaceExpandButton
      remaining={Math.max(expandRemaining, 1)}
      onExpand={handleExpand}
      disabled={expandDisabled}
      loading={loadingMore}
    />
  ) : null

  if (layout === 'grid') {
    const grid = (
      <div className={cn('flex w-full min-w-0 flex-col', className)}>
        <div
          className={discoverHeroBoxGridClassName}
          role="list"
          aria-label={ariaLabel}
        >
          {visibleItems.map((child, index) => (
            <div key={index} className="flex h-full min-w-0 w-full max-w-full flex-col" role="listitem">
              {child}
            </div>
          ))}
        </div>
        {expandButton}
      </div>
    )

    if (columns === 'metrics') {
      return (
        <DiscoverHeroWorkspaceMetricColumnsContext.Provider value={metricColumns}>
          {grid}
        </DiscoverHeroWorkspaceMetricColumnsContext.Provider>
      )
    }

    return grid
  }

  if (columns === 'metrics') {
    const metricsTable = (
      <div className={cn('flex w-full min-w-0 flex-col', className)}>
        <Card
          padding="none"
          radius="xl"
          className="shadow-sm"
          topSlotClassName="p-0"
          topSlot={
            <table className="w-full min-w-0 table-fixed">
              <MetricsTableColGroup showMeta={showMetaColumn} />
              <thead>
                <MetricsTableHeaderRow showMeta={showMetaColumn} />
              </thead>
            </table>
          }
        >
          <table
            className="discover-hero-workspace-table w-full min-w-0 table-fixed"
            aria-label={ariaLabel}
          >
            <MetricsTableColGroup showMeta={showMetaColumn} />
            <tbody>{visibleItems}</tbody>
          </table>
        </Card>
        {expandButton}
      </div>
    )

    return (
      <DiscoverHeroWorkspaceMetricColumnsContext.Provider value={metricColumns}>
        {metricsTable}
      </DiscoverHeroWorkspaceMetricColumnsContext.Provider>
    )
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col', className)}>
      <Card
        padding="none"
        radius="xl"
        className="shadow-sm"
        topSlotClassName="p-0"
        topSlot={
          <table className="w-full min-w-0">
            <thead>
              <tr>
                <th scope="col" className="p-0">
                  <WorkspaceSortHeaderButton label="Title" column="title" />
                </th>
                <th scope="col" className={cn(workspaceTableHeaderCellClassName, 'w-px text-right')}>
                  Action
                </th>
              </tr>
            </thead>
          </table>
        }
      >
        <table className="discover-hero-workspace-table w-full min-w-0" aria-label={ariaLabel}>
          <tbody>
            {visibleItems.map((child, index) => (
              <DiscoverHeroWorkspaceTableRow key={index}>{child}</DiscoverHeroWorkspaceTableRow>
            ))}
          </tbody>
        </table>
      </Card>
      {expandButton}
    </div>
  )
}

export function DiscoverHeroWorkspaceTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="relative border-b border-border-subtle transition-colors last:border-b-0 hover:bg-muted/20">
      <td colSpan={2} className="relative p-0 pl-5 align-middle">
        <span
          className="pointer-events-none absolute left-2.5 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full bg-primary"
          aria-hidden
        />
        {children}
      </td>
    </tr>
  )
}

function WorkspaceGridCardSkeleton() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-muted/35 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="h-3.5 w-14 animate-pulse rounded bg-muted/50" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="flex flex-1 flex-col gap-3 border-t border-border-subtle bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-muted/40" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border-subtle">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className={cn(
                'flex min-w-0 flex-col gap-1.5 px-3 py-2.5',
                index > 0 && 'border-l border-border-subtle',
              )}
            >
              <div className="h-2.5 w-10 animate-pulse rounded bg-muted/40" />
              <div className="h-3.5 w-12 animate-pulse rounded bg-muted/40" />
            </div>
          ))}
        </div>
        <div className="mt-auto h-7 w-full animate-pulse rounded-md bg-muted/40" />
      </div>
    </div>
  )
}

export function DiscoverHeroBoxLoadingSkeleton({
  count = 6,
  className,
  columns = 'cards',
  metricColumns,
  initialVisibleCount,
}: {
  count?: number
  className?: string
  columns?: 'cards' | 'metrics'
  metricColumns?: DiscoverHeroWorkspaceMetricColumns
  initialVisibleCount?: number
}) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const resolvedMetricColumns = metricColumns ?? FINANCIAL_WORKSPACE_METRIC_COLUMNS
  const showMetaColumn = resolvedMetricColumns.metaLabel != null
  const skeletonCap = initialVisibleCount ?? count

  if (layout === 'table' && columns === 'metrics') {
    return (
      <DiscoverHeroWorkspaceTable
        className={className}
        ariaLabel="Loading workspace items"
        columns="metrics"
        metricColumns={resolvedMetricColumns}
        initialVisibleCount={skeletonCap}
      >
        {Array.from({ length: count }, (_, i) => (
          <tr key={i} className="border-b border-border-subtle last:border-b-0">
            <td className="px-4 py-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/30" />
            </td>
            {resolvedMetricColumns.labels.map((label) => (
              <td key={label} className={cn('px-3 py-3', metricsDesktopOnlyColClassName)}>
                <div className="h-5 w-16 animate-pulse rounded bg-muted/30" />
              </td>
            ))}
            {showMetaColumn ? (
              <td className="px-3 py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted/30" />
              </td>
            ) : null}
            <td className="px-3 py-3">
              <div className="ml-auto h-5 w-14 animate-pulse rounded bg-muted/30" />
            </td>
          </tr>
        ))}
      </DiscoverHeroWorkspaceTable>
    )
  }

  return (
    <DiscoverHeroWorkspaceTable
      className={className}
      ariaLabel="Loading workspace items"
      columns={columns}
      metricColumns={metricColumns}
      initialVisibleCount={skeletonCap}
    >
      {Array.from({ length: count }, (_, i) =>
        layout === 'grid' ? (
          <WorkspaceGridCardSkeleton key={i} />
        ) : (
          <div key={i} className="h-[4.5rem] animate-pulse bg-muted/25" />
        ),
      )}
    </DiscoverHeroWorkspaceTable>
  )
}

/** Full room-page placeholder while auth or workspace history is hydrating. */
export function DiscoverHeroRoomPageSkeleton() {
  return (
    <DiscoverHeroWorkspaceLayoutProvider>
      <div className="flex w-full min-w-0 flex-col gap-6 px-3 pb-8 pt-6 md:pt-8">
        <div className="mx-auto flex w-full max-w-[min(100%,36rem)] flex-col items-center gap-3">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted/30" />
          <div className="h-14 w-full animate-pulse rounded-xl border border-border-subtle bg-muted/25" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-7 w-52 animate-pulse rounded-md bg-muted/30" />
          <DiscoverHeroBoxLoadingSkeleton columns="metrics" count={6} />
        </div>
      </div>
    </DiscoverHeroWorkspaceLayoutProvider>
  )
}

export function DiscoverHeroBoxSearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  disabled,
  layout = 'block',
  'aria-label': ariaLabel = 'Search workspace items',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  layout?: 'block' | 'inline'
  'aria-label'?: string
}) {
  const isInline = layout === 'inline'
  const [focused, setFocused] = useState(false)

  const field = (
    <Input
      variant="search"
      size="compact"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      wrapperClassName={cn(!isInline && 'w-full min-w-0', className)}
      className={isInline ? discoverHeroBoxSearchInputInlineClassName : discoverHeroBoxSearchInputClassName}
    />
  )

  if (!isInline) return field

  return (
    <motion.div
      className={cn('shrink-0 origin-right', className)}
      initial={false}
      animate={{ width: focused || value.trim() ? '10.875rem' : '7.25rem' }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
      style={{ maxWidth: '100%' }}
    >
      {field}
    </motion.div>
  )
}

export function DiscoverHeroBox({
  title,
  description,
  children,
  className,
  bodyClassName,
  innerClassName,
  headerClassName,
  /** Accessible name when title/description are omitted. */
  ariaLabel,
  /** Skip outer border — for nested content inside results box. */
  unstyled,
  id,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchDisabled,
  topSlot,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  /** Layout / padding overrides for the content layer. */
  bodyClassName?: string
  innerClassName?: string
  headerClassName?: string
  ariaLabel?: string
  unstyled?: boolean
  id?: string
  /** Optional filter search shown above box content. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchDisabled?: boolean
  /** Optional banner/badge rendered above the box shell. */
  topSlot?: ReactNode
}) {
  const hasHeader = Boolean(title || description)
  const sectionLabel = title ?? ariaLabel
  const showSearch = onSearchChange != null

  const body = unstyled ? (
    <div id={id} className={cn('w-full min-w-0', className)}>
      {topSlot}
      {children}
    </div>
  ) : (
    <div className={cn('flex w-full min-w-0 flex-col', className)}>
      {topSlot ? <div className="flex w-full justify-center">{topSlot}</div> : null}
      <section
        id={id}
        className={discoverHeroBoxOuterClassName}
        aria-label={sectionLabel}
      >
      {hasHeader ? (
        <header className={cn(discoverHeroBoxHeaderClassName, headerClassName)}>
          {title ? <h3 className={discoverHeroBoxTitleClassName}>{title}</h3> : null}
          {description ? (
            <p className={discoverHeroBoxDescriptionClassName}>{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className={cn(discoverHeroBoxInnerClassName, bodyClassName, innerClassName)}>
        {showSearch ? (
          <DiscoverHeroBoxSearchInput
            value={searchValue ?? ''}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            disabled={searchDisabled}
            className="mb-3"
          />
        ) : null}
        {children}
      </div>
      </section>
    </div>
  )

  return <DiscoverHeroWorkspaceLayoutProvider>{body}</DiscoverHeroWorkspaceLayoutProvider>
}

export function DiscoverHeroWorkspaceBox({
  visible,
  ariaLabel,
  className,
  bodyClassName,
  children,
}: {
  visible: boolean
  ariaLabel: string
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <DiscoverHeroBox
      ariaLabel={ariaLabel}
      className={cn(!visible && 'hidden', className)}
      bodyClassName={bodyClassName}
    >
      {children}
    </DiscoverHeroBox>
  )
}

export function DiscoverHeroBoxEmpty({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border-subtle/80 bg-muted/15 px-3 py-6 text-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

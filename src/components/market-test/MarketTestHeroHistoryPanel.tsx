import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Store2Line } from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import {
  fetchUserMarketTests,
  invalidateUserMarketTestsList,
  type MarketTestListRow,
} from '@/lib/marketTestApi'
import { MARKET_TEST_ROUTES, MY_MARKET_TEST_PATH } from '@/lib/marketTestRoutes'
import { MarketTestCard } from '@/components/market-test/MarketTestCard'
import { Button } from '@/components/ui/button'
import { RoomHeroDeleteConfirmDialog } from '@/components/shared/RoomHeroDeleteConfirmDialog'
import { toast } from '@/components/ui/sonner'
import { deleteMarketTest } from '@/lib/facilityDeletes'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
  MARKET_TEST_WORKSPACE_METRIC_COLUMNS,
} from '@/components/discover/DiscoverHeroBox'
import {
  discoverHeroButtonPrimaryClassName,
} from '@/components/discover/discoverHeroTokens'
import { matchesWorkspaceSearch } from '@/lib/discoverHeroWorkspaceSearch'
import { SOURCING_PANEL_MOTION } from '@/lib/sourcingHeroMotion'
import { cn } from '@/lib/utils'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'

export function MarketTestHeroHistoryPanel({
  expanded,
  onHistoryCount,
  onHasContentChange,
  refreshKey,
  workspaceDisabled = false,
  searchQuery = '',
  onReRun,
}: {
  expanded: boolean
  onHistoryCount?: (count: number) => void
  onHasContentChange?: (has: boolean) => void
  refreshKey?: string | number
  workspaceDisabled?: boolean
  searchQuery?: string
  onReRun?: (row: MarketTestListRow) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const [rows, setRows] = useState<MarketTestListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MarketTestListRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const tests = await fetchUserMarketTests(user.id)
    setRows(tests)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!expanded) return
    void load()
  }, [expanded, load, refreshKey])

  useEffect(() => {
    onHistoryCount?.(rows.length)
  }, [rows.length, onHistoryCount])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => matchesWorkspaceSearch(searchQuery, row.query)),
    [rows, searchQuery],
  )
  const isPendingRow = (row: MarketTestListRow) => {
    const status = String(row.generation_status ?? '').toLowerCase()
    return status !== 'complete' && status !== 'failed'
  }
  const filteredPendingRows = useMemo(
    () => filteredRows.filter(isPendingRow),
    [filteredRows],
  )
  const filteredCompletedRows = useMemo(
    () => filteredRows.filter((row) => !isPendingRow(row)),
    [filteredRows],
  )
  const visibleCompletedRows = filteredCompletedRows
  const hasListContent = rows.length > 0
  const hasFilteredContent = filteredRows.length > 0
  const showHistorySkeleton = loading && !hasListContent

  useEffect(() => {
    if (!expanded) {
      onHasContentChange?.(false)
      return
    }
    if (!user?.id) {
      onHasContentChange?.(false)
      return
    }
    if (loading) {
      onHasContentChange?.(true)
      return
    }
    onHasContentChange?.(hasListContent)
  }, [expanded, user?.id, loading, hasListContent, onHasContentChange])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || !user?.id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteMarketTest(pendingDelete.id, user.id)
      invalidateUserMarketTestsList(user.id)
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id))
      setPendingDelete(null)
      toast.success('Market test deleted')
    } catch {
      toast.error('Could not delete market test')
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, pendingDelete, user?.id])

  if (!expanded) return null

  if (!user) {
    return (
      <motion.div
        key="market-test-history-signin"
        {...SOURCING_PANEL_MOTION}
        className="rounded-xl border border-border-subtle bg-bg-sunken/40 px-4 py-6 text-center"
      >
        <p className="text-[11px] font-medium text-foreground">Sign in to view your market tests</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn('mt-3', discoverHeroButtonPrimaryClassName)}
          onClick={() => navigate(landingSignInTo(MY_MARKET_TEST_PATH))}
        >
          Sign in
        </Button>
      </motion.div>
    )
  }

  if (loading && !hasListContent) {
    return (
      <motion.div key="market-test-history-loading" {...SOURCING_PANEL_MOTION}>
        <DiscoverHeroBoxLoadingSkeleton
          count={6}
          columns="metrics"
          metricColumns={MARKET_TEST_WORKSPACE_METRIC_COLUMNS}
        />
      </motion.div>
    )
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div key="market-test-history-panel" {...SOURCING_PANEL_MOTION} className="flex w-full min-w-0 flex-col gap-3">
        {showHistorySkeleton ? (
          <DiscoverHeroBoxLoadingSkeleton
            count={6}
            columns="metrics"
            metricColumns={MARKET_TEST_WORKSPACE_METRIC_COLUMNS}
          />
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : !hasListContent ? (
          <DiscoverHeroWorkspaceEmptyState
            accent="primary"
            icon={Store2Line}
            title="Your market reality checks live here"
            description="Describe an idea above and run a market test — results stay saved permanently."
          />
        ) : (
          <>
            {!hasFilteredContent && searchQuery.trim() ? (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                No market tests match &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              <DiscoverHeroWorkspaceTable
                ariaLabel="Market test workspace"
                columns="metrics"
                metricColumns={MARKET_TEST_WORKSPACE_METRIC_COLUMNS}
                listResetKey={`${refreshKey ?? ''}:${searchQuery}`}
                expandDisabled={workspaceDisabled}
              >
                {filteredPendingRows.map((row) => (
                  <MarketTestCard
                    key={row.id}
                    row={row}
                    disabled={workspaceDisabled}
                    onClick={() =>
                      navigate(MARKET_TEST_ROUTES.detail(String(row.id)), {
                        state: heroFromState,
                      })
                    }
                  />
                ))}
                {visibleCompletedRows.map((row) => (
                  <MarketTestCard
                    key={row.id}
                    row={row}
                    disabled={workspaceDisabled}
                    onClick={() =>
                      navigate(MARKET_TEST_ROUTES.detail(String(row.id)), {
                        state: heroFromState,
                      })
                    }
                    onDeleteRequest={() => setPendingDelete(row)}
                    onReRunRequest={
                      onReRun
                        ? () => onReRun(row)
                        : () => {
                            const term = row.query?.trim()
                            if (term)
                              navigate(MARKET_TEST_ROUTES.new, { state: { query: term } })
                          }
                    }
                  />
                ))}
              </DiscoverHeroWorkspaceTable>
            )}
            <RoomHeroDeleteConfirmDialog
              open={pendingDelete != null}
              itemName={pendingDelete?.query?.trim() || 'Untitled market test'}
              isDeleting={isDeleting}
              onConfirm={() => void confirmDelete()}
              onCancel={() => {
                if (!isDeleting) setPendingDelete(null)
              }}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

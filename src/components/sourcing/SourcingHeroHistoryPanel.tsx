import { useCallback, useEffect, useState, Fragment } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { History, PackageSearch } from '@/lib/icons'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { sourcingSearchResultsPath } from '@/lib/sourcingRoutes'
import type { SourcingHistoryRow } from '@/lib/sourcingTypes'
import { SourcingHistorySummary } from '@/components/sourcing/SourcingHistorySummary'
import { Button } from '@/components/ui/button'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
  SOURCING_WORKSPACE_METRIC_COLUMNS,
  useDiscoverHeroWorkspaceLayoutView,
} from '@/components/discover/DiscoverHeroBox'
import { discoverHeroButtonPrimaryClassName } from '@/components/discover/discoverHeroTokens'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/sonner'
import { deleteSourcingSearch } from '@/lib/facilityDeletes'
import { SOURCING_GRID_SIMULTANEOUS, SOURCING_ITEM_MOTION, SOURCING_PANEL_MOTION } from '@/lib/sourcingHeroMotion'

export function SourcingMySourcesChip({
  active,
  count,
  onClick,
}: {
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={count != null && count > 0 ? `My sources, ${count} saved searches` : 'My sources'}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-[colors,padding]',
        active
          ? 'border-primary/35 bg-primary/10 text-primary'
          : 'border-border-subtle/80 bg-background text-foreground/75 hover:border-primary/35 hover:bg-primary/5 hover:text-foreground',
      )}
    >
      <History className="h-3 w-3 shrink-0" aria-hidden />
      <span>My sources</span>
      {count != null && count > 0 ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}

export function SourcingHeroHistoryPanel({
  expanded,
  onHistoryCount,
  onHasContentChange,
  onReSearch,
}: {
  expanded: boolean
  onHistoryCount?: (count: number) => void
  onHasContentChange?: (has: boolean) => void
  onReSearch?: (row: SourcingHistoryRow) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const [rows, setRows] = useState<SourcingHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SourcingHistoryRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('sourcing_search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(50)
    if (fetchError) setError(fetchError.message)
    else {
      const next = (data as SourcingHistoryRow[]) ?? []
      setRows(next)
      onHistoryCount?.(next.length)
    }
    setLoading(false)
  }, [user?.id, onHistoryCount])

  useEffect(() => {
    if (!expanded) return
    if (!user?.id) return
    void load()
  }, [expanded, user?.id, load])

  const hasListContent = rows.length > 0
  const showSkeleton = loading && rows.length === 0

  useEffect(() => {
    if (!expanded) {
      onHasContentChange?.(false)
      return
    }
    if (!user?.id) {
      onHasContentChange?.(false)
      return
    }
    if (loading) return
    onHasContentChange?.(hasListContent)
  }, [expanded, user?.id, loading, hasListContent, onHasContentChange])

  async function confirmDeleteSourcing() {
    if (!pendingDelete?.search_id || !user?.id) return
    const targetId = pendingDelete.search_id
    const backup = rows
    setIsDeleting(true)
    setRows((prev) => prev.filter((r) => r.search_id !== targetId))
    setPendingDelete(null)
    try {
      await deleteSourcingSearch(targetId, user.id)
      toast.success('Deleted successfully')
      onHistoryCount?.(backup.length - 1)
    } catch {
      setRows(backup)
      toast.error('Delete failed. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!expanded) return null

  if (!user?.id) {
    return (
      <AnimatePresence initial={false}>
        <motion.div
          key="sign-in"
          {...SOURCING_PANEL_MOTION}
          className="rounded-lg border border-dashed border-border-subtle bg-muted/20 px-4 py-5 text-center"
        >
          <p className="text-[11px] font-medium text-foreground">Sign in to view your sourcing history</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={cn('mt-3 h-8', discoverHeroButtonPrimaryClassName)}
            onClick={() => navigate(landingSignInTo(roomPathForMode('sourcing')))}
          >
            Sign in
          </Button>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div key="history-panel" {...SOURCING_PANEL_MOTION} className="flex flex-col gap-3">
        {showSkeleton ? <DiscoverHeroBoxLoadingSkeleton /> : null}

        {error ? (
          <p className="px-0.5 text-[11px] text-destructive">{error}</p>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <DiscoverHeroWorkspaceEmptyState
            accent="primary"
            icon={PackageSearch}
            title="Your sourcing history appears here"
            description="Search for a product above and Access it from here."
          />
        ) : null}

        {rows.length > 0 ? (
          <motion.div
            variants={SOURCING_GRID_SIMULTANEOUS}
            initial="hidden"
            animate="visible"
          >
            <DiscoverHeroWorkspaceTable
              ariaLabel="Sourcing workspace"
              columns="metrics"
              metricColumns={SOURCING_WORKSPACE_METRIC_COLUMNS}
            >
              {rows.map((row) => {
                const summary = (
                  <SourcingHistorySummary
                    row={row}
                    onClick={() => navigate(sourcingSearchResultsPath(row.search_id))}
                    onDeleteRequest={() => setPendingDelete(row)}
                    onReSearchRequest={onReSearch ? () => onReSearch(row) : undefined}
                  />
                )
                return layout === 'table' ? (
                  <Fragment key={row.search_id}>{summary}</Fragment>
                ) : (
                  <motion.div
                    key={row.search_id}
                    variants={SOURCING_ITEM_MOTION}
                    className="flex h-full flex-col gap-2"
                  >
                    {summary}
                  </motion.div>
                )
              })}
            </DiscoverHeroWorkspaceTable>
          </motion.div>
        ) : null}

        <ConfirmDialog
          open={pendingDelete != null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setPendingDelete(null)
          }}
          title="Delete this search?"
          description={
            pendingDelete
              ? `Remove “${pendingDelete.keyword}” and its saved suppliers from your history.`
              : undefined
          }
          confirmLabel="Delete"
          confirming={isDeleting}
          onConfirm={() => void confirmDeleteSourcing()}
        />
      </motion.div>
    </AnimatePresence>
  )
}

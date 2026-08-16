import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookMarked } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace'
import { landingSignInTo } from '@/lib/authLanding'
import { USER_OPPORTUNITIES_FEED_SELECT_FLAT } from '@/lib/opportunitiesFeedSelect'
import { isCompleteUserResearch, RESEARCH_STATUS_COMPLETE } from '@/lib/userResearch'
import { BACKGROUND_JOB_COMPLETE_EVENT } from '@/lib/backgroundJobEvents'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import { ClarificationDraftCard } from '@/components/research/ClarificationDraftCard'
import { ResearchPendingCard } from '@/components/research/ResearchPendingCard'
import { SOURCING_PANEL_MOTION } from '@/lib/sourcingHeroMotion'

import { UserResearchCard } from '@/components/research/UserResearchCard'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RoomHeroDeleteConfirmDialog } from '@/components/shared/RoomHeroDeleteConfirmDialog'
import { toast } from '@/components/ui/sonner'
import { deleteResearch } from '@/lib/facilityDeletes'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
  sortByWorkspaceColumn,
  useDiscoverHeroWorkspaceLayout,
} from '@/components/discover/DiscoverHeroBox'
import { workspaceFinancialSortValues } from '@/components/discover/DiscoverHeroMetricStrip'
import {
  discoverHeroButtonPrimaryClassName,
} from '@/components/discover/discoverHeroTokens'
import { matchesWorkspaceSearch } from '@/lib/discoverHeroWorkspaceSearch'
import { cn } from '@/lib/utils'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import {
  recordResearchWorkspaceRecent,
  seedResearchWorkspaceRecentsIfEmpty,
} from '@/lib/composerSearchRecents'
import type { DbUserOpportunity } from '@/types/database'
import type { ClarificationDraft } from '@/types/research'

export type ResearchHeroHistoryRow = DbUserOpportunity & {
  research_version?: number | null
  research_query?: string | null
  research_status?: string | null
  research_style?: string | null
  model_used?: string | null
  byok_used?: boolean | null
  credits_used?: number | null
}

type ResearchRow = ResearchHeroHistoryRow

type PublishCatalogResult = {
  success?: boolean
  already_catalog?: boolean
  slug?: string
}

function publishCatalogErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('incomplete or failed')) return "This research isn't finished yet."
  if (normalized.includes('only publish your own')) return 'You can only publish your own research.'
  if (normalized.includes('admin role required')) return 'Admin access is required to publish research.'
  if (normalized.includes('not authenticated')) return 'Please sign in again before publishing.'
  if (normalized.includes('opportunity not found')) return 'This research item could not be found.'
  return message || 'Could not publish this research.'
}

export function ResearchHeroHistoryPanel({
  expanded,
  onHistoryCount,
  onHasContentChange,
  refreshKey,
  onReResearch,
  onResumeDraft,
  workspaceDisabled = false,
  reResearchingOpportunityId = null,
  searchQuery = '',
}: {
  expanded: boolean
  onHistoryCount?: (count: number) => void
  /** Fires when saved research / drafts / pending runs are present (or cleared). */
  onHasContentChange?: (has: boolean) => void
  refreshKey?: string | number
  onReResearch?: (row: ResearchHeroHistoryRow) => void
  onResumeDraft?: (draft: ClarificationDraft) => void
  /** Disables history cards while re-research runs or the section picker is open. */
  workspaceDisabled?: boolean
  reResearchingOpportunityId?: string | null
  searchQuery?: string
}) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const { activeProject, isLoading: workspaceLoading } = useActiveWorkspace()
  const backgroundJobs = useBackgroundJobsOptional()
  const projectPendingResearches = useMemo(() => {
    const pending = backgroundJobs?.activeResearches ?? []
    if (!activeProject?.id) return pending
    return pending.filter((row) => row.project_id === activeProject.id)
  }, [activeProject?.id, backgroundJobs?.activeResearches])
  const [rows, setRows] = useState<ResearchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    title?: string | null
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingPublish, setPendingPublish] = useState<ResearchRow | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState<ClarificationDraft | null>(null)
  const [pendingDiscardDraftId, setPendingDiscardDraftId] = useState<string | null>(null)
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id || !activeProject?.id) {
      setLoading(false)
      setHasFetched(true)
      return
    }
    setLoading(true)
    setError(null)

    const [oppResult, draftResult] = await Promise.all([
      supabase
        .from('user_opportunities')
        .select(USER_OPPORTUNITIES_FEED_SELECT_FLAT)
        .eq('user_id', user.id)
        .eq('project_id', activeProject.id)
        .eq('research_status', RESEARCH_STATUS_COMPLETE)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.rpc('get_active_clarification_draft', { p_user_id: user.id }),
    ])

    if (oppResult.error) setError(oppResult.error.message)
    else {
      const next = (oppResult.data as unknown as ResearchRow[]) ?? []
      setRows(next)
      // Sidebar recents should only surface the user's own private research —
      // never rows that were published to the public catalog (`visibility === 'catalog'`),
      // and only rows that actually originated from a research query.
      seedResearchWorkspaceRecentsIfEmpty(
        next
          .filter(
            (row) =>
              isCompleteUserResearch(row) &&
              row.visibility !== 'catalog' &&
              String(row.research_query ?? '').trim().length > 0,
          )
          .map((row) => ({
            query: String(row.research_query ?? '').trim(),
            slug: String(row.slug ?? '').trim(),
          })),
      )
    }

    if (!draftResult.error) {
      const raw = draftResult.data
      const draft = (Array.isArray(raw) ? raw[0] : raw) as ClarificationDraft | null
      const showDraft =
        draft != null && (draft.status === 'in_progress' || draft.status === 'ready')
      setActiveDraft(showDraft ? draft : null)
    }

    setLoading(false)
    setHasFetched(true)
  }, [user?.id, activeProject?.id])

  useEffect(() => {
    setHasFetched(false)
    void load()
  }, [expanded, load, refreshKey])

  useEffect(() => {
    const completeCount = rows.filter(isCompleteUserResearch).length
    onHistoryCount?.(completeCount + projectPendingResearches.length)
  }, [rows, projectPendingResearches.length, onHistoryCount])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail
      if (detail?.kind !== 'research') return
      void load()
      void backgroundJobs?.refetch()
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [backgroundJobs, load])

  const completeRows = useMemo(() => rows.filter(isCompleteUserResearch), [rows])
  const filteredDraft = useMemo(() => {
    if (!activeDraft) return null
    return matchesWorkspaceSearch(searchQuery, activeDraft.original_query)
      ? activeDraft
      : null
  }, [activeDraft, searchQuery])
  const filteredPending = useMemo(
    () =>
      projectPendingResearches.filter((pending) =>
        matchesWorkspaceSearch(searchQuery, pending.title),
      ),
    [projectPendingResearches, searchQuery],
  )
  const filteredCompleteRows = useMemo(
    () =>
      completeRows.filter((row) => matchesWorkspaceSearch(searchQuery, row.title)),
    [completeRows, searchQuery],
  )
  const { sortKey, sortDir } = useDiscoverHeroWorkspaceLayout()
  const sortedCompleteRows = useMemo(
    () =>
      sortByWorkspaceColumn(filteredCompleteRows, sortKey, sortDir, (row) =>
        workspaceFinancialSortValues({
          title: row.title,
          setup_min: row.setup_min,
          setup_max: row.setup_max,
          monthly_rev_min: row.monthly_rev_min,
          monthly_rev_max: row.monthly_rev_max,
          monthly_profit_min: row.monthly_profit_min,
          monthly_profit_max: row.monthly_profit_max,
          margin_pct: row.margin_pct,
        }),
      ),
    [filteredCompleteRows, sortKey, sortDir],
  )
  const visibleRows = sortedCompleteRows
  const hasListContent =
    completeRows.length > 0 || activeDraft != null || projectPendingResearches.length > 0
  const hasFilteredContent =
    filteredCompleteRows.length > 0 || filteredDraft != null || filteredPending.length > 0
  const showHistorySkeleton =
    loading && !hasListContent

  useEffect(() => {
    if (!expanded) {
      onHasContentChange?.(false)
      return
    }
    if (!user?.id || !activeProject?.id) {
      onHasContentChange?.(false)
      return
    }
    if (workspaceLoading || loading || !hasFetched) {
      onHasContentChange?.(true)
      return
    }
    onHasContentChange?.(hasListContent)
  }, [
    expanded,
    user?.id,
    workspaceLoading,
    activeProject?.id,
    loading,
    hasFetched,
    hasListContent,
    onHasContentChange,
  ])

  async function confirmDiscardDraft() {
    if (!pendingDiscardDraftId || !user?.id) return
    setIsDiscardingDraft(true)
    try {
      await supabase.rpc('abandon_clarification_draft', {
        p_draft_id: pendingDiscardDraftId,
        p_user_id: user.id,
      })
      setActiveDraft(null)
      toast.success('Draft discarded')
    } catch {
      toast.error('Could not discard draft. Please try again.')
    } finally {
      setIsDiscardingDraft(false)
      setPendingDiscardDraftId(null)
    }
  }

  async function confirmDeleteResearch() {
    if (!pendingDelete?.id || !user?.id) return
    const targetId = pendingDelete.id
    const backup = rows
    const wasPending = projectPendingResearches.some((r) => r.id === targetId)
    setIsDeleting(true)
    setRows((prev) => prev.filter((r) => r.id !== targetId))
    try {
      await deleteResearch(targetId, user.id)
      if (wasPending) {
        await backgroundJobs?.refetch({ includeResearches: true })
      }
      toast.success('Deleted successfully')
      const remainingPending = wasPending
        ? Math.max(0, projectPendingResearches.length - 1)
        : projectPendingResearches.length
      onHistoryCount?.(
        backup.filter(isCompleteUserResearch).filter((r) => r.id !== targetId).length +
          remainingPending,
      )
      setPendingDelete(null)
    } catch {
      setRows(backup)
      toast.error('Delete failed. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmPublishResearch() {
    if (!pendingPublish?.id || !user?.id || !isAdmin) return
    const targetId = pendingPublish.id
    setPublishingId(targetId)
    try {
      const { data, error: publishError } = await supabase.rpc(
        'publish_opportunity_to_catalog',
        { p_opportunity_id: targetId },
      )
      if (publishError) {
        throw new Error(publishCatalogErrorMessage(publishError.message))
      }

      const result = (data ?? {}) as PublishCatalogResult
      const nextSlug = String(result.slug ?? '').trim()
      if (result.success !== true || !nextSlug) {
        throw new Error('The research was published, but the public slug was missing.')
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === targetId
            ? {
                ...row,
                visibility: 'catalog',
                status: 'published',
                slug: nextSlug,
              }
            : row,
        ),
      )
      toast.success(
        result.already_catalog ? 'Already in the catalog' : 'Published to catalog',
        { description: `/o/${nextSlug}` },
      )
      setPendingPublish(null)
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? publishCatalogErrorMessage(cause.message)
          : 'Could not publish this research.',
      )
    } finally {
      setPublishingId(null)
    }
  }

  if (!expanded) return null

  if (!user) {
    return (
      <motion.div key="research-history-signin" {...SOURCING_PANEL_MOTION} className="rounded-xl border border-border-subtle bg-bg-sunken/40 px-4 py-6 text-center">
        <p className="text-[11px] font-medium text-foreground">Sign in to view your research</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn('mt-3', discoverHeroButtonPrimaryClassName)}
          onClick={() => navigate(landingSignInTo('/my-research'))}
        >
          Sign in
        </Button>
      </motion.div>
    )
  }

  if (workspaceLoading) {
    return (
      <motion.div key="research-history-loading" {...SOURCING_PANEL_MOTION}>
        <DiscoverHeroBoxLoadingSkeleton columns="metrics" />
      </motion.div>
    )
  }

  if (!activeProject?.id) {
    return (
      <motion.div key="research-history-no-project" {...SOURCING_PANEL_MOTION} className="rounded-xl border border-dashed border-border-subtle bg-muted/20 px-4 py-6 text-center">
        <p className="text-[12px] font-medium text-foreground">Preparing your account…</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Try again in a moment</p>
      </motion.div>
    )
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key="research-history-panel"
        {...SOURCING_PANEL_MOTION}
        className="flex flex-col gap-3"
      >
        {showHistorySkeleton ? (
          <DiscoverHeroBoxLoadingSkeleton columns="metrics" />
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : !hasListContent ? (
          <DiscoverHeroWorkspaceEmptyState
            accent="primary"
            icon={BookMarked}
            title="All your research appears here"
            description="Explore an Idea and Access it from here."
          />
        ) : (
          <>
            {!hasFilteredContent && searchQuery.trim() ? (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                No research matches &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              <DiscoverHeroWorkspaceTable
                ariaLabel="Research workspace"
                columns="metrics"
                listResetKey={`${refreshKey ?? ''}:${searchQuery}`}
                expandDisabled={workspaceDisabled}
              >
                {filteredDraft ? (
                    <ClarificationDraftCard
                      key={`draft-${filteredDraft.id}`}
                      draft={{
                        id: filteredDraft.id,
                        original_query: filteredDraft.original_query,
                        country: filteredDraft.country,
                        current_round: filteredDraft.current_round,
                        status:
                          filteredDraft.status === 'ready' ? 'ready' : 'in_progress',
                        updated_at: filteredDraft.updated_at,
                      }}
                      disabled={workspaceDisabled}
                      onResume={(draftId) => {
                        if (filteredDraft.id === draftId) onResumeDraft?.(filteredDraft)
                      }}
                      onDiscard={(draftId) => setPendingDiscardDraftId(draftId)}
                    />
                ) : null}
                {filteredPending.map((pending) => (
                    <ResearchPendingCard
                      key={`pending-${pending.id}`}
                      research={pending}
                      disabled={workspaceDisabled}
                      onDeleteRequest={() =>
                        setPendingDelete({
                          id: pending.id,
                          title: pending.title?.trim() || pending.research_query,
                        })
                      }
                    />
                ))}
                {visibleRows.map((row) => (
                    <UserResearchCard
                      key={row.id}
                      title={String(row.title ?? '')}
                      slug={String(row.slug ?? '')}
                      researchQuery={row.research_query}
                      categorySlug={row.category_slug}
                      researchStyle={row.research_style}
                      modelUsed={row.model_used}
                      setupMin={row.setup_min}
                      setupMax={row.setup_max}
                      monthlyRevMin={row.monthly_rev_min}
                      monthlyRevMax={row.monthly_rev_max}
                      monthlyProfitMin={row.monthly_profit_min}
                      monthlyProfitMax={row.monthly_profit_max}
                      marginPct={row.margin_pct}
                      ease={row.ease}
                      onClick={() => {
                        const slug = String(row.slug ?? '').trim()
                        const query = String(row.research_query ?? row.title ?? '').trim()
                        recordResearchWorkspaceRecent({ query, slug })
                        const detailPath =
                          row.visibility === 'catalog'
                            ? `/o/${encodeURIComponent(slug)}`
                            : `/my-research/${encodeURIComponent(slug)}`
                        navigate(detailPath, {
                          state: heroFromState,
                        })
                      }}
                      onDeleteRequest={() => setPendingDelete(row)}
                      onReResearchRequest={
                        onReResearch ? () => onReResearch(row) : undefined
                      }
                      onPublishRequest={
                        isAdmin &&
                        row.user_id === user.id &&
                        row.research_status === RESEARCH_STATUS_COMPLETE &&
                        row.visibility !== 'catalog'
                          ? () => setPendingPublish(row)
                          : undefined
                      }
                      disabled={workspaceDisabled || publishingId === row.id}
                      isPublishing={publishingId === row.id}
                      isReResearching={
                        reResearchingOpportunityId != null &&
                        row.id === reResearchingOpportunityId
                      }
                    />
                ))}
              </DiscoverHeroWorkspaceTable>
            )}
            <ConfirmDialog
              open={pendingPublish != null}
              title="Add this research to the catalog?"
              description={`“${String(pendingPublish?.title ?? '').trim() || 'Untitled'}” will receive a new public slug and become publicly accessible. This action cannot be reversed here.`}
              confirmLabel="Add to catalog"
              cancelLabel="Cancel"
              loading={publishingId != null}
              onConfirm={() => void confirmPublishResearch()}
              onCancel={() => {
                if (!publishingId) setPendingPublish(null)
              }}
            />
            <ConfirmDialog
              open={pendingDiscardDraftId != null}
              title="Discard this research session?"
              description="Your clarification answers will be removed. You can start a new research session anytime."
              confirmLabel="Discard"
              cancelLabel="Cancel"
              destructive
              onConfirm={() => void confirmDiscardDraft()}
              onCancel={() => {
                if (!isDiscardingDraft) setPendingDiscardDraftId(null)
              }}
            />
            <RoomHeroDeleteConfirmDialog
              open={pendingDelete != null}
              itemName={String(pendingDelete?.title ?? '').trim() || 'Untitled'}
              isDeleting={isDeleting}
              onConfirm={() => void confirmDeleteResearch()}
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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import { RoadmapHistoryCard } from '@/components/roadmap/RoadmapHistoryCard'
import { useAuth } from '@/contexts/AuthContext'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import type { ActiveRoadmap } from '@/hooks/useBackgroundJobs'
import { usePlanUpsell } from '@/hooks/usePlanUpsell'
import { Map } from '@/lib/icons'
import { generateRoadmap } from '@/lib/roadmapApi'
import { deleteRoadmap } from '@/lib/facilityDeletes'
import { roadmapDetailPath } from '@/lib/discoverHeroRoutes'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { CLARIFY_STATE_UPDATED_EVENT } from '@/lib/clarifyStateEvents'
import {
  BACKGROUND_JOB_COMPLETE_EVENT,
  dispatchBackgroundJobsRefetch,
} from '@/lib/backgroundJobEvents'
import { roadmapCountryFromMetadata } from '@/lib/roadmapPreferences'
import { SOURCING_GRID_SIMULTANEOUS, SOURCING_ITEM_MOTION, SOURCING_PANEL_MOTION } from '@/lib/sourcingHeroMotion'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { RoomHeroDeleteConfirmDialog } from '@/components/shared/RoomHeroDeleteConfirmDialog'
import { parseClarifyState } from '@/types/clarifyState'
import { isPersona } from '@/types/persona'
import type { UserRoadmap } from '@/pages/roadmap/roadmapTypes'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
} from '@/components/discover/DiscoverHeroBox'
import { matchesWorkspaceSearch } from '@/lib/discoverHeroWorkspaceSearch'
import { cn } from '@/lib/utils'

type Props = {
  refreshKey?: number
  generating?: boolean
  generatingMessage?: string
  onResumeClarify?: (roadmap: UserRoadmap) => void
  onHistoryCount?: (count: number) => void
  workspaceDisabled?: boolean
  searchQuery?: string
}

function normalizeRoadmapRow(row: Record<string, unknown>): UserRoadmap {
  return {
    ...(row as UserRoadmap),
    persona: isPersona(row.persona) ? row.persona : null,
    clarify_state: parseClarifyState(row.clarify_state),
  }
}

function pendingRoadmapToCard(row: ActiveRoadmap): UserRoadmap {
  const title = row.title?.trim() || row.goal_input?.trim() || 'Roadmap'
  return {
    id: row.id,
    user_id: '',
    goal_input: row.goal_input ?? '',
    title,
    subtitle: null,
    domain: 'general',
    context_summary: null,
    total_phases: 0,
    total_milestones: 0,
    total_tasks: 0,
    total_weeks: 0,
    difficulty: 'intermediate',
    opening_message: null,
    closing_message: null,
    success_vision: null,
    generation_status: row.generation_status,
    credits_used: 0,
    tags: [],
    created_at: row.created_at,
    updated_at: row.created_at,
  }
}

export function RoadmapRoomPanel({
  refreshKey = 0,
  generating = false,
  generatingMessage,
  onResumeClarify,
  onHistoryCount,
  workspaceDisabled = false,
  searchQuery = '',
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const { user } = useAuth()
  const backgroundJobs = useBackgroundJobsOptional()
  const pendingRoadmaps = useMemo(
    () => backgroundJobs?.activeRoadmaps ?? [],
    [backgroundJobs?.activeRoadmaps],
  )
  const showPlanUpsell = usePlanUpsell()

  const [roadmaps, setRoadmaps] = useState<UserRoadmap[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserRoadmap | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchRoadmaps = useCallback(async () => {
    if (!user?.id) {
      setRoadmaps([])
      setListError(null)
      setLoadingList(false)
      onHistoryCount?.(0)
      return
    }

    setLoadingList(true)
    setListError(null)

    try {
      const { data, error } = await supabase
        .from('user_roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .in('generation_status', ['complete', 'clarifying'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const next = (data ?? []).map((row) => normalizeRoadmapRow(row as Record<string, unknown>))
      setRoadmaps(next)
    } catch (err) {
      console.error(err)
      setRoadmaps([])
      setListError(err instanceof Error ? err.message : 'Could not load roadmaps.')
      onHistoryCount?.(0)
    } finally {
      setLoadingList(false)
    }
  }, [user?.id])

  useEffect(() => {
    void fetchRoadmaps()
  }, [fetchRoadmaps, refreshKey])

  useEffect(() => {
    const completeCount = roadmaps.filter((r) => r.generation_status === 'complete').length
    const clarifyingCount = roadmaps.filter((r) => r.generation_status === 'clarifying').length
    onHistoryCount?.(completeCount + clarifyingCount + pendingRoadmaps.length)
  }, [roadmaps, pendingRoadmaps.length, onHistoryCount])

  useEffect(() => {
    const onClarifyUpdated = () => {
      void fetchRoadmaps()
    }
    window.addEventListener(CLARIFY_STATE_UPDATED_EVENT, onClarifyUpdated)
    return () => window.removeEventListener(CLARIFY_STATE_UPDATED_EVENT, onClarifyUpdated)
  }, [fetchRoadmaps])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail
      if (detail?.kind !== 'roadmap') return
      void fetchRoadmaps()
      void backgroundJobs?.refetch()
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [backgroundJobs, fetchRoadmaps])

  const handleRegenerate = async (roadmap: UserRoadmap) => {
    const regenModel =
      (roadmap.metadata?.model as 'flash-lite' | 'flash' | 'pro' | undefined) ?? 'flash'
    const regenCountry = roadmapCountryFromMetadata(roadmap.metadata)
    setRegeneratingId(roadmap.id)
    try {
      await generateRoadmap(roadmap.goal_input, {
        roadmapId: roadmap.id,
        model: regenModel,
        country: regenCountry,
        persona: roadmap.persona ?? null,
      })
      dispatchBackgroundJobsRefetch()
      navigate(roadmapDetailPath(roadmap.id), { state: heroFromState })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Regeneration failed'
      if (
        msg === 'insufficient_credits' ||
        msg === 'no_active_subscription' ||
        msg === 'feature_locked' ||
        msg === 'limit_exceeded'
      ) {
        showPlanUpsell(e)
      } else {
        toast.error('Regeneration failed')
      }
    } finally {
      setRegeneratingId(null)
    }
  }

  const confirmDeleteRoadmap = async () => {
    if (!pendingDelete || !user?.id || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteRoadmap(pendingDelete.id, user.id)
      setRoadmaps((prev) => prev.filter((r) => r.id !== pendingDelete.id))
      setPendingDelete(null)
      toast.success('Roadmap deleted')
    } catch {
      toast.error('Could not delete roadmap')
    } finally {
      setIsDeleting(false)
    }
  }

  const filterRoadmap = useCallback(
    (roadmap: UserRoadmap) =>
      matchesWorkspaceSearch(searchQuery, roadmap.title, roadmap.goal_input),
    [searchQuery],
  )

  const clarifyingRoadmaps = useMemo(
    () => roadmaps.filter((r) => r.generation_status === 'clarifying').filter(filterRoadmap),
    [roadmaps, filterRoadmap],
  )
  const generatingRoadmaps = useMemo(
    () => pendingRoadmaps.map(pendingRoadmapToCard).filter(filterRoadmap),
    [pendingRoadmaps, filterRoadmap],
  )
  const completeRoadmaps = useMemo(
    () => roadmaps.filter((r) => r.generation_status === 'complete').filter(filterRoadmap),
    [roadmaps, filterRoadmap],
  )
  const visibleComplete = completeRoadmaps
  const hasListContent = roadmaps.length > 0 || pendingRoadmaps.length > 0
  const hasFilteredContent =
    clarifyingRoadmaps.length > 0 ||
    generatingRoadmaps.length > 0 ||
    completeRoadmaps.length > 0

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key="roadmap-history-panel"
        {...SOURCING_PANEL_MOTION}
        data-tour="roadmap-history"
        className="flex flex-col gap-3"
      >
        {generating ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-muted/15 px-6 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border-default border-t-primary" />
            <p className="text-[1.1rem] font-semibold text-foreground">Generating your roadmap</p>
            {generatingMessage ? (
              <p className="animate-pulse text-sm text-muted-foreground">{generatingMessage}</p>
            ) : null}
          </div>
        ) : null}

        {loadingList && !hasListContent ? (
          <DiscoverHeroBoxLoadingSkeleton count={3} />
        ) : listError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {listError}
          </div>
        ) : !hasListContent && !generating ? (
          <DiscoverHeroWorkspaceEmptyState
            accent="primary"
            icon={Map}
            title="Your roadmaps appear here"
            description="No roadmaps yet. Describe a goal above and hit Generate."
          />
        ) : hasListContent ? (
          <>
            {!hasFilteredContent && searchQuery.trim() ? (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                No roadmaps match &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              <motion.div
                variants={SOURCING_GRID_SIMULTANEOUS}
                initial="hidden"
                animate="visible"
              >
              <DiscoverHeroWorkspaceTable
                ariaLabel="Roadmap workspace"
                listResetKey={`${refreshKey ?? ''}:${searchQuery}`}
                expandDisabled={workspaceDisabled}
              >
                {generatingRoadmaps.map((rm) => (
                  <motion.div
                    key={rm.id}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <RoadmapHistoryCard roadmap={rm} disabled={workspaceDisabled} />
                  </motion.div>
                ))}
                {clarifyingRoadmaps.map((rm) => (
                  <motion.div
                    key={rm.id}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <RoadmapHistoryCard
                      roadmap={rm}
                      disabled={workspaceDisabled}
                      onResumeClarify={onResumeClarify}
                    />
                  </motion.div>
                ))}
                {visibleComplete.map((rm) => (
                  <motion.div
                    key={rm.id}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <RoadmapHistoryCard
                      roadmap={rm}
                      disabled={workspaceDisabled}
                      regenerating={regeneratingId === rm.id}
                      onRegenerate={(r) => void handleRegenerate(r)}
                      onDeleteRequest={setPendingDelete}
                    />
                  </motion.div>
                ))}
              </DiscoverHeroWorkspaceTable>
              </motion.div>
            )}
            <RoomHeroDeleteConfirmDialog
              open={pendingDelete != null}
              itemName={pendingDelete?.title?.trim() || pendingDelete?.goal_input?.trim() || 'Untitled roadmap'}
              isDeleting={isDeleting}
              onConfirm={() => void confirmDeleteRoadmap()}
              onCancel={() => {
                if (!isDeleting) setPendingDelete(null)
              }}
            />
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}

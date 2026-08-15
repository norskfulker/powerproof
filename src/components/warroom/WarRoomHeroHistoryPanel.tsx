import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Swords } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { normalizeUserPlaybook } from '@/lib/normalizePlaybookSteps'
import { USER_PLAYBOOKS_LIST_SELECT } from '@/lib/userPlaybooksSelect'
import { BACKGROUND_JOB_COMPLETE_EVENT } from '@/lib/backgroundJobEvents'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import type { ActivePlaybook } from '@/hooks/useBackgroundJobs'
import { WarRoomIntakeDraftCard } from '@/components/warroom/WarRoomIntakeDraftCard'
import { WarRoomPlaybookPendingCard } from '@/components/warroom/WarRoomPlaybookPendingCard'
import { PlaybookHistoryRow } from '@/components/warroom/WarRoomPlaybookCard'
import { SOURCING_GRID_SIMULTANEOUS, SOURCING_ITEM_MOTION, SOURCING_PANEL_MOTION } from '@/lib/sourcingHeroMotion'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RoomHeroDeleteConfirmDialog } from '@/components/shared/RoomHeroDeleteConfirmDialog'
import { toast } from '@/components/ui/sonner'
import { deletePlaybook } from '@/lib/facilityDeletes'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
} from '@/components/discover/DiscoverHeroBox'
import {
  discoverHeroButtonPrimaryClassName,
} from '@/components/discover/discoverHeroTokens'
import {
  clearWarRoomIntakeDraft,
  loadWarRoomIntakeDraft,
  WAR_ROOM_DRAFT_UPDATED_EVENT,
  type WarRoomIntakeDraft,
} from '@/lib/warRoomDraft'
import { playbookCardTitle } from '@/lib/playbookDisplay'
import { CLARIFY_STATE_UPDATED_EVENT } from '@/lib/clarifyStateEvents'
import { matchesWorkspaceSearch } from '@/lib/discoverHeroWorkspaceSearch'
import { cn } from '@/lib/utils'
import type { UserPlaybook } from '@/lib/playbookTypes'

const PLAYBOOK_STATUS_COMPLETE = 'complete' as const
const PLAYBOOK_STATUS_CLARIFYING = 'clarifying' as const

function isCompletePlaybook(row: UserPlaybook) {
  return row.generation_status === PLAYBOOK_STATUS_COMPLETE
}

function isClarifyingPlaybook(row: UserPlaybook) {
  return row.generation_status === PLAYBOOK_STATUS_CLARIFYING
}

export function WarRoomHeroHistoryPanel({
  expanded,
  onHistoryCount,
  onHasContentChange,
  refreshKey,
  warRoomPhase = 'idle',
  onReRunPlaybook,
  onResumeClarifyPlaybook,
  onResumeIntakeDraft,
  onDiscardIntakeDraft,
  workspaceDisabled = false,
  searchQuery = '',
}: {
  expanded: boolean
  onHistoryCount?: (count: number) => void
  onHasContentChange?: (has: boolean) => void
  refreshKey?: string | number
  warRoomPhase?: string
  onReRunPlaybook?: (playbook: UserPlaybook) => void
  onResumeClarifyPlaybook?: (playbook: UserPlaybook) => void
  onResumeIntakeDraft?: () => void
  onDiscardIntakeDraft?: () => void
  workspaceDisabled?: boolean
  searchQuery?: string
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const backgroundJobs = useBackgroundJobsOptional()
  const pendingPlaybooks = useMemo(
    () => backgroundJobs?.activePlaybooks ?? [],
    [backgroundJobs?.activePlaybooks],
  )

  const [rows, setRows] = useState<UserPlaybook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<UserPlaybook | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [intakeDraft, setIntakeDraft] = useState<WarRoomIntakeDraft | null>(null)
  const [pendingDiscardDraft, setPendingDiscardDraft] = useState(false)
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)

    try {
      const [playbookResult, draft] = await Promise.all([
        supabase
          .from('user_playbooks')
          .select(USER_PLAYBOOKS_LIST_SELECT)
          .eq('user_id', user.id)
          .in('generation_status', [PLAYBOOK_STATUS_COMPLETE, PLAYBOOK_STATUS_CLARIFYING])
          .order('created_at', { ascending: false })
          .limit(50),
        loadWarRoomIntakeDraft(user.id),
      ])

      if (playbookResult.error) setError(playbookResult.error.message)
      else {
        const next = (playbookResult.data ?? []).map((row) =>
          normalizeUserPlaybook(row as Record<string, unknown>),
        )
        setRows(next)
        onHistoryCount?.(next.filter(isCompletePlaybook).length)
      }

      const showDraft = Boolean(draft?.business_description?.trim())
      setIntakeDraft(showDraft ? draft : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load playbooks.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, onHistoryCount])

  useEffect(() => {
    if (!expanded) return
    void load()
  }, [expanded, load, refreshKey])

  useEffect(() => {
    const onDraftUpdated = () => {
      if (!user?.id) return
      void loadWarRoomIntakeDraft(user.id).then((draft) => {
        const showDraft = Boolean(draft?.business_description?.trim())
        setIntakeDraft(showDraft ? draft : null)
      })
    }
    window.addEventListener(WAR_ROOM_DRAFT_UPDATED_EVENT, onDraftUpdated)
    return () => window.removeEventListener(WAR_ROOM_DRAFT_UPDATED_EVENT, onDraftUpdated)
  }, [user?.id])

  useEffect(() => {
    const onClarifyUpdated = () => {
      if (!expanded) return
      void load()
    }
    window.addEventListener(CLARIFY_STATE_UPDATED_EVENT, onClarifyUpdated)
    return () => window.removeEventListener(CLARIFY_STATE_UPDATED_EVENT, onClarifyUpdated)
  }, [expanded, load])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail
      if (detail?.kind !== 'playbook') return
      void load()
      void backgroundJobs?.refetch()
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [backgroundJobs, load])

  const completeRows = useMemo(() => rows.filter(isCompletePlaybook), [rows])
  const clarifyingRows = useMemo(() => rows.filter(isClarifyingPlaybook), [rows])
  const filteredCompleteRows = useMemo(
    () =>
      completeRows.filter((row) =>
        matchesWorkspaceSearch(searchQuery, playbookCardTitle(row)),
      ),
    [completeRows, searchQuery],
  )
  const filteredClarifyingRows = useMemo(
    () =>
      clarifyingRows.filter((row) =>
        matchesWorkspaceSearch(searchQuery, playbookCardTitle(row)),
      ),
    [clarifyingRows, searchQuery],
  )
  const filteredPendingPlaybooks = useMemo(
    () =>
      pendingPlaybooks.filter((pending) =>
        matchesWorkspaceSearch(searchQuery, pending.business_name),
      ),
    [pendingPlaybooks, searchQuery],
  )
  const filteredIntakeDraft = useMemo(() => {
    if (!intakeDraft) return null
    return matchesWorkspaceSearch(
      searchQuery,
      intakeDraft.business_name,
      intakeDraft.business_description,
    )
      ? intakeDraft
      : null
  }, [intakeDraft, searchQuery])
  const visibleRows = filteredCompleteRows

  const hideIntakeDraft =
    warRoomPhase === 'generating' ||
    warRoomPhase === 'done' ||
    pendingPlaybooks.length > 0

  const visibleIntakeDraft = hideIntakeDraft ? null : filteredIntakeDraft
  const intakeScoutingLive = warRoomPhase === 'scouting'

  const hasListContent =
    completeRows.length > 0 ||
    clarifyingRows.length > 0 ||
    (hideIntakeDraft ? false : intakeDraft != null) ||
    pendingPlaybooks.length > 0
  const hasFilteredContent =
    filteredCompleteRows.length > 0 ||
    filteredClarifyingRows.length > 0 ||
    visibleIntakeDraft != null ||
    filteredPendingPlaybooks.length > 0

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

  async function confirmDiscardDraft() {
    if (!user?.id) return
    setIsDiscardingDraft(true)
    try {
      await clearWarRoomIntakeDraft(user.id)
      setIntakeDraft(null)
      onDiscardIntakeDraft?.()
      toast.success('Draft discarded')
    } catch {
      toast.error('Could not discard draft. Please try again.')
    } finally {
      setIsDiscardingDraft(false)
      setPendingDiscardDraft(false)
    }
  }

  async function confirmDeletePlaybook() {
    if (!pendingDelete?.id || !user?.id) return
    const targetId = pendingDelete.id
    const backup = rows
    setIsDeleting(true)
    setRows((prev) => prev.filter((p) => p.id !== targetId))
    try {
      await deletePlaybook(targetId, user.id)
      toast.success('Deleted successfully')
      onHistoryCount?.(
        backup.filter(isCompletePlaybook).filter((r) => r.id !== targetId).length,
      )
      setPendingDelete(null)
    } catch {
      setRows(backup)
      toast.error('Delete failed. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!expanded) return null

  if (!user) {
    return (
      <motion.div
        key="war-room-history-signin"
        {...SOURCING_PANEL_MOTION}
        className="rounded-xl border border-border-subtle bg-bg-sunken/40 px-4 py-6 text-center"
      >
        <p className="text-[11px] font-medium text-foreground">Sign in to view your playbooks</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn('mt-3', discoverHeroButtonPrimaryClassName)}
          onClick={() => navigate(landingSignInTo(roomPathForMode('war-room')))}
        >
          Sign in
        </Button>
      </motion.div>
    )
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div key="war-room-history-panel" {...SOURCING_PANEL_MOTION} className="flex flex-col gap-3">
        {loading ? (
          <DiscoverHeroBoxLoadingSkeleton count={2} />
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : !hasListContent ? (
          <DiscoverHeroWorkspaceEmptyState
            accent="warRoom"
            icon={Swords}
            title="All your playbooks appear here"
            description="Describe your business above and deploy a War Room to generate your first battle plan."
          />
        ) : (
          <>
            {!hasFilteredContent && searchQuery.trim() ? (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                No playbooks match &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              <motion.div
                variants={SOURCING_GRID_SIMULTANEOUS}
                initial="hidden"
                animate="visible"
              >
              <DiscoverHeroWorkspaceTable
                ariaLabel="War Room workspace"
                listResetKey={`${refreshKey ?? ''}:${searchQuery}`}
                expandDisabled={workspaceDisabled}
              >
                {visibleIntakeDraft && onResumeIntakeDraft ? (
                  <motion.div
                    key="war-room-intake-draft"
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <WarRoomIntakeDraftCard
                      draft={visibleIntakeDraft}
                      isScoutingLive={intakeScoutingLive}
                      disabled={workspaceDisabled}
                      onResume={onResumeIntakeDraft}
                      onDiscard={() => setPendingDiscardDraft(true)}
                    />
                  </motion.div>
                ) : null}
                {filteredPendingPlaybooks.map((pending: ActivePlaybook) => (
                  <motion.div
                    key={`pending-${pending.id}`}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <WarRoomPlaybookPendingCard playbook={pending} />
                  </motion.div>
                ))}
                {filteredClarifyingRows.map((row) => (
                  <motion.div
                    key={row.id}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <PlaybookHistoryRow
                      playbook={row}
                      disabled={workspaceDisabled}
                      onResumeClarify={onResumeClarifyPlaybook}
                      onDeleteRequest={() => setPendingDelete(row)}
                    />
                  </motion.div>
                ))}
                {visibleRows.map((row) => (
                  <motion.div
                    key={row.id}
                    variants={SOURCING_ITEM_MOTION}
                    className="h-full"
                  >
                    <PlaybookHistoryRow
                      playbook={row}
                      disabled={workspaceDisabled}
                      onDeleteRequest={() => setPendingDelete(row)}
                      onReRunRequest={onReRunPlaybook}
                    />
                  </motion.div>
                ))}
              </DiscoverHeroWorkspaceTable>
              </motion.div>
            )}
            <ConfirmDialog
              open={pendingDiscardDraft}
              title="Discard this War Room session?"
              description="Your scouting progress will be removed. You can start a new War Room anytime."
              confirmLabel="Discard"
              cancelLabel="Cancel"
              destructive
              onConfirm={() => void confirmDiscardDraft()}
              onCancel={() => {
                if (!isDiscardingDraft) setPendingDiscardDraft(false)
              }}
            />
            <RoomHeroDeleteConfirmDialog
              open={pendingDelete != null}
              itemName={pendingDelete ? playbookCardTitle(pendingDelete) : ''}
              isDeleting={isDeleting}
              onConfirm={() => void confirmDeletePlaybook()}
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

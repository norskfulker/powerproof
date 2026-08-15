import { Swords } from '@/lib/icons'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceTable,
} from '@/components/discover/DiscoverHeroBox'
import { PlaybookHistoryRow } from '@/components/warroom/WarRoomPlaybookCard'
import { WarRoomIntakeDraftCard } from '@/components/warroom/WarRoomIntakeDraftCard'
import { WarRoomPlaybookPendingCard } from '@/components/warroom/WarRoomPlaybookPendingCard'
import { cn } from '@/lib/utils'
import { useUserPlaybooks } from '@/hooks/useUserPlaybooks'
import type { WarRoomIntakeDraft } from '@/lib/warRoomDraft'
import type { UserPlaybook } from '@/lib/playbookTypes'

export { PlaybookHistoryRow } from '@/components/warroom/WarRoomPlaybookCard'

export function WarRoomPlaybookHistory({
  userId,
  projectId,
  className,
  embedded = false,
  playbooks: playbooksProp,
  loading: loadingProp,
  error: errorProp,
  intakeDraft = null,
  intakeScoutingLive = false,
  onResumeIntakeDraft,
  onDiscardIntakeDraft,
  onDeleteRequest,
  onReRunRequest,
}: {
  userId: string | undefined
  projectId: string | null
  className?: string
  embedded?: boolean
  playbooks?: UserPlaybook[]
  loading?: boolean
  error?: string | null
  intakeDraft?: WarRoomIntakeDraft | null
  intakeScoutingLive?: boolean
  onResumeIntakeDraft?: () => void
  onDiscardIntakeDraft?: () => void
  onDeleteRequest?: (playbook: UserPlaybook) => void
  onReRunRequest?: (playbook: UserPlaybook) => void
}) {
  const useInternalFetch = playbooksProp === undefined
  const fetched = useUserPlaybooks(useInternalFetch ? userId : undefined, useInternalFetch ? projectId : null)
  const playbooks = playbooksProp ?? fetched.playbooks
  const loading = loadingProp ?? fetched.loading
  const error = errorProp ?? fetched.error

  const showIntakeDraft =
    intakeDraft?.business_description?.trim() &&
    onResumeIntakeDraft &&
    onDiscardIntakeDraft

  const hasListContent = playbooks.length > 0 || Boolean(showIntakeDraft)

  return (
    <section className={cn('flex flex-col gap-4', embedded && 'gap-3', className)}>
      {!embedded ? (
        <div>
          <h2 className="font-sans text-lg font-bold text-foreground">Your playbooks</h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            All War Room plans you have generated.
          </p>
        </div>
      ) : null}

      {loading ? (
        <DiscoverHeroBoxLoadingSkeleton count={2} />
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 font-sans text-sm text-destructive">
          Could not load playbooks: {error}
        </div>
      ) : !hasListContent ? (
        <DiscoverHeroWorkspaceEmptyState
          accent="warRoom"
          icon={Swords}
          title="No playbooks yet"
          description="Describe your business above and deploy a War Room to generate your first battle plan."
        />
      ) : (
        <DiscoverHeroWorkspaceTable ariaLabel="War Room playbooks">
          {showIntakeDraft ? (
            <WarRoomIntakeDraftCard
              key="war-room-intake-draft"
              draft={intakeDraft!}
              isScoutingLive={intakeScoutingLive}
              onResume={onResumeIntakeDraft!}
              onDiscard={onDiscardIntakeDraft!}
            />
          ) : null}
          {playbooks.map((pb) =>
            pb.generation_status === 'pending' ? (
              <WarRoomPlaybookPendingCard
                key={pb.id}
                playbook={{
                  id: pb.id,
                  business_name: pb.business_name,
                  generation_status: 'pending',
                  project_id: pb.project_id,
                  created_at: pb.created_at,
                }}
              />
            ) : (
              <PlaybookHistoryRow
                key={pb.id}
                playbook={pb}
                onDeleteRequest={onDeleteRequest}
                onReRunRequest={onReRunRequest}
              />
            ),
          )}
        </DiscoverHeroWorkspaceTable>
      )}
    </section>
  )
}

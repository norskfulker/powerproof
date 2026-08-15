import { Link, useLocation } from 'react-router-dom'
import { Swords } from '@/lib/icons'
import { RoomCardActions } from '@/components/shared/RoomCardActions'
import {
  ResearchHeroCardHeader,
  ResearchHeroCardQuery,
  researchHeroCardInProgressBadgeClassName,
} from '@/components/research/researchHeroCardParts'
import { cn } from '@/lib/utils'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import type { UserPlaybook } from '@/lib/playbookTypes'
import { playbookTitle } from '@/lib/playbookDisplay'
import { RoomHeroCard, RoomHeroCardBody, RoomHeroCardFooter } from '@/components/shared/RoomHeroCard'

export function PlaybookHistoryRow({
  playbook,
  onDeleteRequest,
  onReRunRequest,
  onResumeClarify,
  disabled = false,
}: {
  playbook: UserPlaybook
  onDeleteRequest?: (playbook: UserPlaybook) => void
  onReRunRequest?: (playbook: UserPlaybook) => void
  onResumeClarify?: (playbook: UserPlaybook) => void
  disabled?: boolean
}) {
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const title = playbookTitle(playbook)
  const description = playbook.business_description?.trim() || null
  const showDescription = Boolean(description && description !== title.trim())
  const isComplete = playbook.generation_status === 'complete'
  const isClarifying = playbook.generation_status === 'clarifying'
  const showCompleteActions = Boolean(onDeleteRequest && onReRunRequest && isComplete)
  const showClarifyDelete = Boolean(onDeleteRequest && isClarifying)

  const inProgressBadge = isClarifying ? (
    <span className={researchHeroCardInProgressBadgeClassName} aria-label="In progress">
      In progress
    </span>
  ) : undefined

  const body = (
    <>
      <ResearchHeroCardHeader
        iconOverride={Swords}
        iconTone={isClarifying ? 'amber' : 'warRoom'}
        title={title}
        badge={inProgressBadge}
      />

      {showDescription ? (
        <ResearchHeroCardQuery query={description} disabled={disabled} />
      ) : null}
    </>
  )

  return (
    <RoomHeroCard accent="warRoom" interactive disabled={disabled} className="group">
      {isClarifying && onResumeClarify ? (
        <RoomHeroCardBody className="p-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onResumeClarify(playbook)}
            className="flex h-full w-full flex-col gap-3 p-4 text-left text-inherit transition-colors hover:bg-red-500/[0.04] disabled:cursor-not-allowed"
          >
            {body}
          </button>
        </RoomHeroCardBody>
      ) : (
        <RoomHeroCardBody className="p-0">
          <Link
            to={`/playbook/${playbook.id}`}
            state={heroFromState}
            className="flex h-full w-full flex-col gap-3 p-4 text-left text-inherit no-underline transition-colors hover:bg-red-500/[0.04]"
            tabIndex={disabled ? -1 : undefined}
            aria-disabled={disabled}
          >
            {body}
          </Link>
        </RoomHeroCardBody>
      )}

      {showCompleteActions ? (
        <RoomHeroCardFooter>
          <RoomCardActions
            reRunLabel="Re-run"
            reRunVariant="primary"
            disabled={disabled}
            onReRun={() => onReRunRequest?.(playbook)}
            onDelete={() => onDeleteRequest?.(playbook)}
          />
        </RoomHeroCardFooter>
      ) : showClarifyDelete ? (
        <RoomHeroCardFooter>
          <RoomCardActions
            disabled={disabled}
            onDelete={() => onDeleteRequest?.(playbook)}
          />
        </RoomHeroCardFooter>
      ) : null}
    </RoomHeroCard>
  )
}

export { PlaybookHistoryRow as WarRoomPlaybookCard }

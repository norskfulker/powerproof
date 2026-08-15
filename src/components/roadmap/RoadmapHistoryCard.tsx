import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Map, Play } from '@/lib/icons'

import { Button } from '@/components/ui/button'
import {
  ResearchHeroCardHeader,
  researchHeroCardInProgressBadgeClassName,
} from '@/components/research/researchHeroCardParts'
import { RoomCardActions } from '@/components/shared/RoomCardActions'
import { cn } from '@/lib/utils'
import {
  REGENERATE_ROADMAP_CONFIRM,
  regenerateRoadmapConfirmDescription,
} from '@/lib/rerunConfirm'
import { roadmapDetailPath } from '@/lib/discoverHeroRoutes'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import type { UserRoadmap } from '@/pages/roadmap/roadmapTypes'
import { RoomHeroCard, RoomHeroCardBody, RoomHeroCardFooter } from '@/components/shared/RoomHeroCard'
import {
  roomHeroCardPendingProgressFillClassName,
  roomHeroCardPendingProgressTrackClassName,
} from '@/components/shared/roomHeroCardStyles'

type Props = {
  roadmap: UserRoadmap
  regenerating?: boolean
  onRegenerate?: (roadmap: UserRoadmap) => void
  onDeleteRequest?: (roadmap: UserRoadmap) => void
  onResumeClarify?: (roadmap: UserRoadmap) => void
  disabled?: boolean
}

export function RoadmapHistoryCard({
  roadmap,
  regenerating = false,
  onRegenerate,
  onDeleteRequest,
  onResumeClarify,
  disabled = false,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const isClarifying = roadmap.generation_status === 'clarifying'
  const isGenerating =
    roadmap.generation_status === 'processing' || roadmap.generation_status === 'pending'
  const isComplete = roadmap.generation_status === 'complete'
  const showActions = Boolean(onRegenerate && onDeleteRequest && isComplete)

  const inProgressBadge = (
    <span
      className={researchHeroCardInProgressBadgeClassName}
      aria-label="In progress"
    >
      {isGenerating ? 'Generating' : 'In progress'}
    </span>
  )

  const body = (
    <>
      <ResearchHeroCardHeader
        iconOverride={isGenerating ? Loader2 : Map}
        iconTone={isGenerating || isClarifying ? 'amber' : 'roadmap'}
        title={roadmap.title}
        badge={isGenerating || isClarifying ? inProgressBadge : undefined}
      />
    </>
  )

  const navigateToRoadmap = () => {
    if (roadmap.id) navigate(roadmapDetailPath(roadmap.id), { state: heroFromState })
  }

  if (isGenerating) {
    return (
      <RoomHeroCard
        accent="roadmap"
        state="pending"
        interactive
        disabled={disabled}
        aria-busy
        onActivate={disabled ? undefined : navigateToRoadmap}
        className="group"
      >
        <RoomHeroCardBody>
          {body}
          <div className="mt-auto">
            <div className={roomHeroCardPendingProgressTrackClassName}>
              <div className={cn(roomHeroCardPendingProgressFillClassName, 'shimmer w-2/5')} />
            </div>
          </div>
        </RoomHeroCardBody>

        <RoomHeroCardFooter className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled}
            className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
            asChild
          >
            <Link
              to={roadmapDetailPath(roadmap.id)}
              state={heroFromState}
              tabIndex={disabled ? -1 : undefined}
              aria-disabled={disabled}
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Continue
            </Link>
          </Button>
          <span aria-hidden />
        </RoomHeroCardFooter>
      </RoomHeroCard>
    )
  }

  return (
    <RoomHeroCard accent="roadmap" interactive disabled={disabled} className="group">
      {isClarifying && onResumeClarify ? (
        <>
          <RoomHeroCardBody>{body}</RoomHeroCardBody>
          <RoomHeroCardFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={disabled}
              className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
              onClick={() => onResumeClarify(roadmap)}
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Continue
            </Button>
            <span aria-hidden />
          </RoomHeroCardFooter>
        </>
      ) : (
        <RoomHeroCardBody className="p-0">
          <Link
            to={roadmapDetailPath(roadmap.id)}
            state={heroFromState}
            className="flex h-full w-full flex-col gap-3 p-4 text-inherit no-underline transition-colors hover:bg-violet-500/[0.04]"
            tabIndex={disabled ? -1 : undefined}
            aria-disabled={disabled}
          >
            {body}
          </Link>
        </RoomHeroCardBody>
      )}

      {showActions ? (
        <RoomHeroCardFooter>
          <RoomCardActions
            reRunLabel={regenerating ? 'Regenerating…' : 'Regenerate'}
            reRunVariant="primary"
            disabled={disabled || regenerating}
            requireReRunConfirm
            reRunConfirm={{
              title: REGENERATE_ROADMAP_CONFIRM.title,
              description: regenerateRoadmapConfirmDescription(roadmap.title ?? roadmap.goal_input),
              confirmLabel: REGENERATE_ROADMAP_CONFIRM.confirmLabel,
            }}
            onReRun={() => onRegenerate?.(roadmap)}
            onDelete={() => onDeleteRequest?.(roadmap)}
          />
        </RoomHeroCardFooter>
      ) : null}
    </RoomHeroCard>
  )
}

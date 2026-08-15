import { Link, useLocation } from 'react-router-dom'
import { Loader2, Play } from '@/lib/icons'
import type { ActivePlaybook } from '@/hooks/useBackgroundJobs'
import { playbookDetailPath } from '@/lib/discoverHeroRoutes'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import {
  ResearchHeroCardHeader,
  researchHeroCardInProgressBadgeClassName,
} from '@/components/research/researchHeroCardParts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RoomHeroCard, RoomHeroCardBody, RoomHeroCardFooter } from '@/components/shared/RoomHeroCard'
import {
  roomHeroCardPendingProgressFillClassName,
  roomHeroCardPendingProgressTrackClassName,
} from '@/components/shared/roomHeroCardStyles'

export function WarRoomPlaybookPendingCard({
  playbook,
  className,
}: {
  playbook: ActivePlaybook
  className?: string
}) {
  const location = useLocation()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const title = playbook.business_name?.trim() || 'War Room playbook'

  return (
    <RoomHeroCard accent="warRoom" state="pending" interactive aria-busy className={cn('group', className)}>
      <RoomHeroCardBody>
        <ResearchHeroCardHeader
          iconOverride={Loader2}
          iconTone="amber"
          title={title}
          badge={
            <span className={researchHeroCardInProgressBadgeClassName} aria-label="In progress">
              In progress
            </span>
          }
        />

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
          className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
          asChild
        >
          <Link to={playbookDetailPath(playbook.id)} state={heroFromState}>
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Continue
          </Link>
        </Button>
        <span aria-hidden />
      </RoomHeroCardFooter>
    </RoomHeroCard>
  )
}

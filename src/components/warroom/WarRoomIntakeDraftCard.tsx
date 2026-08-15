import { Loader2, Swords, Trash2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { discoverHeroButtonPrimaryClassName } from '@/components/discover/discoverHeroTokens'
import {
  ResearchHeroCardHeader,
  ResearchHeroCardQuery,
  researchHeroCardInProgressBadgeClassName,
} from '@/components/research/researchHeroCardParts'
import { cn } from '@/lib/utils'
import { RoomHeroCard, RoomHeroCardBody, RoomHeroCardFooter } from '@/components/shared/RoomHeroCard'
import type { WarRoomIntakeDraft } from '@/lib/warRoomDraft'

export function WarRoomIntakeDraftCard({
  draft,
  isScoutingLive = false,
  onResume,
  onDiscard,
  disabled = false,
  className,
}: {
  draft: WarRoomIntakeDraft
  isScoutingLive?: boolean
  onResume: () => void
  onDiscard: () => void
  disabled?: boolean
  className?: string
}) {
  const query = draft.business_description.trim()
  const title = query || 'War Room session'
  const showDescription = query.length > 60

  return (
    <RoomHeroCard
      accent="warRoom"
      state="draft"
      interactive
      onActivate={isScoutingLive || disabled ? undefined : onResume}
      disabled={disabled}
      aria-busy={isScoutingLive}
      className={cn('group', className)}
    >
      <RoomHeroCardBody>
        <ResearchHeroCardHeader
          iconOverride={isScoutingLive ? Loader2 : Swords}
          iconTone="amber"
          title={title}
          badge={
            <span className={researchHeroCardInProgressBadgeClassName} aria-label="In progress">
              {isScoutingLive ? 'Scouting' : 'In progress'}
            </span>
          }
        />

        {showDescription ? <ResearchHeroCardQuery query={query} disabled={disabled} /> : null}
      </RoomHeroCardBody>

      {!isScoutingLive ? (
        <RoomHeroCardFooter className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={cn(discoverHeroButtonPrimaryClassName, 'h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold')}
            disabled={disabled}
            onClick={onResume}
          >
            Continue
          </Button>
          <button
            type="button"
            aria-label="Discard"
            title="Discard"
            disabled={disabled}
            onClick={onDiscard}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors',
              'hover:bg-destructive/10 hover:text-destructive',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/70',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </RoomHeroCardFooter>
      ) : null}
    </RoomHeroCard>
  )
}

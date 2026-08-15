import { Radio, Loader2 } from '@/lib/icons'
import { RoomHeroCard, RoomHeroCardBody } from '@/components/shared/RoomHeroCard'
import {
  roomHeroCardPendingChipClassName,
  roomHeroCardPendingProgressFillClassName,
  roomHeroCardPendingProgressTrackClassName,
  roomHeroCardPendingPromptClassName,
} from '@/components/shared/roomHeroCardStyles'
import { cn } from '@/lib/utils'

const SCOUT_STATUS_BY_PHASE: Record<string, string> = {
  extract: 'Reading the battlefield…',
  research: 'Scouting the competitive landscape…',
  briefing: 'Assembling your battlefield briefing…',
}

const GENERATE_STATUS_BY_PHASE: Record<string, string> = {
  credits: 'Checking credits…',
  draft: 'Saving playbook draft…',
  generate: 'Scanning the battlefield…',
  save: 'Locking in the battle plan…',
}

export function WarRoomThinkingFeed({
  status,
  streamPhase,
  lastPingAt,
  phaseStatusMap = SCOUT_STATUS_BY_PHASE,
  fallbackStatus = 'Scouting the competitive landscape…',
  title,
  compact = false,
}: {
  status: string
  /** @deprecated Stream text is not shown — status events only. */
  streamText?: string
  streamPhase: string | null
  lastPingAt: number | null
  phaseLabels?: Record<string, string>
  phaseStatusMap?: Record<string, string>
  fallbackStatus?: string
  /** Business name shown on compact workspace cards */
  title?: string
  compact?: boolean
}) {
  const live = lastPingAt != null && Date.now() - lastPingAt < 6000
  const displayStatus =
    status.trim() ||
    (streamPhase && phaseStatusMap[streamPhase]) ||
    fallbackStatus

  const cardTitle = title?.trim() || 'War Room Playbook'
  const isGenerating = phaseStatusMap === GENERATE_STATUS_BY_PHASE

  if (compact) {
    return (
      <RoomHeroCard
        accent="warRoom"
        state="pending"
        aria-live="polite"
        aria-busy
        className="flex w-full flex-col"
      >
        <RoomHeroCardBody>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {isGenerating ? 'Building playbook' : 'Scouting market'}
              </p>
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-foreground">
                {cardTitle}
              </h3>
            </div>
            <span
              className={cn(
                roomHeroCardPendingChipClassName,
                'inline-flex shrink-0 items-center gap-1',
              )}
            >
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              {isGenerating ? 'Generating' : 'Scouting'}
            </span>
          </div>

          <p className={cn(roomHeroCardPendingPromptClassName, 'line-clamp-2 font-medium text-foreground/90')}>
            {displayStatus}
          </p>

          <div className={cn(roomHeroCardPendingPromptClassName, 'mt-auto space-y-2')}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                You can leave this page — work continues in the background.
              </p>
              {live ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[hsl(var(--saffron-500))]/25 bg-[hsl(var(--saffron-50))]/80 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--saffron-600))] dark:text-[hsl(var(--saffron-400))]">
                  <Radio className="h-3 w-3 animate-pulse" aria-hidden />
                  Live
                </span>
              ) : null}
            </div>
            <div className={roomHeroCardPendingProgressTrackClassName}>
              <div className={cn(roomHeroCardPendingProgressFillClassName, 'shimmer w-2/5')} />
            </div>
          </div>
        </RoomHeroCardBody>
      </RoomHeroCard>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-3" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent shrink-0" />
        <p className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-foreground">{displayStatus}</p>
        {live ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/25 bg-red-500/5 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden />
            Live
          </span>
        ) : null}
      </div>
      <div className={roomHeroCardPendingProgressTrackClassName}>
        <div className={cn(roomHeroCardPendingProgressFillClassName, 'shimmer w-2/5')} />
      </div>
    </div>
  )
}

export const GENERATE_PHASE_LABELS = GENERATE_STATUS_BY_PHASE

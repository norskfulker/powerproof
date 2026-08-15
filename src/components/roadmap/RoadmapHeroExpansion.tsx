import type { useRoadmapClarifyFlow } from '@/hooks/useRoadmapClarifyFlow'
import { cn } from '@/lib/utils'
import { DISCOVER_HERO_EXPANSION_MIN_H } from '@/components/discover/discoverHeroTokens'
import { getGeneratingMessage } from '@/lib/roadmapApi'
import {
  roomHeroCardProgressFillClassName,
  roomHeroCardProgressTrackClassName,
} from '@/components/shared/roomHeroCardStyles'

type RoadmapFlowHook = ReturnType<typeof useRoadmapClarifyFlow>

interface RoadmapHeroExpansionProps {
  query: string
  roadmapFlow: RoadmapFlowHook
  generatingMessageIndex?: number
  onCancel: () => void
  className?: string
  compact?: boolean
}

export function RoadmapHeroExpansion({
  roadmapFlow,
  generatingMessageIndex = 0,
  className,
  compact = false,
}: RoadmapHeroExpansionProps) {
  const inClarifyFlow = roadmapFlow.step === 'wizard' || roadmapFlow.wizardLoading
  const showFlow =
    !inClarifyFlow &&
    (roadmapFlow.step === 'generating' || Boolean(roadmapFlow.error))

  if (!showFlow) return null

  if (roadmapFlow.step === 'generating') {
    const summaryLine = roadmapFlow.clarifySummary.trim()
    const message = summaryLine
      ? `Building your roadmap: ${summaryLine}`
      : getGeneratingMessage(generatingMessageIndex)

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 px-8 py-16',
          compact ? 'py-8' : '',
          className,
        )}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border-default border-t-primary" />
        <p className="text-[1.1rem] font-semibold text-foreground">Generating your roadmap</p>
        <p className="animate-pulse text-sm text-muted-foreground">{message}</p>
        <div className="w-full max-w-sm space-y-2">
          <div className={roomHeroCardProgressTrackClassName('roadmap')}>
            <div className={cn(roomHeroCardProgressFillClassName('roadmap'), 'shimmer w-2/5')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        compact ? 'gap-2 pt-1' : 'min-h-[320px] gap-4 pt-4',
        !compact && DISCOVER_HERO_EXPANSION_MIN_H,
        className,
      )}
    >
      {roadmapFlow.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.08] p-4 text-sm text-foreground">
          {roadmapFlow.error}
        </div>
      ) : null}
    </div>
  )
}

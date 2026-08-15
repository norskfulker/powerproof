import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle } from '@/lib/icons'
import type { useWarRoom } from '@/hooks/useWarRoom'
import { BattlefieldBriefing } from '@/components/warroom/BattlefieldBriefing'
import { WarRoomThinkingFeed, GENERATE_PHASE_LABELS } from '@/components/warroom/WarRoomThinkingFeed'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DISCOVER_HERO_EXPANSION_MIN_H } from '@/components/discover/discoverHeroTokens'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { warRoomModelDisplayLabel } from '@/lib/aiModels'

type WarRoomHook = ReturnType<typeof useWarRoom>

interface WarRoomHeroExpansionProps {
  businessDescription: string
  warRoom: WarRoomHook
  onReset: () => void
  className?: string
  compact?: boolean
}

export function WarRoomHeroExpansion({
  businessDescription,
  warRoom: wr,
  onReset,
  className,
  compact = false,
}: WarRoomHeroExpansionProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const inClarifyFlow =
    wr.clarifyStep === 'loading' || wr.clarifyStep === 'wizard' || wr.wizardLoading
  const showFlow = !inClarifyFlow && wr.phase !== 'idle'

  const handleDeploy = async () => {
    const result = await wr.deploy()
    if (result && !window.location.pathname.startsWith('/playbook/')) {
      navigate(`/playbook/${result.playbookId}`, {
        state: {
          ...discoverHeroNavState(location.pathname, location.search),
          playbook: result.playbook,
        },
      })
    }
  }

  if (!showFlow) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        compact ? 'gap-2 pt-1' : 'min-h-[280px] gap-4 pt-4',
        !compact && DISCOVER_HERO_EXPANSION_MIN_H,
        className,
      )}
    >
      {wr.phase === 'scouting' && (
        <WarRoomThinkingFeed
          status={wr.streamStatus}
          streamPhase={wr.streamPhase}
          lastPingAt={wr.lastPingAt}
          title={businessDescription.trim() || wr.lastBusinessDescription.trim() || 'War Room Playbook'}
          compact={compact}
        />
      )}

      {wr.phase === 'briefing' && wr.briefing && wr.inferredContext ? (
        <BattlefieldBriefing
          briefing={wr.briefing}
          modelLabel={warRoomModelDisplayLabel(wr.scoutModel)}
          modelUsed={wr.scoutModel}
          deployCreditsRequired={wr.deployCreditsRequired}
          scoutCreditsSpent={wr.scoutCreditsSpent}
          onDeploy={() => void handleDeploy()}
          onBack={onReset}
          isGenerating={false}
          compact={compact}
        />
      ) : null}

      {wr.phase === 'briefing' && (!wr.briefing || !wr.inferredContext) ? (
        <div className="flex flex-col gap-3 py-2">
          <p className="text-[12px] text-muted-foreground">
            Battlefield briefing did not load. Scout the market again or start over.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const desc = businessDescription.trim() || wr.lastBusinessDescription.trim()
                if (desc) void wr.loadBriefing(desc, { summary: wr.clarifySummary || undefined })
                else onReset()
              }}
            >
              Scout again
            </Button>
            <Button variant="secondary" size="sm" onClick={onReset}>
              Start over
            </Button>
          </div>
        </div>
      ) : null}

      {wr.phase === 'generating' && (
        <WarRoomThinkingFeed
          status={wr.streamStatus}
          streamPhase={wr.streamPhase}
          lastPingAt={wr.lastPingAt}
          phaseStatusMap={GENERATE_PHASE_LABELS}
          fallbackStatus="Building your war plan…"
          title={businessDescription.trim() || wr.lastBusinessDescription.trim() || 'War Room Playbook'}
          compact={compact}
        />
      )}

      {wr.phase === 'error' && wr.clarifyStep === 'none' && !wr.wizardLoading ? (
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-[12px] font-medium">
              {wr.error?.includes('refunded')
                ? 'Generation failed. Please try again.'
                : wr.error}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onReset}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

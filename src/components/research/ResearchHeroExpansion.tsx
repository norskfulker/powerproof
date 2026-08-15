import type { useResearchOpportunity } from '@/hooks/useResearchOpportunity'
import type { ResearchStyle } from '@/lib/researchStyles'
import { ResearchDeepLoadingPage } from '@/components/research/ResearchDeepLoadingPage'
import { ResearchErrorState } from '@/components/research/ResearchErrorState'
import { cn } from '@/lib/utils'
import { SaturationWarningPanel } from '@/components/research/SaturationPanels'

type ResearchHook = ReturnType<typeof useResearchOpportunity>

interface ResearchHeroExpansionProps {
  query: string
  country: string
  research: ResearchHook
  researchStyle: ResearchStyle
  onIdeaSelect: (idea: string) => void
  onRunSubmit: () => void
  inputId?: string
  refreshKey?: string | number
  className?: string
  compact?: boolean
}

export function ResearchHeroExpansion({
  query,
  country,
  research,
  researchStyle,
  onRunSubmit,
  className,
  compact = false,
}: ResearchHeroExpansionProps) {
  const inClarifyFlow = research.step === 'wizard' || research.wizardLoading
  const showFlow =
    !inClarifyFlow &&
    (research.step === 'researching' ||
      research.step === 'warning' ||
      research.step === 'done' ||
      Boolean(research.error))

  if (!showFlow) return null

  if (research.step === 'researching') {
    return (
      <ResearchDeepLoadingPage
        query={query.trim()}
        researchStyle={researchStyle}
        startedAt={research.researchStartedAt}
        streamProgressChars={research.streamProgressChars}
        onCancel={research.pendingResearchId ? () => void research.cancelResearch() : undefined}
        cancelDisabled={research.isCancelling}
        className={cn(
          'fixed inset-0 z-50 bg-background',
          className,
        )}
      />
    )
  }

  if (research.step === 'done') {
    if (!research.error) return null
    return (
      <div className={cn('flex flex-col gap-4', compact ? 'gap-2 pt-1' : 'min-h-0 gap-4 pt-4', className)}>
        <ResearchErrorState
          error={research.error.message}
          detail={research.error.detail}
          creditsRefunded={research.error.creditsRefunded}
          onRetry={() => {
            research.clearError()
            onRunSubmit()
          }}
          onDismiss={() => research.clearError()}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        compact ? 'gap-2 pt-1' : 'min-h-[320px] gap-4 pt-4',
        className,
      )}
    >
      {research.step === 'warning' && research.pendingSaturationWarning ? (
        <SaturationWarningPanel
          saturation={research.pendingSaturationWarning}
          onCancel={research.cancelAfterSaturationWarning}
          onProceed={research.proceedAfterSaturationWarning}
        />
      ) : null}

      {research.error ? (
        <ResearchErrorState
          error={research.error.message}
          detail={research.error.detail}
          creditsRefunded={research.error.creditsRefunded}
          onRetry={() => {
            research.clearError()
            onRunSubmit()
          }}
          onDismiss={() => research.clearError()}
        />
      ) : null}
    </div>
  )
}

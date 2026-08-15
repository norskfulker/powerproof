import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Target } from '@/lib/icons'
import { useNavigate } from 'react-router-dom'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  marketTestMetaBadgeClassName,
  marketTestVerdictBadgeClassName,
} from '@/lib/marketTestBadgeStyles'
import {
  marketTestModelLabelFromUsed,
  marketTestVerdictHeading,
  marketTestVerdictTone,
  type MarketTestVerdict,
} from '@/lib/marketTestTypes'
import { cn } from '@/lib/utils'

import {
  opportunityDetailCardClass,
  opportunityDetailCardPaddingClass,
} from '@/lib/opportunityCardClasses'

export type MarketTestDetailBannerProps = {
  createdAt?: string | null
  verdict?: MarketTestVerdict | null
  modelUsed?: string | null
  modelLabel?: string | null
  linkedResearchSlug?: string | null
  onRunAnother?: () => void
  className?: string
}

function formatMarketTestDate(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return format(d, 'MMM d, yyyy')
}

export function MarketTestDetailBanner({
  createdAt,
  verdict,
  modelUsed,
  modelLabel,
  linkedResearchSlug,
  onRunAnother,
  className,
}: MarketTestDetailBannerProps) {
  const navigate = useNavigate()
  const [runAnotherOpen, setRunAnotherOpen] = useState(false)
  const researchDate = formatMarketTestDate(createdAt)
  const modelDisplayLabel =
    modelLabel?.trim() || marketTestModelLabelFromUsed(modelUsed) || null
  const tone = verdict ? marketTestVerdictTone(verdict) : null

  const handleViewResearch = () => {
    if (!linkedResearchSlug) return
    navigate(`/my-research/${encodeURIComponent(linkedResearchSlug)}`)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(opportunityDetailCardClass, opportunityDetailCardPaddingClass, 'min-w-0 w-full selection:bg-primary/10', className)}>
          <div className="flex flex-col gap-3 layout-sm:flex-row layout-sm:items-center layout-sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {researchDate ? (
                <span className={cn(marketTestMetaBadgeClassName(), 'bg-muted/[0.02] font-semibold text-muted-foreground')}>
                  <Calendar className="h-3.5 w-3.5 text-text-tertiary" aria-hidden />
                  <span>{researchDate}</span>
                </span>
              ) : null}

              {modelDisplayLabel ? (
                <AiModelDisplay modelUsed={modelUsed} label={modelDisplayLabel} />
              ) : null}

              {tone && verdict ? (
                <span className={marketTestVerdictBadgeClassName(tone)}>
                  <Target className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{marketTestVerdictHeading(verdict)}</span>
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-subtle/50 pt-3 layout-lg:ml-auto layout-lg:border-t-0 layout-lg:pt-0">
              {linkedResearchSlug ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-xl text-[12px] font-bold tracking-tight"
                  onClick={handleViewResearch}
                >
                  View linked research
                </Button>
              ) : null}
              {onRunAnother ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-xl text-[12px] font-bold tracking-tight"
                  onClick={() => setRunAnotherOpen(true)}
                >
                  <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Run another test
                </Button>
              ) : null}
            </div>
          </div>
        </div>

      {onRunAnother ? (
        <ConfirmDialog
          open={runAnotherOpen}
          title="Run another market test?"
          description="You'll start a new market reality check with your current idea. This won't delete this report."
          confirmLabel="Run another test"
          onConfirm={() => {
            setRunAnotherOpen(false)
            onRunAnother()
          }}
          onCancel={() => setRunAnotherOpen(false)}
        />
      ) : null}
    </TooltipProvider>
  )
}

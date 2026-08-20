import type { ReactNode } from 'react'
import { trendLabel, type TrendKind } from '@/lib/opportunityTrendChart'
import { cn } from '@/lib/utils'

import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { MetricDerivationDialog } from '@/components/opportunity/detail/MetricDerivationDialog'
import { MetricDerivationSheet } from '@/components/opportunity/detail/MetricDerivationSheet'
import {
  EffortScorecardDerivationContent,
  EffortLevelFallbackContent,
  ProfitDerivationContent,
  SetupCostDerivationContent,
  SetupCostFallbackContent,
} from '@/components/opportunity/detail/derivationPopoverContents'
import { dottedTermTriggerClassName } from '@/components/opportunity/detail/DottedTermTooltip'
import { formatSetupBounds } from '@/lib/opportunityFormatters'
import type { OpportunityTermKey } from '@/lib/opportunityTermDefinitions'
import type {
  EffortScorecard,
  ProfitDerivation,
  SetupCostDerivation,
} from '@/types/database'
import {
  opportunityMetricsGridFourClass,
} from '@/components/opportunity/detail/detailSectionClasses'

function effortEaseColor(level: string) {
  if (level === 'Easy') return 'hsl(var(--success))'
  if (level === 'Medium' || level === 'Moderate') return 'rgb(217, 119, 6)'
  if (level === 'Hard') return 'hsl(var(--destructive))'
  return 'hsl(var(--muted-foreground))'
}

function marginScaleColor(marginPct: number) {
  if (marginPct <= 20) return 'hsl(var(--destructive))'
  if (marginPct <= 40) return 'rgb(217, 119, 6)'
  return 'hsl(var(--success))'
}

function trendColorClass(kind: TrendKind) {
  if (kind === 'rising') return 'text-success'
  if (kind === 'falling') return 'text-rose-600'
  return 'text-muted-foreground'
}

const metricLabelClass =
  'font-sans text-[12px] font-medium leading-none text-muted-foreground sm:text-[13px]'

const metricValueClass =
  'font-sans text-[18px] font-semibold tracking-tight tabular-nums text-foreground sm:text-[22px] lg:text-[24px]'

/** Clickable score — dotted tooltip underline signals more detail on click. */
const derivationValueTriggerClass = cn(
  metricValueClass,
  dottedTermTriggerClassName,
  'cursor-pointer rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
)

function GlanceMetric({
  label,
  term,
  children,
  className,
}: {
  label: string
  term: OpportunityTermKey
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 sm:gap-2', className)}>
      <OpportunityTermLabel term={term} label={label} className={metricLabelClass} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function MetricValue({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span style={style} className={cn(metricValueClass, className)}>
      {children}
    </span>
  )
}

export type OpportunityMetricsBarProps = {
  setupMinAbs: number | null | undefined
  setupMaxAbs: number | null | undefined
  profitMinAbs: number
  profitMaxAbs: number
  effortLabel: string
  marginPct: number | null | undefined
  demandTrendKind: TrendKind
  oppSetupMin: unknown
  oppSetupMax: unknown
  formatSetupCost: (min: number | null | undefined, max: number | null | undefined) => string
  formatMoney: (n: number) => string
  setupCostDerivation?: SetupCostDerivation | null
  setupCostBreakdown?: unknown
  profitDerivation?: ProfitDerivation | null
  effortScorecard?: EffortScorecard | null
  easeScore?: number | null
  /** @deprecated Fluid glass metrics removed from glance strip; kept for call-site compat. */
  fluidGlass?: boolean
  hideDemandTrend?: boolean
}

export function OpportunityMetricsBar(props: OpportunityMetricsBarProps) {
  const {
    setupMinAbs,
    setupMaxAbs,
    profitMinAbs,
    profitMaxAbs,
    effortLabel,
    marginPct,
    demandTrendKind,
    oppSetupMin,
    oppSetupMax,
    formatSetupCost,
    formatMoney,
    setupCostDerivation,
    setupCostBreakdown,
    profitDerivation,
    effortScorecard,
    easeScore,
    hideDemandTrend = false,
  } = props

  const hasSetup = oppSetupMin != null || oppSetupMax != null
  const setupValue = hasSetup
    ? formatSetupCost(setupMinAbs, setupMaxAbs) ||
      formatSetupBounds(
        oppSetupMin != null ? Number(oppSetupMin) : null,
        oppSetupMax != null ? Number(oppSetupMax) : null,
        formatMoney,
      )
    : '—'

  const hasProfit = profitMinAbs > 0 && profitMaxAbs > 0
  const profitMonthly = hasProfit ? `${formatMoney(profitMinAbs)}–${formatMoney(profitMaxAbs)}` : null
  const hasMargin = marginPct != null && Number.isFinite(Number(marginPct)) && Number(marginPct) > 0
  const hasEase = Boolean(effortLabel.trim())
  const effortColor = hasEase ? effortEaseColor(effortLabel) : undefined
  const marginColor = hasMargin ? marginScaleColor(Number(marginPct)) : undefined

  const setupValueNode = <span>{setupValue || '—'}</span>

  const profitValueNode = (
    <span>
      {profitMonthly}
      <span className="text-[13px] font-medium text-muted-foreground/70">/mo</span>
    </span>
  )

  return (
    <div id="od-metrics" className="scroll-mt-[7.5rem]">
      <div className={opportunityMetricsGridFourClass}>
        <GlanceMetric label="Setup Cost" term="setup_cost">
          {hasSetup ? (
            <MetricDerivationDialog
              label={setupCostDerivation ? 'Setup cost derivation' : 'Setup cost breakdown'}
              trigger={setupValueNode}
              triggerClassName={derivationValueTriggerClass}
            >
              {setupCostDerivation ? (
                <SetupCostDerivationContent derivation={setupCostDerivation} formatMoney={formatMoney} />
              ) : (
                <SetupCostFallbackContent
                  setupMinAbs={setupMinAbs}
                  setupMaxAbs={setupMaxAbs}
                  breakdown={setupCostBreakdown}
                  formatMoney={formatMoney}
                />
              )}
            </MetricDerivationDialog>
          ) : (
            <MetricValue className="text-muted-foreground">—</MetricValue>
          )}
        </GlanceMetric>

        <GlanceMetric label="Monthly Profit" term="monthly_profit">
          {hasProfit ? (
            <MetricDerivationDialog
              label="Profit derivation"
              trigger={profitValueNode}
              triggerClassName={cn(derivationValueTriggerClass, 'text-success hover:text-success/80')}
            >
              <ProfitDerivationContent
                derivation={profitDerivation}
                formatMoney={formatMoney}
                profitMinAbs={profitMinAbs}
                profitMaxAbs={profitMaxAbs}
              />
            </MetricDerivationDialog>
          ) : (
            <MetricValue className="text-muted-foreground">—</MetricValue>
          )}
        </GlanceMetric>

        <GlanceMetric label="Gross Margin" term="gross_margin">
          {hasMargin ? (
            <MetricValue style={{ color: marginColor }}>
              {Math.round(Number(marginPct)).toLocaleString('en-IN')}%
            </MetricValue>
          ) : (
            <MetricValue className="text-muted-foreground">—</MetricValue>
          )}
        </GlanceMetric>

        <GlanceMetric label="Effort Level" term="effort_level">
          {hasEase ? (
            <MetricDerivationSheet
              label={effortScorecard ? 'Effort scorecard' : 'Effort level'}
              trigger={
                <span style={{ color: effortColor }}>{effortLabel.trim() || '—'}</span>
              }
              triggerClassName={derivationValueTriggerClass}
            >
              {effortScorecard ? (
                <EffortScorecardDerivationContent
                  scorecard={effortScorecard}
                  effortLabel={effortLabel}
                  easeScore={easeScore}
                />
              ) : (
                <EffortLevelFallbackContent level={effortLabel} easeScore={easeScore} />
              )}
            </MetricDerivationSheet>
          ) : (
            <MetricValue className="text-muted-foreground">—</MetricValue>
          )}
        </GlanceMetric>
      </div>

      {!hideDemandTrend ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border-subtle/60 pt-3 sm:mt-4 sm:pt-4">
          <span className="font-sans text-[12px] font-medium text-muted-foreground">Demand</span>
          <span
            className={cn(
              'rounded-md border border-border-subtle bg-muted/40 px-2 py-0.5 font-sans text-[12px] font-semibold tabular-nums sm:text-[13px]',
              trendColorClass(demandTrendKind),
            )}
          >
            {trendLabel(demandTrendKind)}
          </span>
        </div>
      ) : null}
    </div>
  )
}

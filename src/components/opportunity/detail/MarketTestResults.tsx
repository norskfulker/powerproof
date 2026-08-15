import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowUp,
  Check,
  Flag,
  Target,
  TrendingUp,
  X,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { Card } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import {
  InternalPageDataTabs,
  internalPageTabPanelClass,
} from '@/components/shared/InternalPageDataTabs'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunitySectionTitleRow } from '@/components/opportunity/detail/OpportunitySectionTitleRow'
import type { OpportunitySectionNavItem } from '@/components/opportunity/detail/OpportunitySectionNav'
import { useOpportunityDetailNavRegistration } from '@/contexts/OpportunityDetailNavContext'
import {
  MARKET_TEST_DEMAND_STRENGTH_LABEL,
  marketTestDemandStrengthBadgeClassName,
  marketTestRedFlagSideBadgeClassName,
} from '@/lib/marketTestBadgeStyles'
import {
  marketTestVerdictTone,
  type MarketTestDemandSignal,
  type MarketTestPastFailure,
  type MarketTestPastSuccess,
  type MarketTestRedFlag,
  type MarketTestResult,
  type RedFlagSeverity,
} from '@/lib/marketTestTypes'
import { cn } from '@/lib/utils'
import { iconClassName, type IconTone } from '@/lib/iconClassNames'

import {
  opportunityDetailCardClass,
  opportunityDetailCardGlowClass,
  opportunityDetailCardPaddingClass,
  opportunityDetailCardRadiusClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
} from '@/lib/opportunityCardClasses'

const VERDICT_ICON: Record<
  ReturnType<typeof marketTestVerdictTone>,
  typeof Check
> = {
  green: ArrowUp,
  amber: AlertTriangle,
  red: Flag,
}

const SEVERITY_BADGE: Record<
  RedFlagSeverity,
  { variant: 'red' | 'orange' | 'amber'; label: string }
> = {
  critical: { variant: 'red', label: 'Critical' },
  high: { variant: 'orange', label: 'High' },
  medium: { variant: 'amber', label: 'Medium' },
}

const VERDICT_SURFACE: Record<
  ReturnType<typeof marketTestVerdictTone>,
  { card: string; bar: string; score: string }
> = {
  green: {
    card: 'border-emerald-500/30 bg-emerald-500/[0.06]',
    bar: 'bg-emerald-500',
    score: 'text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    card: 'border-amber-500/30 bg-amber-500/[0.06]',
    bar: 'bg-amber-500',
    score: 'text-amber-700 dark:text-amber-400',
  },
  red: {
    card: 'border-red-500/30 bg-red-500/[0.06]',
    bar: 'bg-red-500',
    score: 'text-red-700 dark:text-red-400',
  },
}

function RedFlagSideBadge({
  variant,
  label,
}: {
  variant: 'red' | 'orange' | 'amber'
  label: string
}) {
  return (
    <Badge variant={variant} size="sm" className={marketTestRedFlagSideBadgeClassName}>
      {label}
    </Badge>
  )
}

function SignalListItem({ signal, evidence, strength }: MarketTestDemandSignal) {
  return (
    <li className={cn(opportunityDetailCardClass, "flex items-center overflow-hidden p-0")}>
      <div className="flex shrink-0 items-center p-3">
        <span className={marketTestDemandStrengthBadgeClassName(strength)}>
          {MARKET_TEST_DEMAND_STRENGTH_LABEL[strength]}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-4">
        <p className="text-sm font-semibold text-foreground">{signal}</p>
        {evidence ? <p className="text-xs leading-relaxed text-muted-foreground">{evidence}</p> : null}
      </div>
    </li>
  )
}

function RedFlagListItem({ flag, evidence, severity }: MarketTestRedFlag) {
  const badge = SEVERITY_BADGE[severity]
  return (
    <li className={cn(opportunityDetailCardClass, "flex items-stretch overflow-hidden p-0")}>
      <div className="flex shrink-0 items-stretch p-3">
        <RedFlagSideBadge variant={badge.variant} label={badge.label} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-4">
        <p className="text-sm font-semibold text-foreground">{flag}</p>
        {evidence ? <p className="text-xs leading-relaxed text-muted-foreground">{evidence}</p> : null}
      </div>
    </li>
  )
}

function FailureCard({ company, what_happened }: MarketTestPastFailure) {
  return (
    <Card
      padding="sm"
      radius="lg"
      variant="default"
      accent="none"
      className="h-full"
      topSlotStyle={opportunityCardTopSlotToneStyle.destructive}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Flag
            className={iconClassName({ tone: 'destructive', size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.destructive.title)}>
            {company?.trim() || 'Unnamed company'}
          </span>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-foreground/90">{what_happened}</p>
    </Card>
  )
}

function SuccessCard({ company, what_worked }: MarketTestPastSuccess) {
  return (
    <Card
      padding="sm"
      radius="lg"
      variant="default"
      accent="none"
      className="h-full"
      topSlotStyle={opportunityCardTopSlotToneStyle.success}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Check
            className={iconClassName({ tone: 'success', size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
            {company?.trim() || 'Unnamed company'}
          </span>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-foreground/90">{what_worked}</p>
    </Card>
  )
}

export function MarketTestResults({ result }: { result: MarketTestResult }) {
  const tone = marketTestVerdictTone(result.verdict)
  const surface = VERDICT_SURFACE[tone]
  const score = result.market_reality_score
  const VerdictIcon = VERDICT_ICON[tone]

  const navSections = useMemo((): OpportunitySectionNavItem[] => {
    const items: OpportunitySectionNavItem[] = [
      { id: 'market-test-results', label: 'Overview', icon: Target },
    ]
    if (result.honest_verdict) {
      items.push({ id: 'mt-honest-take', label: 'Honest Take', icon: Target })
    }
    if (result.demand_signals.length) {
      items.push({ id: 'mt-demand-signals', label: 'Demand Signals', icon: TrendingUp })
    }
    if (result.red_flags.length) {
      items.push({ id: 'mt-red-flags', label: 'Red Flags', icon: AlertTriangle })
    }
    if (result.past_failures.length) {
      items.push({ id: 'mt-past-failures', label: 'Past Failures', icon: Flag })
    }
    if (result.past_successes.length) {
      items.push({ id: 'mt-past-successes', label: 'Past Successes', icon: ArrowUp })
    }
    if (result.pros.length || result.cons.length) {
      items.push({ id: 'mt-pros-cons', label: 'Pros & Cons', icon: Check })
    }
    return items
  }, [result])

  useOpportunityDetailNavRegistration(navSections.length >= 2 ? navSections : null)

  return (
    <section
      id="market-test-results"
      className={cn('min-w-0 w-full', opportunityDetailCardRadiusClass)}
    >
      <div className={cn(opportunityDetailCardClass, opportunityDetailCardGlowClass, "overflow-hidden p-0")}>
        <div className={opportunityDetailCardPaddingClass}>
          <OpportunitySectionTitleRow
            icon={Target}
            description="Demand signals, red flags, past failures, and an honest verdict."
          >
            Market Reality Check
          </OpportunitySectionTitleRow>

          <div className={cn('mt-4 rounded-xl border-2 p-4 sm:p-5', surface.card)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex gap-3 sm:items-start">
                <VerdictIcon
                  className={iconClassName({
                    tone: (tone === 'green' ? 'success' : tone === 'amber' ? 'amber' : 'destructive') as IconTone,
                    size: 'lg',
                    active: true,
                  })}
                  aria-hidden
                />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {result.verdict_label}
                  </h3>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className={cn('text-4xl font-black tabular-nums tracking-tight', surface.score)}>
                  {score}
                  <span className="text-lg font-semibold text-muted-foreground">/100</span>
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Market Reality Score
                </p>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn('h-full rounded-full transition-all', surface.bar)}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

        <InternalPageDataTabs
          tabs={navSections
            .filter((s) => s.id !== 'market-test-results')
            .map((s) => ({ id: s.id, label: s.label }))}
          className="mt-0"
          flush
        >
          {result.honest_verdict ? (
            <TabsContent value="mt-honest-take" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-honest-take"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow icon={Target} title="The Honest Take" />
              }
              description="What a co-founder would tell you before you quit your job"
            >
              <blockquote className="border-l-4 border-primary/40 pl-4 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
                {result.honest_verdict}
              </blockquote>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}

          {result.demand_signals.length ? (
            <TabsContent value="mt-demand-signals" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-demand-signals"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow icon={TrendingUp} title="Demand Signals" />
              }
              description={`${result.demand_signals.length} signal${result.demand_signals.length === 1 ? '' : 's'} from real market evidence`}
            >
              <ul className="space-y-3">
                {result.demand_signals.map((item, i) => (
                  <SignalListItem key={`${item.signal}-${i}`} {...item} />
                ))}
              </ul>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}

          {result.red_flags.length ? (
            <TabsContent value="mt-red-flags" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-red-flags"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow icon={AlertTriangle} title="Red Flags" />
              }
              description={`${result.red_flags.length} warning${result.red_flags.length === 1 ? '' : 's'} to take seriously`}
            >
              <ul className="space-y-3">
                {result.red_flags.map((item, i) => (
                  <RedFlagListItem key={`${item.flag}-${i}`} {...item} />
                ))}
              </ul>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}

          {result.past_failures.length ? (
            <TabsContent value="mt-past-failures" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-past-failures"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow
                  icon={Flag}
                  title="Companies That Tried This and Failed"
                />
              }
            >
              <div className="grid gap-3 md:grid-cols-2">
                {result.past_failures.map((item, i) => (
                  <FailureCard key={`${item.company ?? 'unknown'}-${i}`} {...item} />
                ))}
              </div>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}

          {result.past_successes.length ? (
            <TabsContent value="mt-past-successes" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-past-successes"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow
                  icon={ArrowUp}
                  title="Companies That Got This Right"
                />
              }
            >
              <div className="grid gap-3 md:grid-cols-2">
                {result.past_successes.map((item, i) => (
                  <SuccessCard key={`${item.company ?? 'unknown'}-${i}`} {...item} />
                ))}
              </div>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}

          {result.pros.length || result.cons.length ? (
            <TabsContent value="mt-pros-cons" className={internalPageTabPanelClass}>
            <OpportunityDetailSectionShell
              id="mt-pros-cons"
              defaultOpen
              header={
                <OpportunityAccordionHeaderRow icon={Check} title="Pros & Cons" />
              }
              description="Evidence-based reasons for and against"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border-0 bg-semantic-positive/[0.06] p-4">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-semantic-positive">
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {result.pros.map((item, i) => (
                      <li
                        key={`pro-${i}`}
                        className="flex gap-2 text-sm leading-relaxed text-semantic-positive"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3 rounded-xl border-0 bg-destructive/[0.06] p-4">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-destructive">
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {result.cons.map((item, i) => (
                      <li
                        key={`con-${i}`}
                        className="flex gap-2 text-sm leading-relaxed text-destructive"
                      >
                        <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </OpportunityDetailSectionShell>
            </TabsContent>
          ) : null}
        </InternalPageDataTabs>
    </section>
  )
}

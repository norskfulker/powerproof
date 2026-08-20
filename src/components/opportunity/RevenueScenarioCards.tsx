import { useCurrency } from '@/hooks/useCurrency'
import {
  formatScenarioDriverLabel,
  getCalculatorBillingModel,
  isSubscriptionBilling,
  monthlyRevenueFromUnits,
} from '@/lib/calculatorDefaults'
import { normalizeEaseLevel } from '@/lib/opportunityLabels'
import type { DbOpportunity, OpportunityCalculatorConfig } from '@/types/database'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'

import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityProgressBar } from '@/components/opportunity/detail/OpportunityProgressBar'
import { Card } from '@/components/ui/card'
import { ShieldCheck, Sparkles, Flame, Wallet, ArrowUpRight, Percent, Calculator, Gauge } from '@/lib/icons'
import { iconClassName } from '@/lib/iconClassNames'
import { EffortLevelMeter } from '@/components/discover/EffortLevelDashes'

import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

export type RevenueScenarioOpportunity = Pick<
  DbOpportunity,
  | 'monthly_rev_min'
  | 'monthly_rev_max'
  | 'monthly_profit_min'
  | 'monthly_profit_max'
  | 'margin_pct'
  | 'setup_min'
  | 'setup_max'
  | 'calculator_config'
  | 'ease'
> & {
  payback_months_min?: number | null
  payback_months_max?: number | null
}

type Scenario = {
  key: 'conservative' | 'realistic' | 'optimistic'
  label: string
  hint: string
  colorClass: string
  progressClass: string
  topSlotTone: 'destructive' | 'primary' | 'success'
  icon: React.ComponentType<{ className?: string }>
  revenue: number
  profit: number
  margin: number
  paybackMonths: number | null
  driverLabel: string
}

export function RevenueScenarioCards({
  opportunity,
  isMobile = false,
}: {
  opportunity: RevenueScenarioOpportunity
  isMobile?: boolean
}) {
  const { formatMoney } = useCurrency()

  if (opportunity.monthly_rev_min == null && opportunity.monthly_rev_max == null) {
    return null
  }

  const revMin = opportunity.monthly_rev_min ?? 0
  const revMax = opportunity.monthly_rev_max ?? 0
  const profitMin = opportunity.monthly_profit_min ?? 0
  const profitMax = opportunity.monthly_profit_max ?? 0
  const paybackMin = opportunity.payback_months_min ?? null
  const paybackMax = opportunity.payback_months_max ?? null

  const config = opportunity.calculator_config as OpportunityCalculatorConfig | undefined
  const rev = config?.revenue
  const unitsLow = rev?.units_per_day_low ?? 0
  const unitsHigh = rev?.units_per_day_high ?? 0
  const unitsMid = Math.round((unitsLow + unitsHigh) / 2)
  const driverLabel = rev?.driver_label ?? 'units'
  const cogsLabel = config?.cogs_label ?? 'Cost of goods'
  const avgBill = rev?.avg_bill ?? 0
  const billingModel = getCalculatorBillingModel(config)
  const isSubscription = isSubscriptionBilling(config)

  const revenueFromFormula = (units: number) =>
    avgBill > 0 && units > 0 ? monthlyRevenueFromUnits(avgBill, units, billingModel) : 0

  const displayRevMin = revenueFromFormula(unitsLow) || revMin
  const displayRevMax = revenueFromFormula(unitsHigh) || revMax
  const displayRevMid = revenueFromFormula(unitsMid) || Math.round((revMin + revMax) / 2)

  const paybackMid =
    paybackMin != null && paybackMax != null
      ? Math.round((paybackMin + paybackMax) / 2)
      : paybackMin ?? paybackMax ?? null

  const easeLabel = normalizeEaseLevel(opportunity.ease)

  const scenarios: Scenario[] = [
    {
      key: 'conservative',
      label: 'Conservative',
      hint: 'Lower end of expected demand.',
      colorClass: 'text-rose-500',
      progressClass: 'bg-rose-500',
      topSlotTone: 'destructive',
      icon: ShieldCheck,
      revenue: displayRevMin,
      profit: profitMin,
      margin: displayRevMin > 0 ? Math.round((profitMin / displayRevMin) * 100) : 0,
      paybackMonths: paybackMax,
      driverLabel: formatScenarioDriverLabel(unitsLow, driverLabel, isSubscription),
    },
    {
      key: 'realistic',
      label: 'Realistic',
      hint: 'Most likely steady-state run rate.',
      colorClass: 'text-primary',
      progressClass: 'bg-primary',
      topSlotTone: 'primary',
      icon: Sparkles,
      revenue: displayRevMid,
      profit: Math.round((profitMin + profitMax) / 2),
      margin:
        displayRevMid > 0
          ? Math.round((((profitMin + profitMax) / 2) / displayRevMid) * 100)
          : (opportunity.margin_pct ?? 0),
      paybackMonths: paybackMid,
      driverLabel: formatScenarioDriverLabel(unitsMid, driverLabel, isSubscription),
    },
    {
      key: 'optimistic',
      label: 'Optimistic',
      hint: 'Upper end if demand holds.',
      colorClass: 'text-success',
      progressClass: 'bg-success',
      topSlotTone: 'success',
      icon: Flame,
      revenue: displayRevMax,
      profit: profitMax,
      margin: displayRevMax > 0 ? Math.round((profitMax / displayRevMax) * 100) : 0,
      paybackMonths: paybackMin,
      driverLabel: formatScenarioDriverLabel(unitsHigh, driverLabel, isSubscription),
    },
  ]
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'financial_projections',
    'revenue-estimator',
  )

  if (!revMin && !revMax) return null

  const baselineItems = [
    {
      key: 'setup',
      icon: Wallet,
      label: 'Setup capital',
      value: `${formatMoney(opportunity.setup_min ?? 0)} – ${formatMoney(opportunity.setup_max ?? 0)}`,
    },
    avgBill > 0
      ? {
          key: 'ticket',
          icon: ArrowUpRight,
          label: 'Average ticket',
          value: formatMoney(avgBill),
        }
      : null,
    cogsLabel
      ? {
          key: 'cogs',
          icon: Percent,
          label: cogsLabel,
          value: `${config?.cogs_slider_min ?? '—'}–${config?.cogs_slider_max ?? '—'}%`,
        }
      : null,
    easeLabel
      ? {
          key: 'effort',
          icon: Gauge,
          label: 'Effort level',
          valueNode: <EffortLevelMeter effort={easeLabel} size="sm" />,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    icon: React.ElementType
    label: string
    value?: string
    valueNode?: React.ReactNode
  }>

  return (
    <OpportunityDetailSectionShell
      id="od-scenarios"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="revenue-estimator"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={
        <OpportunityAccordionHeaderRow
          icon={Calculator}
          title={<OpportunityTermLabel term="revenue_estimator" label="Revenue Estimator" />}
        />
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {scenarios.map((s) => {
            const Icon = s.icon
            return (
              <Card
                key={s.key}
                padding="sm"
                radius="lg"
                className={cn(opportunityDetailCardClass, 'flex h-full flex-col overflow-hidden')}
                topSlotStyle={opportunityCardTopSlotToneStyle[s.topSlotTone]}
                topSlot={
                  <div className={opportunityCardTopSlotRowClass}>
                    <Icon
                      className={iconClassName({
                        tone:
                          s.topSlotTone === 'success'
                            ? 'success'
                            : s.topSlotTone === 'destructive'
                              ? 'destructive'
                              : 'primary',
                        size: 'sm',
                        active: true,
                      })}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        opportunityCardTopSlotTitleClass,
                        opportunityCardTopSlotTone[s.topSlotTone].title,
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                }
              >
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div>
                    <p
                      className={cn(
                        'font-display text-[28px] font-black leading-none tracking-tight tabular-nums',
                        s.colorClass,
                      )}
                    >
                      {formatMoney(s.revenue)}
                      <span className="ml-1 text-[14px] font-semibold text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-1.5 font-sans text-[12px] text-muted-foreground">{s.hint}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 font-sans text-[13px]">
                      <span className="text-muted-foreground">Monthly profit</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(s.profit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-sans text-[13px] text-muted-foreground">Net margin</span>
                      <div className="flex items-center gap-2">
                        <OpportunityProgressBar
                          value={s.margin}
                          fillClassName={s.progressClass}
                          aria-label={`${s.label} margin`}
                        />
                        <span className={cn('min-w-[2.5rem] text-right font-semibold tabular-nums', s.colorClass)}>
                          {s.margin}%
                        </span>
                      </div>
                    </div>
                    {s.paybackMonths != null ? (
                      <div className="flex items-center justify-between gap-3 border-t border-border-subtle/50 pt-2 font-sans text-[13px]">
                        <span className="text-muted-foreground">Payback</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {s.paybackMonths === 1 ? '1 month' : `${s.paybackMonths} months`}
                        </span>
                      </div>
                    ) : null}
                    {s.driverLabel ? (
                      <div className="flex items-center justify-between gap-3 border-t border-border-subtle/50 pt-2 font-sans text-[13px]">
                        <span className="text-muted-foreground">Customers needed</span>
                        <span className="max-w-[9rem] truncate text-right font-semibold text-foreground">
                          {s.driverLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {baselineItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {baselineItems.map((item) => {
              const Icon = item.icon
              return (
                <Card
                  key={item.key}
                  padding="sm"
                  radius="lg"
                  className="overflow-hidden"
                  topSlot={
                    <div className={opportunityCardTopSlotRowClass}>
                      <Icon className={iconClassName({ tone: 'muted', size: 'sm' })} aria-hidden />
                      <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                        {item.label}
                      </span>
                    </div>
                  }
                >
                  {item.valueNode ?? (
                    <p className="m-0 font-sans text-[14px] font-semibold tabular-nums text-foreground">
                      {item.value}
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        ) : null}
      </div>
    </OpportunityDetailSectionShell>
  )
}

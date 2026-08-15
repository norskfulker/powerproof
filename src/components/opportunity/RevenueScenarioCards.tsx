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
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { OpportunityProgressBar } from '@/components/opportunity/detail/OpportunityProgressBar'
import { Card } from '@/components/ui/card'
import { ShieldCheck, Sparkles, Flame, Wallet, ArrowUpRight, BarChart3, Info, Percent, Calculator } from '@/lib/icons'
import { iconClassName } from '@/lib/iconClassNames'

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
  sublabel: string
  colorClass: string
  badgeVariant: BadgeVariant
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
  const cogsLabel = config?.cogs_label ?? 'Cost of Goods'
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
      label: 'Conservative Model',
      sublabel: 'Minimum operational baseline iteration threshold.',
      colorClass: 'text-rose-500',
      badgeVariant: 'red',
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
      label: 'Realistic Projection',
      sublabel: 'Standard operational run-rate capability target.',
      colorClass: 'text-primary',
      badgeVariant: 'blue',
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
      label: 'Optimistic Horizon',
      sublabel: 'Maximum systemic scale capability saturation.',
      colorClass: 'text-success',
      badgeVariant: 'green',
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
                      className={cn(opportunityDetailCardClass, 'flex h-full flex-col justify-between overflow-hidden')}
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
                              'min-w-0 flex-1',
                            )}
                          >
                            {s.label}
                          </span>
                        </div>
                      }
                    >
                      <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <div
                            className={cn(
                              'inline-flex flex-wrap items-baseline gap-x-2 font-sans text-[28px] font-black tracking-tight leading-none tabular-nums antialiased',
                              s.colorClass,
                            )}
                          >
                            <span>{formatMoney(s.revenue)}</span>
                            <span className="text-[15px] font-bold text-muted-foreground/60">/mo</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-4 font-sans text-[15px] text-muted-foreground/90">
                              <span>Expected Monthly Profit</span>
                              <span className="font-black tabular-nums text-foreground">{formatMoney(s.profit)}</span>
                            </div>
                            <OpportunityProgressBar
                              value={s.margin}
                              fillClassName={cn('opacity-85', s.progressClass)}
                              trackClassName="bg-muted"
                              aria-label={`${s.label} margin`}
                            />
                          </div>

                          <div className="flex items-center justify-between border-t border-border-subtle/40 pt-2.5 font-sans text-[13px] font-medium leading-none">
                            <span className="flex items-center gap-1 text-text-tertiary">
                              <Percent className="h-3 w-3" /> Net Margin
                            </span>
                            <span className={cn('font-black tabular-nums', s.colorClass)}>{s.margin}%</span>
                          </div>

                          {s.paybackMonths != null ? (
                            <div className="flex items-center justify-between border-t border-border-subtle/40 pt-2.5 font-sans text-[13px] font-medium leading-none">
                              <span className="text-text-tertiary">Expected Payback Period</span>
                              <span className="font-bold tabular-nums text-foreground">
                                {s.paybackMonths === 1 ? '1 Month' : `${s.paybackMonths} Months`}
                              </span>
                            </div>
                          ) : null}

                          {s.driverLabel ? (
                            <div className="flex items-center justify-between border-t border-border-subtle/40 pt-2.5 font-sans text-[13px] font-medium leading-none">
                              <span className="text-text-tertiary">Min. Customers Required</span>
                              <span className="max-w-[130px] truncate text-right font-bold text-text-secondary">
                                {s.driverLabel}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-start gap-1.5 border-t border-border-subtle/30 pt-3 text-[11px] font-semibold leading-relaxed tracking-tight text-text-tertiary">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground opacity-60" />
                          <span>{s.sublabel}</span>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              <div className="rounded-2xl border-0 bg-muted/20 px-5 py-4 flex flex-col gap-3.5 shadow-none">
                <div className="flex items-center gap-1.5 font-sans text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  <BarChart3 className="h-3.5 w-3.5 text-text-tertiary" />
                  <span>Underlying Operational Driving Baseline Weights</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      Setup Capital Bounds
                    </span>
                    <div className="text-[13px] font-black text-foreground tracking-tight tabular-nums flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-text-tertiary shrink-0" />
                      <span>
                        {formatMoney(opportunity.setup_min ?? 0)} – {formatMoney(opportunity.setup_max ?? 0)}
                      </span>
                    </div>
                  </div>

                  {avgBill > 0 ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                        Average Ticket Bill
                      </span>
                      <div className="text-[13px] font-black text-foreground tracking-tight tabular-nums flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-text-tertiary shrink-0" />
                        <span>{formatMoney(avgBill)}</span>
                      </div>
                    </div>
                  ) : null}

                  {cogsLabel ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block truncate max-w-full">
                        {cogsLabel} Limits
                      </span>
                      <div className="text-[13px] font-black text-foreground tracking-tight tabular-nums pl-0.5">
                        {config?.cogs_slider_min ?? '—'}–{config?.cogs_slider_max ?? '—'}%
                      </div>
                    </div>
                  ) : null}

                  {easeLabel ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                        Friction Index Complexity
                      </span>
                      <div className="text-[13px] font-black text-foreground tracking-tight pl-0.5">{easeLabel}</div>
                    </div>
                  ) : null}
                </div>
              </div>
      </div>
      </OpportunityDetailSectionShell>
  )

}

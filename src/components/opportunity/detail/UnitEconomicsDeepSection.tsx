import { useMemo } from 'react'
import type { ElementType } from 'react'
import {
  Banknote,
  Calculator,
  Clock,
  Percent,
  Scale,
  Target,
  TrendingUp,
  Users,
} from '@/lib/icons'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'

import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useCurrency } from '@/hooks/useCurrency'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { parseOppJsonField, type UnitEconomicsDeepData } from '@/lib/researchDepthTypes'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex, type IconTone } from '@/lib/iconClassNames'
import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

type MetricDef = {
  key: string
  label: string
  icon: ElementType
  hue: number
  format: (data: UnitEconomicsDeepData, formatMoney: (n: number) => string) => string | null
  highlight?: boolean
}

const METRICS: MetricDef[] = [
  {
    key: 'ltv_cac',
    label: 'LTV : CAC',
    icon: Scale,
    hue: 262,
    highlight: true,
    format: (d) =>
      d.ltv_cac_ratio != null && Number.isFinite(d.ltv_cac_ratio) ? `${d.ltv_cac_ratio}x` : null,
  },
  {
    key: 'ltv',
    label: 'Avg LTV',
    icon: Users,
    hue: 227,
    highlight: true,
    format: (d, fmt) =>
      d.avg_ltv_usd != null && Number.isFinite(d.avg_ltv_usd) ? fmt(d.avg_ltv_usd) : null,
  },
  {
    key: 'gross_margin',
    label: 'Gross margin',
    icon: Percent,
    hue: 152,
    highlight: true,
    format: (d) =>
      d.gross_margin_pct != null && Number.isFinite(d.gross_margin_pct) ? `${d.gross_margin_pct}%` : null,
  },
  {
    key: 'contribution',
    label: 'Contribution margin',
    icon: TrendingUp,
    hue: 199,
    format: (d, fmt) =>
      d.contribution_margin_usd != null && Number.isFinite(d.contribution_margin_usd)
        ? fmt(d.contribution_margin_usd)
        : null,
  },
  {
    key: 'be_units',
    label: 'Break-even units / mo',
    icon: Target,
    hue: 32,
    format: (d) =>
      d.break_even_units_per_month != null && Number.isFinite(d.break_even_units_per_month)
        ? Math.round(d.break_even_units_per_month).toLocaleString('en-US')
        : null,
  },
  {
    key: 'be_revenue',
    label: 'Break-even revenue',
    icon: Banknote,
    hue: 340,
    format: (d, fmt) =>
      d.break_even_revenue_usd != null && Number.isFinite(d.break_even_revenue_usd)
        ? fmt(d.break_even_revenue_usd)
        : null,
  },
  {
    key: 'payback',
    label: 'Payback period',
    icon: Clock,
    hue: 174,
    format: (d) =>
      d.payback_period_months != null && Number.isFinite(d.payback_period_months)
        ? `${d.payback_period_months} mo`
        : null,
  },
]

function MetricTile({
  label,
  value,
  icon: Icon,
  iconTone,
  highlight = false,
}: {
  label: string
  value: string
  icon: ElementType
  iconTone: IconTone
  highlight?: boolean
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className="h-full"
      topSlotStyle={highlight ? opportunityCardTopSlotToneStyle.primary : undefined}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon
            className={iconClassName({ tone: highlight ? 'primary' : iconTone, size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              highlight ? opportunityCardTopSlotTone.primary.title : 'text-muted-foreground',
              'text-xs font-medium tracking-normal',
            )}
          >
            {label}
          </span>
        </div>
      }
    >
      <p
        className={cn(
          'font-sans font-medium tabular-nums tracking-normal text-foreground',
          highlight ? 'text-xl text-primary' : 'text-lg',
        )}
      >
        {value}
      </p>
    </Card>
  )
}

function CacChannelCard({
  channel,
  cac,
  notes,
  index,
  formatMoney,
}: {
  channel: string
  cac: number | undefined
  notes?: string
  index: number
  formatMoney: (n: number) => string
}) {
  const cacStr = cac != null && Number.isFinite(cac) ? formatMoney(cac) : '—'

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'overflow-hidden transition-shadow hover:shadow-md')}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <TrendingUp
            className={iconClassName({ tone: iconToneForIndex(index), size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {channel}
          </span>
        </div>
      }
    >
      <p className="font-sans text-lg font-black tabular-nums tracking-tight text-foreground">
        {cacStr}
        <span className="ml-1 text-[11px] font-semibold text-muted-foreground">CAC</span>
      </p>
      {notes ? (
        <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-muted-foreground">{notes}</p>
      ) : null}
    </Card>
  )
}

export function UnitEconomicsDeepSection({
  opp,
  isMobile,
}: {
  opp: Record<string, unknown>
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}) {
  const { formatMoney } = useCurrency()
  const data = parseOppJsonField<UnitEconomicsDeepData>(
    (opp as { unit_economics_deep?: unknown }).unit_economics_deep,
  )

  const channels = (data?.cac_by_channel ?? []).filter((c) => c?.channel)
  const activeMetrics = useMemo(() => {
    if (!data) return []
    return METRICS.map((m) => ({
      ...m,
      value: m.format(data, formatMoney),
    })).filter((m) => m.value != null) as Array<MetricDef & { value: string }>
  }, [data, formatMoney])

  const hasMetrics = activeMetrics.length > 0 || channels.length > 0
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'unit_economics_deep',
    'unit-economics',
  )

  if (!data || !hasMetrics) return null

  const highlightMetrics = activeMetrics.filter((m) => m.highlight)
  const otherMetrics = activeMetrics.filter((m) => !m.highlight)

  const subtitleParts = [
    highlightMetrics[0]?.value ? `LTV:CAC ${highlightMetrics[0].value}` : null,
    activeMetrics.find((m) => m.key === 'gross_margin')?.value
      ? `${activeMetrics.find((m) => m.key === 'gross_margin')!.value} margin`
      : null,
    channels.length > 0 ? `${channels.length} CAC channels` : null,
  ].filter(Boolean)

  return (
    <OpportunityDetailSectionShell
      id="od-unit-economics"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="unit-economics"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={<OpportunityAccordionHeaderRow icon={Calculator} title="Unit economics" />}
      description={subtitleParts.length ? subtitleParts.join(' · ') : `${activeMetrics.length} metrics`}
    >
      <div className="space-y-4">
        {highlightMetrics.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {highlightMetrics.map((m, i) => (
              <MetricTile
                key={m.key}
                label={m.label}
                value={m.value}
                icon={m.icon}
                iconTone={iconToneForIndex(i)}
                highlight
              />
            ))}
          </div>
        ) : null}

        {otherMetrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {otherMetrics.map((m, i) => (
              <MetricTile
                key={m.key}
                label={m.label}
                value={m.value}
                icon={m.icon}
                iconTone={iconToneForIndex(i)}
              />
            ))}
          </div>
        ) : null}

        {channels.length > 0 ? (
          <div className="space-y-2">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              CAC by channel
            </p>
            <div className="space-y-2">
              {channels.map((c, i) => (
                <CacChannelCard
                  key={i}
                  channel={c.channel!}
                  cac={c.cac_usd}
                  notes={c.notes}
                  index={i}
                  formatMoney={formatMoney}
                />
              ))}
            </div>
          </div>
        ) : null}

        {data.notes ? (
          <div className="rounded-xl border-0 bg-primary/[0.04] px-4 py-3.5">
            <p className="font-sans text-[12px] leading-relaxed text-foreground/85">{data.notes}</p>
          </div>
        ) : null}
      </div>
    </OpportunityDetailSectionShell>

  )
}

import type { ElementType } from 'react'
import {
  Award,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Landmark,
  PiggyBank,
  Repeat,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { OpportunityDetailAccordionTrigger } from '@/components/opportunity/detail/OpportunityDetailAccordionTrigger'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useCurrency } from '@/hooks/useCurrency'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import { iconClassName, type IconTone } from '@/lib/iconClassNames'
import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

import {
  formatFundingRange,
  parseOppJsonField,
  type FundingOptionType,
  type FundingOptionsData,
} from '@/lib/researchDepthTypes'

const FUNDING_TYPE_CONFIG: Record<
  string,
  { icon: ElementType; hue: number; label: string; badge: 'gray' | 'blue' | 'purple' | 'green' | 'orange' }
> = {
  bootstrap: { icon: Wallet, hue: 220, label: 'Self-funding', badge: 'gray' },
  debt: { icon: Landmark, hue: 210, label: 'Debt', badge: 'blue' },
  equity: { icon: TrendingUp, hue: 270, label: 'Equity', badge: 'purple' },
  grant: { icon: Award, hue: 150, label: 'Grant', badge: 'green' },
  revenue_based: { icon: Repeat, hue: 28, label: 'Revenue-based', badge: 'orange' },
}

const ELIGIBILITY_VARIANT: Record<string, 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
}

function getFundingColors(hue: number) {
  return {
    solid: `hsl(${hue}, 85%, 58%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.65)`,
    text: `hsl(${hue}, 78%, 42%)`,
    tintBg: `hsla(${hue}, 85%, 58%, 0.08)`,
  }
}

const FUNDING_TYPE_TONES: Record<string, IconTone> = {
  bootstrap: 'muted',
  debt: 'primary',
  equity: 'roadmap',
  grant: 'success',
  revenue_based: 'amber',
}

function FundingMetaTile({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className="h-full min-w-0"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon className={iconClassName({ tone: 'muted', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              'text-xs font-medium tracking-normal text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>
      }
    >
      <div className="font-sans text-[12px] font-medium leading-snug text-foreground">{children}</div>
    </Card>
  )
}

function FundingProsCons({ pros, cons }: { pros?: string[]; cons?: string[] }) {
  if (!pros?.length && !cons?.length) return null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {pros?.length ? (
        <Card
          padding="sm"
          radius="lg"
          className="h-full"
          topSlotStyle={opportunityCardTopSlotToneStyle.success}
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <CheckCircle2
                className={iconClassName({ tone: 'success', size: 'sm', active: true })}
                strokeWidth={2.5}
                aria-hidden
              />
              <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
                Pros
              </span>
            </div>
          }
        >
          <ul className="m-0 list-none space-y-2 p-0">
            {pros.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 font-sans text-[12px] leading-relaxed text-foreground/85"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {cons?.length ? (
        <Card
          padding="sm"
          radius="lg"
          className="h-full"
          topSlotStyle={opportunityCardTopSlotToneStyle.destructive}
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <XCircle
                className={iconClassName({ tone: 'destructive', size: 'sm', active: true })}
                strokeWidth={2.5}
                aria-hidden
              />
              <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.destructive.title)}>
                Cons
              </span>
            </div>
          }
        >
          <ul className="m-0 list-none space-y-2 p-0">
            {cons.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 font-sans text-[12px] leading-relaxed text-foreground/85"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

function FundingOptionCard({
  opt,
  index,
  formatMoney,
}: {
  opt: NonNullable<FundingOptionsData['options']>[number]
  index: number
  formatMoney: (n: number) => string
}) {
  const typeKey = String(opt.type ?? '').toLowerCase()
  const config = FUNDING_TYPE_CONFIG[typeKey] ?? {
    icon: PiggyBank,
    hue: 220,
    label: typeKey.replace(/_/g, ' ') || 'Funding',
    badge: 'gray' as const,
  }
  const colors = getFundingColors(config.hue)
  const Icon = config.icon
  const elig = String(opt.eligibility_bar ?? '').toLowerCase()
  const eligVariant = ELIGIBILITY_VARIANT[elig] ?? 'amber'
  const range = formatFundingRange(opt.amount_range_usd_min, opt.amount_range_usd_max, formatMoney)
  const url = String(opt.url ?? '').trim()
  const href = url ? (url.startsWith('http') ? url : `https://${url}`) : null

  return (
    <Card
      key={index}
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'overflow-hidden')}
      topSlotStyle={opportunityCardTopSlotToneStyle.primary}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon
            className={iconClassName({ tone: FUNDING_TYPE_TONES[typeKey] ?? 'primary', size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {config.label}
          </span>
        </div>
      }
    >
      <div className="flex w-full min-w-0 items-start gap-3 text-left">
        <Icon
          className={iconClassName({ tone: FUNDING_TYPE_TONES[typeKey] ?? 'primary', size: 'lg', active: true })}
          strokeWidth={2.5}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" className="font-semibold" variant={config.badge}>
              {config.label}
            </Badge>
            <span className="font-sans text-[15px] font-bold text-foreground">
              {opt.label ?? opt.source_name}
            </span>
          </div>
          {opt.source_name && opt.label ? (
            <p className="mt-0.5 font-sans text-[12px] font-medium text-muted-foreground">
              {opt.source_name}
            </p>
          ) : null}
          {range ? (
            <p
              className="mt-1.5 font-sans text-lg font-black tabular-nums tracking-tight"
              style={{ color: colors.text }}
            >
              {range}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="mt-3 space-y-4 rounded-xl border-0 p-4"
        style={{ backgroundColor: colors.tintBg }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {opt.eligibility_bar ? (
            <FundingMetaTile icon={Target} label="Eligibility">
              <Badge size="sm" className="font-semibold" variant={eligVariant}>
                {opt.eligibility_bar}
              </Badge>
            </FundingMetaTile>
          ) : null}
          {opt.when_to_apply ? (
            <FundingMetaTile icon={Clock} label="When">
              {opt.when_to_apply}
            </FundingMetaTile>
          ) : null}
          {opt.interest_or_dilution ? (
            <FundingMetaTile icon={Banknote} label="Cost">
              {opt.interest_or_dilution}
            </FundingMetaTile>
          ) : null}
          {opt.approval_timeline ? (
            <FundingMetaTile icon={Clock} label="Timeline">
              {opt.approval_timeline}
            </FundingMetaTile>
          ) : null}
        </div>

        {opt.best_for ? (
          <div className="rounded-xl border-0 bg-primary/[0.04] px-3.5 py-3">
            <p className="font-sans text-[12px] leading-relaxed text-foreground/90">
              <span className="font-bold text-primary">Best for: </span>
              {opt.best_for}
            </p>
          </div>
        ) : null}

        <FundingProsCons pros={opt.pros} cons={opt.cons} />

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border-0 bg-primary px-4 py-2.5',
              'font-sans text-[13px] font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90',
            )}
          >
            Apply
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </a>
        ) : null}
      </div>
    </Card>
  )

}

export function FundingOptionsSection({
  opp,
  isMobile,
  isProLocked = false,
}: {
  opp: Record<string, unknown>
   isMobile: boolean
   isProLocked?: boolean

}) {
  const { formatMoney } = useCurrency()
  const data = parseOppJsonField<FundingOptionsData>((opp as { funding_options?: unknown }).funding_options)
  const options = (data?.options ?? []).filter((o) => o?.label || o?.source_name)
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'funding_options',
    'funding-options',
  )

  if (!data || options.length === 0) return null

  const typeSummary = [...new Set(options.map((o) => String(o.type ?? '').toLowerCase()).filter(Boolean))]

  return (
    <OpportunityDetailSectionShell
      id="od-funding"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="funding-options"
      accordionValue={isProLocked ? 'funding-options' : accordionValue}
      onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
      header={
        <OpportunityDetailAccordionTrigger
          icon={PiggyBank}
          title="Funding options"
          aside={`${options.length} source${options.length === 1 ? '' : 's'}`}
          asideSubline={
            typeSummary.length ? typeSummary.map((t) => t.replace(/_/g, ' ')).join(', ') : undefined
          }
        />
      }
    >
            <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[14rem]">
            <div className="space-y-4">
              {data.summary ? (
                <Card
                  padding="sm"
                  radius="lg"
                  className={cn(opportunityDetailCardClass, 'overflow-hidden')}
                  topSlotStyle={opportunityCardTopSlotToneStyle.primary}
                  topSlot={
                    <div className={opportunityCardTopSlotRowClass}>
                      <PiggyBank
                        className={iconClassName({ tone: 'primary', size: 'sm', active: true })}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.primary.title)}>
                        Capital strategy
                      </span>
                    </div>
                  }
                >
                  <p className="font-sans text-[14px] leading-relaxed text-foreground/90">{data.summary}</p>
                </Card>
              ) : null}

              <div className="w-full space-y-3">
                {options.map((opt, i) => (
                  <FundingOptionCard key={i} opt={opt} index={i} formatMoney={formatMoney} />
                ))}
              </div>
            </div>
            </OpportunityProLock>
    </OpportunityDetailSectionShell>
  )
}

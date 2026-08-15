import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ElementType } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  Check,
  Compass,
  Gauge,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Users,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import {
  OpportunityAccordionHeaderRow,
  opportunityAccordionDescriptionClass,
} from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import {
  OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT,
  type OpportunityEditSectionFocusDetail,
} from '@/lib/opportunityEditSectionFocus'
import {
  parseFutureOutlook,
  parseMarketVerdict,
  parsePainPoints,
  parseSaturationLevel,
} from '@/lib/researchDepthTypes'
import type {
  FutureOutlook,
  MarketVerdict,
  PainPoint,
  SaturationLevel,
} from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import type { SaturationData } from '@/types/research'
import { iconClassName } from '@/lib/iconClassNames'
import { getSaturationLabel, getVerdictTone, normalizeSaturationData } from '@/lib/saturation'
import { OperatorInsightsContent } from '@/components/opportunity/detail/ExpertTipsSection'
import { parseExpertTipsStructured } from '@/types/research'

import {
  opportunityDetailCardClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  type OpportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'

type TwScroll = { startWhenInView: true; inViewResetKey: string }

const WILLINGNESS_BADGE: Record<
  PainPoint['willingness_to_pay'],
  { variant: 'green' | 'amber' | 'gray'; label: string }
> = {
  high: { variant: 'green', label: 'High WTP' },
  medium: { variant: 'amber', label: 'Medium WTP' },
  low: { variant: 'gray', label: 'Low WTP' },
}

const VERDICT_CONFIG: Record<
  MarketVerdict['verdict'],
  { variant: 'green' | 'amber' | 'red'; emoji: string; label: string }
> = {
  bullish: { variant: 'green', emoji: '🚀', label: 'Bullish' },
  cautious: { variant: 'amber', emoji: '⚠️', label: 'Cautious' },
  bearish: { variant: 'red', emoji: '📉', label: 'Bearish' },
}

const OUTLOOK_CONFIG: Record<
  FutureOutlook['outlook'],
  { variant: 'green' | 'blue' | 'amber' | 'red'; label: string }
> = {
  bright: { variant: 'green', label: 'Bright' },
  moderate: { variant: 'blue', label: 'Moderate' },
  uncertain: { variant: 'amber', label: 'Uncertain' },
  declining: { variant: 'red', label: 'Declining' },
}

const DISRUPTION_BADGE: Record<
  FutureOutlook['disruption_risk'],
  { variant: 'green' | 'amber' | 'red'; label: string }
> = {
  low: { variant: 'green', label: 'Low disruption' },
  medium: { variant: 'amber', label: 'Medium disruption' },
  high: { variant: 'red', label: 'High disruption' },
}

const SATURATION_CONFIG: Record<
  SaturationLevel,
  { variant: 'green' | 'amber' | 'red'; label: string }
> = {
  low: { variant: 'green', label: 'Low Competition' },
  medium: { variant: 'amber', label: 'Moderate Competition' },
  high: { variant: 'red', label: 'High Competition' },
  extreme: { variant: 'red', label: 'Extremely Saturated' },
}

/** Maps the existing green/amber/red badge variants to nested-card topSlot tones. */
const GAR_TONE: Record<'green' | 'amber' | 'red', OpportunityCardTopSlotTone> = {
  green: 'success',
  amber: 'amber',
  red: 'destructive',
}

const SECTION_TO_ITEM: Record<string, string> = {
  pain_points: 'pain-points',
  market_verdict: 'market-verdict',
  future_outlook: 'future-outlook',
  saturation_level: 'saturation',
  expert_tips_structured: 'operator-insights',
}

const HIGHLIGHT_MS = 3200

const ADVICE_PLATFORM_LOGOS = [
  {
    name: 'Reddit',
    src: 'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/logos-1/Reddit_Logo.webp',
  },
  {
    name: 'Telegram',
    src: 'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/logos-1/Telegram_Logo.webp',
  },
  {
    name: 'Discord',
    src: 'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/logos-1/Discord_Logo.webp',
  },
] as const

function clampUrgency(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function urgencyDecisionLabel(score: number): string {
  if (score >= 70) return 'Move now'
  if (score >= 40) return 'Watch closely'
  return 'Wait and watch'
}

function AdvicePlatformLogos() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5" aria-label="Sourced from Reddit, Telegram, and Discord">
      {ADVICE_PLATFORM_LOGOS.map((logo) => (
        <img
          key={logo.name}
          src={logo.src}
          alt=""
          title={logo.name}
          className="h-5 w-5 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
        />
      ))}
    </span>
  )
}

function AccordionPanelTrigger({
  icon: Icon,
  title,
  endAddon,
}: {
  icon: ElementType
  title: ReactNode
  /** Exception slot — e.g. social source logos on operator advice. */
  endAddon?: ReactNode
}) {
  if (!endAddon) {
    return <OpportunityAccordionHeaderRow icon={Icon} title={title} />
  }
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <OpportunityAccordionHeaderRow icon={Icon} title={title} className="min-w-0 flex-1" />
      {endAddon}
    </span>
  )
}

const painSubcardTitleClass =
  'flex items-center gap-2 font-sans text-md tracking-medium font-semibold text-muted-foreground'

function PainPointsContent({ painPoints }: { painPoints: PainPoint[] }) {
  const { localizeText } = useCurrency()
  const count = painPoints.length

  return (
    <div
      className={cn(
        'grid gap-3',
        count === 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-1 sm:grid-cols-2',
        count >= 3 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
      )}
    >
      {painPoints.map((point, index) => {
        const wtp = WILLINGNESS_BADGE[point.willingness_to_pay] ?? WILLINGNESS_BADGE.medium
        return (
          <Card
            key={`${point.pain}-${index}`}
            padding="sm"
            radius="lg"
            className="flex h-full min-w-0 flex-col"
            topSlot={
              <div className={opportunityCardTopSlotRowClass}>
                <AlertCircle
                  className={iconClassName({ tone: 'muted', size: 'sm' })}
                  aria-hidden
                />
                <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                  {localizeText(point.pain)}
                </div>
              </div>
            }
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex self-start">
                      <Badge size="sm" className="font-semibold" variant={wtp.variant}>
                        {wtp.label}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Willingness to Pay</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {point.current_workaround ? (
                <Card
                  padding="sm"
                  radius="md"
                  className="border-primary/15 bg-primary/[0.04] shadow-none"
                >
                  <div className={cn(painSubcardTitleClass, 'text-primary')}>
                    <Users className={iconClassName({ tone: 'primary', size: 'sm', active: true })} aria-hidden />
                    People facing
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-foreground/90">
                    <span className="font-semibold text-foreground">
                      People currently facing this problem by:
                    </span>{' '}
                    {localizeText(point.current_workaround)}
                  </p>
                </Card>
              ) : null}

              {point.how_this_business_solves_it ? (
                <Card
                  padding="sm"
                  radius="md"
                  className="mt-auto border-success/20 bg-success/[0.04] shadow-none"
                >
                  <div className={cn(painSubcardTitleClass, 'text-success')}>
                    <Lightbulb className={iconClassName({ tone: 'success', size: 'sm', active: true })} aria-hidden />
                    Solution
                  </div>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-foreground/90">
                    {localizeText(point.how_this_business_solves_it)}
                  </p>
                </Card>
              ) : null}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function MarketVerdictContent({ verdict }: { verdict: MarketVerdict }) {
  const { localizeText } = useCurrency()
  const config = VERDICT_CONFIG[verdict.verdict] ?? VERDICT_CONFIG.cautious
  const stanceTone = GAR_TONE[config.variant]
  const urgency = clampUrgency(verdict.urgency_score)
  const urgencyTone: OpportunityCardTopSlotTone = urgency >= 70 ? 'success' : urgency >= 40 ? 'amber' : 'destructive'
  const whyNow = Array.isArray(verdict.why_now) ? verdict.why_now.filter(Boolean) : []
  const whyNotYet = Array.isArray(verdict.why_not_yet) ? verdict.why_not_yet.filter(Boolean) : []

  return (
    <div className="space-y-4">
      {verdict.verdict_summary ? (
        <p className={opportunityAccordionDescriptionClass}>{localizeText(verdict.verdict_summary)}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          padding="sm"
          radius="lg"
          topSlotStyle={opportunityCardTopSlotToneStyle[stanceTone]}
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <TrendingUp
                className={iconClassName({
                  tone: stanceTone === 'success' ? 'success' : stanceTone === 'destructive' ? 'destructive' : 'amber',
                  size: 'sm',
                  active: true,
                })}
                aria-hidden
              />
              <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone[stanceTone].title)}>
                Market stance
              </div>
            </div>
          }
        >
          <Badge size="sm" className="font-semibold" variant={config.variant}>
            <span aria-hidden>{config.emoji}</span>
            {config.label}
          </Badge>
        </Card>

        <Card
          padding="sm"
          radius="lg"
          topSlotStyle={opportunityCardTopSlotToneStyle[urgencyTone]}
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <Gauge
                className={iconClassName({
                  tone: urgencyTone === 'success' ? 'success' : urgencyTone === 'destructive' ? 'destructive' : 'amber',
                  size: 'sm',
                  active: true,
                })}
                aria-hidden
              />
              <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone[urgencyTone].title)}>
                Urgency
              </div>
            </div>
          }
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className={cn('font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums', opportunityCardTopSlotTone[urgencyTone].value)}>
                {urgency}
                <span className="ml-0.5 text-[14px] font-medium text-muted-foreground">/100</span>
              </p>
              <p className="text-[12px] font-semibold text-foreground/85">{urgencyDecisionLabel(urgency)}</p>
            </div>
            <span className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timing
            </span>
          </div>
        </Card>
      </div>

      {(whyNow.length > 0 || whyNotYet.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {whyNow.length > 0 ? (
            <Card
              padding="sm"
              radius="lg"
              topSlotStyle={opportunityCardTopSlotToneStyle.success}
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <Check
                    className={iconClassName({ tone: 'success', size: 'sm', active: true })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
                    Why now
                  </div>
                </div>
              }
            >
              <ul className="space-y-2">
                {whyNow.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/85">
                    <Check
                      className={iconClassName({ tone: 'success', size: 'sm', active: true, className: 'mt-0.5' })}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {localizeText(item)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {whyNotYet.length > 0 ? (
            <Card
              padding="sm"
              radius="lg"
              topSlotStyle={opportunityCardTopSlotToneStyle.warning}
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <AlertTriangle
                    className={iconClassName({ tone: 'amber', size: 'sm', active: true })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.warning.title)}>
                    Why not yet
                  </div>
                </div>
              }
            >
              <ul className="space-y-2">
                {whyNotYet.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/85">
                    <AlertTriangle
                      className={iconClassName({ tone: 'amber', size: 'sm', active: true, className: 'mt-0.5' })}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {localizeText(item)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      {verdict.timing_note ? (
        <p className="border-t border-border-subtle/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {localizeText(verdict.timing_note)}
        </p>
      ) : null}
    </div>
  )
}

function FutureOutlookContent({ outlook }: { outlook: FutureOutlook }) {
  const { localizeText } = useCurrency()
  const outlookConfig = OUTLOOK_CONFIG[outlook.outlook] ?? OUTLOOK_CONFIG.moderate
  const disruption = DISRUPTION_BADGE[outlook.disruption_risk] ?? DISRUPTION_BADGE.medium
  const tailwinds = Array.isArray(outlook.tailwinds) ? outlook.tailwinds.filter(Boolean) : []
  const headwinds = Array.isArray(outlook.headwinds) ? outlook.headwinds.filter(Boolean) : []
  const megatrends = Array.isArray(outlook.megatrend_alignment)
    ? outlook.megatrend_alignment.filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        <Badge size="sm" className="font-semibold" variant={outlookConfig.variant}>
          {outlookConfig.label}
        </Badge>
        <Badge size="sm" className="font-semibold" variant={disruption.variant}>
          {disruption.label}
        </Badge>
      </div>

      {outlook.future_verdict ? (
        <p className="text-[13px] leading-relaxed text-foreground/90">{localizeText(outlook.future_verdict)}</p>
      ) : null}

      {(outlook.year3_potential || outlook.year5_potential) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {outlook.year3_potential ? (
            <Card
              padding="sm"
              radius="lg"
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <Calendar
                    className={iconClassName({ tone: 'muted', size: 'sm' })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                    Year 3 potential
                  </div>
                </div>
              }
            >
              <p className="text-[12px] leading-relaxed text-foreground/90">{localizeText(outlook.year3_potential)}</p>
            </Card>
          ) : null}
          {outlook.year5_potential ? (
            <Card
              padding="sm"
              radius="lg"
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <Target
                    className={iconClassName({ tone: 'muted', size: 'sm' })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                    Year 5 potential
                  </div>
                </div>
              }
            >
              <p className="text-[12px] leading-relaxed text-foreground/90">{localizeText(outlook.year5_potential)}</p>
            </Card>
          ) : null}
        </div>
      )}

      {(tailwinds.length > 0 || headwinds.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {tailwinds.length > 0 ? (
            <Card
              padding="sm"
              radius="lg"
              topSlotStyle={opportunityCardTopSlotToneStyle.success}
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <ArrowUpRight
                    className={iconClassName({ tone: 'success', size: 'sm', active: true })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
                    Tailwinds
                  </div>
                </div>
              }
            >
              <ul className="space-y-1.5">
                {tailwinds.map((item, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-foreground/85">
                    {localizeText(item)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {headwinds.length > 0 ? (
            <Card
              padding="sm"
              radius="lg"
              topSlotStyle={opportunityCardTopSlotToneStyle.destructive}
              topSlot={
                <div className={opportunityCardTopSlotRowClass}>
                  <ArrowDownRight
                    className={iconClassName({ tone: 'destructive', size: 'sm', active: true })}
                    aria-hidden
                  />
                  <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.destructive.title)}>
                    Headwinds
                  </div>
                </div>
              }
            >
              <ul className="space-y-1.5">
                {headwinds.map((item, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-foreground/85">
                    {localizeText(item)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      {outlook.disruption_note ? (
        <div className="rounded-xl border-0 bg-amber-500/[0.04] px-3.5 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <TrendingDown className={iconClassName({ tone: 'amber', size: 'sm', active: true })} aria-hidden />
            Disruption risk
          </p>
          <p className="text-[12px] leading-relaxed text-foreground/85">{localizeText(outlook.disruption_note)}</p>
        </div>
      ) : null}

      {megatrends.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border-subtle/60 pt-3">
          {megatrends.map((tag, i) => (
            <Badge size="sm" className="font-semibold" key={`${tag}-${i}`} variant="blue">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SaturationContent({
  level,
  note,
  saturation,
  isSaturated,
}: {
  level: SaturationLevel
  note: string
  saturation: SaturationData | null
  isSaturated: boolean
}) {
  const { localizeText } = useCurrency()
  const config = SATURATION_CONFIG[level]
  const saturationTone = GAR_TONE[config.variant]
  const verdict = saturation?.verdict ?? (isSaturated ? 'Saturated' : 'Blue Ocean')
  const tone = getVerdictTone(verdict)
  const score = Math.max(0, Math.min(100, Math.round(saturation?.score ?? (isSaturated ? 75 : 28))))
  const reasons = saturation?.reasons?.length
    ? saturation.reasons
    : note
      ? note.split(/\s*\|\s*|\n+/).filter(Boolean)
      : []
  const penalties = saturation?.score_penalties
  const penaltyRows = [
    { label: 'Market Momentum', value: Math.abs(penalties?.market_momentum ?? 0) },
    { label: 'Ease of Entry', value: Math.abs(penalties?.ease ?? 0) },
    { label: 'Profitability', value: Math.abs(penalties?.profitability ?? 0) },
  ].filter((item) => item.value > 0)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card
        padding="sm"
        radius="lg"
        topSlotStyle={opportunityCardTopSlotToneStyle[saturationTone]}
        topSlot={
          <div className={opportunityCardTopSlotRowClass}>
            <BarChart2
              className={iconClassName({
                tone: saturationTone === 'success' ? 'success' : saturationTone === 'destructive' ? 'destructive' : 'amber',
                size: 'sm',
                active: true,
              })}
              aria-hidden
            />
            <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone[saturationTone].title)}>
              Competition call
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Badge size="sm" variant={config.variant} className="font-semibold w-full justify-center truncate">
              {config.label}
            </Badge>
            <span className="inline-flex w-full items-center justify-center truncate rounded-full border border-border-subtle bg-muted/30 px-2 py-1 text-center text-[11px] font-semibold text-muted-foreground">
              {getSaturationLabel(score)}
            </span>
            <span className={cn('inline-flex w-full items-center justify-center truncate rounded-full border px-2 py-1 text-center text-[11px] font-semibold', tone.badge)}>
              {verdict}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <p className={cn('font-display text-[40px] font-semibold leading-none tracking-tight tabular-nums', opportunityCardTopSlotTone[saturationTone].value)}>
              {score}
              <span className="ml-1 text-[15px] font-medium text-muted-foreground">/100</span>
            </p>
            <span className="pb-1 text-right text-[12px] font-medium text-muted-foreground">
              Competition<br />intensity
            </span>
          </div>

          {penaltyRows.length ? (
            <div className="space-y-1.5 border-t border-border-subtle/60 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score impact</p>
              {penaltyRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-destructive">−{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        padding="sm"
        radius="lg"
        topSlotStyle={opportunityCardTopSlotToneStyle[saturationTone]}
        topSlot={
          <div className={opportunityCardTopSlotRowClass}>
            <Target
              className={iconClassName({
                tone: saturationTone === 'success' ? 'success' : saturationTone === 'destructive' ? 'destructive' : 'amber',
                size: 'sm',
                active: true,
              })}
              aria-hidden
            />
            <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone[saturationTone].title)}>
              Strategy
            </div>
          </div>
        }
      >
        {reasons.length ? (
          <div className="space-y-3">
            {reasons.map((reason, idx) => (
              <p
                key={`${idx}-${reason.slice(0, 20)}`}
                className="text-[13px] leading-relaxed text-foreground/90"
              >
                {localizeText(reason)}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            No strategy narrative available for this market yet.
          </p>
        )}
      </Card>
    </div>
  )
}

export function ResearchInsightSections({
  opp,
  isMobile,
  isProLocked = false,
}: {
  opp: Record<string, unknown>
  isMobile: boolean
  twScroll?: TwScroll
  isProLocked?: boolean
}) {
  const painPoints = parsePainPoints(opp.pain_points)
  const marketVerdict = parseMarketVerdict(opp.market_verdict)
  const futureOutlook = parseFutureOutlook(opp.future_outlook)
  const saturationLevel = parseSaturationLevel(opp.saturation_level)
  const saturationNote = String(opp.saturation_note ?? '').trim()
  const saturationData = normalizeSaturationData((opp as { research_context?: Record<string, unknown> })?.research_context?.saturation)
  const operatorInsights = parseExpertTipsStructured(opp.expert_tips_structured)

  const panels = useMemo(() => {
    const items: Array<{ id: string; sectionKey: string; node: React.ReactNode }> = []

    if (painPoints?.length) {
      items.push({
        id: 'pain-points',
        sectionKey: 'pain_points',
        node: (
          <OpportunityDetailSectionShell
            key="pain-points"
            id="od-pain-points"
            header={
              <AccordionPanelTrigger
                icon={AlertCircle}
                title="What customers are facing?"
              />
            }
          >
            <PainPointsContent painPoints={painPoints} />
          </OpportunityDetailSectionShell>
        ),
      })
    }

    if (marketVerdict) {
      items.push({
        id: 'market-verdict',
        sectionKey: 'market_verdict',
        node: (
          <OpportunityDetailSectionShell
            key="market-verdict"
            id="od-market-verdict"
            header={
              <AccordionPanelTrigger
                icon={TrendingUp}
                title="Is this a good time to start this business?"
              />
            }
          >
            <MarketVerdictContent verdict={marketVerdict} />
          </OpportunityDetailSectionShell>
        ),
      })
    }

    if (futureOutlook) {
      items.push({
        id: 'future-outlook',
        sectionKey: 'future_outlook',
        node: (
          <OpportunityDetailSectionShell
            key="future-outlook"
            id="od-future-outlook"
            header={
              <AccordionPanelTrigger
                icon={Compass}
                title="What is the long-term outlook?"
              />
            }
          >
            <FutureOutlookContent outlook={futureOutlook} />
          </OpportunityDetailSectionShell>
        ),
      })
    }

    if (saturationLevel || saturationData) {
      items.push({
        id: 'saturation',
        sectionKey: 'saturation_level',
        node: (
          <OpportunityDetailSectionShell
            key="saturation"
            id="od-saturation"
            header={
              <AccordionPanelTrigger
                icon={BarChart2}
                title="Is there too much competition?"
              />
            }
          >
            <SaturationContent
              level={saturationLevel ?? 'medium'}
              note={saturationNote}
              saturation={saturationData}
              isSaturated={Boolean(opp.is_saturated)}
            />
          </OpportunityDetailSectionShell>
        ),
      })
    }

    if (operatorInsights.length > 0) {
      items.push({
        id: 'operator-insights',
        sectionKey: 'expert_tips_structured',
        node: (
          <OpportunityDetailSectionShell
            key="operator-insights"
            id="od-tips"
            header={
              <AccordionPanelTrigger
                icon={Lightbulb}
                title="Existing Entrepreneur's Advice"
                endAddon={<AdvicePlatformLogos />}
              />
            }
          >
            <OperatorInsightsContent tips={operatorInsights} />
          </OpportunityDetailSectionShell>
        ),
      })
    }

    return items
  }, [
    painPoints,
    marketVerdict,
    futureOutlook,
    saturationLevel,
    saturationNote,
    saturationData,
    operatorInsights,
    opp.is_saturated,
  ])

  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<OpportunityEditSectionFocusDetail>).detail
      if (!detail?.sectionKey) return
      const item = SECTION_TO_ITEM[detail.sectionKey]
      if (!item) return
      if (detail.highlight === false) return
      setHighlighted(true)
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setHighlighted(false), HIGHLIGHT_MS)
    }
    window.addEventListener(OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT, onFocus)
    return () => {
      window.removeEventListener(OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT, onFocus)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (panels.length === 0) return null

  return (
    <section
      id="od-research-insights"
      className={cn(
        'min-w-0 w-full scroll-mt-[7.5rem] bg-background',
        'transition-[box-shadow,outline-color] duration-300',
        highlighted &&
          'ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]',
      )}
    >
      <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[14rem]">
        <div className="flex w-full flex-col bg-background">
          {panels.map((panel) => panel.node)}
        </div>
      </OpportunityProLock>
    </section>
  )
}

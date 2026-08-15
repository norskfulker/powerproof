import type { RefObject } from 'react'
import * as React from 'react'
import { useMemo } from 'react'
import {
  MapPin,
  Megaphone,
  BarChart3,
  Check,
  AlertCircle,
  AlertTriangle,
  Coins,
  Wrench,
  Landmark,
  TrendingUp,
} from '@/lib/icons'
import {
  FIT_SCORE_KEYS,
  FIT_SCORE_TIER_LABEL,
  SCORE_DIMENSION_META,
  getFitDimensionBarTone,
  getFitDimensionValue,
  getFitScoreTier,
  getFitScoreTierBadgeVariant,
  getValidatedFitScore,
  isFitScoreDisplayValid,
  type FitScoreKey,
} from '@/lib/fitScore'
import { capitalizeFirstLetter } from '@/lib/opportunityDetailUtils'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import {
  opportunityTermKeyForTitle,
  type OpportunityTermKey,
} from '@/lib/opportunityTermDefinitions'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { iconClassName } from '@/lib/iconClassNames'
import { Badge } from '@/components/ui/badge'
import { OpportunityProgressBar } from '@/components/opportunity/detail/OpportunityProgressBar'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'

const FIT_KEY_TERM: Record<(typeof FIT_SCORE_KEYS)[number], OpportunityTermKey> = {
  profitability: 'profitability',
  ease: 'ease_of_execution',
  govt_support: 'govt_support',
  market_momentum: 'market_momentum',
}

const FIT_KEY_ICON: Record<FitScoreKey, React.ElementType> = {
  profitability: Coins,
  ease: Wrench,
  govt_support: Landmark,
  market_momentum: TrendingUp,
}

function FitIndexBadge({
  score,
  unavailable = false,
}: {
  score: string
  unavailable?: boolean
}) {
  if (unavailable) {
    return (
      <Badge variant="gray" size="sm" className="uppercase tracking-wide">
        Fit N/A
      </Badge>
    )
  }

  if (score === '—') return null

  const numScore = parseInt(score, 10)
  const tier = getFitScoreTier(numScore)
  const variant = getFitScoreTierBadgeVariant(tier)

  return (
    <Badge variant={variant} size="sm" className="font-semibold">
      <span className="opacity-90">Fit</span>
      <span className="font-bold">{FIT_SCORE_TIER_LABEL[tier]}</span>
      <span className="tabular-nums opacity-80">{score}</span>
    </Badge>
  )
}

function FitScoreSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Fit score loading">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIT_SCORE_KEYS.map((key) => (
          <div key={key} className="space-y-2 border-b border-border-subtle/50 pb-4 last:border-b-0 sm:border-b-0 sm:pb-0">
            <span className="block h-3.5 w-28 animate-pulse rounded bg-muted/40" />
            <span className="block h-2 w-full animate-pulse rounded-full bg-muted/30" />
            <span className="block h-3 w-full animate-pulse rounded bg-muted/25" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreBreakdownSection({
  rawBreakdown,
  fitScore,
  fitScoreUnavailable,
  fitScoreValid,
  pros,
  cons,
}: {
  rawBreakdown: Record<string, unknown> | undefined
  fitScore: string
  fitScoreUnavailable: boolean
  fitScoreValid: boolean
  pros: string[]
  cons: string[]
}) {
  const { localizeText } = useCurrency()
  const showScoreCards = fitScoreValid
  const showUnavailableMessage = fitScoreUnavailable && !fitScoreValid
  const hasProsCons = pros.length > 0 || cons.length > 0

  if (!showScoreCards && !hasProsCons && !showUnavailableMessage) return null

  return (
    <div className="space-y-6">
      {showUnavailableMessage ? (
        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
          Fit score was not saved for this report. Other sections are still available.
        </p>
      ) : null}

      {showScoreCards ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5">
          {FIT_SCORE_KEYS.map((key, index) => {
            const meta = SCORE_DIMENSION_META[key]
            const val = getFitDimensionValue(rawBreakdown, key)
            return (
              <ScoreBreakdownItem
                key={key}
                meta={meta}
                term={FIT_KEY_TERM[key]}
                icon={FIT_KEY_ICON[key]}
                val={val}
                index={index}
              />
            )
          })}
        </div>
      ) : null}

      {hasProsCons ? (
        <div
          id="od-pros-cons"
          className="grid grid-cols-1 gap-6 border-t border-border-subtle/60 pt-6 sm:grid-cols-2 sm:gap-8"
        >
          {pros.length > 0 ? (
            <ProsConsBreakdownList
              title="Benefits of starting this business"
              items={pros.map(localizeText)}
              variant="pro"
            />
          ) : null}
          {cons.length > 0 ? (
            <ProsConsBreakdownList
              title="Potential Challenges"
              items={cons.map(localizeText)}
              variant="con"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ScoreBreakdownItem({
  meta,
  term,
  icon: Icon,
  val,
}: {
  meta: { label: string; desc: string }
  term: OpportunityTermKey
  icon: React.ElementType
  val: number
  index: number
}) {
  const { fill: barColor } = getFitDimensionBarTone(val)
  const tier = getFitScoreTier(val)
  const badgeVariant = getFitScoreTierBadgeVariant(tier)

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={iconClassName({ tone: 'muted', size: 'sm' })}
          aria-hidden
        />
        <OpportunityTermLabel
          term={term}
          label={meta.label}
          className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium text-foreground"
        />
        <Badge variant={badgeVariant} size="sm" className="shrink-0 font-semibold">
          {FIT_SCORE_TIER_LABEL[tier]}
        </Badge>
      </div>
      <OpportunityProgressBar
        value={val}
        color={barColor}
        size="md"
        className="min-w-0 w-full"
        aria-label={`${meta.label} score`}
      />
      <p className="font-sans text-[12px] font-normal leading-relaxed text-muted-foreground">
        {meta.desc}
      </p>
    </div>
  )
}

const PROS_CONS_CONFIG = {
  pro: {
    ItemIcon: Check,
    itemIconClass: 'text-success',
    titleClass: 'text-success',
  },
  con: {
    ItemIcon: AlertCircle,
    itemIconClass: 'text-destructive',
    titleClass: 'text-destructive',
  },
}

function ProsConsBreakdownList({
  title,
  items,
  variant,
}: {
  title: string
  items: string[]
  variant: 'pro' | 'con'
}) {
  const config = PROS_CONS_CONFIG[variant]
  const ItemIcon = config.ItemIcon
  const TitleIcon = variant === 'pro' ? Check : AlertTriangle

  return (
    <div className="min-w-0 space-y-3">
      <div className={cn('flex items-center gap-2 font-sans text-[13px] font-semibold', config.titleClass)}>
        <TitleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {title}
      </div>
      <ul className="m-0 list-none space-y-2.5 p-0">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 font-sans text-[13px] font-normal leading-relaxed text-foreground/85"
          >
            <ItemIcon
              className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', config.itemIconClass)}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PillRail({
  title,
  term,
  icon: Icon,
  pills,
  pillsRef,
}: {
  title: string
  term?: OpportunityTermKey
  icon: React.ElementType
  pills: string[]
  pillsRef: RefObject<HTMLDivElement | null>
  variant?: 'default' | 'primary'
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 font-sans text-[13px] font-medium text-foreground">
        <Icon className={iconClassName({ tone: 'muted', size: 'sm' })} strokeWidth={2.5} aria-hidden />
        {term ?? opportunityTermKeyForTitle(title) ? (
          <OpportunityTermLabel term={(term ?? opportunityTermKeyForTitle(title))!} label={title} />
        ) : (
          <span>{title}</span>
        )}
      </div>
      <div ref={pillsRef} className="flex flex-wrap gap-1.5">
        {pills.map((pill) => (
          <span
            key={pill}
            className="rounded-md border border-border-subtle bg-muted/30 px-2.5 py-1 font-sans text-[12px] font-medium text-foreground/80"
          >
            {capitalizeFirstLetter(pill)}
          </span>
        ))}
      </div>
    </div>
  )
}

export type FitScoreSidebarProps = {
  rawBreakdown: Record<string, unknown> | undefined
  rawScore: number | null | undefined
  fitScorePending?: boolean
  fitScoreUnavailable?: boolean
  opp: any
  locationPillsRef: RefObject<HTMLDivElement | null>
  customerPillsRef: RefObject<HTMLDivElement | null>
  statePillsRef: RefObject<HTMLDivElement | null>
  showFitScoreColumn: boolean
  hasGuidelinesChips: boolean
}

export function ResearchSaturationIndicator({ opp }: { opp: Record<string, unknown> }) {
  if (!(opp as { is_saturated?: boolean }).is_saturated) return null
  const note = (opp as { saturation_note?: string }).saturation_note
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/30">
      <div className="flex items-center gap-2">
        <OpportunityTermLabel
          term="research_saturation"
          label="Market Saturation Warning"
          className="text-[13px] font-semibold text-orange-700 dark:text-orange-400"
        />
      </div>
      {note ? (
        <p className="text-[12px] leading-relaxed text-orange-600/80 dark:text-orange-400/70">{note}</p>
      ) : null}
    </div>
  )
}

export function FitScoreSidebar({
  rawBreakdown,
  rawScore,
  fitScorePending = false,
  fitScoreUnavailable = false,
  opp,
  locationPillsRef: _locationPillsRef,
  customerPillsRef,
  statePillsRef,
  showFitScoreColumn,
  hasGuidelinesChips,
}: FitScoreSidebarProps) {
  const isMobile = useIsMobile()
  const fitScoreValid = isFitScoreDisplayValid(rawScore, rawBreakdown)
  const fitScoreHeadline = fitScoreValid ? getValidatedFitScore(rawScore, rawBreakdown) : null
  const fitScore = fitScoreHeadline != null ? `${fitScoreHeadline}` : '—'

  const pros: string[] = useMemo(
    () => (Array.isArray((opp as any)?.pros) ? (opp as any).pros.filter(Boolean) : []),
    [opp],
  )
  const cons: string[] = useMemo(
    () => (Array.isArray((opp as any)?.cons) ? (opp as any).cons.filter(Boolean) : []),
    [opp],
  )
  const hasProsCons = pros.length > 0 || cons.length > 0
  const showScoreBreakdown = showFitScoreColumn || hasProsCons

  const targetCustomerPills: string[] = useMemo(
    () =>
      Array.isArray((opp as any)?.target_customer_pills)
        ? (opp as any).target_customer_pills
            .map((p: any) => (typeof p === 'string' ? p : (p?.label ?? p?.name ?? '')))
            .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [],
    [opp],
  )

  if (!showScoreBreakdown && !hasGuidelinesChips) return null

  const summaryBadge =
    fitScorePending ? null : (
      <FitIndexBadge score={fitScore} unavailable={fitScoreUnavailable && !fitScoreValid} />
    )

  return (
    <OpportunityDetailSectionShell
      id="od-fit"
      itemValue="fit"
      defaultOpen={!isMobile && fitScoreValid}
      header={
        <OpportunityAccordionHeaderRow
          icon={BarChart3}
          title={<OpportunityTermLabel term="score_breakdown" label="Fit" />}
        />
      }
      contentMeta={summaryBadge || undefined}
      contentClassName="text-foreground"
    >
      <div className="space-y-6">
        {showScoreBreakdown ? (
          fitScorePending ? (
            <FitScoreSkeleton />
          ) : (
            <ScoreBreakdownSection
              rawBreakdown={rawBreakdown}
              fitScore={fitScore}
              fitScoreUnavailable={fitScoreUnavailable}
              fitScoreValid={fitScoreValid}
              pros={pros}
              cons={cons}
            />
          )
        ) : null}

        {hasGuidelinesChips ? (
          <div
            className={cn(
              'space-y-5',
              showScoreBreakdown && 'border-t border-border-subtle/60 pt-5',
            )}
          >
            {targetCustomerPills.length > 0 && (
              <PillRail
                title="Day One Ideal Customers"
                icon={Megaphone}
                pills={targetCustomerPills}
                pillsRef={customerPillsRef}
              />
            )}

            {Array.isArray((opp as any)?.state_tags) && (opp as any).state_tags.length > 0 && (
              <PillRail
                title="Best Place to Start this Business"
                icon={MapPin}
                pills={(opp as any).state_tags}
                pillsRef={statePillsRef}
              />
            )}
          </div>
        ) : null}
      </div>
    </OpportunityDetailSectionShell>
  )
}

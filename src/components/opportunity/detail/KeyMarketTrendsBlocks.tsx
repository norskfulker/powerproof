import { useId, useMemo, type ReactNode } from 'react'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import * as React from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import {
  capitalizeFirstLetter,
  formatMarketCrForDisplay,
  parseMarketCrValue,
  normalizePenetrationPercent,
  formatPenetrationPercent,
} from '@/lib/opportunityDetailUtils'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import {
  opportunityTermKeyForTitle,
  type OpportunityTermKey,
} from '@/lib/opportunityTermDefinitions'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { cn } from '@/lib/utils'
import { iconClassName } from '@/lib/iconClassNames'
import type { ResearchDemandTrend } from '@/types/database'
import {
  opportunityDetailCardClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  type OpportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'
import { Card } from '@/components/ui/card'

import {
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  Globe,
  Layers,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from '@/lib/icons'

const PRIMARY_BLUE = 'hsl(227, 100%, 59%)'

// ─── Utility Functions ───────────────────────────────────────────

function parseJsonField<T = Record<string, unknown>>(raw: unknown): T | null {
  if (raw == null) return null
  if (typeof raw !== 'string') return raw as T
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return null
  }
}

function levelVariant(level: string | undefined): 'green' | 'amber' | 'red' | 'gray' {
  const normalized = String(level ?? '').trim().toLowerCase()
  if (normalized === 'low') return 'green'
  if (normalized === 'high') return 'red'
  if (normalized === 'medium') return 'amber'
  return 'gray'
}

function trendDirectionVariant(
  dir: ResearchDemandTrend['trend_direction'] | undefined,
): 'green' | 'amber' | 'red' | 'gray' {
  if (dir === 'rising') return 'green'
  if (dir === 'falling') return 'red'
  if (dir === 'seasonal') return 'amber'
  return 'gray'
}

function extractNumber(val: unknown): number {
  if (val == null) return 0
  const match = String(val).match(/[-+]?[0-9]*\.?[0-9]+/)
  return match ? parseFloat(match[0]) : 0
}

/** Meaningful period label — drop blanks / N/A placeholders. */
function meaningfulPeriod(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^n\/?a$/i.test(s) || s === '-' || s === '—' || s === '.') return null
  return s
}

function peakTroughFromChart(
  data: Array<{ period: string; value: number }> | null | undefined,
): { peak: string | null; trough: string | null } {
  if (!data?.length) return { peak: null, trough: null }
  let peak = data[0]!
  let trough = data[0]!
  for (const point of data) {
    if (point.value > peak.value) peak = point
    if (point.value < trough.value) trough = point
  }
  return {
    peak: meaningfulPeriod(peak.period),
    trough: meaningfulPeriod(trough.period),
  }
}

/**
 * Captured share tone — low captured = more opportunity (success),
 * high captured = largely served (destructive).
 */
function getPenetrationTone(capturedPct: number): {
  valueClass: string
  slotTone: OpportunityCardTopSlotTone
  note: string
} {
  if (capturedPct <= 5) {
    return {
      valueClass: 'text-success',
      slotTone: 'success',
      note: 'Very little of the market is captured yet',
    }
  }
  if (capturedPct <= 20) {
    return {
      valueClass: 'text-primary',
      slotTone: 'primary',
      note: 'Moderate share captured — room remains to grow',
    }
  }
  if (capturedPct <= 50) {
    return {
      valueClass: 'text-warning',
      slotTone: 'warning',
      note: 'Meaningful share already captured — differentiation matters',
    }
  }
  return {
    valueClass: 'text-destructive',
    slotTone: 'destructive',
    note: 'Most of the market is already captured',
  }
}

// ─── Enhanced Visual Components ────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  badge,
  badgeVariant = 'gray',
  term,
  headerAction,
}: {
  icon: React.ElementType
  title: string
  badge?: ReactNode
  badgeVariant?: 'green' | 'amber' | 'red' | 'gray'
  term?: OpportunityTermKey
  headerAction?: ReactNode
}) {
  const resolvedTerm = term ?? opportunityTermKeyForTitle(title)
  const variantStyles = {
    green: 'bg-success/10 text-success border-success/20',
    amber: 'bg-warning/10 text-warning border-warning/20',
    red: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    gray: 'bg-muted/50 text-muted-foreground border-border-subtle',
  }

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Icon className={iconClassName({ tone: 'primary', size: 'md', active: true })} strokeWidth={2.5} aria-hidden />
        <h3 className="font-sans text-lg font-medium text-foreground">
          {resolvedTerm ? (
            <OpportunityTermLabel term={resolvedTerm} label={title} />
          ) : (
            title
          )}
        </h3>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge ? (
          <span
            className={cn(
              'inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider',
              variantStyles[badgeVariant],
            )}
          >
            {badge}
          </span>
        ) : null}
        {headerAction}
      </div>
    </div>
  )
}

// ─── CAGR Tone + network sticks ────────────────────────────────────

function getCagrTone(numCagr: number): {
  valueClass: string
  slotTone: OpportunityCardTopSlotTone
  icon: React.ElementType
} {
  if (numCagr >= 30) {
    return { valueClass: 'text-success', slotTone: 'success', icon: ArrowUpRight }
  }
  if (numCagr >= 18) {
    return { valueClass: 'text-success', slotTone: 'success', icon: TrendingUp }
  }
  if (numCagr >= 12) {
    return { valueClass: 'text-warning', slotTone: 'warning', icon: Minus }
  }
  if (numCagr >= 6) {
    return { valueClass: 'text-destructive', slotTone: 'destructive', icon: Minus }
  }
  return { valueClass: 'text-destructive', slotTone: 'destructive', icon: ArrowDownRight }
}

/** 30%+ → 5 sticks; each 6pp below drops one stick. */
function cagrStickCount(cagr: number): number {
  if (!Number.isFinite(cagr) || cagr <= 0) return 0
  if (cagr >= 30) return 5
  return Math.max(1, Math.ceil(cagr / 6))
}

function CagrNetworkSticks({ cagr }: { cagr: number }) {
  const active = cagrStickCount(cagr)
  const fillClass =
    cagr >= 30
      ? 'bg-success'
      : cagr >= 18
        ? 'bg-primary'
        : cagr >= 6
          ? 'bg-warning'
          : 'bg-destructive'

  return (
    <div
      className="flex h-8 items-center gap-1"
      role="img"
      aria-label={`${active} of 5 growth signal bars at ${cagr}% CAGR`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < active
        const height = 10 + i * 5
        return (
          <span
            key={i}
            className={cn('w-2 rounded-sm transition-colors', on ? fillClass : 'bg-muted/45')}
            style={{ height }}
          />
        )
      })}
    </div>
  )
}

/** Divided bar: red = captured, green = still open. */
function PenetrationSplitBar({ capturedPct }: { capturedPct: number }) {
  const captured = Math.max(0, Math.min(100, capturedPct))
  const open = Math.max(0, Math.min(100, 100 - captured))

  return (
    <div className="space-y-2">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40"
        role="img"
        aria-label={`${formatPenetrationPercent(captured)}% captured, ${formatPenetrationPercent(open)}% uncaptured`}
      >
        {captured > 0 ? (
          <div className="h-full bg-destructive transition-all" style={{ width: `${captured}%` }} />
        ) : null}
        {open > 0 ? (
          <div className="h-full bg-success transition-all" style={{ width: `${open}%` }} />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
          {formatPenetrationPercent(captured)}% captured
        </span>
        <span className="inline-flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          {formatPenetrationPercent(open)}% open
        </span>
      </div>
    </div>
  )
}

function MetricSlotCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType
  title: string
  /** @deprecated Header stays muted — ignored. */
  slotTone?: OpportunityCardTopSlotTone
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn('flex h-full min-w-0 flex-col', className)}
      topSlotStyle={opportunityCardTopSlotToneStyle.default}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon
            className={iconClassName({ tone: 'muted', size: 'sm' })}
            aria-hidden
          />
          <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {title}
          </div>
        </div>
      }
    >
      {children}
    </Card>
  )
}

// ─── Market size — concentric TAM / SAM / SOM ────────────────────

const PIPELINE_TIERS = {
  tam: {
    title: 'Total Addressable Market',
    abbr: 'TAM',
    description: 'Maximum revenue opportunity',
    ringFill: 'hsl(227 90% 58% / 0.14)',
    ringStroke: 'hsl(227 90% 58% / 0.55)',
    textColor: 'text-primary',
    icon: Globe,
  },
  sam: {
    title: 'Serviceable Addressable Market',
    abbr: 'SAM',
    description: 'Reachable with current model',
    ringFill: 'hsl(38 92% 50% / 0.16)',
    ringStroke: 'hsl(38 92% 50% / 0.55)',
    textColor: 'text-warning',
    icon: Target,
  },
  som: {
    title: 'Serviceable Obtainable Market',
    abbr: 'SOM',
    description: 'Realistically capturable share',
    ringFill: 'hsl(152 60% 42% / 0.18)',
    ringStroke: 'hsl(152 60% 42% / 0.55)',
    textColor: 'text-success',
    icon: Zap,
  },
} as const

function MarketSizingFunnel({
  tamDisplay,
  samDisplay,
  somDisplay,
}: {
  tamDisplay: string | null
  samDisplay: string | null
  somDisplay: string | null
}) {
  const tiers = [
    { key: 'tam' as const, display: tamDisplay, r: 118 },
    { key: 'sam' as const, display: samDisplay, r: 82 },
    { key: 'som' as const, display: somDisplay, r: 46 },
  ]

  return (
    <Card
      padding="sm"
      radius="xl"
      className={cn(
        opportunityDetailCardClass,
        'relative h-full min-w-0 overflow-hidden',
        'shadow-[0_18px_40px_-24px_rgba(37,99,235,0.45)]',
        'ring-1 ring-primary/20',
      )}
      topSlotClassName="bg-gradient-to-r from-primary/15 via-primary/8 to-transparent"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Layers className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className={cn(opportunityCardTopSlotTitleClass, 'text-[15px] font-bold tracking-tight')}>
              Size of the market
            </span>
            <p className="mt-0.5 font-sans text-[11px] font-medium text-muted-foreground">
              TAM · SAM · SOM opportunity stack
            </p>
          </div>
        </div>
      }
    >
      <div className="relative flex h-full min-h-0 flex-col items-center gap-6 layout-sm:flex-row layout-sm:items-center layout-sm:gap-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto aspect-square w-full max-w-[300px] shrink-0">
          <svg viewBox="0 0 280 280" className="h-full w-full drop-shadow-sm" role="img" aria-label="TAM SAM SOM concentric market size">
            {tiers.map((tier) => {
              const styles = PIPELINE_TIERS[tier.key]
              return (
                <circle
                  key={tier.key}
                  cx={140}
                  cy={140}
                  r={tier.r}
                  fill={styles.ringFill}
                  stroke={styles.ringStroke}
                  strokeWidth={2.5}
                />
              )
            })}
            <text
              x={140}
              y={132}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 13, fontWeight: 800 }}
            >
              SOM
            </text>
            <text
              x={140}
              y={152}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 14, fontWeight: 700 }}
            >
              {somDisplay ?? '—'}
            </text>
          </svg>
        </div>

        <ul className="relative z-[1] flex w-full min-w-0 flex-1 flex-col justify-center gap-4">
          {tiers.map((tier) => {
            const styles = PIPELINE_TIERS[tier.key]
            const Icon = styles.icon
            return (
              <li
                key={tier.key}
                className="flex min-w-0 items-start gap-3 rounded-xl border border-border-subtle/60 bg-card/80 px-3.5 py-3 shadow-sm"
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    styles.textColor,
                    'bg-current/10',
                  )}
                  style={{ background: styles.ringFill }}
                >
                  <Icon className={cn('h-4 w-4', styles.textColor)} strokeWidth={2.5} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className={cn('font-display text-[12px] font-bold uppercase tracking-[0.14em]', styles.textColor)}>
                      {styles.abbr}
                    </span>
                    <span className={cn('font-display text-[20px] font-black tabular-nums tracking-tight', styles.textColor)}>
                      {tier.display ?? '—'}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-[12px] font-medium leading-snug text-muted-foreground">
                    {styles.title}
                  </p>
                  <p className="mt-0.5 font-sans text-[11px] leading-snug text-muted-foreground/80">
                    {styles.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

// ─── Custom Chart Tooltip ──────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className={cn(opportunityDetailCardClass, 'px-4 py-3 backdrop-blur-xl')}>
      <p className="mb-1 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-sans text-[15px] font-black tabular-nums text-foreground">
        {payload[0].value}
      </p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────

export type KeyMarketTrendsProps = {
  opp: Record<string, unknown>
  forecast?: {
    key_indicator?: {
      name?: string
      value?: string
      direction?: 'up' | 'flat' | 'down'
      note?: string
    } | null
  } | null
  isMobile: boolean
  preferredCurrency: string
  convertFromUSD: (amountUSD: number, targetCurrency?: string) => number
  inrPerUsd: number
  twScroll?: { startWhenInView: true; inViewResetKey: string }
  demandTrendHeaderAction?: ReactNode
  isProLocked?: boolean
}

export function KeyMarketTrends({
  opp,
  preferredCurrency,
  convertFromUSD,
  inrPerUsd,
  demandTrendHeaderAction,
  isProLocked = false,
}: KeyMarketTrendsProps) {
  const meshId = useId().replace(/:/g, '')
  const { localizeText } = useCurrency()

  const md = useMemo(() => parseJsonField<Record<string, unknown>>((opp as any)?.market_demographics), [opp])
  const mi = useMemo(() => parseJsonField<Record<string, unknown>>((opp as any)?.market_intelligence), [opp])
  const demandTrend = (opp as any)?.demand_trend as ResearchDemandTrend | null | undefined
  const trends = useMemo(() => {
    const list = md?.market_trends ?? md?.key_trends
    return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : []
  }, [md])

  const cagr = md?.market_cagr ?? mi?.cagr_pct
  const penetration = md?.penetration_pct
  const sizingUnit = mi?.market_size_unit ?? md?.market_size_unit

  const growthCards = useMemo(() => {
    const cards: ReactNode[] = []

    if (cagr != null && cagr !== '') {
      const numCagr = extractNumber(cagr)
      const { valueClass, slotTone, icon } = getCagrTone(numCagr)
      const cagrText = String(cagr).trim().replace(/%/g, '')

      cards.push(
        <MetricSlotCard key="cagr" icon={icon} title="Growth Pace (CAGR)" slotTone={slotTone}>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums', valueClass)}>
                {cagrText}
                <span className="ml-0.5 text-[14px] font-medium text-muted-foreground">%</span>
              </p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">per year</p>
            </div>
            <CagrNetworkSticks cagr={numCagr} />
          </div>
        </MetricSlotCard>,
      )
    }

    const capturedPct = normalizePenetrationPercent(penetration)
    if (capturedPct != null) {
      const { valueClass, slotTone, note } = getPenetrationTone(capturedPct)
      const displayPct = formatPenetrationPercent(capturedPct)

      cards.push(
        <MetricSlotCard key="pen" icon={Layers} title="Market Penetration" slotTone={slotTone}>
          <div className="space-y-3">
            <p className={cn('font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums', valueClass)}>
              {displayPct}
              <span className="ml-0.5 text-[14px] font-medium text-muted-foreground">% captured</span>
            </p>
            <PenetrationSplitBar capturedPct={capturedPct} />
            <p className="text-[12px] leading-snug text-muted-foreground">{note}</p>
          </div>
        </MetricSlotCard>,
      )
    }

    const seasonality = String(mi?.seasonality ?? '').trim()
    if (seasonality) {
      const notes = String(mi?.seasonality_notes ?? '').trim()
      cards.push(
        <MetricSlotCard key="season" icon={Calendar} title="Seasonality" slotTone="default">
          <div className="space-y-3">
            <Badge size="sm" className="font-semibold" variant={levelVariant(seasonality)}>
              {capitalizeFirstLetter(seasonality)}
            </Badge>
            {notes ? (
              <p className="text-[13px] leading-relaxed text-foreground/90">{notes}</p>
            ) : (
              <p className="text-[12px] leading-snug text-muted-foreground">
                Seasonal demand pattern for this market
              </p>
            )}
          </div>
        </MetricSlotCard>,
      )
    }

    return cards
  }, [cagr, penetration, mi])

  const formatPipelineDisplay = (raw: unknown) => {
    if (parseMarketCrValue(raw) == null) return null
    const formatted = formatMarketCrForDisplay(
      raw,
      preferredCurrency,
      convertFromUSD,
      sizingUnit,
      inrPerUsd,
    )
    return formatted === '—' ? null : formatted
  }

  const tamDisplay = formatPipelineDisplay(mi?.tam_cr)
  const samDisplay = formatPipelineDisplay(mi?.sam_cr)
  const somDisplay = formatPipelineDisplay(mi?.som_cr)
  const hasPipeline = Boolean(tamDisplay || samDisplay || somDisplay)

  const chartData = (demandTrend?.data?.length ?? 0) >= 3 ? demandTrend!.data : null
  const chartPeakTrough = peakTroughFromChart(chartData)
  const peakPeriod = meaningfulPeriod(demandTrend?.peak_period) ?? chartPeakTrough.peak
  const troughPeriod = meaningfulPeriod(demandTrend?.trough_period) ?? chartPeakTrough.trough

  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    ['market_intelligence', 'demand_trend'],
    'key-market-trends',
  )

  if (!growthCards.length && !chartData && !hasPipeline && !trends.length) return null

  return (
    <div id="od-key-market-trends" className={cn('scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="key-market-trends"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={TrendingUp}
            title={
              <OpportunityTermLabel term="key_market_trends" label="Market Size & Intelligence" />
            }
          />
        }
      >
        <div className="relative flex flex-col gap-8">
          {hasPipeline ? (
            <MarketSizingFunnel
              tamDisplay={tamDisplay}
              samDisplay={samDisplay}
              somDisplay={somDisplay}
            />
          ) : null}

          {growthCards.length > 0 ? (
            <section>
              <SectionHeader
                icon={BarChart3}
                title="Growth Rate and Trend"
                term="growth_rate_and_trend"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 layout-sm:grid-cols-3">
                {growthCards}
              </div>
            </section>
          ) : null}

          {chartData ? (
            <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[16rem]">
              <Card
                padding="sm"
                radius="lg"
                className={cn(opportunityDetailCardClass, 'h-full min-w-0 overflow-hidden')}
                topSlot={
                  <div className={cn(opportunityCardTopSlotRowClass, 'flex-wrap')}>
                    <TrendingUp
                      className={iconClassName({ tone: 'muted', size: 'sm' })}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                      {demandTrend?.label || 'Demand Velocity Trend'}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {demandTrend?.trend_direction ? (
                        <Badge size="sm" className="font-semibold" variant={trendDirectionVariant(demandTrend.trend_direction)}>
                          {capitalizeFirstLetter(demandTrend.trend_direction)}
                        </Badge>
                      ) : null}
                      {demandTrendHeaderAction}
                    </div>
                  </div>
                }
              >
                  <div className="-mx-2 h-[220px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <pattern id={meshId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill={PRIMARY_BLUE} opacity="0.06" />
                          </pattern>
                        </defs>

                        <XAxis
                          dataKey="period"
                          tick={{
                            fontSize: 11,
                            fontWeight: 600,
                            fill: 'hsl(var(--muted-foreground))',
                            fontFamily: 'sans-serif',
                          }}
                          tickLine={false}
                          axisLine={false}
                          dy={12}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                          content={<ChartTooltip />}
                          cursor={{
                            stroke: 'hsl(var(--border))',
                            strokeWidth: 1,
                            strokeDasharray: '4 4',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={PRIMARY_BLUE}
                          strokeWidth={2.5}
                          fill={PRIMARY_BLUE}
                          fillOpacity={0.12}
                          dot={false}
                          activeDot={{
                            r: 5,
                            strokeWidth: 2,
                            stroke: 'hsl(var(--card))',
                            fill: PRIMARY_BLUE,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {demandTrend?.trend_note ? (
                    <div className="mt-5 flex items-start gap-3 rounded-lg border border-border-subtle/60 bg-muted/20 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      <p className="font-sans text-[13px] font-medium leading-relaxed text-foreground/80">
                        {demandTrend.trend_note}
                      </p>
                    </div>
                  ) : null}

                  {peakPeriod || troughPeriod ? (
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {peakPeriod ? (
                        <div className="inline-flex items-center gap-2 rounded-md border border-success/20 bg-success/[0.06] px-3 py-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={2.5} aria-hidden />
                          <div className="min-w-0">
                            <span className="block font-sans text-[10px] font-semibold uppercase tracking-wider text-success/80">
                              Peak demand
                            </span>
                            <span className="block font-sans text-[12px] font-semibold leading-tight text-success">
                              {peakPeriod}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      {troughPeriod ? (
                        <div className="inline-flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-3 py-1.5">
                          <TrendingDown className="h-3.5 w-3.5 text-rose-600" strokeWidth={2.5} aria-hidden />
                          <div className="min-w-0">
                            <span className="block font-sans text-[10px] font-semibold uppercase tracking-wider text-rose-600/80">
                              Low demand
                            </span>
                            <span className="block font-sans text-[12px] font-semibold leading-tight text-rose-700">
                              {troughPeriod}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
              </Card>
            </OpportunityProLock>
          ) : null}

          {trends.length > 0 ? (
            <section>
              <SectionHeader icon={TrendingUp} title="Trends in this opportunity" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {trends.map((trend, index) => {
                  const title = String(trend.title ?? trend.label ?? trend.name ?? '').trim()
                  const description = String(
                    trend.body ?? trend.desc ?? trend.description ?? '',
                  ).trim()

                  return (
                    <Card
                      key={`${title || 'trend'}-${index}`}
                      padding="sm"
                      radius="lg"
                      className={cn(opportunityDetailCardClass, 'overflow-hidden')}
                      topSlot={
                        <div className={opportunityCardTopSlotRowClass}>
                          <TrendingUp
                            className={iconClassName({ tone: 'muted', size: 'sm', active: true })}
                            aria-hidden
                          />
                          <span
                            className={cn(
                              opportunityCardTopSlotTitleClass,
                              opportunityCardTopSlotTone.default.title,
                            )}
                          >
                            {title}
                          </span>
                        </div>
                      }
                    >
                      {description ? (
                        <p className="m-0 font-sans text-[14px] leading-relaxed text-muted-foreground">
                          {localizeText(description)}
                        </p>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      </OpportunityDetailSectionShell>
    </div>
  )
}

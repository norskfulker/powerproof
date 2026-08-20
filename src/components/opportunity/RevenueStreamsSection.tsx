import { useMemo } from 'react'
import * as React from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { Badge } from '@/components/ui/badge'
import type { RevenueStream } from '@/types/database'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'
import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityDetailCardClass,
  opportunityDetailCardGlowClass,
} from '@/lib/opportunityCardClasses'

import {
  TrendingUp,
  Layers,
  Repeat,
  ShoppingCart,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Lock,
  PieChart,
  Activity,
  Sparkles,
} from '@/lib/icons'

// ─── Color System ────────────────────────────────────────────────

const STREAM_PALETTE = [
  { hue: 227, name: 'primary' },      // Blue
  { hue: 262, name: 'violet' },       // Violet
  { hue: 152, name: 'emerald' },      // Emerald
  { hue: 32,  name: 'amber' },        // Amber
  { hue: 199, name: 'sky' },          // Sky
  { hue: 340, name: 'rose' },         // Rose
  { hue: 174, name: 'teal' },         // Teal
  { hue: 280, name: 'fuchsia' },      // Fuchsia
] as const

/** Stable accent when the same model appears on multiple streams (offsets base hue). */
const MODEL_HUE_OFFSET: Record<string, number> = {
  recurring: 0,
  transactional: 2,
  passive: 4,
  commission: 1,
  licensing: 3,
  'one-time': 5,
  freemium: 6,
  marketplace: 7,
}

const MODEL_LABELS: Record<string, string> = {
  recurring: 'Recurring',
  transactional: 'Transactional',
  passive: 'Passive',
  commission: 'Commission',
  licensing: 'Licensing',
  'one-time': 'One-time',
  freemium: 'Freemium',
  marketplace: 'Marketplace',
}

const MODEL_ICONS: Record<string, React.ElementType> = {
  recurring: Repeat,
  transactional: ShoppingCart,
  passive: Activity,
  commission: PieChart,
  licensing: Lock,
  'one-time': Zap,
  freemium: Sparkles,
  marketplace: Layers,
}

const GROWTH_CONFIG: Record<string, { 
  label: string
  variant: 'green' | 'amber' | 'gray'
  tone: 'success' | 'warning' | 'default'
}> = {
  low:    { label: 'Low growth',    variant: 'gray',  tone: 'default' },
  medium: { label: 'Medium growth', variant: 'amber', tone: 'warning' },
  high:   { label: 'High growth',   variant: 'green', tone: 'success' },
}

// ─── Utility Functions ───────────────────────────────────────────

function streamPaletteIndex(index: number, model: string) {
  const modelOffset = MODEL_HUE_OFFSET[model]
  const base = modelOffset !== undefined ? modelOffset : index
  return (base + index) % STREAM_PALETTE.length
}

type StreamTheme = {
  solid: string
  soft: string
  softBorder: string
  badgeStyle: React.CSSProperties
}

function getStreamTheme(index: number, model: string): StreamTheme {
  const { hue } = STREAM_PALETTE[streamPaletteIndex(index, model)]
  const solid = `hsl(${hue}, 68%, 46%)`
  return {
    solid,
    soft: `hsla(${hue}, 55%, 46%, 0.12)`,
    softBorder: `hsla(${hue}, 50%, 46%, 0.22)`,
    badgeStyle: {
      background: `hsla(${hue}, 55%, 46%, 0.14)`,
      color: solid,
      border: `1px solid hsla(${hue}, 50%, 46%, 0.28)`,
    },
  }
}

function streamColor(index: number, model: string) {
  return getStreamTheme(index, model).solid
}

// ─── Revenue mix composition ─────────────────────────────────────

type MixSegment = {
  index: number
  stream: RevenueStream
  pct: number
  visualPct: number
  color: string
  theme: StreamTheme
  label: string
}

function useRevenueMixSegments(streams: RevenueStream[]) {
  return useMemo(() => {
    const raw = streams
      .map((stream, index) => ({
        index,
        stream,
        pct: Math.max(0, stream.pct_of_revenue ?? 0),
        color: streamColor(index, stream.model),
        theme: getStreamTheme(index, stream.model),
        label: stream.label?.trim() || `Stream ${index + 1}`,
      }))
      .filter((s) => s.pct > 0)
      .sort((a, b) => b.pct - a.pct)

    const totalPct = raw.reduce((sum, s) => sum + s.pct, 0)
    const segments: MixSegment[] = raw.map((s) => ({
      ...s,
      visualPct: totalPct > 0 ? (s.pct / totalPct) * 100 : 0,
    }))

    return { segments, totalPct, primary: segments[0] ?? null }
  }, [streams])
}

function RevenueMixDonut({ segments, primary }: { segments: MixSegment[]; primary: MixSegment | null }) {
  const size = 128
  const cx = size / 2
  const cy = size / 2
  const r = 46
  const stroke = 13
  const circumference = 2 * Math.PI * r
  let dashOffset = 0

  return (
    <div className="relative mx-auto shrink-0 sm:mx-0" aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          opacity={0.35}
        />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {segments.map((seg) => {
            const dash = (seg.visualPct / 100) * circumference
            const gap = Math.max(0, circumference - dash)
            const offset = dashOffset
            dashOffset += dash
            return (
              <circle
                key={`donut-${seg.index}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-700 ease-out"
              />
            )
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {primary ? (
          <>
            <span
              className="font-sans text-2xl font-black tabular-nums leading-none"
              style={{ color: primary.color }}
            >
              {primary.pct}%
            </span>
            <span className="mt-1 max-w-[5.5rem] truncate font-sans text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Primary
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

function RevenueMixStackedBar({ segments }: { segments: MixSegment[] }) {
  return (
    <div
      className="flex h-9 w-full gap-1 rounded-xl border-0 bg-muted/30 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
      role="img"
      aria-label="Revenue mix stacked bar"
    >
      {segments.map((seg) => {
        const showLabel = seg.visualPct >= 14
        return (
          <div
            key={`stack-${seg.index}`}
            className="relative flex min-w-[6px] items-center justify-center overflow-hidden rounded-md transition-all duration-700 ease-out"
            style={{
              flexGrow: seg.visualPct,
              flexBasis: 0,
              background: seg.color,
            }}
            title={`${seg.label}: ${seg.pct}% of revenue`}
          >
            {showLabel ? (
              <span className="px-1 font-sans text-[10px] font-black tabular-nums text-white drop-shadow-sm">
                {seg.pct}%
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function RevenueMixBreakdown({ segments }: { segments: MixSegment[] }) {
  return (
    <ul className="space-y-2">
      {segments.map((seg, rank) => {
        const ModelIcon = MODEL_ICONS[seg.stream.model] ?? Coins
        const isPrimary = rank === 0
        return (
          <li
            key={`mix-row-${seg.index}`}
            className={cn(
              'rounded-xl border px-3 py-2.5 transition-colors',
              isPrimary
                ? 'border-border-subtle bg-card shadow-sm'
                : 'border-border-subtle/50 bg-muted/20',
            )}
          >
            <div className="flex items-center gap-3">
              <ModelIcon className={iconClassName({ tone: iconToneForIndex(seg.index), size: 'md', active: true })} strokeWidth={2.5} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[13px] font-semibold text-foreground">{seg.label}</p>
                    <p className="font-sans text-[10px] font-medium text-muted-foreground">
                      {MODEL_LABELS[seg.stream.model] ?? seg.stream.model}
                      {isPrimary ? (
                        <span className="ml-1.5 font-black uppercase tracking-wider text-primary">· Primary</span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className="shrink-0 font-sans text-sm font-black tabular-nums"
                    style={{ color: seg.color }}
                  >
                    {seg.pct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${seg.visualPct}%`,
                      background: seg.color,
                    }}
                  />
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RevenueMixComposition({ streams }: { streams: RevenueStream[] }) {
  const { segments, totalPct, primary } = useRevenueMixSegments(streams)

  if (segments.length === 0) return null

  const mixComplete = Math.abs(totalPct - 100) < 0.5

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <RevenueMixDonut segments={segments} primary={primary} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-sans text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Share of revenue
              </p>
              {primary ? (
                <p className="mt-0.5 font-sans text-sm font-medium text-foreground/85">
                  <span className="font-semibold text-foreground">{primary.label}</span> leads at{' '}
                  <span className="font-bold tabular-nums" style={{ color: primary.color }}>
                    {primary.pct}%
                  </span>
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                'rounded-lg border px-2.5 py-1 font-sans text-[11px] font-bold tabular-nums',
                mixComplete
                  ? 'border-success/20 bg-success/10 text-success'
                  : 'border-warning/20 bg-warning/10 text-warning',
              )}
            >
              {mixComplete ? 'Mix · 100%' : `Allocated · ${totalPct}%`}
            </div>
          </div>
          <RevenueMixStackedBar segments={segments} />
        </div>
      </div>

      <RevenueMixBreakdown segments={segments} />

      {!mixComplete && totalPct > 0 ? (
        <p className="font-sans text-[11px] font-medium text-muted-foreground">
          Stream percentages sum to {totalPct}% — bar segments are scaled proportionally for comparison.
        </p>
      ) : null}
    </div>
  )
}

// ─── Stream Detail Card ──────────────────────────────────────────

function StreamDetailCard({
  stream,
  index,
  formatMoney,
}: {
  stream: RevenueStream
  index: number
  formatMoney: (val: number) => string
}) {
  const { localizeText } = useCurrency()
  const theme = getStreamTheme(index, stream.model)
  const color = theme.solid
  const growth = stream.growth_potential ? GROWTH_CONFIG[stream.growth_potential] : null
  const pct = stream.pct_of_revenue ?? 0
  const ModelIcon = MODEL_ICONS[stream.model] ?? Coins
  const hasMeta =
    stream.avg_ticket_usd > 0 || Boolean(stream.dependency?.trim()) || Boolean(stream.unlock_at?.trim())

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'relative h-full overflow-hidden')}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <ModelIcon
            className={iconClassName({ tone: iconToneForIndex(index), size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              opportunityCardTopSlotTone.default.title,
              'min-w-0 flex-1',
            )}
          >
            {stream.label}
          </span>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pct > 0 ? (
            <span className="font-display text-[18px] font-bold tabular-nums" style={{ color }}>
              {pct}%
            </span>
          ) : null}
          <Badge size="sm" className="font-semibold" variant="gray">
            {MODEL_LABELS[stream.model] ?? stream.model}
          </Badge>
          {stream.frequency ? (
            <span className="font-sans text-[12px] capitalize text-muted-foreground">
              {stream.frequency.replace(/_/g, ' ')}
            </span>
          ) : null}
          {growth ? (
            <span
              className={cn(
                'font-sans text-[12px] font-medium',
                growth.tone === 'success'
                  ? 'text-success'
                  : growth.tone === 'warning'
                    ? 'text-warning'
                    : 'text-muted-foreground',
              )}
            >
              {growth.label}
            </span>
          ) : null}
        </div>

        {stream.description ? (
          <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
            {localizeText(stream.description)}
          </p>
        ) : null}

        {hasMeta ? (
          <div className="mt-auto grid grid-cols-1 gap-2 border-t border-border-subtle/50 pt-3 sm:grid-cols-3">
            {stream.avg_ticket_usd > 0 ? (
              <div>
                <p className="font-sans text-[11px] font-medium text-muted-foreground">Avg ticket</p>
                <p className="mt-0.5 font-sans text-[13px] font-semibold tabular-nums">
                  {formatMoney(stream.avg_ticket_usd)}
                </p>
              </div>
            ) : null}
            {stream.dependency?.trim() ? (
              <div>
                <p className="font-sans text-[11px] font-medium text-muted-foreground">Depends on</p>
                <p className="mt-0.5 font-sans text-[13px] font-semibold leading-snug">
                  {localizeText(stream.dependency.trim())}
                </p>
              </div>
            ) : null}
            {stream.unlock_at?.trim() ? (
              <div>
                <p className="font-sans text-[11px] font-medium text-muted-foreground">Unlocks at</p>
                <p className="mt-0.5 font-sans text-[13px] font-semibold leading-snug">
                  {localizeText(stream.unlock_at.trim())}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

// ─── Summary Stats ───────────────────────────────────────────────

function SummaryPills({ streams }: { streams: RevenueStream[] }) {
  const stats = useMemo(() => {
    const totalStreams = streams.length
    const recurringCount = streams.filter(s => s.model === 'recurring').length
    const highGrowthCount = streams.filter(s => s.growth_potential === 'high').length
    const avgTicket = streams.reduce((sum, s) => sum + (s.avg_ticket_usd ?? 0), 0) / (streams.filter(s => s.avg_ticket_usd > 0).length || 1)

    return { totalStreams, recurringCount, highGrowthCount, avgTicket }
  }, [streams])

  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-2">
      <div className="inline-flex items-center gap-2 rounded-lg border-0 bg-card/60 px-3 py-1.5">
        <Layers className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
        <span className="font-sans text-[11px] font-bold text-foreground">
          {stats.totalStreams} stream{stats.totalStreams > 1 ? 's' : ''}
        </span>
      </div>

      {stats.recurringCount > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg border-0 bg-success/[0.06] px-3 py-1.5">
          <Repeat className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
          <span className="font-sans text-[11px] font-bold text-success">
            {stats.recurringCount} recurring
          </span>
        </div>
      )}

      {stats.highGrowthCount > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg border-0 bg-primary/[0.06] px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          <span className="font-sans text-[11px] font-bold text-primary">
            {stats.highGrowthCount} high growth
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function RevenueStreamsSection({
  streams,
  isMobile = false,
  isProLocked = false,
}: {
  streams: RevenueStream[]
  isMobile?: boolean
  isProLocked?: boolean
}) {
  const { formatMoney } = useCurrency()
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'revenue_streams',
    'revenue-streams',
  )

  if (!streams?.length) return null

  const totalPct = streams.reduce((sum, s) => sum + Math.max(0, s.pct_of_revenue ?? 0), 0)
  const hasComposition = totalPct > 0

  return (
    <OpportunityDetailSectionShell
      id="od-revenue-streams"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="revenue-streams"
      accordionValue={isProLocked ? 'revenue-streams' : accordionValue}
      onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
      header={
        <OpportunityAccordionHeaderRow
          icon={PieChart}
          title={
            <span className="truncate">
              <OpportunityTermLabel term="revenue_streams" label="Revenue streams" />
            </span>
          }
        />
      }
      description={`${streams.length} stream${streams.length === 1 ? '' : 's'}`}
    >
            <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[14rem]">
            <div className="flex flex-col gap-6">
              {hasComposition ? (
                <Card
                  padding="sm"
                  radius="lg"
                  className={cn(opportunityDetailCardClass, opportunityDetailCardGlowClass, 'overflow-visible')}
                  topSlotStyle={opportunityCardTopSlotToneStyle.primary}
                  topSlot={
                    <div className={opportunityCardTopSlotRowClass}>
                      <Activity
                        className={iconClassName({ tone: 'primary', size: 'sm', active: true })}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.primary.title)}>
                        Revenue mix
                      </span>
                    </div>
                  }
                >
                  <div className="mb-4">
                    <SummaryPills streams={streams} />
                  </div>
                  <RevenueMixComposition streams={streams} />
                </Card>
              ) : (
                <SummaryPills streams={streams} />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {streams.map((stream, i) => (
                  <StreamDetailCard
                    key={`${stream.label}-${i}`}
                    stream={stream}
                    index={i}
                    formatMoney={formatMoney}
                  />
                ))}
              </div>
            </div>
      </OpportunityProLock>
    </OpportunityDetailSectionShell>

  )
}
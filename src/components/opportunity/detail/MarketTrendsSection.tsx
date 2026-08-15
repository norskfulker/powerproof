import * as React from 'react'
import type { ReactNode } from 'react'
import { ShieldAlert, Users } from '@/lib/icons'
import { KeyMarketTrends } from '@/components/opportunity/detail/KeyMarketTrendsBlocks'
import { parseMarketCrValue } from '@/lib/opportunityDetailUtils'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { iconClassName } from '@/lib/iconClassNames'

import { Card } from '@/components/ui/card'
import {
  opportunityDetailCardClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'

export type MarketTrendsSectionProps = {
  opp: any
  isMobile: boolean
  fullDetail: boolean
  preferredCurrency: string
  convertFromUSD: (amountUSD: number, targetCurrency?: string) => number
  inrPerUsd: number
  twScroll: { startWhenInView: true; inViewResetKey: string }
  demandTrendHeaderAction?: ReactNode
  isProLocked?: boolean
}

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

function ThreatLevelTag({ level }: { level: string }) {
  const normalized = level.trim().toLowerCase()
  const isHigh = normalized === 'high'
  const isMed = normalized === 'medium'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wider',
        isHigh && 'border-rose-500/20 bg-rose-500/10 text-rose-500',
        isMed && 'border-warning/20 bg-warning/10 text-warning',
        !isHigh && !isMed && 'border-primary/20 bg-primary/10 text-primary',
      )}
    >
      <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />
      {level} threat
    </span>
  )
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Structured research competitors belong in `CompetitorsSection`, not this market trends grid. */
function isResearchCompetitorsData(raw: unknown): boolean {
  const parsed = parseJsonField<Record<string, unknown>>(raw)
  if (!parsed || Array.isArray(parsed)) return false
  return Boolean(
    parsed.king_of_market ||
      (Array.isArray(parsed.direct) && parsed.direct.length > 0) ||
      (Array.isArray(parsed.indirect) && parsed.indirect.length > 0),
  )
}

export function MarketTrendsSection(props: MarketTrendsSectionProps) {
  const {
    opp,
    isMobile,
    fullDetail,
    preferredCurrency,
    convertFromUSD,
    inrPerUsd,
    twScroll,
    demandTrendHeaderAction,
    isProLocked = false,
  } = props

  const { localizeText } = useCurrency()

  const md = React.useMemo(
    () => parseJsonField<Record<string, unknown>>(opp?.market_demographics),
    [opp?.market_demographics],
  )

  const mi = React.useMemo(
    () => parseJsonField<Record<string, unknown>>(opp?.market_intelligence),
    [opp?.market_intelligence],
  )

  const competitors = React.useMemo(() => {
    const raw = parseJsonField<unknown>(opp?.competitors)
    if (Array.isArray(raw)) {
      return raw.filter((c) => c != null && typeof c === 'object')
    }
    if (raw && typeof raw === 'object') {
      const data = raw as {
        direct?: Array<Record<string, unknown>>
        indirect?: Array<Record<string, unknown>>
      }
      return [
        ...safeArray(data.direct),
        ...safeArray(data.indirect).map((item) => ({
          ...item,
          tag: item.threat_level ? String(item.threat_level) : undefined,
          description: item.reason,
        })),
      ].filter((c) => c != null && typeof c === 'object')
    }
    return []
  }, [opp?.competitors])

  const trends = React.useMemo(() => {
    const list = md?.market_trends ?? md?.key_trends
    return Array.isArray(list) ? list : []
  }, [md])

  const demandTrend = React.useMemo(() => {
    const raw = opp?.demand_trend
    if (raw == null) return null
    if (typeof raw === 'object') return raw
    return parseJsonField(raw)
  }, [opp?.demand_trend])

  const marketSizeCr = md?.market_size_cr
  const cagr = md?.market_cagr
  const penetration = md?.penetration_pct
  const uncapturedCr = Number(md?.uncaptured_market_cr) || null
  const opportunityNote =
    typeof md?.market_opportunity_notes === 'string' ? md.market_opportunity_notes.trim() : ''

  const hasPipeline = Boolean(
    parseMarketCrValue(mi?.tam_cr) || parseMarketCrValue(mi?.sam_cr) || parseMarketCrValue(mi?.som_cr),
  )

  const hasCompetitors = competitors.length > 0
  const showEmbeddedCompetitors = hasCompetitors && !isResearchCompetitorsData(opp?.competitors)
  const hasTrends = trends.length > 0
  const hasMarketOpportunity = Boolean(marketSizeCr || cagr || uncapturedCr || penetration != null)
  const hasExtendedKeyMarket =
    hasMarketOpportunity ||
    mi?.seasonality ||
    (Array.isArray(demandTrend?.data) && demandTrend.data.length >= 3)

  if (!fullDetail) return null
  if (!showEmbeddedCompetitors && !hasTrends && !hasExtendedKeyMarket && !hasPipeline) return null

  return (
    <div className={cn('grid w-full min-w-0 grid-cols-1', isMobile ? 'gap-5' : 'gap-6')}>
      <KeyMarketTrends
        opp={opp as Record<string, unknown>}
        isMobile={isMobile}
        preferredCurrency={preferredCurrency}
        convertFromUSD={convertFromUSD}
        inrPerUsd={inrPerUsd}
        twScroll={twScroll}
        demandTrendHeaderAction={demandTrendHeaderAction}
        isProLocked={isProLocked}
      />

      {opportunityNote ? (
        <div className={cn(opportunityDetailCardClass, "px-5 py-4 font-sans text-[15px] leading-relaxed text-muted-foreground")}>
          {opportunityNote}
        </div>
      ) : null}

      {showEmbeddedCompetitors ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-0.5">
            <Users className={iconClassName({ tone: 'muted', size: 'sm', active: true })} aria-hidden />
            <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.16em] text-foreground">
              Competitors
            </h3>
          </div>
          <div className="space-y-3">
            {competitors.map((c: Record<string, unknown>, i: number) => (
              <Card
                key={i}
                padding="sm"
                radius="lg"
                className={cn(opportunityDetailCardClass, 'group overflow-hidden transition-colors')}
                topSlot={
                  <div className={opportunityCardTopSlotRowClass}>
                    <Users
                      className={iconClassName({ tone: 'muted', size: 'sm', active: true })}
                      aria-hidden
                    />
                    <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
                      {String(c.name ?? '')}
                    </span>
                  </div>
                }
              >
                {c.tag ? (
                  <span className="mb-2 inline-flex shrink-0 rounded-md border border-border-subtle/50 bg-muted/30 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {String(c.tag)}
                  </span>
                ) : null}
                {c.description ? (
                  <p className="m-0 font-sans text-[14px] leading-relaxed text-muted-foreground">
                    {localizeText(String(c.description))}
                  </p>
                ) : null}
                {c.threat_level ? (
                  <div className="mt-3">
                    <ThreatLevelTag level={String(c.threat_level)} />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

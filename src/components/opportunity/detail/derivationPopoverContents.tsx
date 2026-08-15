import type { ReactNode } from 'react'
import { ArrowDown, Gauge, Minus, TrendingUp, TrendingDown, Wallet } from '@/lib/icons'
import type {
  EffortScorecard,
  ProfitDerivation,
  SetupCostDerivation,
} from '@/types/database'
import { localizeUsdAmountsInText } from '@/lib/opportunityDetailUtils'
import { cn } from '@/lib/utils'
import { iconClassName } from '@/lib/iconClassNames'
import { Badge } from '@/components/ui/badge'
import { OpportunityProgressBar } from '@/components/opportunity/detail/OpportunityProgressBar'

import {
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

const bodyClass = 'font-sans text-[13px] leading-relaxed text-foreground/90'

function formatUsd(amount: number, formatMoney: (n: number) => string) {
  return formatMoney(amount)
}

function DerivationNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-border-subtle/50 bg-muted/20 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

function DerivationFormulaFooter({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
      <p className="font-mono text-[11px] leading-relaxed text-primary/90">{children}</p>
    </div>
  )
}

// ─── Setup cost ──────────────────────────────────────────────────────

export function SetupCostDerivationContent({
  derivation,
  formatMoney,
}: {
  derivation: SetupCostDerivation
  formatMoney: (n: number) => string
}) {
  const fmt = (n: number) => formatUsd(n, formatMoney)
  const subtotal = derivation.subtotal > 0 ? derivation.subtotal : 1

  return (
    <div className="space-y-3.5">
      <div className="overflow-hidden rounded-xl border border-border-subtle/60">
        <div className="flex items-center gap-2 border-b border-border-subtle/50 bg-muted/25 px-3 py-2">
          <Wallet className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cost line-items
          </span>
          <span className="ml-auto font-sans text-[11px] font-medium text-muted-foreground/70">
            {derivation.items.length} items
          </span>
        </div>

        <ul className="divide-y divide-border-subtle/40">
          {derivation.items.map((item, i) => {
            const share = Math.min(100, Math.round((item.amount_usd / subtotal) * 100))
            return (
              <li key={`${item.label}-${i}`} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 font-sans text-[12px] font-medium leading-snug text-foreground">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-sans text-[12px] font-semibold tabular-nums text-foreground">
                    {fmt(item.amount_usd)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-primary/55"
                    style={{ width: `${share}%` }}
                    role="presentation"
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-border-subtle/60 bg-muted/35 px-3 py-2.5">
          <span className="font-sans text-[13px] font-semibold text-foreground">Subtotal</span>
          <span className="font-sans text-[13px] font-bold tabular-nums text-foreground">
            {fmt(derivation.subtotal)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-success/25 bg-success/[0.06] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-success" strokeWidth={2.25} />
            <span className="font-sans text-[10px] font-bold uppercase tracking-wide text-success">
              Optimistic
            </span>
          </div>
          <p className="font-sans text-[14px] font-bold tabular-nums text-foreground">
            {fmt(derivation.optimistic)}
          </p>
          <p className="mt-0.5 font-sans text-[10px] font-medium text-muted-foreground">Subtotal × 0.85</p>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning/[0.06] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-warning" strokeWidth={2.25} />
            <span className="font-sans text-[10px] font-bold uppercase tracking-wide text-warning">
              With buffer
            </span>
          </div>
          <p className="font-sans text-[14px] font-bold tabular-nums text-foreground">
            {fmt(derivation.buffer)}
          </p>
          <p className="mt-0.5 font-sans text-[10px] font-medium text-muted-foreground">Subtotal × 1.20</p>
        </div>
      </div>
    </div>
  )
}

// ─── Profit ──────────────────────────────────────────────────────────

function profitRevenueLine(d: ProfitDerivation, formatMoney: (n: number) => string) {
  const bill = formatMoney(d.avg_bill)
  if (d.billing_model === 'subscription_cumulative') {
    return `${d.units_low}–${d.units_high} subscribers × ${bill}/mo`
  }
  return `${d.units_low}–${d.units_high} ${d.driver_label}/day × ${bill} × 30 days`
}

function ProfitFlowStep({
  label,
  detail,
  result,
  accent = 'default',
  isFinal = false,
}: {
  label: string
  detail: string
  result: string
  accent?: 'default' | 'revenue' | 'gross' | 'net'
  isFinal?: boolean
}) {
  const accentStyles = {
    default: 'border-border-subtle/60 bg-card',
    revenue: 'border-primary/20 bg-primary/[0.04]',
    gross: 'border-success/20 bg-success/[0.04]',
    net: 'border-primary/30 bg-primary/[0.07]',
  }

  const labelStyles = {
    default: 'text-muted-foreground',
    revenue: 'text-primary',
    gross: 'text-success',
    net: 'text-primary',
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        accentStyles[accent],
        isFinal && 'ring-1 ring-primary/15',
      )}
    >
      <p className={cn('font-sans text-[10px] font-bold uppercase tracking-wide', labelStyles[accent])}>
        {label}
      </p>
      <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">{detail}</p>
      <p
        className={cn(
          'mt-1.5 font-sans tabular-nums text-foreground',
          isFinal ? 'text-[15px] font-bold text-primary' : 'text-[13px] font-semibold',
        )}
      >
        {result}
      </p>
    </div>
  )
}

export function ProfitDerivationContent({
  derivation,
  formatMoney,
  profitMinAbs,
  profitMaxAbs,
}: {
  derivation?: ProfitDerivation | null
  formatMoney: (n: number) => string
  profitMinAbs: number
  profitMaxAbs: number
}) {
  const fmt = (n: number) => formatUsd(n, formatMoney)
  const yearlyMin = profitMinAbs * 12
  const yearlyMax = profitMaxAbs * 12

  return (
    <div className="space-y-3">
      {derivation ? (
        <div className="space-y-1.5">
          <ProfitFlowStep
            label="Revenue"
            detail={profitRevenueLine(derivation, formatMoney)}
            result={`${fmt(derivation.rev_low)} – ${fmt(derivation.rev_high)}`}
            accent="revenue"
          />

          <div className="flex justify-center py-0.5" aria-hidden>
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/50">
              <Minus className="h-3 w-3 rotate-90" strokeWidth={2} />
              <span className="font-sans text-[10px] font-medium">{derivation.cogs_pct}% COGS</span>
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            </div>
          </div>

          <ProfitFlowStep
            label="Gross profit"
            detail={`After ${derivation.cogs_pct}% cost of goods`}
            result={`${fmt(derivation.gross_low)} – ${fmt(derivation.gross_high)}`}
            accent="gross"
          />

          <div className="flex justify-center py-0.5" aria-hidden>
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/50">
              <Minus className="h-3 w-3 rotate-90" strokeWidth={2} />
              <span className="font-sans text-[10px] font-medium">{fmt(derivation.opex)} fixed opex</span>
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            </div>
          </div>

          <ProfitFlowStep
            label="Net profit (monthly)"
            detail="After fixed operating costs"
            result={`${fmt(profitMinAbs)} – ${fmt(profitMaxAbs)}`}
            accent="net"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
        <p className="font-sans text-[10px] font-bold uppercase tracking-wide text-primary">Annual profit</p>
        <p className="mt-1 font-sans text-[14px] font-bold tabular-nums text-foreground">
          {fmt(yearlyMin)} – {fmt(yearlyMax)}
          <span className="ml-1 text-[12px] font-medium text-muted-foreground">/yr</span>
        </p>
      </div>

      {derivation?.formula ? (
        <DerivationFormulaFooter>
          {localizeUsdAmountsInText(derivation.formula, formatMoney)}
        </DerivationFormulaFooter>
      ) : null}
    </div>
  )
}

// ─── Effort scorecard ────────────────────────────────────────────────

const EFFORT_DIMENSIONS: Array<{
  key: keyof Pick<
    EffortScorecard,
    | 'capital_intensity'
    | 'skill_barrier'
    | 'regulatory_burden'
    | 'operational_complexity'
    | 'time_to_first_revenue'
  >
  label: string
  defaultWeightPct: number
}> = [
  { key: 'capital_intensity', label: 'Capital intensity', defaultWeightPct: 25 },
  { key: 'skill_barrier', label: 'Skill barrier', defaultWeightPct: 20 },
  { key: 'regulatory_burden', label: 'Regulatory burden', defaultWeightPct: 25 },
  { key: 'operational_complexity', label: 'Operational complexity', defaultWeightPct: 15 },
  { key: 'time_to_first_revenue', label: 'Time to first revenue', defaultWeightPct: 15 },
]

function effortLevelInk(level: string) {
  if (level === 'Easy') return 'hsl(var(--primary))'
  if (level === 'Medium' || level === 'Moderate') return 'rgb(217, 119, 6)'
  if (level === 'Hard') return 'hsl(var(--destructive))'
  return 'hsl(var(--muted-foreground))'
}

function effortLevelVariant(level: string): 'green' | 'amber' | 'red' | 'gray' {
  if (level === 'Easy') return 'green'
  if (level === 'Medium' || level === 'Moderate') return 'amber'
  if (level === 'Hard') return 'red'
  return 'gray'
}

function normalizeEffortScore(score: number) {
  if (!Number.isFinite(score)) return 0
  if (score > 5) return Math.min(5, Math.round(score / 20))
  return Math.min(5, Math.max(0, Math.round(score * 10) / 10))
}

function weightPctValue(scorecard: EffortScorecard, key: string, fallback: number) {
  const w = scorecard.weights?.[key]
  if (w == null || !Number.isFinite(w)) return fallback
  return w <= 1 ? Math.round(w * 100) : Math.round(w)
}

function weightPct(scorecard: EffortScorecard, key: string, fallback: number) {
  return `${weightPctValue(scorecard, key, fallback)}%`
}

function primaryDriverDimension(scorecard: EffortScorecard) {
  return EFFORT_DIMENSIONS.reduce((best, row) => {
    const score = normalizeEffortScore(scorecard[row.key])
    const bestScore = normalizeEffortScore(scorecard[best.key])
    return score > bestScore ? row : best
  }, EFFORT_DIMENSIONS[0])
}

function effortNarrative(scorecard: EffortScorecard) {
  const notes = scorecard.notes?.trim() ?? ''
  const note = scorecard.note?.trim() ?? ''

  if (notes && note.includes(notes)) {
    return { summary: note.replace(notes, '').trim(), detail: notes }
  }

  if (notes && note && notes !== note) {
    return { summary: note, detail: notes }
  }

  if (notes) return { summary: null, detail: notes }
  if (note) return { summary: null, detail: note }
  return { summary: null, detail: null }
}

function EffortScoreBar({ score, color }: { score: number; color: string }) {
  const normalized = normalizeEffortScore(score)
  const widthPct = Math.min(100, Math.max(0, (normalized / 5) * 100))

  return <OpportunityProgressBar value={widthPct} color={color} trackClassName="bg-muted/40" />
}

function EffortDimensionRow({
  label,
  score,
  weight,
  isPrimary,
  ink,
}: {
  label: string
  score: number
  weight: string
  isPrimary: boolean
  ink: string
}) {
  const normalized = normalizeEffortScore(score)
  const displayScore = Number.isInteger(normalized) ? normalized : normalized.toFixed(1)

  return (
    <div
      className={cn(
        opportunityDetailCardClass,
        'px-3 py-2.5',
        isPrimary ? 'border-primary/25 bg-primary/[0.05]' : 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-sans text-[12px] font-semibold leading-snug text-foreground">
              {label}
            </span>
            {isPrimary ? (
              <Badge size="sm" variant="blue" className="font-semibold px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                Primary driver
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 font-sans text-[10px] font-medium text-muted-foreground">Weight {weight}</p>
        </div>
        <span className="shrink-0 font-sans text-[13px] font-bold tabular-nums" style={{ color: ink }}>
          {displayScore}/5
        </span>
      </div>
      <div className="mt-2">
        <EffortScoreBar score={score} color={ink} />
      </div>
    </div>
  )
}

export function EffortScorecardDerivationContent({
  scorecard,
  effortLabel,
  easeScore,
}: {
  scorecard: EffortScorecard
  effortLabel?: string
  easeScore?: number | null
}) {
  const primary = primaryDriverDimension(scorecard)
  const { summary, detail } = effortNarrative(scorecard)
  const level = effortLabel?.trim() || '—'
  const ink = effortLevelInk(level)
  const avg = Number.isFinite(scorecard.avg) ? scorecard.avg.toFixed(1) : null
  const ease = easeScore != null && Number.isFinite(Number(easeScore)) ? Math.round(Number(easeScore)) : null
  const primaryScore = normalizeEffortScore(scorecard[primary.key])

  return (
    <div className="space-y-3.5">
      <div className={cn(opportunityDetailCardClass, "overflow-hidden p-0")} style={{
          borderColor: `color-mix(in srgb, ${ink} 28%, transparent)`,
          background: `color-mix(in srgb, ${ink} 6%, transparent)`,
        }}>
        <div className="flex items-start gap-2.5 px-3.5 py-3">
          <Gauge className={iconClassName({ tone: 'primary', size: 'md', active: true })} strokeWidth={2.25} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm" variant={effortLevelVariant(level)} className="font-semibold text-[13px]">
                {level}
              </Badge>
              {ease != null ? (
                <span className="font-sans text-[12px] font-medium tabular-nums text-muted-foreground">
                  Score {ease}/100
                </span>
              ) : null}
            </div>
            {avg ? (
              <p className="mt-1.5 font-sans text-[12px] font-medium text-muted-foreground">
                Weighted avg effort {avg}/5
              </p>
            ) : null}
            <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">
              Primary driver:{' '}
              <span className="font-semibold text-foreground">
                {primary.label} ({primaryScore}/5)
              </span>
            </p>
          </div>
        </div>
        {summary ? (
          <p className="border-t border-border-subtle/40 px-3.5 py-2.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Effort dimensions
        </p>
        <ul className="space-y-2">
          {EFFORT_DIMENSIONS.map((row) => (
            <li key={row.key}>
              <EffortDimensionRow
                label={row.label}
                score={scorecard[row.key]}
                weight={weightPct(scorecard, row.key, row.defaultWeightPct)}
                isPrimary={row.key === primary.key}
                ink={row.key === primary.key ? ink : 'hsl(var(--primary))'}
              />
            </li>
          ))}
        </ul>
      </div>

      {detail ? <DerivationNote>{detail}</DerivationNote> : null}
    </div>
  )
}

// ─── Fallbacks when structured derivation JSON is absent ─────────────

type SetupBreakdownRow = {
  item?: string
  label?: string
  min?: number
  max?: number
  notes?: string
}

export function SetupCostFallbackContent({
  setupMinAbs,
  setupMaxAbs,
  breakdown,
  formatMoney,
}: {
  setupMinAbs: number | null | undefined
  setupMaxAbs: number | null | undefined
  breakdown?: unknown
  formatMoney: (n: number) => string
}) {
  const fmt = (n: number) => formatUsd(n, formatMoney)
  const rows = Array.isArray(breakdown)
    ? (breakdown as SetupBreakdownRow[]).filter(
        (row) => row && (row.item || row.label || row.min != null || row.max != null),
      )
    : []
  const min = setupMinAbs != null && Number.isFinite(Number(setupMinAbs)) ? Number(setupMinAbs) : null
  const max = setupMaxAbs != null && Number.isFinite(Number(setupMaxAbs)) ? Number(setupMaxAbs) : null
  const rangeLabel =
    min != null && max != null && min !== max
      ? `${fmt(min)} – ${fmt(max)}`
      : min != null
        ? fmt(min)
        : max != null
          ? fmt(max)
          : null

  return (
    <div className="space-y-3">
      {rangeLabel ? (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
          <p className="font-sans text-[10px] font-bold uppercase tracking-wide text-primary">
            Estimated setup range
          </p>
          <p className="mt-1 font-sans text-[16px] font-bold tabular-nums text-foreground">{rangeLabel}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border-subtle/60">
          <div className="border-b border-border-subtle/50 bg-muted/25 px-3 py-2">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cost breakdown
            </span>
          </div>
          <ul className="divide-y divide-border-subtle/40">
            {rows.slice(0, 10).map((row, i) => {
              const label = String(row.item ?? row.label ?? 'Item').trim()
              const rowMin = row.min != null ? Number(row.min) : null
              const rowMax = row.max != null ? Number(row.max) : null
              const cost =
                rowMin != null && rowMax != null && rowMin !== rowMax
                  ? `${fmt(rowMin)} – ${fmt(rowMax)}`
                  : rowMax != null
                    ? fmt(rowMax)
                    : rowMin != null
                      ? fmt(rowMin)
                      : '—'
              return (
                <li key={`${label}-${i}`} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1 font-sans text-[12px] font-medium leading-snug text-foreground">
                      {label}
                    </span>
                    <span className="shrink-0 font-sans text-[12px] font-semibold tabular-nums text-foreground">
                      {cost}
                    </span>
                  </div>
                  {row.notes ? (
                    <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">{row.notes}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <DerivationNote>
          Setup cost covers plant, equipment, working capital, and pre-operative expenses for this opportunity.
        </DerivationNote>
      )}
    </div>
  )
}

export function EffortLevelFallbackContent({
  level,
  easeScore,
}: {
  level: string
  easeScore?: number | null
}) {
  const ink = effortLevelInk(level)
  const ease = easeScore != null && Number.isFinite(Number(easeScore)) ? Math.round(Number(easeScore)) : null

  return (
    <div className="space-y-3">
      <div className={cn(opportunityDetailCardClass, "px-3.5 py-3")} style={{
          borderColor: `color-mix(in srgb, ${ink} 28%, transparent)`,
          background: `color-mix(in srgb, ${ink} 6%, transparent)`,
        }}>
        <Badge size="sm" variant={effortLevelVariant(level)} className="font-semibold text-[14px]">
          {level.trim() || '—'}
        </Badge>
        {ease != null ? (
          <p className="mt-2 font-sans text-[12px] font-medium text-muted-foreground">Ease score {ease}/100</p>
        ) : null}
      </div>
      <DerivationNote>
        Effort reflects capital needs, skills, regulation, operational complexity, and time to first revenue.
        A detailed scorecard was not saved for this report.
      </DerivationNote>
    </div>
  )
}

import type { ReactNode } from 'react'
import type {
  EffortScorecard,
  ProfitDerivation,
  SetupCostDerivation,
} from '@/types/database'
import { localizeUsdAmountsInText } from '@/lib/opportunityDetailUtils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { OpportunityProgressBar } from '@/components/opportunity/detail/OpportunityProgressBar'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

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
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Line item</TableHead>
            <TableHead className="w-[5.5rem] text-right">Share</TableHead>
            <TableHead className="w-[7.5rem] pr-4 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {derivation.items.map((item, i) => {
            const share = Math.min(100, Math.round((item.amount_usd / subtotal) * 100))
            return (
              <TableRow key={`${item.label}-${i}`}>
                <TableCell className="pl-4 font-medium">{item.label}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {share}%
                </TableCell>
                <TableCell className="pr-4 text-right font-semibold tabular-nums">
                  {fmt(item.amount_usd)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="pl-4 font-semibold">
              Subtotal
            </TableCell>
            <TableCell className="pr-4 text-right font-bold tabular-nums">
              {fmt(derivation.subtotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Scenario</TableHead>
            <TableHead>Basis</TableHead>
            <TableHead className="w-[7.5rem] pr-4 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="pl-4 font-medium text-success">Optimistic</TableCell>
            <TableCell className="text-muted-foreground">Subtotal × 0.85</TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums">
              {fmt(derivation.optimistic)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="pl-4 font-medium text-warning">With buffer</TableCell>
            <TableCell className="text-muted-foreground">Subtotal × 1.20</TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums">
              {fmt(derivation.buffer)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
    <div className="space-y-4">
      {derivation ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Step</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-[9rem] pr-4 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="pl-4 font-medium text-primary">Revenue</TableCell>
              <TableCell className="text-muted-foreground">
                {profitRevenueLine(derivation, formatMoney)}
              </TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">
                {fmt(derivation.rev_low)} – {fmt(derivation.rev_high)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-4 font-medium">COGS</TableCell>
              <TableCell className="text-muted-foreground">
                {derivation.cogs_pct}% cost of goods
              </TableCell>
              <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                −{derivation.cogs_pct}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-4 font-medium text-success">Gross profit</TableCell>
              <TableCell className="text-muted-foreground">
                After {derivation.cogs_pct}% cost of goods
              </TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">
                {fmt(derivation.gross_low)} – {fmt(derivation.gross_high)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-4 font-medium">Fixed opex</TableCell>
              <TableCell className="text-muted-foreground">Operating costs</TableCell>
              <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                −{fmt(derivation.opex)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-4 font-semibold text-primary">Net profit (monthly)</TableCell>
              <TableCell className="text-muted-foreground">After fixed operating costs</TableCell>
              <TableCell className="pr-4 text-right font-bold tabular-nums text-primary">
                {fmt(profitMinAbs)} – {fmt(profitMaxAbs)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Period</TableHead>
            <TableHead className="pr-4 text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="pl-4 font-medium">Annual</TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums">
              {fmt(yearlyMin)} – {fmt(yearlyMax)}
              <span className="ml-1 text-[12px] font-medium text-muted-foreground">/yr</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

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

  return (
    <OpportunityProgressBar
      value={widthPct}
      color={color}
      size="sm"
      aria-label={`Effort ${normalized} of 5`}
    />
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
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Summary</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead className="pr-4 text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="pl-4 font-medium">Effort level</TableCell>
            <TableCell className="text-muted-foreground">Overall difficulty band</TableCell>
            <TableCell className="pr-4 text-right">
              <Badge size="sm" variant={effortLevelVariant(level)} className="font-semibold">
                {level}
              </Badge>
            </TableCell>
          </TableRow>
          {ease != null ? (
            <TableRow>
              <TableCell className="pl-4 font-medium">Ease score</TableCell>
              <TableCell className="text-muted-foreground">0–100 composite</TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">{ease}/100</TableCell>
            </TableRow>
          ) : null}
          {avg ? (
            <TableRow>
              <TableCell className="pl-4 font-medium">Weighted average</TableCell>
              <TableCell className="text-muted-foreground">Across effort dimensions</TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">{avg}/5</TableCell>
            </TableRow>
          ) : null}
          <TableRow>
            <TableCell className="pl-4 font-medium">Primary driver</TableCell>
            <TableCell className="text-muted-foreground">{primary.label}</TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums" style={{ color: ink }}>
              {primaryScore}/5
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Dimension</TableHead>
            <TableHead className="w-[4.5rem] text-right">Weight</TableHead>
            <TableHead className="min-w-[5.5rem]">Signal</TableHead>
            <TableHead className="w-[4rem] pr-4 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {EFFORT_DIMENSIONS.map((row) => {
            const score = scorecard[row.key]
            const normalized = normalizeEffortScore(score)
            const displayScore = Number.isInteger(normalized) ? normalized : normalized.toFixed(1)
            const isPrimary = row.key === primary.key
            return (
              <TableRow key={row.key} className={isPrimary ? 'bg-primary/[0.04]' : undefined}>
                <TableCell className="pl-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{row.label}</span>
                    {isPrimary ? (
                      <Badge size="sm" variant="blue" className="px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide">
                        Primary
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {weightPct(scorecard, row.key, row.defaultWeightPct)}
                </TableCell>
                <TableCell>
                  <EffortScoreBar score={score} color={isPrimary ? ink : 'hsl(var(--primary))'} />
                </TableCell>
                <TableCell
                  className="pr-4 text-right font-semibold tabular-nums"
                  style={{ color: isPrimary ? ink : undefined }}
                >
                  {displayScore}/5
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {summary ? <DerivationNote>{summary}</DerivationNote> : null}
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
    <div className="space-y-4">
      {rangeLabel ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Estimate</TableHead>
              <TableHead className="pr-4 text-right">Range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="pl-4 font-medium">Setup cost</TableCell>
              <TableCell className="pr-4 text-right font-semibold tabular-nums">{rangeLabel}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : null}

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Line item</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[8rem] pr-4 text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableRow key={`${label}-${i}`}>
                  <TableCell className="pl-4 font-medium">{label}</TableCell>
                  <TableCell className="text-muted-foreground">{row.notes?.trim() || '—'}</TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums">{cost}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
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

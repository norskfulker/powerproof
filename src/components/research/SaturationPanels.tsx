import { AlertTriangle } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SaturationData } from '@/types/research'
import { getSaturationLabel, getSaturationMeterTone, getVerdictTone } from '@/lib/saturation'
import {
  opportunityDetailCardClass,
  opportunityDetailCardPaddingClass,
} from '@/lib/opportunityCardClasses'

export function SaturationWarningPanel({
  saturation,
  onCancel,
  onProceed,
}: {
  saturation: SaturationData
  onCancel: () => void
  onProceed: () => void
}) {
  const tone = getVerdictTone(saturation.verdict)
  const score = Math.max(0, Math.min(100, Math.round(saturation.score)))

  return (
    <div className={cn('rounded-2xl border p-4 layout-sm:p-5', tone.card)}>
      <div className="flex items-center gap-2 text-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
        <p className="text-sm font-semibold">Market Saturation Warning</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', tone.badge)}>
          {saturation.verdict}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Score: {score}/100</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
          <div className={cn('h-full rounded-full transition-all', getSaturationMeterTone(score))} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{getSaturationLabel(score)}</p>
      </div>
      {saturation.reasons.length ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Why this market is {saturation.verdict.toLowerCase()}:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {saturation.reasons.map((reason, idx) => (
              <li key={`${idx}-${reason.slice(0, 18)}`}>- {reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-xs italic text-muted-foreground">
        You can still research this, but go in with eyes open.
      </p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={onProceed}>
          Research Anyway
        </Button>
      </div>
    </div>
  )
}

export function SaturationAssessmentSection({
  saturation,
  isSaturated,
  fallbackNote,
}: {
  saturation: SaturationData | null
  isSaturated: boolean
  fallbackNote: string | null
}) {
  const verdict = saturation?.verdict ?? (isSaturated ? 'Saturated' : 'Blue Ocean')
  const score = Math.max(0, Math.min(100, Math.round(saturation?.score ?? (isSaturated ? 75 : 28))))
  const tone = getVerdictTone(verdict)
  const reasons = saturation?.reasons?.length
    ? saturation.reasons
    : fallbackNote
      ? fallbackNote.split(/\s*\|\s*|\n+/).filter(Boolean)
      : []
  const penalties = saturation?.score_penalties
  const penaltyRows = [
    { label: 'Market Momentum', value: Math.abs(penalties?.market_momentum ?? 0) },
    { label: 'Ease of Entry', value: Math.abs(penalties?.ease ?? 0) },
    { label: 'Profitability', value: Math.abs(penalties?.profitability ?? 0) },
  ].filter((item) => item.value > 0)

  return (
    <div className={cn(opportunityDetailCardClass, opportunityDetailCardPaddingClass, 'space-y-4')}>
      <h3 className="text-base font-semibold text-foreground">Market Saturation Assessment</h3>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', tone.badge)}>{verdict}</span>
        <span className="text-xs font-medium text-muted-foreground">Score: {score}/100</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
          <div className={cn('h-full rounded-full', getSaturationMeterTone(score))} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{getSaturationLabel(score)}</p>
      </div>
      {verdict === 'Blue Ocean' || !isSaturated ? (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Low competition detected - this market has room to run.
        </p>
      ) : null}
      {reasons.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Why this market is {verdict.toLowerCase()}:</p>
          {reasons.map((reason, idx) => (
            <div key={`${idx}-${reason.slice(0, 20)}`} className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-muted-foreground">
              {reason}
            </div>
          ))}
        </div>
      ) : null}
      {penaltyRows.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Score Impact:</p>
          {penaltyRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[140px_1fr_auto] items-center gap-2 text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-red-500/10">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, row.value * 2)}%` }} />
              </div>
              <span className="font-medium text-red-500">-{row.value} pts</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}


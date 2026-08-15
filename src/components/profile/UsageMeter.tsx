import { cn } from '@/lib/utils'

type UsageMeterProps = {
  used: number
  total: number
  /** Optional override — when true, renders an unlimited bar (full width, no fill math). */
  unlimited?: boolean
  /** Visual tone for the fill bar. */
  tone?: 'primary' | 'warning' | 'limit' | 'muted'
  className?: string
}

const TONE_FILL: Record<NonNullable<UsageMeterProps['tone']>, string> = {
  primary: 'bg-primary',
  warning: 'bg-amber-500',
  limit: 'bg-destructive',
  muted: 'bg-muted-foreground/50',
}

const TONE_TRACK: Record<NonNullable<UsageMeterProps['tone']>, string> = {
  primary: 'bg-primary/15',
  warning: 'bg-amber-500/15',
  limit: 'bg-destructive/15',
  muted: 'bg-muted-foreground/15',
}

/**
 * Thin progress bar used inside the profile usage tab. No labels — the
 * surrounding card renders the numeric copy. Width is clamped to [0, 100]%
 * so a misconfigured backend (`used > allowance`) never overflows.
 */
export function UsageMeter({
  used,
  total,
  unlimited = false,
  tone = 'primary',
  className,
}: UsageMeterProps) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0
  const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0
  const ratio = unlimited
    ? 1
    : safeTotal > 0
      ? Math.min(1, safeUsed / safeTotal)
      : 0
  const fillPct = `${(ratio * 100).toFixed(2)}%`

  // Auto-escalate tone when approaching/exceeding the limit.
  const resolvedTone: NonNullable<UsageMeterProps['tone']> =
    tone === 'primary' && !unlimited
      ? ratio >= 1
        ? 'limit'
        : ratio >= 0.8
          ? 'warning'
          : 'primary'
      : tone

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={unlimited ? undefined : safeTotal}
      aria-valuenow={unlimited ? undefined : Math.min(safeUsed, safeTotal)}
      aria-valuetext={
        unlimited
          ? 'Unlimited'
          : `${safeUsed} of ${safeTotal} used`
      }
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full',
        TONE_TRACK[resolvedTone],
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          TONE_FILL[resolvedTone],
        )}
        style={{ width: unlimited ? '100%' : fillPct }}
      />
    </div>
  )
}
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type OpportunityProgressBarProps = {
  /** Fill amount from 0–100. */
  value: number
  /** Fill color — CSS color string or leave unset to inherit via `fillClassName`. */
  color?: string
  className?: string
  trackClassName?: string
  fillClassName?: string
  /** `sm` = 6px (metrics), `md` = 8px (score cards). */
  size?: 'sm' | 'md'
  /** Animate fill width on mount. */
  animated?: boolean
  animationDelay?: number
  style?: CSSProperties
  'aria-label'?: string
}

const SIZE_TRACK: Record<NonNullable<OpportunityProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
}

/**
 * Shared continuous progress track used across opportunity detail
 * (metrics bar, score breakdown, revenue estimator, effort popovers).
 */
export function OpportunityProgressBar({
  value,
  color,
  className,
  trackClassName,
  fillClassName,
  size = 'sm',
  animated = false,
  animationDelay = 0,
  style,
  'aria-label': ariaLabel,
}: OpportunityProgressBarProps) {
  const widthPct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))

  const fillStyle: CSSProperties = {
    width: `${widthPct}%`,
    ...(color ? { background: color } : null),
  }

  const track = cn(
    'overflow-hidden rounded-full bg-muted/30',
    SIZE_TRACK[size],
    trackClassName,
    className,
  )

  if (animated) {
    return (
      <div
        className={track}
        style={style}
        role="progressbar"
        aria-valuenow={Math.round(widthPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <motion.div
          className={cn('h-full rounded-full', fillClassName)}
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12, delay: animationDelay }}
          style={color ? { background: color } : undefined}
        />
      </div>
    )
  }

  return (
    <div
      className={track}
      style={style}
      role="progressbar"
      aria-valuenow={Math.round(widthPct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className={cn('h-full rounded-full transition-all', fillClassName)} style={fillStyle} />
    </div>
  )
}

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type OpportunityProgressBarProps = {
  /** Fill amount from 0–100. */
  value: number
  /** Fill color — CSS color string or leave unset to inherit via `fillClassName`. */
  color?: string
  className?: string
  trackClassName?: string
  fillClassName?: string
  /** @deprecated Size maps to stick height; kept for call-site compat. */
  size?: 'sm' | 'md'
  /** @deprecated Continuous animation removed — discrete sticks match CAGR / scanner meters. */
  animated?: boolean
  animationDelay?: number
  style?: CSSProperties
  'aria-label'?: string
  /** Number of sticks (default 5 — same as Growth Pace CAGR). */
  stickCount?: number
}

/**
 * Discrete network sticks — same visual language as Growth Pace (CAGR)
 * and scanner effort meters (not a continuous fill track).
 */
export function OpportunityProgressBar({
  value,
  color,
  className,
  trackClassName,
  fillClassName,
  size = 'sm',
  style,
  'aria-label': ariaLabel,
  stickCount = 5,
}: OpportunityProgressBarProps) {
  const widthPct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
  const filled = Math.round((widthPct / 100) * stickCount)
  const tall = size === 'md'

  return (
    <div
      className={cn(
        'flex items-end gap-1',
        tall ? 'h-8' : 'h-6',
        trackClassName,
        className,
      )}
      style={style}
      role="meter"
      aria-valuenow={Math.round(widthPct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {Array.from({ length: stickCount }, (_, i) => {
        const on = i < filled
        const height = tall ? 12 + i * 4 : 10 + i * 3
        return (
          <span
            key={i}
            className={cn(
              'w-1.5 rounded-sm transition-colors sm:w-2',
              on ? fillClassName || 'bg-primary' : 'bg-muted/45',
            )}
            style={on && color ? { background: color, height } : { height }}
          />
        )
      })}
    </div>
  )
}

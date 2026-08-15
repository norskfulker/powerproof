import { Badge } from '@/components/ui/badge'
import {
  easeLevelBadgeVariant,
  easeLevelDashFillClass,
  easeLevelFilledDashes,
  EFFORT_DASH_COUNT,
  normalizeEaseLevel,
} from '@/lib/opportunityLabels'
import { cn } from '@/lib/utils'

export function EffortLevelDashes({
  effort,
  size = 'sm',
  className,
}: {
  effort?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  const level = normalizeEaseLevel(effort)
  const filled = easeLevelFilledDashes(level)
  const fillClass = easeLevelDashFillClass(level)

  return (
    <div
      role="meter"
      aria-label={level ? `Effort ${level}` : 'Effort unavailable'}
      aria-valuemin={0}
      aria-valuemax={EFFORT_DASH_COUNT}
      aria-valuenow={filled}
      aria-valuetext={level || 'Unknown'}
      className={cn(
        'inline-flex max-w-full shrink-0 items-stretch gap-[2px]',
        size === 'md'
          ? 'h-4 w-[3.5rem] layout-sm:h-[1.125rem] layout-sm:w-16'
          : 'h-3.5 w-11 max-layout-sm:w-10 layout-sm:h-4 layout-sm:w-[3.25rem]',
        className,
      )}
    >
      {Array.from({ length: EFFORT_DASH_COUNT }, (_, index) => (
        <span
          key={index}
          className={cn(
            'min-w-0 flex-1 rounded-full',
            index < filled ? fillClass : 'bg-muted-foreground/20',
          )}
        />
      ))}
    </div>
  )
}

/** Dashes + Easy / Medium / Hard badge — table column and card topSlot. */
export function EffortLevelMeter({
  effort,
  size = 'sm',
  className,
}: {
  effort?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  const level = normalizeEaseLevel(effort)
  if (!level) {
    return <EffortLevelDashes effort={effort} size={size} className={className} />
  }

  return (
    <div className={cn('inline-flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      <EffortLevelDashes effort={effort} size={size} />
      <Badge variant={easeLevelBadgeVariant(level)} size="xs" className="shrink-0 font-semibold">
        {level}
      </Badge>
    </div>
  )
}

import { cn } from '@/lib/utils'

export function PreviewScoreDots({
  score,
  className,
  filledClassName = 'bg-primary',
}: {
  score: number
  className?: string
  /** Tailwind bg class for filled dots (e.g. semantic score tone). */
  filledClassName?: string
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)))
  const filled = Math.min(5, Math.max(0, Math.round(clamped / 20)))

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`Score ${clamped} out of 100`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-full',
            i < filled ? filledClassName : 'bg-muted-foreground/25',
          )}
        />
      ))}
    </span>
  )
}

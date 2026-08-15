import { useReducedMotion } from 'framer-motion'
import type { PreviewUnlockChip } from '@/components/research/preview/previewUnlockContent'
import { cn } from '@/lib/utils'

function UnlockFeatureChip({ icon: Icon, label }: PreviewUnlockChip) {
  return (
    <span
      className={cn(
        'relative z-0 inline-flex shrink-0 items-center gap-2 rounded-full border border-border-subtle/60 bg-card/80 px-3 py-1.5',
        'text-[12px] font-medium normal-case tracking-normal text-foreground/85',
        'shadow-[0_2px_8px_-4px_rgba(0,0,0,0.12)]',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span>{label}</span>
    </span>
  )
}

export function PreviewUnlockMarquee({
  chips,
  className,
  durationClass = '[animation:ticker-slide_48s_linear_infinite]',
  ariaLabel = 'Features you unlock',
}: {
  chips: PreviewUnlockChip[]
  className?: string
  durationClass?: string
  ariaLabel?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const loop = [...chips, ...chips]

  if (prefersReducedMotion) {
    return (
      <div
        className={cn('flex w-full flex-wrap items-center justify-center gap-2 py-1', className)}
        role="list"
        aria-label={ariaLabel}
      >
        {chips.map((chip) => (
          <UnlockFeatureChip key={chip.label} {...chip} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-x-hidden overflow-y-visible py-1',
        '[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]',
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      <div className={cn('flex w-max gap-2.5 px-1 sm:gap-3', durationClass)}>
        {loop.map((chip, i) => (
          <UnlockFeatureChip key={`${chip.label}-${i}`} {...chip} />
        ))}
      </div>
    </div>
  )
}

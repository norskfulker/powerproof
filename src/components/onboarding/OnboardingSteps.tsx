import { motion } from 'framer-motion'
import { Check } from '@/lib/icons'
import { cn } from '@/lib/utils'

export const ONBOARDING_STEPS = [
  { id: 1, label: 'Pick idea' },
  { id: 2, label: 'Generate' },
  { id: 3, label: 'Reveal' },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

/** Compact 3-step progress for research onboarding (pick → generate → reveal). */
export function OnboardingSteps({
  current,
  className,
}: {
  current: OnboardingStepId
  className?: string
}) {
  return (
    <nav
      aria-label="Onboarding progress"
      className={cn('mx-auto w-full max-w-md overflow-visible', className)}
    >
      <ol className="flex items-center justify-between gap-1">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = current > step.id
          const active = current === step.id
          const upcoming = current < step.id

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full items-center justify-center">
                  {index > 0 ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute right-1/2 top-1/2 h-0.5 w-[calc(100%-1.75rem)] -translate-y-1/2 rounded-full',
                        done || active ? 'bg-primary/70' : 'bg-border-subtle',
                      )}
                    />
                  ) : null}
                  {index < ONBOARDING_STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-1/2 top-1/2 h-0.5 w-[calc(100%-1.75rem)] -translate-y-1/2 rounded-full',
                        done ? 'bg-primary/70' : 'bg-border-subtle',
                      )}
                    />
                  ) : null}
                  <motion.span
                    layout
                    className={cn(
                      'relative z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums',
                      done &&
                        'border-primary bg-primary text-primary-foreground',
                      active &&
                        'border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
                      upcoming &&
                        'border-border-subtle bg-card text-muted-foreground',
                    )}
                    animate={
                      active
                        ? {
                            scale: [1, 1.08, 1],
                            boxShadow: [
                              '0 0 0 4px hsl(var(--primary) / 0.12)',
                              '0 0 0 7px hsl(var(--primary) / 0.08)',
                              '0 0 0 4px hsl(var(--primary) / 0.12)',
                            ],
                          }
                        : { scale: 1 }
                    }
                    transition={
                      active
                        ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.2 }
                    }
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden /> : step.id}
                  </motion.span>
                </div>
                <span
                  className={cn(
                    'max-w-full truncate text-center text-[11px] font-semibold leading-none',
                    active && 'text-foreground',
                    done && 'text-primary',
                    upcoming && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                  {active ? <span className="sr-only"> (current)</span> : null}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

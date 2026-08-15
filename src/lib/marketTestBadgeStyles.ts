import type { DemandSignalStrength } from '@/lib/marketTestTypes'
import { marketTestVerdictTone } from '@/lib/marketTestTypes'
import { cn } from '@/lib/utils'

/** Standard inline badge height across market test UI (cards, banner, demand signals). */
export const marketTestBadgeHeightClassName =
  'inline-flex h-7 min-h-7 items-center rounded-md border px-2.5 text-[10px] font-semibold leading-none'

/** Red-flag severity column — square badge, full row height (exception to standard height). */
export const marketTestRedFlagSideBadgeClassName = cn(
  '!flex !h-14 !w-14 shrink-0 items-center justify-center self-stretch !rounded-md !p-2',
  'text-center text-[10px] font-semibold leading-tight',
)

export const MARKET_TEST_DEMAND_STRENGTH_LABEL: Record<DemandSignalStrength, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
}

export function marketTestDemandStrengthBadgeClassName(strength: DemandSignalStrength): string {
  const tone: Record<DemandSignalStrength, string> = {
    strong: 'border-semantic-positive/25 bg-semantic-positive/10 text-semantic-positive',
    moderate:
      'border-[hsl(var(--saffron-500)/0.35)] bg-[hsl(var(--saffron-100))] text-[hsl(var(--saffron-600))] dark:border-[hsl(var(--saffron-500)/0.3)] dark:bg-[hsl(var(--saffron-50))]/50 dark:text-[hsl(var(--saffron-400))]',
    weak: 'border-border-subtle/80 bg-muted/45 text-muted-foreground',
  }
  return cn(marketTestBadgeHeightClassName, tone[strength])
}

type VerdictTone = ReturnType<typeof marketTestVerdictTone>

export function marketTestVerdictBadgeClassName(tone: VerdictTone): string {
  const toneClass: Record<VerdictTone, string> = {
    green: 'border-semantic-positive/25 bg-semantic-positive/10 text-semantic-positive',
    amber:
      'border-[hsl(var(--saffron-500)/0.35)] bg-[hsl(var(--saffron-100))] text-[hsl(var(--saffron-600))] dark:border-[hsl(var(--saffron-500)/0.3)] dark:bg-[hsl(var(--saffron-50))]/50 dark:text-[hsl(var(--saffron-400))]',
    red: 'border-destructive/25 bg-destructive/10 text-destructive',
  }
  return cn(marketTestBadgeHeightClassName, 'gap-1.5 uppercase tracking-wide', toneClass[tone])
}

export function marketTestScoreBadgeClassName(score: number): string {
  return cn(
    marketTestBadgeHeightClassName,
    'tabular-nums',
    score >= 60
      ? 'border-semantic-positive/25 bg-semantic-positive/10 text-semantic-positive'
      : 'border-border-subtle/80 bg-muted/45 text-foreground/85',
  )
}

export function marketTestFailedBadgeClassName(): string {
  return cn(
    marketTestBadgeHeightClassName,
    'border-destructive/25 bg-destructive/10 text-destructive',
  )
}

export function marketTestMetaBadgeClassName(): string {
  return cn(
    marketTestBadgeHeightClassName,
    'gap-1.5 border-border-subtle/80 bg-bg-surface font-semibold text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
  )
}

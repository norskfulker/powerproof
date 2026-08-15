import type { AskAiStorageNamespace } from '@/lib/askAiStorage'
import { cn } from '@/lib/utils'

/** Soft smoke gradient for Ask AI empty-state headlines. */
export const askAiSmokeGradientTitleClassName = cn(
  'font-medium text-[clamp(1.05rem,2.8vw,1.3rem)] font-bold leading-snug tracking-tight',
  'bg-gradient-to-br from-foreground via-foreground/42 to-muted-foreground/72 bg-clip-text text-transparent',
  'dark:from-foreground dark:via-foreground/48 dark:to-muted-foreground/68',
)

export function askAiEmptyStateTitle(namespace: AskAiStorageNamespace): string {
  switch (namespace) {
    case 'research':
      return 'Go deeper on this research'
    case 'playbook':
      return 'Sharpen your playbook'
    case 'roadmap':
      return 'Plot your next move'
    case 'market_test':
      return 'Stress-test this verdict'
    case 'workspace':
      return 'Ask your workspace'
    default:
      return 'Ask your workspace'
  }
}

export function askAiSuggestionChipsLabel(namespace: AskAiStorageNamespace): string {
  switch (namespace) {
    case 'research':
      return 'Explore an angle like'
    case 'playbook':
      return 'Pressure-test a move like'
    case 'roadmap':
      return 'Try one of these'
    case 'market_test':
      return 'Challenge the test with'
    case 'workspace':
      return 'Try asking about'
    default:
      return 'Try asking about'
  }
}

/** Idea-chip button chrome for Ask AI suggestion rows (matches embedded IdeaChips). */
export const askAiSuggestionChipButtonClassName = cn(
  'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border border-border-subtle/70',
  'bg-background px-2.5 py-2 shadow-sm',
  'text-[11px] font-medium text-foreground transition-[color,border-color]',
  'hover:border-primary/35 hover:bg-background hover:text-foreground',
  'disabled:cursor-default disabled:opacity-40',
)

export const askAiSuggestionChipIconWrapClassName = cn(
  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-border-subtle/70 text-foreground',
)

/** Bordered icon control — Ask AI header + composer actions. */
export const askAiIconButtonClassName = cn(
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle/80 bg-card',
  'text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50',
)

/** Larger touch targets for mobile / tablet Ask AI sheet header actions. */
export const askAiIconButtonCompactClassName = cn(
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle/80 bg-card',
  'text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50',
)

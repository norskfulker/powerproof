import type { CSSProperties } from 'react'
import {
  cardTopSlotBandClassName,
  cardTopSlotIconClass,
  cardTopSlotRowClass,
  cardTopSlotTitleClass,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Shared opportunity-detail card surface — flush (no surrounding border).
 * Prefer this class on a plain element (`div` / `li` / …) instead of a wrapper component.
 */
export const opportunityDetailCardClass = cn(
  'relative overflow-hidden rounded-xl border-0 bg-card shadow-none',
)

/** @deprecated Alias — use `opportunityDetailCardClass`. */
export const opportunityDetailCardSurfaceClass = opportunityDetailCardClass

/** Shared outer radius for opportunity detail cards, hero, and section panels. */
export const opportunityDetailCardRadiusClass = 'rounded-xl'

/** Optional soft tint — quiet; avoid stacking with heavy shadows. */
export const opportunityDetailCardGlowClass = cn(
  'before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:bg-primary/[0.015]',
)

/** @deprecated Alias — use `opportunityDetailCardGlowClass`. */
export const opportunityDetailCardGlowRadiusClass = 'before:rounded-xl'

/** Standard inner padding for opportunity detail section cards. */
export const opportunityDetailCardPaddingClass = ''

/** Compact metric tile — combine with `opportunityDetailCardClass`. */
export const opportunityMetricCardClass = cn(
  opportunityDetailCardClass,
  'flex h-full min-h-0 min-w-0 flex-col justify-center !overflow-visible p-3 layout-sm:p-3.5',
  'border-0 bg-muted/20 !shadow-none',
)

/** Nested card topSlot — same band as `Card`. */
export const opportunityCardTopSlotBandClass = cardTopSlotBandClassName

export const opportunityCardTopSlotBandStyle: CSSProperties = {}

/** Nested card `topSlot` row — same as `Card`. */
export const opportunityCardTopSlotRowClass = cardTopSlotRowClass

export const opportunityCardTopSlotIconClass = cardTopSlotIconClass

export const opportunityCardTopSlotTitleClass = cardTopSlotTitleClass

export const opportunityCardTopSlotMetaClass =
  'shrink-0 text-[13px] font-medium tabular-nums text-muted-foreground'

/**
 * TopSlot tones — band is owned by `Card`; title matches the shared slot.
 * Use `value` for semantic body emphasis (scores, stance labels).
 */
export const opportunityCardTopSlotTone = {
  default: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-primary',
  },
  success: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-success',
  },
  warning: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-warning',
  },
  destructive: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-destructive',
  },
  amber: {
    band: '',
    icon: 'text-primary',
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    value: 'text-[hsl(var(--saffron-600))]',
  },
} as const

export type OpportunityCardTopSlotTone = keyof typeof opportunityCardTopSlotTone

/** TopSlot band fill — unused; `Card` owns the muted band. */
export const opportunityCardTopSlotToneStyle: Record<OpportunityCardTopSlotTone, CSSProperties> = {
  default: {},
  primary: {},
  success: {},
  warning: {},
  destructive: {},
  amber: {},
}

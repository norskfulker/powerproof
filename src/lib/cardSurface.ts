/**
 * cardSurface — PowerProof standard card/surface utility classes.
 *
 * These are the canonical surface patterns for the app.
 * Use these instead of hand-rolling rounded-xl + border combinations.
 *
 * Usage:
 *   import { cardSurface, cardSurfaceSunken, cardSurfaceFlush } from '@/lib/cardSurface'
 *   <div className={cardSurface}>...</div>
 */

/** Default app surface — card, panel, section container */
export const cardSurface =
  'rounded-xl border border-border-subtle bg-card'

/** Sunken / inset surface — used inside cards, empty states, workspace backgrounds */
export const cardSurfaceSunken =
  'rounded-xl border border-border-subtle bg-bg-sunken'

/** Elevated surface — modals, popovers, dropdowns */
export const cardSurfaceElevated =
  'rounded-xl border border-border-default bg-card shadow-[var(--shadow-md)]'

/** Flush surface — no border, no shadow — for sections inside an existing card */
export const cardSurfaceFlush =
  'rounded-lg bg-card'

/**
 * Standard card padding tokens.
 * Combine with a surface class above.
 *
 * cardPadding.md  — default for most cards          (p-4)
 * cardPadding.lg  — detail/hero sections             (p-5 layout-sm:p-6)
 * cardPadding.sm  — compact / inner cards            (p-3)
 */
export const cardPadding = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 layout-sm:p-6',
} as const

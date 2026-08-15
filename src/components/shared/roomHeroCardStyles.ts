import type { KeyboardEvent } from 'react'
import { cardInteractiveClassName } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type RoomHeroCardAccent = 'research' | 'warRoom' | 'roadmap'

/** @deprecated Use generic card lift hover — accent-specific inset borders removed. */
export type RoomHeroCardHoverBorderTone = 'research' | 'warRoom' | 'roadmap' | 'amber'

export type RoomHeroCardShellOptions = {
  /** Enables the shared Card lift hover (no accent-specific hover). */
  hoverBorder?: boolean | RoomHeroCardHoverBorderTone
}

/** @deprecated Use RoomHeroCard from '@/components/shared/RoomHeroCard' instead. */
export function roomHeroCardHoverBorderClassName(_tone: RoomHeroCardHoverBorderTone) {
  return cardInteractiveClassName
}

/** @deprecated Use RoomHeroCard from '@/components/shared/RoomHeroCard' instead. */
export function roomHeroCardShellClassName(
  _accent: RoomHeroCardAccent = 'research',
  options?: RoomHeroCardShellOptions,
) {
  return cn(
    hasInteractiveHover(options?.hoverBorder) && cardInteractiveClassName,
  )
}

function hasInteractiveHover(hoverBorder?: boolean | RoomHeroCardHoverBorderTone): boolean {
  return Boolean(hoverBorder)
}

/** Makes the full room hero card open its detail view (footer actions use stopPropagation). */
export function roomHeroCardActivateProps(
  onActivate?: () => void,
  options?: { disabled?: boolean },
) {
  const disabled = options?.disabled ?? false
  if (!onActivate || disabled) return {}
  return {
    role: 'button' as const,
    tabIndex: 0,
    className: 'cursor-pointer',
    onClick: () => onActivate(),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}

/** Inner padding for all room hero workspace cards */
export const roomHeroCardPaddingClassName = 'p-4'

export const roomHeroCardMetaChipClassName =
  'inline-flex max-w-full items-center gap-1 rounded-md bg-muted/45 px-2 py-1 text-[10px] font-medium text-foreground/85'

const accentChip: Record<RoomHeroCardAccent, string> = {
  research: 'bg-primary/8 text-primary',
  warRoom: 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
  roadmap: 'bg-[hsl(var(--badge-global-bg))] text-[hsl(var(--badge-global-text))]',
}

export function roomHeroCardAccentChipClassName(accent: RoomHeroCardAccent) {
  return cn(roomHeroCardMetaChipClassName, accentChip[accent])
}

/** Clarification draft status — distinct from research primary chips (avoids amber + primary clash). */
export function roomHeroCardDraftStatusChipClassName(status: 'pending' | 'ready') {
  if (status === 'pending') {
    return cn(
      roomHeroCardMetaChipClassName,
      'border border-[hsl(var(--saffron-600))]/20 bg-[hsl(var(--saffron-50))] text-[hsl(var(--saffron-600))] dark:border-[hsl(var(--saffron-500))]/25 dark:bg-[hsl(var(--saffron-50))]/50 dark:text-[hsl(var(--saffron-400))]',
    )
  }
  return cn(
    roomHeroCardMetaChipClassName,
    'border border-[hsl(var(--semantic-positive))]/20 bg-[hsl(var(--semantic-positive))]/10 text-[hsl(var(--semantic-positive))] dark:border-[hsl(var(--semantic-positive))]/25 dark:bg-[hsl(var(--semantic-positive))]/10 dark:text-[hsl(var(--semantic-positive))]',
  )
}

export const roomHeroCardPromptClassName =
  'rounded-lg bg-muted/35 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground'

/** In-progress card shell — semantic saffron across all workspace accents. */
export const roomHeroCardPendingShellClassName = cn(
  '!border-[hsl(var(--saffron-600))]/55 !bg-[hsl(var(--saffron-100))]',
  'dark:!border-[hsl(var(--saffron-500))]/50 dark:!bg-[hsl(var(--saffron-500))]/20',
)

/** In-progress status chip — semantic saffron. */
export const roomHeroCardPendingChipClassName = cn(
  roomHeroCardMetaChipClassName,
  'border border-[hsl(var(--saffron-600))]/20 bg-[hsl(var(--saffron-50))] text-[hsl(var(--saffron-600))]',
  'dark:border-[hsl(var(--saffron-500))]/25 dark:bg-[hsl(var(--saffron-50))]/50 dark:text-[hsl(var(--saffron-400))]',
)

export const roomHeroCardPendingPromptClassName = cn(
  roomHeroCardPromptClassName,
  'bg-[hsl(var(--saffron-50))]/90 dark:bg-[hsl(var(--saffron-50))]/35',
)

export const roomHeroCardPendingProgressTrackClassName =
  'h-1 overflow-hidden rounded-full bg-[hsl(var(--saffron-100))] dark:bg-[hsl(var(--saffron-500))]/15'

export const roomHeroCardPendingProgressFillClassName =
  'h-full rounded-full bg-[hsl(var(--saffron-600))] dark:bg-[hsl(var(--saffron-500))]'

const draftTint: Record<RoomHeroCardAccent, string> = {
  research: 'bg-[hsl(var(--saffron-500))]/[0.04]',
  warRoom:
    'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/[0.04] dark:border-[hsl(var(--destructive))]/35',
  roadmap:
    'border-[hsl(var(--badge-global-text))]/40 bg-[hsl(var(--badge-global-bg))]/[0.04] dark:border-[hsl(var(--badge-global-text))]/35',
}

/** @deprecated Use RoomHeroCard state="draft" instead. */
export function roomHeroCardDraftShellClassName(
  accent: RoomHeroCardAccent,
  options?: RoomHeroCardShellOptions,
) {
  return cn(roomHeroCardShellClassName(accent, options), draftTint[accent])
}

export function roomHeroCardStatusBadgeClassName(accent: RoomHeroCardAccent) {
  return cn(
    'rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
    accentChip[accent],
  )
}

const progressFill: Record<RoomHeroCardAccent, string> = {
  research: 'bg-primary',
  warRoom: 'bg-[hsl(var(--destructive))]',
  roadmap: 'bg-[hsl(var(--badge-global-text))]',
}

export function roomHeroCardProgressFillClassName(accent: RoomHeroCardAccent) {
  return cn('h-full rounded-full transition-all', progressFill[accent])
}

export function roomHeroCardProgressTrackClassName(accent: RoomHeroCardAccent) {
  const track: Record<RoomHeroCardAccent, string> = {
    research: 'bg-primary/10',
    warRoom: 'bg-[hsl(var(--destructive))]/10',
    roadmap: 'bg-[hsl(var(--badge-global-text))]/10',
  }
  return cn('h-1 overflow-hidden rounded-full', track[accent])
}

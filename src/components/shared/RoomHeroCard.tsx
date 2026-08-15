import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RoomHeroCardAccent } from '@/components/shared/roomHeroCardStyles'
import { roomHeroCardPendingShellClassName } from '@/components/shared/roomHeroCardStyles'

export type RoomHeroCardState = 'default' | 'pending' | 'draft'

const accentBorderClass: Record<RoomHeroCardAccent, string> = {
  research: '',
  warRoom:
    '!border-[hsl(var(--destructive))]/45 dark:!border-[hsl(var(--destructive))]/40',
  roadmap:
    '!border-[hsl(var(--badge-global-text))]/45 dark:!border-[hsl(var(--badge-global-text))]/40',
}

const draftTintClass: Record<RoomHeroCardAccent, string> = {
  research: '!bg-[hsl(var(--saffron-500))]/[0.04]',
  warRoom:
    '!border-[hsl(var(--destructive))]/40 !bg-[hsl(var(--destructive))]/[0.04] dark:!border-[hsl(var(--destructive))]/35',
  roadmap:
    '!border-[hsl(var(--badge-global-text))]/40 !bg-[hsl(var(--badge-global-bg))]/[0.04] dark:!border-[hsl(var(--badge-global-text))]/35',
}

export const roomHeroCardBodyClassName =
  'flex min-h-0 flex-1 flex-col justify-start gap-2 p-4'

export const roomHeroCardFooterClassName =
  'mt-auto w-full shrink-0 px-4 pb-4 pt-0'

export type RoomHeroCardProps = {
  accent?: RoomHeroCardAccent
  state?: RoomHeroCardState
  interactive?: boolean
  children: ReactNode
  className?: string
  onActivate?: () => void
  disabled?: boolean
}

export function RoomHeroCardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(roomHeroCardBodyClassName, className)}>{children}</div>
}

export function RoomHeroCardFooter({
  children,
  className,
  isolateActions = true,
}: {
  children: ReactNode
  className?: string
  /** Stops footer clicks from bubbling to the card activate handler. */
  isolateActions?: boolean
}) {
  return (
    <div
      className={cn(roomHeroCardFooterClassName, className)}
      onClick={isolateActions ? (event) => event.stopPropagation() : undefined}
      onKeyDown={isolateActions ? (event) => event.stopPropagation() : undefined}
    >
      {children}
    </div>
  )
}

export function RoomHeroCard({
  accent = 'research',
  state = 'default',
  interactive = false,
  children,
  className,
  onActivate,
  disabled = false,
  topSlot,
  ...rest
}: RoomHeroCardProps &
  Omit<ComponentProps<typeof Card>, 'children' | 'interactive' | 'onClick' | 'accent' | 'variant' | 'padding' | 'radius'>) {
  const activateProps =
    onActivate && !disabled
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick: onActivate,
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onActivate()
            }
          },
        }
      : {}

  return (
    <Card
      variant="default"
      accent="none"
      padding="none"
      radius="xl"
      topSlot={topSlot}
      interactive={interactive && !disabled}
      className={cn(
        'room-hero-card flex h-full w-full min-w-0 flex-col overflow-hidden shadow-sm',
        topSlot ? '!bg-muted/35' : '!bg-card',
        state === 'pending' && roomHeroCardPendingShellClassName,
        state === 'draft' && draftTintClass[accent],
        state === 'default' && accent !== 'research' && accentBorderClass[accent],
        disabled && 'opacity-60',
        onActivate && !disabled && 'cursor-pointer',
        className,
      )}
      {...activateProps}
      {...rest}
    >
      {children}
    </Card>
  )
}

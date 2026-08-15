import { cloneElement, isValidElement, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type IconTone =
  | 'primary'
  | 'warRoom'
  | 'roadmap'
  | 'amber'
  | 'success'
  | 'destructive'
  | 'muted'

const ROTATING_TONES: IconTone[] = [
  'primary',
  'roadmap',
  'success',
  'amber',
  'warRoom',
  'destructive',
]

export function iconToneForIndex(index: number): IconTone {
  return ROTATING_TONES[index % ROTATING_TONES.length]!
}

const TONE_CLASS: Record<IconTone, string> = {
  primary: 'text-primary',
  warRoom: 'text-[hsl(var(--destructive))]',
  roadmap: 'text-[hsl(var(--badge-global-text))]',
  amber: 'text-[hsl(var(--saffron-600))] dark:text-[hsl(var(--saffron-400))]',
  success: 'text-[hsl(var(--success))]',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
}

const INTERACTIVE_TONE_CLASS: Record<Exclude<IconTone, 'muted'>, string> = {
  primary: 'text-muted-foreground group-hover:text-primary',
  warRoom: 'text-muted-foreground group-hover:text-[hsl(var(--destructive))]',
  roadmap: 'text-muted-foreground group-hover:text-[hsl(var(--badge-global-text))]',
  amber:
    'text-muted-foreground group-hover:text-[hsl(var(--saffron-600))] dark:group-hover:text-[hsl(var(--saffron-400))]',
  success: 'text-muted-foreground group-hover:text-[hsl(var(--success))]',
  destructive: 'text-muted-foreground group-hover:text-destructive',
}

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const

export function iconSizeClass(size: keyof typeof SIZE_CLASS = 'md') {
  return cn('block shrink-0', SIZE_CLASS[size])
}

export function iconToneClass(tone: IconTone = 'primary') {
  return TONE_CLASS[tone]
}

export function interactiveIconClass(tone: IconTone = 'primary') {
  if (tone === 'muted') return INTERACTIVE_TONE_CLASS.primary
  return INTERACTIVE_TONE_CLASS[tone]
}

export function navIconClassName(active = false) {
  return cn(
    'block shrink-0 h-3.5 w-3.5 transition-colors duration-200',
    active ? 'text-foreground' : 'text-muted-foreground group-hover/sidebar-nav:text-foreground',
  )
}

/** Dense room / opportunity rail icons. */
export function navIconClassNameMd(active = false) {
  return cn(
    'block shrink-0 h-3 w-3 transition-colors duration-200',
    active ? 'text-foreground' : 'text-muted-foreground group-hover/sidebar-nav:text-foreground',
  )
}

/** Apply nav icon sizing/color to a pre-built icon element. */
export function withNavIconClass(icon: ReactNode, active = false, size: 'sm' | 'md' = 'sm') {
  const className = size === 'md' ? navIconClassNameMd(active) : navIconClassName(active)
  if (isValidElement<{ className?: string }>(icon)) {
    return cloneElement(icon, {
      className: cn(className, icon.props.className),
    })
  }
  return icon
}

export function iconClassName({
  tone = 'primary',
  size = 'md',
  interactive = false,
  active = false,
  className,
}: {
  tone?: IconTone
  size?: keyof typeof SIZE_CLASS
  interactive?: boolean
  active?: boolean
  className?: string
}) {
  const accentTone = tone === 'muted' ? 'primary' : tone
  return cn(
    iconSizeClass(size),
    active ? iconToneClass(accentTone) : interactive ? interactiveIconClass(accentTone) : iconToneClass(tone),
    className,
  )
}

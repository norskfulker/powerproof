import type { ReactNode } from 'react'

import {
  HERO_FOOTER_CHIP_ICON_CLASS,
  HERO_FOOTER_CHIP_LABEL_CLASS,
  HERO_FOOTER_CHIP_SURFACE_CLASS,
} from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'

export function HeroComposerFooterChipContent({
  label,
  icon,
  className,
  labelClassName,
  labelOverflowVisible = false,
}: {
  label: string
  icon: ReactNode
  className?: string
  labelClassName?: string
  /** Allow full label width (discover hero model chip). */
  labelOverflowVisible?: boolean
}) {
  return (
    <span
      className={cn(
        HERO_FOOTER_CHIP_SURFACE_CLASS,
        labelOverflowVisible ? 'max-w-none overflow-visible' : 'min-w-0 max-w-full',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center',
          HERO_FOOTER_CHIP_ICON_CLASS,
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          HERO_FOOTER_CHIP_LABEL_CLASS,
          labelOverflowVisible
            ? 'max-w-none overflow-visible whitespace-nowrap'
            : 'min-w-0 max-w-[6.25rem] truncate sm:max-w-[7.5rem]',
          labelClassName,
        )}
      >
        {label}
      </span>
    </span>
  )
}

export { HERO_FOOTER_CHIP_ICON_CLASS }

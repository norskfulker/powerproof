import type { ReactNode } from 'react'
import {
  discoverHeroCenteredInnerClass,
  discoverHeroLeftInnerClass,
} from '@/components/discover/discoverHeroTokens'
import { cn } from '@/lib/utils'

const sectionClass = 'relative isolate min-w-0 max-w-full overflow-visible'

/** Thin discover / room hero section shell. */
export function DiscoverHeroSection({
  id,
  ariaLabel,
  className,
  innerClassName,
  centered: _centered = true,
  align = 'center',
  children,
}: {
  id: string
  ariaLabel: string
  className?: string
  innerClassName?: string
  /** @deprecated Always centered; kept for call-site compatibility. */
  centered?: boolean
  align?: 'center' | 'left'
  children: ReactNode
}) {
  return (
    <section id={id} className={cn(sectionClass, className)} aria-label={ariaLabel}>
      <div
        className={cn(
          align === 'left' ? discoverHeroLeftInnerClass : discoverHeroCenteredInnerClass,
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}

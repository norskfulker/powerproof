import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { DiscoverWide } from '@/components/page-shells/DiscoverWide'
import { opportunityDetailPageGridClass } from '@/pages/OpportunityDetailPage'
import { marketTestScrollHideClassName } from '@/lib/marketTestDetailLayout'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { cn } from '@/lib/utils'

const sectionMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
}

export function MarketTestPageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const bp = useBreakpoint()
  const isCompact = bp === 'mobile' || bp === 'tablet'

  return (
    <main className={cn('w-full min-w-0', marketTestScrollHideClassName)}>
      <DiscoverWide className="py-3 layout-sm:py-5 layout-lg:py-6">
        <motion.div
          className={cn(
            opportunityDetailPageGridClass(isCompact),
            'pb-8 font-sans max-[389px]:pb-6',
            className,
          )}
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: {
              transition: { staggerChildren: 0.06, delayChildren: 0.04 },
            },
          }}
        >
          {children}
        </motion.div>
      </DiscoverWide>
    </main>
  )
}

/** Staggered section wrapper for market test detail rows. */
export function MarketTestDetailSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={cn('min-w-0 w-full', className)} {...sectionMotion}>
      {children}
    </motion.div>
  )
}

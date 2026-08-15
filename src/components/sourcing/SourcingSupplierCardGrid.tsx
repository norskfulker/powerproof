import { motion } from 'framer-motion'
import { SOURCING_GRID_STAGGER, SOURCING_ITEM_MOTION } from '@/lib/sourcingHeroMotion'
import type { SourcingCard } from '@/lib/sourcingTypes'
import { SupplierCard } from '@/components/sourcing/SupplierCard'
import { cn } from '@/lib/utils'

export function SourcingSupplierCardGrid({
  cards,
  onCardClick,
  className,
  layoutKey,
}: {
  cards: SourcingCard[]
  onCardClick: (card: SourcingCard) => void
  className?: string
  /** Remount stagger when the result set identity changes (e.g. new search). */
  layoutKey?: string
}) {
  return (
    <motion.div
      key={layoutKey}
      className={cn('grid grid-cols-1 gap-3 layout-sm:grid-cols-2', className)}
      variants={SOURCING_GRID_STAGGER}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card, i) => (
        <motion.div
          key={`${card.source}-${card.product_url}-${i}`}
          variants={SOURCING_ITEM_MOTION}
          className="overflow-visible"
          {...(i === 0 ? { 'data-tour': 'source-listing-card' } : {})}
        >
          <SupplierCard card={card} onClick={() => onCardClick(card)} />
        </motion.div>
      ))}
    </motion.div>
  )
}

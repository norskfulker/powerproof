import type { ReactNode } from 'react'
import { AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

/**
 * Accordion title row — icon + title only. The trigger owns the chevron.
 * Section borders live in `OpportunityDetailPage`; trailing actions belong in
 * the section content. `group/trigger` enables hover icon reveal on headers.
 */
export function SectionAccordionHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <AccordionTrigger className={cn('items-center overflow-hidden hover:no-underline', className)}>
      {children}
    </AccordionTrigger>
  )
}
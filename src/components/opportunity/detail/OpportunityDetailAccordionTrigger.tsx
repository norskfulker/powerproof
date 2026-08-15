import type { ElementType, ReactNode } from 'react'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'

/** Standard opportunity detail accordion trigger — icon + title only. */
export function OpportunityDetailAccordionTrigger({
  icon,
  title,
  className,
}: {
  icon: ElementType
  title: ReactNode
  /** @deprecated Move aside into accordion content. */
  aside?: ReactNode
  /** @deprecated Move aside subline into accordion content. */
  asideSubline?: ReactNode
  className?: string
}) {
  return (
    <OpportunityAccordionHeaderRow
      icon={icon}
      title={title}
      iconVariant="primary"
      className={className}
    />
  )
}

import type { ElementType, ReactNode } from 'react'
import {
  opportunityAccordionDescriptionClass,
  opportunityAccordionTitleClass,
} from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { iconClassName } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'

/**
 * In-content section title row (not an accordion trigger).
 * Supports optional description / trailing for body headings.
 */
export function OpportunitySectionTitleRow({
  icon: Icon,
  children,
  description,
  trailing,
  className,
}: {
  icon: ElementType
  children: ReactNode
  description?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={iconClassName({ tone: 'primary', size: 'md', active: true })}
          strokeWidth={2.5}
          aria-hidden
        />
        <span className={cn('min-w-0 flex-1', opportunityAccordionTitleClass)}>{children}</span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </div>
      {description ? (
        <p className={cn(opportunityAccordionDescriptionClass, 'pl-[1.625rem]')}>{description}</p>
      ) : null}
    </div>
  )
}

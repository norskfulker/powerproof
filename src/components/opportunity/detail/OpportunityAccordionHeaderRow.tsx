import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Accordion trigger title — sentence case, responsive for phone / tablet / desktop. */
export const opportunityAccordionTitleClass =
  'font-display text-md font-medium leading-none tracking-normal text-foreground layout-sm:text-lg layout-lg:text-xl'

/** Sub description — use inside accordion content, not the trigger. */
export const opportunityAccordionDescriptionClass =
  'font-sans text-[12px] font-normal leading-snug text-muted-foreground sm:text-[13px]'

export type OpportunityAccordionHeaderRowProps = {
  icon: ElementType
  title: ReactNode
  /**
   * @deprecated Descriptions belong in the accordion content box via
   * `OpportunityDetailSectionShell` `description` — ignored on the trigger.
   */
  description?: ReactNode
  /**
   * @deprecated Trailing metadata belongs in the accordion content box — ignored on the trigger.
   */
  trailing?: ReactNode
  /** @deprecated Inline descriptions are no longer shown on triggers. */
  inlineDescription?: boolean
  /** @deprecated Prefer `tone` — muted maps to a quieter primary holder. */
  iconVariant?: 'muted' | 'primary'
  /** Icon tone — defaults to primary. */
  tone?: 'primary' | 'muted' | 'destructive' | 'success' | 'amber'
  className?: string
}

/**
 * Accordion trigger row — icon holder + title (chevron from AccordionTrigger).
 */
export function OpportunityAccordionHeaderRow({
  icon: Icon,
  title,
  tone = 'primary',
  className,
}: OpportunityAccordionHeaderRowProps) {
  const iconToneClassName = {
    primary: 'text-primary',
    muted: 'text-muted-foreground',
    destructive: 'text-destructive',
    success: 'text-[hsl(var(--success))]',
    amber: 'text-saffron-600',
  }[tone]

  return (
    <span className={cn('flex min-w-0 flex-1 items-center gap-2.5 text-left leading-none', className)}>
      <Icon className={cn('h-4 w-4 shrink-0', iconToneClassName)} aria-hidden />
      <span className={cn('flex min-w-0 items-center truncate', opportunityAccordionTitleClass)}>
        {title}
      </span>
    </span>
  )
}

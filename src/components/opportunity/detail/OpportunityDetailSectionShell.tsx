import type { ReactNode } from 'react'
import { opportunityAccordionDescriptionClass } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { cn } from '@/lib/utils'

export type OpportunityDetailSectionShellProps = {
  id?: string
  className?: string
  /** Extra classes on the section frame (e.g. remove bottom border). */
  itemClassName?: string
  /** Section title row (icon + label only). */
  header: ReactNode
  /** Sub description rendered at the top of the section body. */
  description?: ReactNode
  /** Optional meta row under description (counts, badges, totals). */
  contentMeta?: ReactNode
  /** Extra classes on the section body. */
  contentClassName?: string
  children: ReactNode
  /** @deprecated Sections are always expanded. */
  itemValue?: string
  /** @deprecated Sections are always expanded. */
  accordionValue?: string
  /** @deprecated Sections are always expanded. */
  onAccordionValueChange?: (value: string) => void
  /** @deprecated Sections are always expanded. */
  defaultOpen?: boolean
}

/**
 * Always-open opportunity detail section — icon + title, then body.
 * Collapse is owned by page tabs, not this shell.
 */
export function OpportunityDetailSectionShell({
  id,
  className,
  itemClassName,
  header,
  description,
  contentMeta,
  contentClassName,
  children,
}: OpportunityDetailSectionShellProps) {
  return (
    <section
      id={id}
      data-internal-section=""
      className={cn(
        'w-full rounded-none border-x border-b border-t border-border-subtle bg-background p-0 shadow-none',
        '[&+[data-internal-section]]:border-t-0',
        id && 'scroll-mt-[7.5rem]',
        className,
        itemClassName,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3 pb-2 pt-3.5 text-left sm:px-4 sm:pt-5">
        {header}
      </div>
      <div
        className={cn(
          'px-3 pb-2.5 pt-0 text-[14px] text-foreground sm:px-4 sm:pb-3 sm:text-[15px]',
          contentClassName,
        )}
      >
        {(description || contentMeta) ? (
          <div className="mb-4 space-y-2">
            {description ? (
              <p className={opportunityAccordionDescriptionClass}>{description}</p>
            ) : null}
            {contentMeta ? <div className="flex flex-wrap items-center gap-2">{contentMeta}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  )
}

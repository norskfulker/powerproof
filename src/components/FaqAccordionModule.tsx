import type { ReactNode } from 'react'
import { HelpCircle } from '@/lib/icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

export type FaqAccordionItem = {
  question: string
  answer: ReactNode
}

type FaqAccordionModuleProps = {
  title?: string
  items: FaqAccordionItem[]
  idPrefix?: string
  className?: string
  /** When false, only the accordion list is rendered (no icon + title header). */
  showHeader?: boolean
  triggerClassName?: string
  contentClassName?: string
  /**
   * Wrap the whole module in a rounded bordered section. Use on FAQ landing
   * pages (e.g. `/support`) where each category reads as its own section.
   * Defaults to `false` so existing landing usages stay flush.
   */
  sectionBorder?: boolean
  /**
   * Wrap each FAQ item in a square-edged bordered box. Default `false` so the
   * accordion uses the shared primitive's borderless styling.
   */
  itemBordered?: boolean
  /**
   * Hairline dividers between items (no card chrome). Used on marketing
   * landing FAQ where section borders live on the page frame.
   */
  itemDivided?: boolean
}

export function FaqAccordionModule({
  title,
  items,
  idPrefix = 'faq',
  className,
  showHeader = true,
  triggerClassName,
  contentClassName,
  sectionBorder = false,
  itemBordered = false,
  itemDivided = false,
}: FaqAccordionModuleProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        sectionBorder &&
          'rounded-xl border border-border-subtle p-5 sm:p-6',
        className,
      )}
    >
      {showHeader && title ? (
        <div className="mb-4 flex items-center gap-2.5 pt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
      ) : null}
      <Accordion
        type="single"
        collapsible
        className={cn(
          'w-full gap-0',
          itemDivided && 'divide-y divide-border-subtle/60',
        )}
      >
        {items.map((faq, index) => (
          <AccordionItem
            key={`${idPrefix}-${faq.question}`}
            value={`${idPrefix}-${index}`}
            className={cn(
              itemBordered && 'border border-border-subtle bg-background',
            )}
          >
            <AccordionTrigger
              className={cn(
                'text-base font-semibold sm:text-[17px]',
                triggerClassName,
              )}
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent
              className={cn(
                'text-base leading-relaxed sm:text-[17px]',
                contentClassName,
              )}
            >
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

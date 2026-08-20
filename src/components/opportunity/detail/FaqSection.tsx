import { useMemo } from 'react'
import { HelpCircle } from '@/lib/icons'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

export type FaqSectionProps = {
  opp: any
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

export function FaqSection({ opp }: FaqSectionProps) {
  const { localizeText } = useCurrency()
  const faqs = useMemo(() => {
    return Array.isArray(opp.faqs)
      ? opp.faqs.filter(
          (f: any) =>
            String(f?.question ?? f?.q ?? '').trim() && String(f?.answer ?? f?.a ?? '').trim(),
        )
      : []
  }, [opp.faqs])
  const { accordionValue, onAccordionValueChange, wrapperClassName } =
    useOpportunityEditSectionAccordion('faqs', 'faq-section')

  if (faqs.length === 0) return null

  return (
    <section id="od-faq" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="faq-section"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={HelpCircle}
            title={<OpportunityTermLabel term="faq" label="Frequently Asked Questions" />}
          />
        }
      >
        <Accordion type="multiple" className="w-full divide-y divide-border-subtle border-y border-border-subtle">
          {faqs.map((faq: any, i: number) => {
            const question = localizeText(faq.question ?? faq.q ?? '')
            const answer = localizeText(faq.answer ?? faq.a ?? '')
            return (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="px-0 sm:px-1">{question}</AccordionTrigger>
                <AccordionContent className="px-0 pb-4 text-[13px] leading-relaxed text-muted-foreground sm:px-1 sm:text-[14px]">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </OpportunityDetailSectionShell>
    </section>
  )
}

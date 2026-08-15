import { useMemo } from 'react'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { Card } from '@/components/ui/card'
import { HelpCircle } from '@/lib/icons'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'

export type FaqSectionProps = {
  opp: any
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

export function FaqSection({ opp, isMobile }: FaqSectionProps) {
  const { localizeText } = useCurrency()
  const faqs = useMemo(() => {
    return Array.isArray(opp.faqs)
      ? opp.faqs.filter(
          (f: any) =>
            String(f?.question ?? f?.q ?? '').trim() && String(f?.answer ?? f?.a ?? '').trim(),
        )
      : []
  }, [opp.faqs])
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('faqs', 'faq-section')

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
        description={`${faqs.length} question${faqs.length === 1 ? '' : 's'}`}
      >
        <div className="flex w-full flex-col gap-3">
          {faqs.map((faq: any, i: number) => {
            const question = localizeText(faq.question ?? faq.q ?? '')
            const answer = localizeText(faq.answer ?? faq.a ?? '')
            return (
              <Card key={i} className="w-full p-4">
                <p className="font-sans text-[13px] font-semibold leading-relaxed text-foreground sm:text-[14px]">
                  {question}
                </p>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
                  {answer}
                </p>
              </Card>
            )
          })}
        </div>
      </OpportunityDetailSectionShell>
    </section>
  )
}

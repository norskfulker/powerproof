import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { SchemeAccordionItem } from '@/components/opportunity/detail/SchemeAccordionItem'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import { Landmark } from '@/lib/icons'

export type SchemesSectionProps = {
  opp: any
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

export function SchemesSection({ opp, isMobile }: SchemesSectionProps) {
  const schemes =
    (opp as any).govt_scheme_details?.schemes ??
    (Array.isArray((opp as any).govt_scheme_details) ? (opp as any).govt_scheme_details : [])
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('govt_schemes', 'government-schemes')

  if (!schemes.length) return null

  return (
    <section id="od-schemes" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="government-schemes"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Landmark}
            title={
              <OpportunityTermLabel
                term="government_schemes"
                label="Government Schemes & Support"
              />
            }
          />
        }
        description={`${schemes.length} ${schemes.length === 1 ? 'scheme' : 'schemes'}`}
      >
        <div className="w-full space-y-2">
          {schemes.map((s: any, i: number) => (
            <SchemeAccordionItem
              key={String(s?.scheme ?? s?.name ?? i)}
              scheme={s}
              accValue={`govt-scheme-${i}`}
              isMobile={isMobile}
            />
          ))}
        </div>
      </OpportunityDetailSectionShell>
    </section>
  )
}

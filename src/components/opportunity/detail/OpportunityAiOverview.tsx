import { FileText } from '@/lib/icons'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { RisingMarkdown } from '@/components/opportunity/detail/RisingMarkdown'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { capitalizeFirstLetter, normalizeBusinessOverviewMarkdown } from '@/lib/opportunityDetailUtils'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'

export type OpportunityAiOverviewProps = {
  opp: any
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
  /** When set, renders this markdown instead of `opp.full_desc` (public SEO preview). */
  overviewMarkdown?: string
}

function BusinessOverview({
  opp,
  twScroll,
  isMobile,
  overviewMarkdown,
}: {
  opp: any
  twScroll: OpportunityAiOverviewProps['twScroll']
  isMobile: boolean
  overviewMarkdown?: string
}) {
  const raw = String(overviewMarkdown ?? opp.full_desc ?? opp.tagline ?? '').trim()
  const normalized = normalizeBusinessOverviewMarkdown(raw)
  const text = normalized && !/^#{1,6}\s/m.test(normalized) ? capitalizeFirstLetter(normalized) : normalized
  if (!text.trim()) return null

  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('business_overview', 'business-overview')

  return (
    <OpportunityDetailSectionShell
      className={wrapperClassName}
      itemValue="business-overview"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={
        <OpportunityAccordionHeaderRow
          icon={FileText}
          iconVariant="primary"
          title={<OpportunityTermLabel term="business_overview" label="About this Idea & Business" />}
        />
      }
    >
      <RisingMarkdown
        text={text}
        isMobile={isMobile}
        resetKey={twScroll.inViewResetKey}
        className={cn(
          'font-description leading-relaxed text-foreground',
          isMobile ? 'text-[14px]' : 'text-[15px]',
        )}
      />
    </OpportunityDetailSectionShell>
  )
}

export function OpportunityAiOverview({ opp, isMobile, twScroll, overviewMarkdown }: OpportunityAiOverviewProps) {
  const raw = String(overviewMarkdown ?? opp.full_desc ?? opp.tagline ?? '').trim()
  const normalized = normalizeBusinessOverviewMarkdown(raw)
  const text = normalized && !/^#{1,6}\s/m.test(normalized) ? capitalizeFirstLetter(normalized) : normalized
  if (!text.trim()) return null

  return (
    <div id="od-ai" className={'min-w-0 w-full'}>
      <BusinessOverview
        opp={opp}
        twScroll={twScroll}
        isMobile={isMobile}
        overviewMarkdown={overviewMarkdown}
      />
    </div>
  )
}

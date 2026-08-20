import type { NavigateFunction } from 'react-router-dom'
import { landingSignInTo } from '@/lib/authLanding'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { MachineryTable } from '@/components/opportunity/detail/MachineryTable'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunityAccordionDescriptionClass } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import type { MachineryItem } from '@/types/database'
import { Eye, Lock, Wrench } from '@/lib/icons'

export type MachinerySectionProps = {
  machineryList: MachineryItem[]
  isMobile: boolean
  isLocked: boolean
  formatMoney: (n: number) => string
  formatConvertedValue: (v: unknown, fmt: (n: number) => string) => string
  navigate: NavigateFunction
  locationPathSearch: string
  twScroll: { startWhenInView: boolean; inViewResetKey: string }
}

export function MachinerySection(props: MachinerySectionProps) {
  const {
    machineryList,
    isMobile,
    isLocked,
    formatMoney,
    formatConvertedValue,
    navigate,
    locationPathSearch,
  } = props
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('machinery_list', 'machinery-equipment')

  if (!machineryList?.length) return null

  const total = machineryList.reduce(
    (sum, item) => sum + (item.cost_approx ?? 0) * (item.qty ?? 1),
    0,
  )
  const showTotal = machineryList.some((item) => (item.cost_approx ?? 0) > 0)

  return (
    <section id="od-machinery" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="machinery-equipment"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Wrench}
            title={<OpportunityTermLabel term="machinery_equipment" label="Machinery & Equipment" />}
          />
        }
        contentMeta={
          showTotal ? (
            <>
              <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(total)}
              </span>
              <span className={opportunityAccordionDescriptionClass}>total</span>
            </>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          {isLocked ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-warning/[0.06] px-2.5 py-1">
                <Lock className="h-3 w-3 text-warning" strokeWidth={2.5} aria-hidden />
                <span className="font-sans text-[10px] font-black uppercase tracking-wider text-warning">
                  Locked
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border-0 bg-warning/[0.04] px-4 py-2.5">
                <Eye className="h-4 w-4 shrink-0 text-warning" strokeWidth={2.5} aria-hidden />
                <p className="font-sans text-[12px] font-medium text-warning/80">
                  Sign in to view all equipment details. First item is visible as a preview.
                </p>
              </div>
            </div>
          ) : null}

          <MachineryTable
            hideHeader
            machinery={machineryList}
            formatMoney={formatMoney}
            formatCost={(cost) => formatConvertedValue(cost, formatMoney)}
            rowClassName={(i) => (isLocked && i > 0 ? 'blur-[4px]' : undefined)}
            onRowClick={
              isLocked
                ? (i) => {
                    if (i > 0) navigate(landingSignInTo(locationPathSearch))
                  }
                : undefined
            }
            onRowKeyDown={
              isLocked
                ? (i, e) => {
                    if (i > 0 && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      navigate(landingSignInTo(locationPathSearch))
                    }
                  }
                : undefined
            }
          />
        </div>
      </OpportunityDetailSectionShell>
    </section>
  )
}

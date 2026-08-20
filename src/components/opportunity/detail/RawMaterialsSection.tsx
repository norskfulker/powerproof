import { Package } from '@/lib/icons'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { RawMaterialItem } from '@/types/database'

export type RawMaterialsSectionProps = {
  rawMaterialsList: RawMaterialItem[]
  isMobile: boolean
  isLocked: boolean
  formatMoney: (n: number) => string
  formatConvertedValue: (v: unknown, fmt: (n: number) => string) => string
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

function formatCostCell(
  item: RawMaterialItem,
  formatMoney: (n: number) => string,
  formatConvertedValue: (v: unknown, fmt: (n: number) => string) => string,
): string {
  const cpu = String(item.cost_per_unit ?? '').trim()
  if (cpu) return formatConvertedValue(cpu, formatMoney)
  const rate = Number(item.rate_per_unit)
  if (Number.isFinite(rate) && rate > 0) return formatMoney(rate)
  return '—'
}

export function RawMaterialsSection(props: RawMaterialsSectionProps) {
  const { rawMaterialsList, isLocked, formatMoney, formatConvertedValue } = props
  const { accordionValue, onAccordionValueChange, wrapperClassName } =
    useOpportunityEditSectionAccordion('raw_materials', 'raw-materials')

  if (!rawMaterialsList.length) return null

  return (
    <section id="od-raw" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="raw-materials"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Package}
            title={<OpportunityTermLabel term="raw_materials" label="Raw materials" />}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Material</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="pr-4 text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawMaterialsList.map((item, i) => {
              const blurred = isLocked && i > 0
              const meta = [item.unit, item.frequency].filter(Boolean).join(' · ')
              return (
                <TableRow key={`${item.name}-${i}`} className={blurred ? 'blur-[4px]' : undefined}>
                  <TableCell className="pl-4">
                    <div className="font-medium text-foreground">{item.name}</div>
                    {item.notes ? (
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{item.notes}</div>
                    ) : null}
                    {meta ? (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{meta}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.category?.trim() || 'Other'}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {item.source || '—'}
                  </TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums">
                    {formatCostCell(item, formatMoney, formatConvertedValue)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </OpportunityDetailSectionShell>
    </section>
  )
}

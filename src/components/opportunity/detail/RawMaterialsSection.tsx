import { Package, Tag } from '@/lib/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
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

function groupByCategory(items: RawMaterialItem[]): Record<string, RawMaterialItem[]> {
  return items.reduce<Record<string, RawMaterialItem[]>>((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
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
  const { rawMaterialsList, isMobile, isLocked, formatMoney, formatConvertedValue } = props
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('raw_materials', 'raw-materials')

  if (!rawMaterialsList.length) return null

  const grouped = groupByCategory(rawMaterialsList)
  const categories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })
  const firstCat = categories[0] ?? 'Other'

  const renderCategoryTable = (cat: string) => {
    const rows = grouped[cat] ?? []
    return (
      <div className="overflow-hidden rounded-xl border-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Material
              </th>
              <th className="hidden px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                Source
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => {
              const blurred = isLocked && i > 0 && cat !== firstCat
              const meta = [item.unit, item.frequency].filter(Boolean).join(' · ')
              return (
                <tr key={i} className={i < rows.length - 1 ? 'border-b border-border-subtle' : ''}>
                  <td className={`px-4 py-3 ${blurred ? 'blur-[4px]' : ''}`}>
                    <div className="text-sm font-medium text-foreground">{item.name}</div>
                    {item.notes ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.notes}</div>
                    ) : null}
                    {meta ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{meta}</div>
                    ) : null}
                  </td>
                  <td
                    className={`hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell ${blurred ? 'blur-[4px]' : ''}`}
                  >
                    {item.source || '—'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-sm font-semibold text-foreground ${blurred ? 'blur-[4px]' : ''}`}
                  >
                    {formatCostCell(item, formatMoney, formatConvertedValue)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const body =
    categories.length <= 1 ? (
      renderCategoryTable(firstCat)
    ) : (
      <Tabs defaultValue={firstCat} className="w-full">
        <div className="mb-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} icon={<Tag className="h-4 w-4" />}>
                {cat}
                <span className="ml-1 tabular-nums text-muted-foreground">({grouped[cat]?.length ?? 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            {renderCategoryTable(cat)}
          </TabsContent>
        ))}
      </Tabs>
    )

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
        description={`${rawMaterialsList.length} ${rawMaterialsList.length === 1 ? 'item' : 'items'}${categories.length > 1 ? ` · ${categories.length} categories` : ''}`}
      >
        {body}
      </OpportunityDetailSectionShell>
    </section>
  )
}

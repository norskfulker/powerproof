import { useMemo } from 'react'
import {
  Boxes,
  ExternalLink,
  Gift,
  Layers,
  Wrench,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'

import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import { parseOppJsonField, type ToolStackItem } from '@/lib/researchDepthTypes'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'
import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

const TOOL_PALETTE = [
  { hue: 227 },
  { hue: 262 },
  { hue: 152 },
  { hue: 32 },
  { hue: 199 },
  { hue: 340 },
] as const

function toolColors(index: number) {
  const { hue } = TOOL_PALETTE[index % TOOL_PALETTE.length]
  return {
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    text: `hsl(${hue}, 78%, 42%)`,
  }
}

function ToolCard({
  tool,
  index,
  formatMoney,
}: {
  tool: ToolStackItem
  index: number
  formatMoney: (n: number) => string
}) {
  const colors = toolColors(index)
  const mustHave = String(tool.priority ?? '').toLowerCase() === 'must_have'
  const url = String(tool.url ?? '').trim()
  const href = url ? (url.startsWith('http') ? url : `https://${url}`) : null
  const cost =
    tool.cost_usd_per_month != null && Number.isFinite(tool.cost_usd_per_month)
      ? `${formatMoney(tool.cost_usd_per_month)}/mo`
      : null

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(
        opportunityDetailCardClass,
        'overflow-hidden transition-shadow hover:shadow-md',
        mustHave && 'ring-1 ring-inset ring-primary/20',
      )}
      topSlotStyle={mustHave ? opportunityCardTopSlotToneStyle.primary : undefined}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Wrench
            className={iconClassName({
              tone: mustHave ? 'primary' : iconToneForIndex(index),
              size: 'sm',
              active: true,
            })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              mustHave ? opportunityCardTopSlotTone.primary.title : opportunityCardTopSlotTone.default.title,
              'min-w-0 flex-1',
            )}
          >
            {tool.name}
          </span>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {cost ? (
          <Badge size="sm" className="font-semibold" variant="gray">{cost}</Badge>
        ) : (
          <Badge size="sm" className="font-semibold" variant="green">Free</Badge>
        )}
        {tool.category ? (
          <Badge size="sm" className="font-semibold" variant="gray">{tool.category}</Badge>
        ) : null}
        {mustHave ? (
          <Badge size="sm" className="font-semibold" variant="blue">Must have</Badge>
        ) : tool.priority ? (
          <Badge size="sm" className="font-semibold" variant="gray">Nice to have</Badge>
        ) : null}
        {tool.free_tier_available ? (
          <Badge size="sm" className="font-semibold" variant="green">
            <Gift className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            Free tier
          </Badge>
        ) : null}
      </div>
      {tool.purpose ? (
        <p className="mt-2 font-sans text-[12px] leading-relaxed text-muted-foreground">{tool.purpose}</p>
      ) : null}
      {tool.notes ? (
        <p className="mt-1 font-sans text-[11px] text-muted-foreground/80">{tool.notes}</p>
      ) : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 font-sans text-[11px] font-bold text-primary transition-colors hover:bg-primary/[0.1]"
        >
          Visit
          <ExternalLink className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        </a>
      ) : null}
    </Card>
  )
}

function ToolList({
  tools,
  formatMoney,
}: {
  tools: ToolStackItem[]
  formatMoney: (n: number) => string
}) {
  const sorted = useMemo(
    () =>
      [...tools].sort((a, b) => {
        const am = String(a.priority ?? '').toLowerCase() === 'must_have' ? 0 : 1
        const bm = String(b.priority ?? '').toLowerCase() === 'must_have' ? 0 : 1
        return am - bm
      }),
    [tools],
  )

  return (
    <div className="space-y-3">
      {sorted.map((tool, i) => (
        <ToolCard key={i} tool={tool} index={i} formatMoney={formatMoney} />
      ))}
    </div>
  )
}

export function ToolsAndStackSection({
  opp,
  isMobile,
}: {
  opp: Record<string, unknown>
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}) {
  const { formatMoney } = useCurrency()
  const raw = (opp as { tools_and_stack?: unknown }).tools_and_stack
  const items = parseOppJsonField<ToolStackItem[]>(raw)
  const tools = Array.isArray(items) ? items.filter((t) => t?.name) : []
  if (tools.length === 0) return null

  const mustHaveCount = tools.filter((t) => String(t.priority ?? '').toLowerCase() === 'must_have').length
  const monthlyTotal = tools.reduce((sum, t) => {
    const c = t.cost_usd_per_month
    return sum + (c != null && Number.isFinite(c) ? c : 0)
  }, 0)

  const grouped = useMemo(() => {
    return tools.reduce<Record<string, ToolStackItem[]>>((acc, tool) => {
      const cat = tool.category?.trim() || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(tool)
      return acc
    }, {})
  }, [tools])

  const categories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })
  const firstCat = categories[0] ?? 'Other'
  const useTabs = categories.length > 1
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'tools_and_stack',
    'tools-stack',
  )

  const subtitleParts = [
    `${tools.length} tool${tools.length === 1 ? '' : 's'}`,
    mustHaveCount > 0 ? `${mustHaveCount} must-have` : null,
    monthlyTotal > 0 ? `${formatMoney(monthlyTotal)}/mo` : 'mostly free',
  ].filter(Boolean)

  const body = useTabs ? (
    <Tabs defaultValue={firstCat} className="w-full">
      <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} icon={<Layers className="h-4 w-4" />}>
              {cat}
              <span className="ml-1 tabular-nums text-muted-foreground">({grouped[cat]?.length ?? 0})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {categories.map((cat) => (
        <TabsContent key={cat} value={cat}>
          <ToolList tools={grouped[cat] ?? []} formatMoney={formatMoney} />
        </TabsContent>
      ))}
    </Tabs>
  ) : (
    <ToolList tools={tools} formatMoney={formatMoney} />
  )

  return (
    <OpportunityDetailSectionShell
      id="od-tools"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="tools-stack"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={<OpportunityAccordionHeaderRow icon={Boxes} title="Tools & stack" />}
      description={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
      contentMeta={
        monthlyTotal > 0 ? (
          <>
            <Badge size="sm" variant="blue" className="font-semibold font-bold">
              Est. stack cost: {formatMoney(monthlyTotal)}/mo
            </Badge>
            {mustHaveCount > 0 ? (
              <Badge size="sm" variant="gray" className="font-semibold font-bold">
                {mustHaveCount} essential
              </Badge>
            ) : null}
          </>
        ) : null
      }
    >
            {body}
    </OpportunityDetailSectionShell>
  )
}

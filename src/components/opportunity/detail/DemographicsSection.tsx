import {
  Brain,
  Clock,
  Monitor,
  Sparkles,
  Target,
  Users,
  Zap,
  Globe,
  BarChart3,
} from '@/lib/icons'
import { useMemo } from 'react'
import type { ElementType, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunityAccordionDescriptionClass } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { Badge } from '@/components/ui/badge'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { useCurrency } from '@/hooks/useCurrency'
import { capitalizeFirstLetter } from '@/lib/opportunityDetailUtils'
import { iconClassName } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'
import {
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
} from '@/lib/opportunityCardClasses'

export type DemographicsSectionProps = {
  opp: any
  isMobile: boolean
  fullDetail: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
  isProLocked?: boolean
}

function parseMarketDemographics(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw !== 'string') return raw as Record<string, unknown>
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return null
  }
}

function priceSensitivityVariant(level: 'low' | 'medium' | 'high'): 'green' | 'amber' | 'red' {
  if (level === 'low') return 'green'
  if (level === 'high') return 'red'
  return 'amber'
}

function formatPsychographicProfile(raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const nested =
      obj.profile ?? obj.summary ?? obj.description ?? obj.text ?? obj.psychographics
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
    const parts = Object.values(obj)
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
    if (parts.length) return parts.join(' · ')
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ')
  }
  return String(raw).trim()
}

function DemographicSlotCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ElementType
  title: string
  children: ReactNode
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className="flex h-full min-w-0 flex-col"
      topSlotStyle={opportunityCardTopSlotToneStyle.default}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon className={iconClassName({ tone: 'muted', size: 'sm' })} aria-hidden />
          <div className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {title}
          </div>
        </div>
      }
    >
      {children}
    </Card>
  )
}

function DemographicDescription({ children }: { children: ReactNode }) {
  return <p className={cn(opportunityAccordionDescriptionClass, 'text-[13px] leading-relaxed')}>{children}</p>
}

function DemographicLead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-sans text-[15px] font-semibold leading-snug tracking-normal text-foreground', className)}>
      {children}
    </p>
  )
}

export function DemographicsSection(props: DemographicsSectionProps) {
  const { opp, fullDetail, isProLocked = false } = props
  const { localizeText } = useCurrency()

  const md = parseMarketDemographics(opp?.market_demographics)

  const primaryBuyers = localizeText(String(md?.primary_buyers ?? '').trim())
  const incomeSegment = capitalizeFirstLetter(String(md?.income_segment ?? '').trim())
  const geography = capitalizeFirstLetter(String(md?.geography ?? '').trim())
  const keyInsight = localizeText(String(md?.key_insight ?? '').trim())
  const priceSensitivity = md?.price_sensitivity as 'low' | 'medium' | 'high' | undefined
  const priceRange = localizeText(String(md?.price_range ?? '').trim())
  const decisionTimeline = localizeText(String(md?.decision_timeline ?? '').trim())
  const psychographicProfile = localizeText(formatPsychographicProfile(md?.psychographic_profile))
  const buyingTriggers = Array.isArray(md?.buying_triggers)
    ? md.buying_triggers
        .map((t: unknown) => localizeText(String(t ?? '').trim()))
        .filter(Boolean)
    : []
  const mediaConsumption = localizeText(String(md?.media_consumption ?? '').trim())

  const cards = useMemo(() => {
    const items: ReactNode[] = []

    if (psychographicProfile) {
      items.push(
        <DemographicSlotCard key="psychographic" icon={Brain} title="Psychographic profile">
          <DemographicDescription>{psychographicProfile}</DemographicDescription>
        </DemographicSlotCard>,
      )
    }

    if (incomeSegment) {
      items.push(
        <DemographicSlotCard key="income" icon={BarChart3} title="Income tier">
          <DemographicLead>{incomeSegment}</DemographicLead>
        </DemographicSlotCard>,
      )
    }

    if (geography) {
      items.push(
        <DemographicSlotCard key="geography" icon={Globe} title="Geographic focus">
          <DemographicLead>{geography}</DemographicLead>
        </DemographicSlotCard>,
      )
    }

    if (priceSensitivity || priceRange) {
      items.push(
        <DemographicSlotCard key="price" icon={Zap} title="Price sensitivity">
          <div className="space-y-2">
            {priceSensitivity ? (
              <Badge size="sm" className="font-semibold" variant={priceSensitivityVariant(priceSensitivity)}>
                {capitalizeFirstLetter(priceSensitivity)}
              </Badge>
            ) : null}
            {priceRange ? <DemographicDescription>{priceRange}</DemographicDescription> : null}
          </div>
        </DemographicSlotCard>,
      )
    }

    if (decisionTimeline) {
      items.push(
        <DemographicSlotCard key="timeline" icon={Clock} title="Decision timeline">
          <DemographicLead>{decisionTimeline}</DemographicLead>
        </DemographicSlotCard>,
      )
    }

    if (mediaConsumption) {
      items.push(
        <DemographicSlotCard key="media" icon={Monitor} title="Media consumption">
          <DemographicDescription>{mediaConsumption}</DemographicDescription>
        </DemographicSlotCard>,
      )
    }

    if (primaryBuyers) {
      items.push(
        <DemographicSlotCard key="primary" icon={Target} title="Primary profiles">
          <DemographicDescription>{primaryBuyers}</DemographicDescription>
        </DemographicSlotCard>,
      )
    }

    if (buyingTriggers.length > 0) {
      items.push(
        <DemographicSlotCard key="triggers" icon={Users} title="Buying triggers">
          <DemographicDescription>{buyingTriggers.join(' · ')}</DemographicDescription>
        </DemographicSlotCard>,
      )
    }

    if (keyInsight) {
      items.push(
        <DemographicSlotCard key="insight" icon={Sparkles} title="Demographic insight">
          <DemographicDescription>{keyInsight}</DemographicDescription>
        </DemographicSlotCard>,
      )
    }

    return items
  }, [
    primaryBuyers,
    incomeSegment,
    geography,
    priceSensitivity,
    priceRange,
    decisionTimeline,
    psychographicProfile,
    mediaConsumption,
    buyingTriggers,
    keyInsight,
  ])

  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'market_demographics',
    'demographic-profiling',
  )

  if (!fullDetail || cards.length === 0) return null

  return (
    <div id="market" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="demographic-profiling"
        accordionValue={isProLocked ? 'demographic-profiling' : accordionValue}
        onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Users}
            title={<OpportunityTermLabel term="demographic_profiling" label="Demographic Profiling Matrix" />}
          />
        }
      >
        <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[12rem]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 layout-lg:grid-cols-3">
            {cards}
          </div>
        </OpportunityProLock>
      </OpportunityDetailSectionShell>
    </div>
  )
}

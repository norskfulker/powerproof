import { type ReactNode } from 'react'
import * as React from 'react'
import {
  Check,
  Crown,
  Swords,
  ShieldAlert,
  ShieldCheck,
  Target,
  Zap,
  AlertTriangle,
  Award,
  Eye,
  Crosshair,
} from '@/lib/icons'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import {
  opportunityTermKeyForTitle,
  type OpportunityTermKey,
} from '@/lib/opportunityTermDefinitions'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { Badge } from '@/components/ui/badge'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'
import type { ResearchCompetitors } from '@/types/database'

import {
  opportunityDetailCardClass,
  opportunityDetailCardGlowClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
} from '@/lib/opportunityCardClasses'
import { Card } from '@/components/ui/card'

// ─── Color System ────────────────────────────────────────────────

const COMPETITOR_PALETTE = [
  { hue: 227 },
  { hue: 262 },
  { hue: 152 },
  { hue: 32 },
  { hue: 199 },
  { hue: 340 },
  { hue: 174 },
  { hue: 280 },
] as const

const THREAT_CONFIG: Record<
  string,
  {
    variant: 'success' | 'warning' | 'danger'
    icon: React.ElementType
    label: string
  }
> = {
  low: { variant: 'success', icon: ShieldCheck, label: 'Low threat' },
  medium: { variant: 'warning', icon: AlertTriangle, label: 'Medium threat' },
  high: { variant: 'danger', icon: ShieldAlert, label: 'High threat' },
}

const COMPETITOR_TYPE_LABELS: Record<string, string> = {
  local: 'Local',
  national: 'National',
  international: 'International',
}

function getCompetitorColors(index: number) {
  const { hue } = COMPETITOR_PALETTE[index % COMPETITOR_PALETTE.length]
  return {
    hue,
    solid: `hsl(${hue}, 85%, 58%)`,
    border: `hsl(${hue}, 85%, 50%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    cardBg: `hsla(${hue}, 60%, 97%, 0.4)`,
    text: `hsl(${hue}, 80%, 45%)`,
    subtleText: `hsl(${hue}, 60%, 55%)`,
  }
}

function formatCompetitorType(type: string) {
  const key = type.toLowerCase().trim()
  return COMPETITOR_TYPE_LABELS[key] ?? type
}

function MetricBadge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
  size?: 'sm' | 'md'
}) {
  const variantMap = {
    default: 'gray',
    success: 'green',
    warning: 'amber',
    danger: 'red',
    primary: 'blue',
  } as const

  return (
    <Badge
      variant={variantMap[variant]}
      className="font-semibold font-black uppercase tracking-wider"
    >
      {children}
    </Badge>
  )
}

function CompetitionSubsectionHeader({
  icon: Icon,
  title,
  count,
  countLabel = 'items',
  term,
}: {
  icon: React.ElementType
  title: string
  count?: number
  countLabel?: string
  term?: OpportunityTermKey
}) {
  const resolvedTerm = term ?? opportunityTermKeyForTitle(title)

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className={iconClassName({ tone: 'primary', size: 'md', active: true })} strokeWidth={2.5} aria-hidden />
        <div className="min-w-0">
          <h3 className="font-sans text-lg font-medium text-foreground">
            {resolvedTerm ? (
              <OpportunityTermLabel term={resolvedTerm} label={title} />
            ) : (
              title
            )}
          </h3>
          {count != null && count > 0 ? (
            <p className="mt-0.5 font-sans text-[11px] font-medium text-muted-foreground">
              {count} {count === 1 ? countLabel.replace(/s$/, '') : countLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CompetitorInsightTile({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon: React.ElementType
  tone?: 'default' | 'success' | 'warning' | 'primary'
}) {
  const toneStyles = {
    default: 'border-border-subtle/60 bg-muted/20 text-muted-foreground',
    success: 'border-success/20 bg-success/[0.05] text-success',
    warning: 'border-warning/20 bg-warning/[0.05] text-warning',
    primary: 'border-primary/20 bg-primary/[0.05] text-primary',
  }

  return (
    <div className={cn('min-w-0 rounded-xl border px-3 py-2.5', toneStyles[tone])}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-sans text-[12px] font-medium leading-relaxed text-foreground">{value}</p>
    </div>
  )
}

function KingOfMarketCard({ king }: { king: NonNullable<ResearchCompetitors['king_of_market']> }) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, opportunityDetailCardGlowClass, 'overflow-hidden')}
      topSlotStyle={opportunityCardTopSlotToneStyle.amber}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Crown
            className={iconClassName({ tone: 'amber', size: 'sm', active: true })}
            strokeWidth={2.25}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.amber.title)}>
            {king.name}
          </span>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-warning">
          King of market
        </span>
        <MetricBadge variant="primary" size="md">
          Market leader
        </MetricBadge>
      </div>

      <div className="space-y-4">
        <p className="font-sans text-[14px] font-medium leading-relaxed text-foreground/90">
          {king.why_they_win}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-0 bg-warning/[0.07] p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </div>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-warning">
                Their weakness
              </span>
            </div>
            <p className="font-sans text-[12px] font-medium leading-relaxed text-foreground/85">
              {king.their_weakness}
            </p>
          </div>

          <div className="rounded-xl border-0 bg-success/[0.07] p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                <Zap className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </div>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-success">
                Your exploit
              </span>
            </div>
            <p className="font-sans text-[12px] font-medium leading-relaxed text-foreground/85">
              {king.your_exploit}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function DirectCompetitorCard({
  competitor,
  index,
}: {
  competitor: NonNullable<ResearchCompetitors['direct']>[number]
  index: number
}) {
  const colors = getCompetitorColors(index)

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'relative h-full overflow-hidden')}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Target
            className={iconClassName({ tone: iconToneForIndex(index), size: 'sm', active: true })}
            strokeWidth={2.25}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {competitor.name}
          </span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex rounded-md border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: colors.cardBg,
                borderColor: colors.glow,
                color: colors.text,
              }}
            >
              {formatCompetitorType(competitor.type)}
            </span>
            {competitor.market_share_est ? (
              <span className="font-sans text-[10px] font-medium text-muted-foreground">
                · {competitor.market_share_est} share
              </span>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-sans text-sm font-black tabular-nums text-foreground">
              {competitor.pricing}
            </p>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              pricing
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <CompetitorInsightTile
            label="Strength"
            value={competitor.strength}
            icon={ShieldCheck}
            tone="success"
          />
          <CompetitorInsightTile
            label="Weakness"
            value={competitor.weakness}
            icon={ShieldAlert}
            tone="warning"
          />
          <div className="sm:col-span-2">
            <CompetitorInsightTile
              label="Gap you can fill"
              value={competitor.not_doing}
              icon={Crosshair}
              tone="primary"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

function DirectCompetitorsSection({
  competitors,
}: {
  competitors: NonNullable<ResearchCompetitors['direct']>
}) {
  return (
    <div className="space-y-4">
      <CompetitionSubsectionHeader
        icon={Swords}
        title="Direct Competitors"
        count={competitors.length}
        countLabel="competitors"
        term="direct_competitors"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {competitors.map((competitor, i) => (
          <DirectCompetitorCard key={`${competitor.name}-${i}`} competitor={competitor} index={i} />
        ))}
      </div>
    </div>
  )
}

function IndirectThreatCard({
  threat: item,
  index,
}: {
  threat: NonNullable<ResearchCompetitors['indirect']>[number]
  index: number
}) {
  const threat = THREAT_CONFIG[item.threat_level] ?? THREAT_CONFIG.medium
  const colors = getCompetitorColors(index + 2)
  const ThreatIcon = threat.icon

  const borderTone =
    threat.variant === 'danger'
      ? 'border-rose-500/25'
      : threat.variant === 'warning'
        ? 'border-warning/25'
        : 'border-success/25'

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'h-full overflow-hidden', borderTone)}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Eye
            className={iconClassName({ tone: iconToneForIndex(index), size: 'sm', active: true })}
            strokeWidth={2.25}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.default.title)}>
            {item.name}
          </span>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MetricBadge variant={threat.variant} size="sm">
          <span className="flex items-center gap-1">
            <ThreatIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            {threat.label}
          </span>
        </MetricBadge>
      </div>
      <p className="font-sans text-[12px] font-medium leading-relaxed text-muted-foreground">
        {item.reason}
      </p>
    </Card>
  )
}

function IndirectThreatsSection({ threats }: { threats: NonNullable<ResearchCompetitors['indirect']> }) {
  return (
    <div className="space-y-4">
      <CompetitionSubsectionHeader icon={Eye} title="Indirect Threats" count={threats.length} countLabel="threats" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {threats.map((item, i) => (
          <IndirectThreatCard key={`${item.name}-${i}`} threat={item} index={i} />
        ))}
      </div>
    </div>
  )
}

function AdvantageCard({ advantage }: { advantage: string; index: number }) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'h-full')}
      topSlotStyle={opportunityCardTopSlotToneStyle.success}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Check
            className={iconClassName({ tone: 'success', size: 'sm', active: true })}
            strokeWidth={2.75}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
            Advantage
          </span>
        </div>
      }
    >
      <p className="font-sans text-[13px] font-medium leading-relaxed text-foreground/90">{advantage}</p>
    </Card>
  )
}

function AdvantagesSection({ advantages }: { advantages: string[] }) {
  return (
    <div className="space-y-4">
      <CompetitionSubsectionHeader icon={Award} title="Your Advantages" count={advantages.length} countLabel="advantages" />
      <div className="grid gap-3 sm:grid-cols-2">
        {advantages.map((item, i) => (
          <AdvantageCard key={`${item}-${i}`} advantage={item} index={i} />
        ))}
      </div>
    </div>
  )
}

function ActionStepCard({
  action,
  index,
  total,
}: {
  action: string
  index: number
  total: number
}) {
  const colors = getCompetitorColors(index)

  return (
    <li className="flex items-center gap-3 rounded-xl border-0 bg-muted/15 px-4 py-3.5">
      <div
        className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl font-sans text-white shadow-sm"
        style={{
          background: colors.solid,
        }}
      >
        <span className="text-[13px] font-black leading-none tabular-nums">{index + 1}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Step {index + 1} of {total}
        </span>
        <p className="mt-0.5 font-sans text-[13px] font-semibold leading-relaxed text-foreground">
          {action}
        </p>
      </div>
    </li>
  )
}

function ActionPlanSection({ actions }: { actions: string[] }) {
  return (
    <div className="space-y-4">
      <CompetitionSubsectionHeader
        icon={Target}
        title="Strategic Action Plan"
        count={actions.length}
        countLabel="moves"
      />
      <ol className="flex flex-col gap-2.5">
        {actions.map((action, i) => (
          <ActionStepCard
            key={`${action}-${i}`}
            action={action}
            index={i}
            total={actions.length}
          />
        ))}
      </ol>
    </div>
  )
}

export function CompetitorsSection({
  competitors,
  isMobile = false,
  isProLocked = false,
}: {
  competitors: ResearchCompetitors | null | undefined
  isMobile?: boolean
  isProLocked?: boolean
}) {
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion('competitors', 'competitive-landscape')

  if (!competitors?.king_of_market?.name) return null

  const { king_of_market: king, direct, indirect, your_advantages, what_to_do, badge_context } = competitors
  const marketContext = badge_context?.trim() || undefined

  const competitorNames = [
    king.name,
    ...(direct?.map((c) => c.name) ?? []),
    ...(indirect?.map((c) => c.name) ?? []),
  ]
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)

  const body = (
    <div className="flex flex-col gap-6">
      <KingOfMarketCard king={king} />

      {direct?.length ? <DirectCompetitorsSection competitors={direct} /> : null}

      {indirect?.length ? <IndirectThreatsSection threats={indirect} /> : null}

      {your_advantages?.length ? <AdvantagesSection advantages={your_advantages} /> : null}

      {what_to_do?.length ? <ActionPlanSection actions={what_to_do} /> : null}
    </div>
  )

  return (
    <section id="od-competitors" className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="competitive-landscape"
        accordionValue={isProLocked ? 'competitive-landscape' : accordionValue}
        onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Swords}
            title="Competitive Landscape"
          />
        }
        description={marketContext || undefined}
        >
        {isProLocked ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {competitorNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-md border border-border-subtle bg-card px-2.5 py-1 font-sans text-[13px] font-semibold text-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
            <OpportunityProLock locked minHeightClassName="min-h-[14rem]">
              {body}
            </OpportunityProLock>
          </div>
        ) : (
          body
        )}
      </OpportunityDetailSectionShell>
    </section>
  )
}

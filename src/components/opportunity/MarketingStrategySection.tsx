import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import * as React from 'react'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { Card } from '@/components/ui/card'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { opportunityAccordionDescriptionClass } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import type {
  MarketingBudgetMilestone,
  MarketingBudgetMilestoneChannel,
  MarketingChannel,
  MarketingStrategy,
} from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'
import {
  opportunityDetailCardClass,
  opportunityDetailCardGlowClass,
  opportunityDetailCardRadiusClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotIconClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotMetaClass,
  opportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'

import {
  TrendingUp,
  Target,
  Megaphone,
  Users,
  Zap,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Wallet,
  BarChart3,
  PieChart,
  Rocket,
  Repeat,
  Handshake,
  Lightbulb as LightbulbIcon,
  ChevronRight,
  Minus,
  Award,
  Flame,
  Quote,
  BadgeCheck,
  Star,
  Activity,
  ListChecks,
  Layers,
  Video,
  Camera,
  MessageCircle,
  Linkedin,
  MapPin,
  Globe,
  Mail,
  Search,
} from '@/lib/icons'

// ─── Color System ────────────────────────────────────────────────

const CHANNEL_PALETTE = [
  { hue: 227, name: 'primary' },    // Blue
  { hue: 262, name: 'violet' },     // Violet
  { hue: 152, name: 'emerald' },    // Emerald
  { hue: 32,  name: 'amber' },      // Amber
  { hue: 199, name: 'sky' },        // Sky
  { hue: 340, name: 'rose' },       // Rose
  { hue: 174, name: 'teal' },       // Teal
  { hue: 280, name: 'fuchsia' },    // Fuchsia
] as const

const TYPE_ICONS: Record<string, React.ElementType> = {
  social: Users,
  digital_ads: Target,
  content: Sparkles,
  seo: Search,
  guerrilla: Flame,
  offline_print: Megaphone,
  offline_ooh: Megaphone,
  pr: Megaphone,
  referral: Handshake,
  influencer: Award,
  community: Users,
  email: Mail,
  event: Calendar,
}

const CHANNEL_NAME_ICON_RULES: Array<{ keywords: string[]; icon: React.ElementType }> = [
  { keywords: ['ugc', 'user-generated', 'user generated'], icon: Camera },
  { keywords: ['reel', 'short-form', 'short form', 'tiktok', 'youtube short'], icon: Video },
  { keywords: ['influencer'], icon: Award },
  { keywords: ['whatsapp'], icon: MessageCircle },
  { keywords: ['linkedin'], icon: Linkedin },
  { keywords: ['google my business', 'google business', 'gmb'], icon: MapPin },
  { keywords: ['instant site', 'website', 'landing page', 'web site', 'digital storefront'], icon: Globe },
  { keywords: ['guerrilla'], icon: Flame },
  { keywords: ['google ads', 'search ads', 'ppc', 'sem'], icon: Target },
  { keywords: ['facebook', 'instagram', 'meta ads', 'social media'], icon: Users },
  { keywords: ['email', 'newsletter'], icon: Mail },
  { keywords: ['seo', 'search engine', 'organic search'], icon: Search },
  { keywords: ['referral', 'word-of-mouth', 'word of mouth'], icon: Handshake },
  { keywords: ['event', 'workshop', 'activation'], icon: Calendar },
  { keywords: ['content', 'blog', 'article'], icon: Sparkles },
  { keywords: ['print', 'ooh', 'billboard'], icon: Megaphone },
]

const PRIORITY_GROUP_ICONS: Record<'primary' | 'secondary' | 'experimental', React.ElementType> = {
  primary: Star,
  secondary: Layers,
  experimental: Sparkles,
}

function getMarketingChannelIcon(channel: MarketingChannel): React.ElementType {
  const name = channel.name.toLowerCase()
  for (const rule of CHANNEL_NAME_ICON_RULES) {
    if (rule.keywords.some((keyword) => name.includes(keyword))) {
      return rule.icon
    }
  }
  return TYPE_ICONS[channel.type] ?? Target
}

const PRIORITY_CONFIG: Record<string, { 
  label: string
  variant: 'primary' | 'default' | 'warning'
}> = {
  primary: { label: 'Primary', variant: 'primary' },
  secondary: { label: 'Secondary', variant: 'default' },
  experimental: { label: 'Test it', variant: 'warning' },
}

const SUCCESS_CONFIG: Record<string, { 
  label: string
  variant: 'success' | 'warning' | 'danger'
  icon: React.ElementType
}> = {
  low:    { label: 'Low',    variant: 'danger',  icon: ShieldAlert },
  medium: { label: 'Medium', variant: 'warning', icon: ShieldCheck },
  high:   { label: 'High',   variant: 'success', icon: ShieldCheck },
}

const MILESTONE_KEYS = [
  { key: 'month_1' as const,  label: 'Month 1',  icon: Rocket },
  { key: 'month_6' as const,  label: 'Month 6',  icon: TrendingUp },
  { key: 'month_12' as const, label: 'Month 12', icon: Award },
  { key: 'month_18' as const, label: 'Month 18', icon: Target },
] as const

const CHANNEL_PRIORITY_ORDER = ['primary', 'secondary', 'experimental'] as const

const CHANNEL_PRIORITY_GROUP: Record<
  (typeof CHANNEL_PRIORITY_ORDER)[number],
  { label: string; hint: string }
> = {
  primary: { label: 'Primary channels', hint: 'Highest-impact spend' },
  secondary: { label: 'Secondary channels', hint: 'Supporting reach & presence' },
  experimental: { label: 'Test channels', hint: 'Low-risk experiments' },
}

const MarketingStrategyVariantContext = createContext<'default' | 'flat'>('default')

function useMarketingStrategyVariant() {
  return useContext(MarketingStrategyVariantContext)
}

// ─── Color Derivation ────────────────────────────────────────────

function getChannelColors(index: number) {
  const { hue } = CHANNEL_PALETTE[index % CHANNEL_PALETTE.length]
  return {
    hue,
    solid: `hsl(${hue}, 85%, 58%)`,
    border: `hsl(${hue}, 85%, 50%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    cardBg: `hsla(${hue}, 60%, 97%, 0.4)`,
    softBorder: `hsla(${hue}, 85%, 58%, 0.15)`,
    text: `hsl(${hue}, 80%, 45%)`,
    subtleText: `hsl(${hue}, 60%, 55%)`,
  }
}

// ─── Enhanced Visual Components ────────────────────────────────────

function GlassCard({
  children,
  className,
  glow = false,
  topSlot,
  topSlotClassName,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
  /** Header band — pass raw icon + title topSlot JSX for titled nested cards. */
  topSlot?: ReactNode
  topSlotClassName?: string
}) {
  return (
    <Card
      padding="none"
      radius="lg"
      className={cn(glow && opportunityDetailCardGlowClass, className)}
      topSlot={topSlot}
      topSlotClassName={topSlotClassName}
    >
      {children}
    </Card>
  )
}

function MetricBadge({ 
  children, 
  variant = 'default',
  size = 'lg'
}: { 
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
  size?: 'sm' | 'md' | 'lg'
}) {
  const variants = {
    default: 'bg-muted/60 text-muted-foreground border-border-subtle/50',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-lg border font-black uppercase tracking-wider",
      size === 'sm' ? "px-2 py-0.5 text-[10px]" : size === 'lg' ? "px-3.5 py-1.5 text-[12px]" : "px-2.5 py-1 text-[11px]",
      variants[variant]
    )}>
      {children}
    </span>
  )
}

type BudgetSplitSegment = { label: string; pct: number }

function parseBudgetSplit(split: string): BudgetSplitSegment[] {
  return split
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*%?$/)
      if (match) {
        return { label: match[1].trim(), pct: Number.parseFloat(match[2]) }
      }
      return { label: part, pct: 0 }
    })
    .filter((s) => s.label.length > 0)
}

const BUDGET_SPLIT_COLORS = [227, 262, 152, 32, 199, 340] as const

function BudgetSplitVisual({ split }: { split: string }) {
  const segments = useMemo(() => {
    const parsed = parseBudgetSplit(split)
    const withPct = parsed.filter((s) => s.pct > 0)
    return withPct.length > 0 ? withPct : parsed
  }, [split])

  const totalPct = segments.reduce((sum, s) => sum + (s.pct > 0 ? s.pct : 0), 0)
  const useNormalized = totalPct > 0 && Math.abs(totalPct - 100) > 0.5

  return (
    <div className="space-y-3">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted/50">
        {segments.map((seg, i) => {
          const width = useNormalized
            ? (seg.pct / totalPct) * 100
            : seg.pct > 0
              ? seg.pct
              : 100 / segments.length
          const hue = BUDGET_SPLIT_COLORS[i % BUDGET_SPLIT_COLORS.length]
          return (
            <div
              key={`${seg.label}-${i}`}
              className="h-full min-w-[4px] rounded-sm transition-all"
              style={{
                width: `${width}%`,
                background: `hsl(${hue}, 68%, 48%)`,
              }}
              title={`${seg.label}${seg.pct > 0 ? ` · ${seg.pct}%` : ''}`}
            />
          )
        })}
      </div>
      <ul className="space-y-1.5">
        {segments.map((seg, i) => {
          const hue = BUDGET_SPLIT_COLORS[i % BUDGET_SPLIT_COLORS.length]
          return (
            <li key={`${seg.label}-${i}`} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: `hsl(${hue}, 68%, 48%)` }}
                  aria-hidden
                />
                <span className="truncate font-medium text-foreground/85">{seg.label}</span>
              </span>
              {seg.pct > 0 ? (
                <span className="shrink-0 font-bold tabular-nums text-muted-foreground">{seg.pct}%</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MarketingStatCard({
  label,
  icon: Icon,
  children,
  caption,
}: {
  label: string
  icon: React.ElementType
  children: ReactNode
  caption?: string
}) {
  const header = (
    <div className={opportunityCardTopSlotRowClass}>
      <span className={opportunityCardTopSlotIconClass}>
        <Icon aria-hidden />
      </span>
      <span className={opportunityCardTopSlotTitleClass}>
        {label}
      </span>
    </div>
  )
  const body = (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
      {caption ? (
        <p className="mt-3 font-sans text-[11px] leading-relaxed text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )

  return (
    <Card padding="none" radius="lg" className="h-full" topSlot={header}>
      <div className="p-4">{body}</div>
    </Card>
  )
}

function PrimaryHookCard({ hook }: { hook: string }) {
  const header = (
    <div className={opportunityCardTopSlotRowClass}>
      <span className={cn(opportunityCardTopSlotIconClass, opportunityCardTopSlotTone.primary.icon)}>
        <LightbulbIcon aria-hidden />
      </span>
      <span className={opportunityCardTopSlotTitleClass}>
        Core psychological hook
      </span>
    </div>
  )
  const body = (
    <div className="relative pl-6">
      <span
        className="pointer-events-none absolute -left-1 top-0 text-5xl leading-none text-primary/15 select-none"
        aria-hidden
      >
        &ldquo;
      </span>
      <p className="font-sans text-[17px] font-semibold leading-snug text-foreground sm:text-lg">
        {hook}
      </p>
      <p className="mt-2 font-sans text-[12px] leading-relaxed text-muted-foreground">
        The emotional trigger that anchors messaging, offers, and channel creative.
      </p>
    </div>
  )

  return (
    <Card padding="none" radius="lg" className="h-full" topSlot={header}>
      <div className="p-5">{body}</div>
    </Card>
  )
}

// ─── Strategy Overview ───────────────────────────────────────────

function StrategyOverview({
  strategy,
  formatMoney,
}: {
  strategy: MarketingStrategy
  formatMoney: (n: number) => string
}) {
  const hasBudget = strategy.total_budget_usd != null && strategy.total_budget_usd > 0
  const hasSplit = Boolean(strategy.budget_split?.trim())
  const channelCount = strategy.channels?.length ?? 0

  return (
    <div className="space-y-5">
      {(hasBudget || hasSplit || channelCount > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {hasBudget ? (
            <MarketingStatCard
              label="Year 1 budget"
              icon={Wallet}
              caption="Total marketing spend allocated for the first year"
            >
              <p className="font-sans text-2xl font-black tabular-nums tracking-tight text-foreground sm:text-[26px]">
                {formatMoney(strategy.total_budget_usd!)}
              </p>
            </MarketingStatCard>
          ) : null}

          {hasSplit ? (
            <MarketingStatCard
              label="Budget split"
              icon={PieChart}
              caption="Share of spend across channel groups"
            >
              <BudgetSplitVisual split={strategy.budget_split!.trim()} />
            </MarketingStatCard>
          ) : null}

          {channelCount > 0 ? (
            <MarketingStatCard
              label="Active channels"
              icon={Megaphone}
              caption="Distinct channels in the go-to-market plan"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-3xl font-black tabular-nums leading-none text-foreground">
                  {channelCount}
                </span>
                <span className="font-sans text-sm font-medium text-muted-foreground">
                  {channelCount === 1 ? 'channel' : 'channels'}
                </span>
              </div>
            </MarketingStatCard>
          ) : null}
        </div>
      )}

      {strategy.primary_hook ? <PrimaryHookCard hook={strategy.primary_hook} /> : null}
    </div>
  )
}

function MarketingSubsectionShell({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon: React.ElementType
  count?: number
  children: ReactNode
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className="w-full overflow-hidden"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={opportunityCardTopSlotIconClass}>
            <Icon aria-hidden />
          </span>
          <h4 className={cn(opportunityCardTopSlotTitleClass, 'font-sans text-[15px] sm:text-base')}>
            {title}
          </h4>
          {count != null && count > 0 ? (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-border-subtle bg-muted/40 px-2 py-0.5 font-sans text-[10px] font-bold tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
      }
    >
      {children}
    </Card>
  )
}

function budgetMilestonesHasData(milestones: NonNullable<MarketingStrategy['budget_milestones']>) {
  return MILESTONE_KEYS.some(({ key }) => Boolean(milestones[key]))
}

const SOCIAL_PROOF_ICONS = [Quote, BadgeCheck, Star, Users] as const

function SocialProofAngleCard({ angle, index }: { angle: string; index: number }) {
  const Icon = SOCIAL_PROOF_ICONS[index % SOCIAL_PROOF_ICONS.length]
  return (
    <Card
      padding="none"
      radius="lg"
      className="h-full"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={opportunityCardTopSlotIconClass}>
            <Icon aria-hidden />
          </span>
          <span className={opportunityCardTopSlotTitleClass}>Proof angle {index + 1}</span>
        </div>
      }
    >
      <p className="p-4 font-sans text-[13px] font-medium leading-relaxed text-foreground">{angle}</p>
    </Card>
  )
}

// ─── Social Proof Angles ─────────────────────────────────────────

function SocialProofSection({ angles }: { angles: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {angles.map((angle, i) => (
        <SocialProofAngleCard key={`${angle}-${i}`} angle={angle} index={i} />
      ))}
    </div>
  )
}

type LeverMeta = { icon: React.ElementType; colors: ReturnType<typeof getChannelColors> }

function getLeverMeta(lever: string, index: number): LeverMeta {
  const key = lever.toLowerCase()
  if (key.includes('scarcity') || key.includes('urgency')) {
    return { icon: Flame, colors: getChannelColors(3) }
  }
  if (key.includes('authority') || key.includes('expert')) {
    return { icon: Award, colors: getChannelColors(1) }
  }
  if (key.includes('social')) {
    return { icon: Users, colors: getChannelColors(0) }
  }
  if (key.includes('reciproc')) {
    return { icon: Handshake, colors: getChannelColors(6) }
  }
  if (key.includes('commit') || key.includes('consist')) {
    return { icon: CheckCircle2, colors: getChannelColors(2) }
  }
  return { icon: Zap, colors: getChannelColors(index) }
}

function PsychologyLeverCard({
  lever,
  application,
  index,
}: {
  lever: string
  application: string
  index: number
}) {
  const { icon: Icon } = getLeverMeta(lever, index)

  return (
    <Card
      padding="none"
      radius="lg"
      className="h-full"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={opportunityCardTopSlotIconClass}>
            <Icon aria-hidden />
          </span>
          <span className={opportunityCardTopSlotTitleClass}>{lever}</span>
        </div>
      }
    >
      <p className="p-4 font-sans text-[13px] leading-relaxed text-muted-foreground">{application}</p>
    </Card>
  )
}

// ─── Psychology Levers ───────────────────────────────────────────

function PsychologyLeversSection({
  levers,
}: {
  levers: Array<{ lever: string; application: string }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {levers.map((item, i) => (
        <PsychologyLeverCard
          key={`${item.lever}-${i}`}
          lever={item.lever}
          application={item.application}
          index={i}
        />
      ))}
    </div>
  )
}

// ─── Budget Milestones ───────────────────────────────────────────

type NormalizedMilestoneChannel = {
  name: string
  action: string
  budget_usd: number
}

function normalizeMilestoneChannel(
  channel: string | MarketingBudgetMilestoneChannel,
): NormalizedMilestoneChannel {
  if (typeof channel === 'string') {
    return { name: channel.trim(), action: '', budget_usd: 0 }
  }
  return {
    name: String(channel.name ?? '').trim(),
    action: String(channel.action ?? '').trim(),
    budget_usd: Number.isFinite(channel.budget_usd) ? channel.budget_usd : 0,
  }
}

function milestoneSpendBadge(focus: string): { label: string; className: string } | null {
  const text = focus.toLowerCase()
  if (text.includes('highest')) {
    return { label: 'Peak spend', className: 'border-warning/25 bg-warning/10 text-warning' }
  }
  if (text.includes('lowest')) {
    return { label: 'Lean spend', className: 'border-success/25 bg-success/10 text-success' }
  }
  if (text.includes('moderate')) {
    return { label: 'Moderate', className: 'border-primary/25 bg-primary/10 text-primary' }
  }
  if (text.includes('lower')) {
    return { label: 'Reduced', className: 'border-border-subtle bg-muted/40 text-muted-foreground' }
  }
  return null
}

function MilestoneChannelAllocationBar({
  channels,
  totalUsd,
  formatMoney,
}: {
  channels: NormalizedMilestoneChannel[]
  totalUsd: number
  formatMoney: (n: number) => string
}) {
  const withBudget = channels.filter((c) => c.budget_usd > 0)
  if (withBudget.length === 0) return null

  const sum = withBudget.reduce((s, c) => s + c.budget_usd, 0)
  const denominator = sum > 0 ? sum : totalUsd > 0 ? totalUsd : 0
  if (denominator <= 0) return null

  return (
    <div className="space-y-2">
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted/50">
        {withBudget.map((ch, i) => {
          const hue = CHANNEL_PALETTE[i % CHANNEL_PALETTE.length].hue
          const width = (ch.budget_usd / denominator) * 100
          return (
            <div
              key={`${ch.name}-${i}`}
              className="h-full min-w-[4px] rounded-sm"
              style={{ width: `${width}%`, background: `hsl(${hue}, 68%, 48%)` }}
              title={`${ch.name} · ${formatMoney(ch.budget_usd)} · ${Math.round(width)}%`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {withBudget.map((ch, i) => {
          const hue = CHANNEL_PALETTE[i % CHANNEL_PALETTE.length].hue
          const pct = Math.round((ch.budget_usd / denominator) * 100)
          return (
            <span
              key={`legend-${ch.name}-${i}`}
              className="inline-flex items-center gap-1.5 font-sans text-[10px] text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: `hsl(${hue}, 68%, 48%)` }}
                aria-hidden
              />
              <span className="truncate">{ch.name}</span>
              <span className="font-semibold tabular-nums text-foreground/70">{pct}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MilestoneChannelRow({
  channel,
  index,
  formatMoney,
  periodTotalUsd,
}: {
  channel: NormalizedMilestoneChannel
  index: number
  formatMoney: (n: number) => string
  periodTotalUsd: number
}) {
  const { localizeText } = useCurrency()
  const colors = getChannelColors(index)
  const sharePct =
    periodTotalUsd > 0 && channel.budget_usd > 0
      ? Math.round((channel.budget_usd / periodTotalUsd) * 100)
      : null

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="flex min-w-0 flex-1 gap-3">
        <div
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: colors.solid }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-sans text-[13px] font-semibold text-foreground">{channel.name}</p>
          {channel.action ? (
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground">
              {localizeText(channel.action)}
            </p>
          ) : null}
        </div>
      </div>
      {channel.budget_usd > 0 ? (
        <div className="shrink-0 text-right">
          <span
            className="font-sans text-sm font-bold tabular-nums"
            style={{ color: colors.text }}
          >
            {formatMoney(channel.budget_usd)}
          </span>
          {sharePct != null ? (
            <p className="mt-0.5 font-sans text-[10px] font-medium tabular-nums text-muted-foreground">
              {sharePct}% of period
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function BudgetMilestoneCard({
  label,
  icon: Icon,
  focus,
  total_usd,
  channels,
  index,
  formatMoney,
}: {
  label: string
  icon: React.ElementType
  focus: string
  total_usd: number
  channels?: MarketingBudgetMilestone['channels']
  index: number
  formatMoney: (n: number) => string
}) {
  const variant = useMarketingStrategyVariant()
  const colors = getChannelColors(index)
  const normalizedChannels = (channels ?? [])
    .map(normalizeMilestoneChannel)
    .filter((c) => c.name.length > 0)
  const spendBadge = milestoneSpendBadge(focus)

  const channelsBody =
    normalizedChannels.length > 0 ? (
      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Channel allocation
            </span>
            <span className="font-sans text-[10px] font-medium text-muted-foreground">
              {normalizedChannels.length} {normalizedChannels.length === 1 ? 'method' : 'methods'}
            </span>
          </div>
          <MilestoneChannelAllocationBar
            channels={normalizedChannels}
            totalUsd={total_usd ?? 0}
            formatMoney={formatMoney}
          />
        </div>
        <div className="overflow-hidden rounded-xl border-0 divide-y divide-border-subtle/60">
          {normalizedChannels.map((ch, ci) => (
            <MilestoneChannelRow
              key={`${ch.name}-${ci}`}
              channel={ch}
              index={ci}
              formatMoney={formatMoney}
              periodTotalUsd={total_usd ?? 0}
            />
          ))}
        </div>
      </div>
    ) : null

  if (variant === 'flat') {
    return (
      <Card
        padding="none"
        radius="lg"
        className="overflow-hidden"
        topSlot={
          <div className={opportunityCardTopSlotRowClass}>
            <span className={opportunityCardTopSlotIconClass}>
              <Icon aria-hidden />
            </span>
            <span className={opportunityCardTopSlotTitleClass}>{label}</span>
          </div>
        }
      >
        <div className="space-y-3 px-4 pt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1 font-sans text-[11px] text-muted-foreground">{focus}</p>
            <div className="shrink-0 text-right">
              <p className={cn(opportunityCardTopSlotMetaClass, 'text-2xl font-black tracking-tight')}>
                {formatMoney(total_usd ?? 0)}
              </p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Period budget
              </p>
            </div>
          </div>
          {spendBadge ? (
            <div className="flex items-center justify-end">
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider',
                  spendBadge.className,
                )}
              >
                {spendBadge.label}
              </span>
            </div>
          ) : null}
        </div>
        {channelsBody}
      </Card>
    )
  }

  const body = (
    <>
      <div
        className="flex flex-col gap-4 border-b border-border-subtle/60 p-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ background: `hsla(${colors.hue}, 60%, 97%, 0.35)` }}
      >
        <div className="flex min-w-0 gap-3">
          <Icon className={iconClassName({ tone: iconToneForIndex(colors.hue % 6), size: 'lg', active: true })} strokeWidth={2.5} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-sans text-sm font-bold text-foreground">{label}</h4>
              {spendBadge ? (
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider',
                    spendBadge.className,
                  )}
                >
                  {spendBadge.label}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-muted-foreground">{focus}</p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="font-sans text-2xl font-black tabular-nums tracking-tight text-foreground">
            {formatMoney(total_usd ?? 0)}
          </p>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Period budget
          </p>
        </div>
      </div>

      {channelsBody}
    </>
  )

  return (
    <div
      className="overflow-hidden rounded-xl border-0"
      style={{ background: colors.cardBg, borderColor: colors.border }}
    >
      {body}
    </div>
  )
}

function BudgetMilestonesSection({
  milestones,
  formatMoney,
}: {
  milestones: NonNullable<MarketingStrategy['budget_milestones']>
  formatMoney: (n: number) => string
}) {
  const items = useMemo(() => {
    return MILESTONE_KEYS.map(({ key, label, icon }) => {
      const m = milestones[key]
      return m ? { key, label, icon, ...m } : null
    }).filter(Boolean) as Array<{
      key: string
      label: string
      icon: React.ElementType
      total_usd: number
      focus: string
      channels?: MarketingBudgetMilestone['channels']
    }>
  }, [milestones])

  if (!items.length) return null

  const journeyTotal = items.reduce((s, m) => s + (m.total_usd ?? 0), 0)
  const maxPeriodSpend = Math.max(...items.map((m) => m.total_usd ?? 0), 1)

  return (
    <div className="space-y-5">
      <div className={cn(opportunityDetailCardClass, "p-4")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              18-month journey
            </p>
            <p className="mt-1 font-sans text-2xl font-black tabular-nums tracking-tight text-foreground">
              {formatMoney(journeyTotal)}
            </p>
            <p className="mt-1 font-sans text-[12px] text-muted-foreground">
              Spend peaks at launch, then shifts toward retention and organic growth.
            </p>
          </div>
          <div className="flex items-end gap-2 sm:gap-3">
            {items.map((m, i) => {
              const height = Math.max(12, Math.round(((m.total_usd ?? 0) / maxPeriodSpend) * 48))
              const colors = getChannelColors(i)
              return (
                <div key={m.key} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-8 rounded-t-md transition-all sm:w-10"
                    style={{
                      height: `${height}px`,
                      background: colors.solid,
                    }}
                    title={`${m.label}: ${formatMoney(m.total_usd ?? 0)}`}
                  />
                  <span className="font-sans text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    M{m.label.replace(/\D/g, '')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative space-y-4">
      <div
        className="pointer-events-none absolute left-[19px] top-8 hidden h-[calc(100%-4rem)] w-px bg-primary/15 sm:block"
        aria-hidden
      />
      {items.map((m, i) => (
        <div key={m.key} className="relative flex gap-4">
          <div className="relative z-10 mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm sm:flex">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: getChannelColors(i).mutedBg }}
            >
              <m.icon
                className="h-3.5 w-3.5"
                style={{ color: getChannelColors(i).text }}
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <BudgetMilestoneCard
              label={m.label}
              icon={m.icon}
              focus={m.focus}
              total_usd={m.total_usd}
              channels={m.channels}
              index={i}
              formatMoney={formatMoney}
            />
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

function formatChannelBudget(amount: number, formatMoney: (n: number) => string) {
  if (!Number.isFinite(amount) || amount <= 0) return 'Free'
  return `${formatMoney(amount)}/mo`
}

function channelBudgetTotal(channels: MarketingChannel[]) {
  return channels.reduce((sum, ch) => sum + (ch.budget_usd ?? 0), 0)
}

function groupChannelsByPriority(channels: MarketingChannel[]) {
  return CHANNEL_PRIORITY_ORDER.map((priority) => ({
    priority,
    ...CHANNEL_PRIORITY_GROUP[priority],
    items: channels
      .map((channel, index) => ({ channel, index }))
      .filter(({ channel }) => channel.priority === priority),
  })).filter((group) => group.items.length > 0)
}

function ChannelMetaTile({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  icon: React.ElementType
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneStyles = {
    default: 'border-border-subtle/60 bg-muted/20 text-muted-foreground',
    success: 'border-success/20 bg-success/[0.05] text-success',
    warning: 'border-warning/20 bg-warning/[0.05] text-warning',
    danger: 'border-rose-500/20 bg-rose-500/[0.05] text-rose-600',
  }

  return (
    <div className={cn('min-w-0 rounded-xl border px-3 py-2.5', toneStyles[tone])}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-sans text-[12px] font-semibold leading-snug text-foreground">{value}</div>
    </div>
  )
}

function ChannelPortfolioSummary({
  channels,
  formatMoney,
}: {
  channels: MarketingChannel[]
  formatMoney: (n: number) => string
}) {
  const totalMonthly = useMemo(() => channelBudgetTotal(channels), [channels])
  const primaryCount = channels.filter((c) => c.priority === 'primary').length
  const paidChannels = channels.filter((c) => (c.budget_usd ?? 0) > 0)

  return (
    <Card
      padding="none"
      radius="lg"
      className="overflow-hidden"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={opportunityCardTopSlotTitleClass}>Channel portfolio</span>
        </div>
      }
    >
      <div className="space-y-1 border-b border-border-subtle/60 px-4 py-3 sm:px-5">
        <span className="block font-sans text-2xl font-black tabular-nums tracking-tight text-foreground">
          {totalMonthly > 0 ? formatMoney(totalMonthly) : 'Free'}
          {totalMonthly > 0 ? (
            <span className="ml-1 text-sm font-bold text-muted-foreground">/mo total</span>
          ) : (
            <span className="ml-1 text-sm font-bold text-muted-foreground">· organic-first mix</span>
          )}
        </span>
        <span className="block font-sans text-[12px] text-muted-foreground">
          {channels.length} channels · {primaryCount} primary · {paidChannels.length} paid
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 px-4 py-3 sm:px-5">
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Priority mix
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {CHANNEL_PRIORITY_ORDER.map((priority) => {
            const count = channels.filter((c) => c.priority === priority).length
            if (!count) return null
            const cfg = PRIORITY_CONFIG[priority]
            return (
              <span
                key={priority}
                className={cn(
                  'rounded-lg border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider',
                  cfg.variant === 'primary'
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : cfg.variant === 'warning'
                      ? 'border-warning/20 bg-warning/10 text-warning'
                      : 'border-border-subtle bg-muted/40 text-muted-foreground',
                )}
              >
                {count} {cfg.label.toLowerCase()}
              </span>
            )
          })}
        </div>
      </div>
      {paidChannels.length > 0 ? (
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly budget mix
          </span>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted/50">
            {paidChannels.map((ch, i) => {
              const idx = channels.indexOf(ch)
              const hue = CHANNEL_PALETTE[idx % CHANNEL_PALETTE.length].hue
              const width = totalMonthly > 0 ? ((ch.budget_usd ?? 0) / totalMonthly) * 100 : 0
              return (
                <div
                  key={`${ch.name}-${i}`}
                  className="h-full min-w-[3px] rounded-sm"
                  style={{ width: `${width}%`, background: `hsl(${hue}, 68%, 48%)` }}
                  title={`${ch.name} · ${formatMoney(ch.budget_usd ?? 0)}`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {paidChannels.slice(0, 6).map((ch, i) => {
              const idx = channels.indexOf(ch)
              const hue = CHANNEL_PALETTE[idx % CHANNEL_PALETTE.length].hue
              const pct =
                totalMonthly > 0 ? Math.round(((ch.budget_usd ?? 0) / totalMonthly) * 100) : 0
              return (
                <span
                  key={`legend-${ch.name}`}
                  className="inline-flex max-w-[160px] items-center gap-1.5 font-sans text-[10px] text-muted-foreground"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: `hsl(${hue}, 68%, 48%)` }}
                    aria-hidden
                  />
                  <span className="truncate">{ch.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground/70">{pct}%</span>
                </span>
              )
            })}
            {paidChannels.length > 6 ? (
              <span className="font-sans text-[10px] text-muted-foreground">
                +{paidChannels.length - 6} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function ChannelTacticsList({ tactics, colors }: { tactics: string[]; colors: ReturnType<typeof getChannelColors> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} aria-hidden />
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Tactics
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tactics.map((tactic, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-xl border-0 bg-muted/15 px-3 py-2.5"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-sans text-[10px] font-black tabular-nums text-white"
              style={{ background: colors.solid }}
            >
              {i + 1}
            </span>
            <span className="font-sans text-[12px] font-medium leading-snug text-foreground/90">{tactic}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChannelDosDonts({ dos, donts }: { dos?: string[]; donts?: string[] }) {
  if (!dos?.length && !donts?.length) return null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {dos?.length ? (
        <div className="rounded-xl border-0 bg-success/[0.06] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className={iconClassName({ tone: 'success', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-success">Do</span>
          </div>
          <ul className="space-y-2">
            {dos.map((item, i) => (
              <li key={i} className="flex items-start gap-2 font-sans text-[12px] leading-relaxed text-foreground/85">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {donts?.length ? (
        <div className="rounded-xl border-0 bg-rose-500/[0.05] p-4">
          <div className="mb-3 flex items-center gap-2">
            <XCircle className={iconClassName({ tone: 'destructive', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Don&apos;t
            </span>
          </div>
          <ul className="space-y-2">
            {donts.map((item, i) => (
              <li key={i} className="flex items-start gap-2 font-sans text-[12px] leading-relaxed text-foreground/85">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ChannelInsightPanel({
  title,
  body,
  icon: Icon,
  tone,
}: {
  title: string
  body: string
  icon: React.ElementType
  tone: 'creative' | 'caution'
}) {
  const isCreative = tone === 'creative'
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        isCreative
          ? 'border-primary/15 bg-primary/[0.05]'
          : 'border-rose-500/15 bg-rose-500/[0.04]',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={iconClassName({ tone: isCreative ? 'primary' : 'destructive', size: 'sm', active: true })} strokeWidth={2.25} aria-hidden />
        <span
          className={cn(
            'font-sans text-[10px] font-bold uppercase tracking-wider',
            isCreative ? 'text-primary' : 'text-rose-700',
          )}
        >
          {title}
        </span>
      </div>
      <p className="font-sans text-[12px] font-medium leading-relaxed text-foreground/85">{body}</p>
    </div>
  )
}

function ChannelSetupGuide({ setup, colors }: { setup: string; colors: ReturnType<typeof getChannelColors> }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: colors.softBorder, background: colors.cardBg }}
    >
      <div className="flex items-center gap-2.5 border-b border-border-subtle/40 px-4 py-3">
        <Zap className={iconClassName({ tone: 'amber', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
        <div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-foreground">
            Setup guide
          </span>
          <p className="font-sans text-[11px] text-muted-foreground">Platform & launch checklist</p>
        </div>
      </div>

      {revealed ? (
        <div className="px-4 py-3">
          <p className="font-sans text-[12px] font-medium leading-relaxed text-foreground/85">{setup}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group block w-full px-4 py-3 text-left transition-colors hover:bg-muted/20"
        >
          <span className="relative block overflow-hidden rounded-lg border-0 bg-muted/25 px-4 py-5">
            <span
              aria-hidden
              className="pointer-events-none block select-none font-sans text-[12px] leading-relaxed text-muted-foreground blur-[5px]"
            >
              {setup}
            </span>
            <span className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
              <span className="rounded-md border border-border-subtle bg-card px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                Reveal spoiler
              </span>
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

function ChannelAccordionItem({
  channel,
  index,
  formatMoney,
}: {
  channel: MarketingChannel
  index: number
  formatMoney: (n: number) => string
}) {
  const colors = getChannelColors(index)
  const priority = channel.priority ? PRIORITY_CONFIG[channel.priority] : null
  const success = channel.success_rate ? SUCCESS_CONFIG[channel.success_rate] : null
  const Icon = getMarketingChannelIcon(channel)
  const budgetLabel = formatChannelBudget(channel.budget_usd ?? 0, formatMoney)
  const successTone =
    success?.variant === 'success'
      ? 'success'
      : success?.variant === 'warning'
        ? 'warning'
        : success?.variant === 'danger'
          ? 'danger'
          : 'default'

  return (
    <Card
      padding="sm"
      radius="lg"
      className="w-full overflow-hidden"
      topSlot={
        <div className={cn(opportunityCardTopSlotRowClass, 'flex-wrap gap-y-2')}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
            style={{ background: colors.solid }}
          >
            <Icon className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
          </div>
          <span className={cn(opportunityCardTopSlotTitleClass, 'min-w-0 flex-1')}>
            {channel.name}
          </span>
          {priority ? (
            <MetricBadge
              variant={
                priority.variant === 'primary'
                  ? 'primary'
                  : priority.variant === 'warning'
                    ? 'warning'
                    : 'default'
              }
              size="sm"
            >
              {priority.label}
            </MetricBadge>
          ) : null}
          <div className="ml-auto shrink-0 text-right">
            <p
              className="font-sans text-sm font-black tabular-nums tracking-tight"
              style={{ color: channel.budget_usd > 0 ? colors.text : undefined }}
            >
              {budgetLabel.replace('/mo', '')}
            </p>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {channel.budget_usd > 0 ? 'per month' : 'no spend'}
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
              {success ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-sans text-[10px] font-bold',
                    success.variant === 'success'
                      ? 'border-success/20 bg-success/10 text-success'
                      : success.variant === 'warning'
                        ? 'border-warning/20 bg-warning/10 text-warning'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-600',
                  )}
                >
                  <success.icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  {success.label} success
                </span>
              ) : null}
              {channel.timeline ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-muted/30 px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  {channel.timeline}
                </span>
              ) : null}
              {channel.tactics?.length ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-muted/30 px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                  <ListChecks className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                    {channel.tactics.length} tactics
                </span>
              ) : null}
            </div>

      <div className="mt-3 space-y-5 border-t border-border-subtle/60 pt-5">
        <p className="font-sans text-[14px] font-medium leading-relaxed text-foreground/90">
          {channel.rationale}
        </p>

        {(success || channel.kpi || channel.timeline) && (
          <div className="grid gap-2 sm:grid-cols-3">
            {success ? (
              <ChannelMetaTile
                label="Success likelihood"
                value={success.label}
                icon={success.icon}
                tone={successTone}
              />
            ) : null}
            {channel.kpi ? (
              <ChannelMetaTile label="Primary KPI" value={channel.kpi} icon={Activity} />
            ) : null}
            {channel.timeline ? (
              <ChannelMetaTile label="Timeline" value={channel.timeline} icon={Calendar} />
            ) : null}
          </div>
        )}

        {channel.tactics?.length ? (
          <ChannelTacticsList tactics={channel.tactics} colors={colors} />
        ) : null}

        <ChannelDosDonts dos={channel.dos} donts={channel.donts} />

        {(channel.ad_creative_idea || channel.failure_mode) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {channel.ad_creative_idea ? (
              <ChannelInsightPanel
                title="Ad creative idea"
                body={channel.ad_creative_idea}
                icon={LightbulbIcon}
                tone="creative"
              />
            ) : null}
            {channel.failure_mode ? (
              <ChannelInsightPanel
                title="Common failure"
                body={channel.failure_mode}
                icon={ShieldAlert}
                tone="caution"
              />
            ) : null}
          </div>
        )}

        {channel.platform_setup ? (
          <ChannelSetupGuide setup={channel.platform_setup} colors={colors} />
        ) : null}
      </div>
    </Card>
  )
}

function MarketingChannelsSection({
  channels,
  formatMoney,
}: {
  channels: MarketingChannel[]
  formatMoney: (n: number) => string
}) {
  const groups = useMemo(() => groupChannelsByPriority(channels), [channels])

  return (
    <div className="flex flex-col gap-6">
      <ChannelPortfolioSummary channels={channels} formatMoney={formatMoney} />

      {groups.map((group) => {
        const groupTotal = channelBudgetTotal(group.items.map(({ channel }) => channel))
        const GroupIcon = PRIORITY_GROUP_ICONS[group.priority]
        const groupColorIndex =
          group.priority === 'primary' ? 0 : group.priority === 'secondary' ? 1 : 2
        const groupColors = getChannelColors(groupColorIndex)

        return (
          <div key={group.priority} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <GroupIcon className={iconClassName({ tone: iconToneForIndex(groupColorIndex), size: 'md', active: true })} strokeWidth={2.25} aria-hidden />
                <div className="min-w-0">
                  <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-foreground/90">
                    {group.label}
                  </h4>
                  <p className="font-sans text-[11px] text-muted-foreground">{group.hint}</p>
                </div>
              </div>
              <span className="font-sans text-[11px] font-semibold tabular-nums text-muted-foreground">
                {groupTotal > 0
                  ? `${formatMoney(groupTotal)}/mo`
                  : `${group.items.length} free`}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {group.items.map(({ channel, index }) => (
                <ChannelAccordionItem
                  key={`channel-${index}`}
                  channel={channel}
                  index={index}
                  formatMoney={formatMoney}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Guerrilla Play ──────────────────────────────────────────────

function GuerrillaPlaySection({ 
  play 
}: { 
  play: NonNullable<MarketingStrategy['guerrilla_play']> 
}) {
  return (
    <GlassCard
      glow={true}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={cn(opportunityCardTopSlotIconClass, opportunityCardTopSlotTone.warning.icon)}>
            <Flame aria-hidden />
          </span>
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              'text-lg font-medium',
              opportunityCardTopSlotTone.warning.title,
            )}
          >
            Guerrilla Play
          </span>
        </div>
      }
      topSlotClassName={opportunityCardTopSlotTone.warning.band}
    >
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex justify-end">
            <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-warning/10 text-warning border-warning/20">
              Zero / Low Budget
            </span>
          </div>
          <p className="font-sans text-[15px] font-semibold text-foreground leading-relaxed">
            {play.idea}
          </p>
          <p className="font-sans text-[13px] font-medium text-muted-foreground/80 leading-relaxed">
            {play.execution}
          </p>

          {play.expected_impact ? (
            <div className="rounded-xl border-0 bg-success/[0.04] px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" strokeWidth={2.5} />
                <span className="font-sans text-[10px] font-black uppercase tracking-wider text-success">
                  Expected Impact
                </span>
              </div>
              <p className="font-sans text-[12px] font-medium text-muted-foreground/80 leading-relaxed">
                {play.expected_impact}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Launch Sequence ─────────────────────────────────────────────

function LaunchSequenceSection({ 
  sequence 
}: { 
  sequence: NonNullable<MarketingStrategy['launch_sequence']> 
}) {
  const variant = useMarketingStrategyVariant()
  return (
    <GlassCard
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <span className={cn(opportunityCardTopSlotIconClass, opportunityCardTopSlotTone.primary.icon)}>
            <Rocket aria-hidden />
          </span>
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              'text-lg font-medium',
              opportunityCardTopSlotTone.primary.title,
            )}
          >
            Launch Sequence
          </span>
        </div>
      }
      topSlotClassName={opportunityCardTopSlotTone.primary.band}
    >
      <div className={variant === 'flat' ? undefined : 'p-6'}>
        <div className={cn(variant !== 'flat' && 'relative space-y-0')}>
          {variant !== 'flat' ? (
            <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-primary/15" />
          ) : null}

          {sequence.map((step, i) => {
            const colors = getChannelColors(i)

            return (
              <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
                <div 
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 shadow-sm',
                    variant === 'flat'
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-card',
                  )}
                  style={variant === 'flat' ? undefined : { 
                    background: colors.mutedBg,
                    borderColor: colors.solid,
                  }}
                >
                  <span 
                    className={cn(
                      'font-sans text-xs font-black',
                      variant === 'flat' && 'text-primary',
                    )}
                    style={variant === 'flat' ? undefined : { color: colors.text }}
                  >
                    {i + 1}
                  </span>
                </div>

                <div className="flex flex-col gap-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className={cn(
                        'font-sans text-[11px] font-black uppercase tracking-wider',
                        variant === 'flat' && 'text-primary',
                      )}
                      style={variant === 'flat' ? undefined : { color: colors.text }}
                    >
                      {step.week}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-sans text-[11px] font-bold text-muted-foreground">
                      {step.goal}
                    </span>
                  </div>
                  <p className="font-sans text-[13px] font-semibold text-foreground leading-relaxed">
                    {step.action}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Retention & Referral ────────────────────────────────────────

function RetentionReferralSection({ 
  retention, 
  referral 
}: { 
  retention?: string
  referral?: string 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {retention ? (
        <GlassCard
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <span className={cn(opportunityCardTopSlotIconClass, opportunityCardTopSlotTone.success.icon)}>
                <Repeat aria-hidden />
              </span>
              <span
                className={cn(
                  opportunityCardTopSlotTitleClass,
                  'text-sm font-bold',
                  opportunityCardTopSlotTone.success.title,
                )}
              >
                Retention
              </span>
            </div>
          }
          topSlotClassName={opportunityCardTopSlotTone.success.band}
        >
          <div className="p-5">
            <p className="font-sans text-[13px] font-medium leading-relaxed text-muted-foreground/80">
              {retention}
            </p>
          </div>
        </GlassCard>
      ) : null}

      {referral ? (
        <GlassCard
          topSlot={
            <div className={opportunityCardTopSlotRowClass}>
              <span className={cn(opportunityCardTopSlotIconClass, 'bg-muted/70 text-muted-foreground')}>
                <Handshake aria-hidden />
              </span>
              <span className={cn(opportunityCardTopSlotTitleClass, 'text-sm font-bold')}>Referral Mechanic</span>
            </div>
          }
        >
          <div className="p-5">
            <p className="font-sans text-[13px] font-medium leading-relaxed text-muted-foreground/80">
              {referral}
            </p>
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function MarketingStrategySection({
  strategy,
  variant = 'default',
  isMobile = false,
  isProLocked = false,
}: {
  strategy: MarketingStrategy
  /** Flatter panels without accent lines — used on user research detail. */
  variant?: 'default' | 'flat'
  isMobile?: boolean
  isProLocked?: boolean
}) {
  const { formatMoney } = useCurrency()
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    ['marketing_strategy', 'marketing_channels'],
    'marketing-strategy',
    {
      marketing_strategy: 'marketing-strategy',
      marketing_channels: 'marketing-channels',
    },
  )
  if (!strategy) return null

  const socialAngles = strategy.social_proof_angles ?? []
  const psychologyLevers = strategy.psychology_levers ?? []
  const hasSocialProof = socialAngles.length > 0
  const hasPsychology = psychologyLevers.length > 0
  const hasBudgetMilestones = Boolean(
    strategy.budget_milestones && budgetMilestonesHasData(strategy.budget_milestones),
  )
  const channels = strategy.channels ?? []
  const hasChannels = channels.length > 0
  const channelsMonthlyTotal = channelBudgetTotal(channels)
  const primaryChannelCount = channels.filter((c) => c.priority === 'primary').length
  const strategyBody = (
    <div className="relative flex flex-col gap-6">
      <StrategyOverview strategy={strategy} formatMoney={formatMoney} />

      {hasSocialProof || hasPsychology || hasBudgetMilestones ? (
        <div className="w-full space-y-3">
          {hasSocialProof ? (
            <MarketingSubsectionShell
              title="Social proof angles"
              icon={Users}
              count={socialAngles.length}
            >
              <SocialProofSection angles={socialAngles} />
            </MarketingSubsectionShell>
          ) : null}

          {hasPsychology ? (
            <MarketingSubsectionShell
              title="Psychology levers"
              icon={Zap}
              count={psychologyLevers.length}
            >
              <PsychologyLeversSection levers={psychologyLevers} />
            </MarketingSubsectionShell>
          ) : null}

          {hasBudgetMilestones ? (
            <MarketingSubsectionShell
              title="Budget milestones"
              icon={Calendar}
              count={MILESTONE_KEYS.filter(({ key }) => strategy.budget_milestones![key]).length}
            >
              <BudgetMilestonesSection
                milestones={strategy.budget_milestones!}
                formatMoney={formatMoney}
              />
            </MarketingSubsectionShell>
          ) : null}
        </div>
      ) : null}

      {strategy.guerrilla_play?.idea ? <GuerrillaPlaySection play={strategy.guerrilla_play} /> : null}

      {strategy.launch_sequence?.length ? (
        <LaunchSequenceSection sequence={strategy.launch_sequence} />
      ) : null}

      {(strategy.retention_strategy || strategy.referral_mechanic) ? (
        <RetentionReferralSection
          retention={strategy.retention_strategy}
          referral={strategy.referral_mechanic}
        />
      ) : null}
    </div>
  )

  return (
    <MarketingStrategyVariantContext.Provider value={variant}>
       <section id="od-marketing" className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}>
         <div className="w-full">

          <OpportunityDetailSectionShell
            itemValue="marketing-strategy"
            accordionValue={accordionValue}
            onAccordionValueChange={onAccordionValueChange}
            header={
              <OpportunityAccordionHeaderRow
                icon={Megaphone}
                title={<OpportunityTermLabel term="marketing_strategy" label="Marketing strategy" />}
              />
            }
          >
            {strategyBody}
          </OpportunityDetailSectionShell>

          {hasChannels ? (
            <OpportunityDetailSectionShell
              id="od-marketing-channels"
              itemValue="marketing-channels"
              accordionValue={isProLocked ? 'marketing-channels' : accordionValue}
              onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
              header={
                <OpportunityAccordionHeaderRow
                  icon={Layers}
                  title="Marketing channels"
                />
              }
              description={`${channels.length} channels · ${primaryChannelCount} primary`}
              contentMeta={
                <>
                  <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
                    {channelsMonthlyTotal > 0 ? formatMoney(channelsMonthlyTotal) : 'Free'}
                  </span>
                  {channelsMonthlyTotal > 0 ? (
                    <span className={opportunityAccordionDescriptionClass}>/mo</span>
                  ) : null}
                </>
              }
            >
              <OpportunityProLock locked={isProLocked} minHeightClassName="min-h-[14rem]">
                <MarketingChannelsSection channels={channels} formatMoney={formatMoney} />
              </OpportunityProLock>
            </OpportunityDetailSectionShell>
          ) : null}
        </div>
      </section>
    </MarketingStrategyVariantContext.Provider>
  )
}
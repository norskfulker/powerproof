import type { ElementType } from 'react'
import {
  ArrowLeft,
  Check,
  Crosshair,
  MapPin,
  ShieldAlert,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from '@/lib/icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { useByok } from '@/hooks/useByok'
import { BYOK_SUBMIT_HINT } from '@/lib/byok'
import type { BriefingResult } from '@/lib/playbookTypes'
import { DEFAULT_COUNTRY_NAME } from '@/lib/countries'
import { cn } from '@/lib/utils'

export interface BattlefieldBriefingProps {
  briefing: BriefingResult
  modelLabel: string
  /** Raw model id for chip display — preferred over plain `modelLabel`. */
  modelUsed?: string | null
  deployCreditsRequired: number
  scoutCreditsSpent: number
  onDeploy: () => void
  onBack: () => void
  isGenerating: boolean
  compact?: boolean
}

const WAR_ROOM_DEPLOY_CLASS =
  '!rounded-xl !border-[hsl(var(--destructive))] !bg-[hsl(var(--destructive))] text-white hover:!bg-[hsl(var(--destructive))]/90 dark:!border-[hsl(var(--destructive))] dark:!bg-[hsl(var(--destructive))] dark:hover:!bg-[hsl(var(--destructive))]/90'

const BATTLEFIELD_SUMMARY_FALLBACKS = [
  'Intel gathering failed.',
  'Intel gathering failed. Proceeding with founder description.',
] as const

const MARKET_GAP_FALLBACKS = [
  'Could not auto-research.',
  'Could not auto-research. Playbook will use description only.',
] as const

function isUsableBattlefieldSummary(value: string | null | undefined): value is string {
  const trimmed = value?.trim()
  if (!trimmed) return false
  if (trimmed.includes('Intel gathering failed') || trimmed.includes('gathering failed')) {
    return false
  }
  return !BATTLEFIELD_SUMMARY_FALLBACKS.some((fallback) => trimmed === fallback)
}

function isUsableMarketGap(value: string | null | undefined): value is string {
  const trimmed = value?.trim()
  if (!trimmed) return false
  if (trimmed.includes('Could not auto-research')) return false
  return !MARKET_GAP_FALLBACKS.some((fallback) => trimmed === fallback)
}

function intelGatheringFailed(briefing: BriefingResult): boolean {
  const summary = briefing.battlefield_summary?.trim() ?? ''
  if (
    !summary ||
    summary.includes('Intel gathering failed') ||
    summary.includes('gathering failed')
  ) {
    return true
  }
  const namedCompetitors = briefing.competitors?.filter((c) => c.name?.trim()) ?? []
  return namedCompetitors.length === 0
}

/** Show city/region only when it adds detail beyond the canonical market country. */
function displayLocation(location: string | null | undefined, marketCountry: string): string | null {
  const loc = location?.trim()
  const market = marketCountry.trim()
  if (!loc) return null
  if (!market) return loc
  if (loc.toLowerCase() === market.toLowerCase()) return null
  return loc
}

function stageLabel(stage: string): string {
  const s = stage.trim().toLowerCase()
  if (s === 'idea') return 'Idea'
  if (s === 'early') return 'Early traction'
  if (s === 'growth') return 'Growth'
  if (s === 'scaling') return 'Scaling'
  if (s === 'active') return 'Active'
  return stage
}

function WarRoomProgress() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant="green" size="sm" className="shrink-0 gap-1">
        <Check className="h-3 w-3" aria-hidden />
        Scout complete
      </Badge>
      <span className="h-px min-w-[12px] flex-1 bg-gradient-to-r from-[hsl(var(--semantic-positive))]/40 to-[hsl(var(--destructive))]/40" />
      <Badge variant="red" size="sm" className="shrink-0">
        Deploy playbook
      </Badge>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ElementType
  label: string
  value: string | null
  tone?: 'neutral' | 'green' | 'red' | 'amber'
}) {
  if (!value?.trim()) return null
  const toneClass =
    tone === 'green'
      ? 'border-[hsl(var(--semantic-positive))]/20 bg-[hsl(var(--semantic-positive))]/[0.05]'
      : tone === 'red'
        ? 'border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/[0.05]'
        : tone === 'amber'
          ? 'border-[hsl(var(--saffron-500))]/20 bg-[hsl(var(--badge-trending-bg))]'
          : 'border-border-subtle/60 bg-background/80'

  return (
    <div className={cn('rounded-xl border px-3 py-2.5', toneClass)}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} aria-hidden />
        <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="font-sans text-[12px] font-semibold leading-snug text-foreground">{value}</p>
    </div>
  )
}

function CompetitorCard({
  name,
  strength,
  weakness,
}: {
  name: string
  strength: string
  weakness: string
}) {
  const strengthText = strength?.trim()
  const weaknessText = weakness?.trim()

  return (
    <div className="min-w-[220px] shrink-0 rounded-xl border border-border-subtle/70 bg-card p-3.5 layout-sm:min-w-0 layout-sm:shrink">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="m-0 font-sans text-[13px] font-bold leading-snug text-foreground">{name}</h4>
        <Badge variant="red" size="xs">
          Rival
        </Badge>
      </div>
      <div className="space-y-2.5">
        {strengthText ? (
          <div>
            <p className="mb-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--destructive))]">
              Their strength
            </p>
            <p className="font-sans text-[11px] leading-relaxed text-foreground/85">{strengthText}</p>
          </div>
        ) : null}
        {weaknessText ? (
          <div className="rounded-lg border border-[hsl(var(--semantic-positive))]/20 bg-[hsl(var(--semantic-positive))]/[0.04] px-2.5 py-2">
            <p className="mb-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--semantic-positive))]">
              Your exploit
            </p>
            <p className="font-sans text-[11px] leading-relaxed text-foreground/90">{weaknessText}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InsightBlock({
  title,
  icon: Icon,
  children,
  tone,
}: {
  title: string
  icon: ElementType
  children: string
  tone: 'green' | 'amber' | 'red'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-[hsl(var(--semantic-positive))]/25 bg-[hsl(var(--semantic-positive))]/[0.04]'
      : tone === 'amber'
        ? 'border-[hsl(var(--saffron-500))]/25 bg-[hsl(var(--badge-trending-bg))]'
        : 'border-[hsl(var(--destructive))]/25 bg-[hsl(var(--destructive))]/[0.04]'

  return (
    <div className={cn('rounded-xl border px-3.5 py-3', toneClass)}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} aria-hidden />
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <p className="font-sans text-[12px] leading-relaxed text-foreground/90">{children}</p>
    </div>
  )
}

function GroundTruthList({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (!items.length) return null
  return (
    <div className="rounded-xl border border-[hsl(var(--saffron-500))]/25 bg-[hsl(var(--badge-trending-bg))] px-3.5 py-3">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--saffron-600))] dark:text-[hsl(var(--saffron-400))]">
        {title}
      </p>
      <ul className="m-0 list-disc space-y-1.5 pl-4">
        {items.map((item, idx) => (
          <li key={`${idx}-${item.slice(0, 24)}`} className="font-sans text-[12px] leading-relaxed text-foreground/90">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BattlefieldBriefing({
  briefing,
  modelLabel,
  modelUsed,
  onDeploy,
  onBack,
  isGenerating,
  compact = false,
}: BattlefieldBriefingProps) {
  const isByokActive = useByok()
  const marketCountry = DEFAULT_COUNTRY_NAME
  const competitors = briefing.competitors?.filter((c) => c.name?.trim()) ?? []
  const battlefieldSummary = isUsableBattlefieldSummary(briefing.battlefield_summary)
    ? briefing.battlefield_summary!.trim()
    : null
  const marketGap = isUsableMarketGap(briefing.market_gap) ? briefing.market_gap!.trim() : null
  const locationLabel = displayLocation(briefing.location, marketCountry)
  const intelFailed = intelGatheringFailed(briefing)
  const hasDeepIntel = Boolean(
    briefing.asymmetric_advantage?.trim() || marketGap || briefing.recent_threats?.trim(),
  )
  const topFailureModes = Array.isArray(briefing.top_failure_modes)
    ? briefing.top_failure_modes.map((m) => String(m ?? '').trim()).filter(Boolean)
    : []
  const hasOperationalGroundTruth = Boolean(
    briefing.regulatory_reality?.trim() ||
      briefing.cost_to_first_revenue?.trim() ||
      briefing.customer_acquisition_reality?.trim() ||
      topFailureModes.length > 0 ||
      briefing.hidden_gatekeepers?.trim() ||
      briefing.whats_working_now?.trim(),
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[hsl(var(--destructive))]/20 bg-gradient-to-b from-[hsl(var(--destructive))]/[0.04] via-card to-card',
        compact ? 'shadow-sm' : 'shadow-[0_12px_40px_-20px_hsl(var(--destructive)/0.35)]',
      )}
    >
      <div className={cn('flex flex-col', compact ? 'gap-3 p-3.5 layout-sm:p-4' : 'gap-4 p-4 layout-sm:p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <WarRoomProgress />
            <div>
              <h2
                className={cn(
                  'font-display font-bold tracking-tight text-foreground',
                  compact ? 'text-lg' : 'text-xl layout-sm:text-2xl',
                )}
              >
                Battlefield briefing
              </h2>
              <p className="mt-1 font-sans text-[12px] leading-relaxed text-muted-foreground layout-sm:text-[13px]">
                Recon is complete. Review intel, then deploy your tactical playbook.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {briefing.business_type?.trim() ? (
                <Badge variant="gray" size="sm">
                  {briefing.business_type.trim()}
                </Badge>
              ) : null}
              {briefing.stage?.trim() ? (
                <Badge variant="orange" size="sm">
                  {stageLabel(briefing.stage)}
                </Badge>
              ) : null}
              {marketCountry ? (
                <Badge variant="gray" size="sm">
                  {marketCountry}
                </Badge>
              ) : null}
              {locationLabel ? (
                <Badge variant="gray" size="sm">
                  <MapPin className="mr-0.5 inline h-3 w-3" aria-hidden />
                  {locationLabel}
                </Badge>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-3.5 w-3.5" aria-hidden />}
            onClick={onBack}
            disabled={isGenerating}
            className="shrink-0"
          >
            Edit
          </Button>
        </div>

        {intelFailed ? (
          <div className="rounded-xl border border-[hsl(var(--saffron-500))]/25 bg-[hsl(var(--badge-trending-bg))] px-3.5 py-3 layout-sm:px-4 layout-sm:py-3.5">
            <p className="font-sans text-[12px] leading-relaxed text-muted-foreground layout-sm:text-[13px]">
              Live intel unavailable for this session. Your playbook will be built from your
              description.
            </p>
          </div>
        ) : null}

        {battlefieldSummary ? (
          <div className="rounded-xl border border-[hsl(var(--destructive))]/15 bg-background/70 px-3.5 py-3 layout-sm:px-4 layout-sm:py-3.5">
            <p className="font-sans text-[14px] font-medium leading-relaxed text-foreground text-pretty layout-sm:text-[15px]">
              {battlefieldSummary}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 layout-sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Market size" value={briefing.market_size} />
          <StatTile icon={Target} label="Goal" value={briefing.primary_goal} tone="green" />
          <StatTile icon={ShieldAlert} label="Threat" value={briefing.main_threat} tone="red" />
        </div>

        {competitors.length > 0 ? (
          <div className="space-y-2">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Enemy positions · {competitors.length}
            </p>
            <div
              className={cn(
                'flex gap-2.5 overflow-x-auto pb-0.5 layout-sm:grid layout-sm:grid-cols-2 layout-sm:overflow-visible',
                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              )}
            >
              {competitors.map((c) => (
                <CompetitorCard
                  key={c.name}
                  name={c.name}
                  strength={c.strength}
                  weakness={c.weakness}
                />
              ))}
            </div>
          </div>
        ) : null}

        {hasDeepIntel ? (
          <Accordion type="single" collapsible defaultValue="deep-intel" className="gap-0">
            <AccordionItem value="deep-intel" className="border-border-subtle/60">
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline layout-sm:px-4">
                <span className="font-sans text-[12px] font-bold text-foreground">
                  Strategic intel
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 px-3 pb-3 layout-sm:px-4 layout-sm:pb-4">
                {briefing.asymmetric_advantage ? (
                  <InsightBlock title="Asymmetric edge" icon={Target} tone="green">
                    {briefing.asymmetric_advantage}
                  </InsightBlock>
                ) : null}
                {marketGap ? (
                  <InsightBlock title="Market gap" icon={Zap} tone="amber">
                    {marketGap}
                  </InsightBlock>
                ) : null}
                {briefing.recent_threats ? (
                  <InsightBlock title="Enemy moves" icon={ShieldAlert} tone="red">
                    {briefing.recent_threats}
                  </InsightBlock>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        {hasOperationalGroundTruth ? (
          <Accordion type="single" collapsible defaultValue="operational-ground-truth" className="gap-0">
            <AccordionItem value="operational-ground-truth" className="border-border-subtle/60">
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline layout-sm:px-4">
                <span className="font-sans text-[12px] font-bold text-foreground">
                  Operational Ground Truth
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 px-3 pb-3 layout-sm:px-4 layout-sm:pb-4">
                {briefing.regulatory_reality?.trim() ? (
                  <InsightBlock title="Regulatory Reality" icon={ShieldAlert} tone="amber">
                    {briefing.regulatory_reality}
                  </InsightBlock>
                ) : null}
                {briefing.cost_to_first_revenue?.trim() ? (
                  <InsightBlock title="Real Cost to First Revenue" icon={Target} tone="amber">
                    {briefing.cost_to_first_revenue}
                  </InsightBlock>
                ) : null}
                {briefing.customer_acquisition_reality?.trim() ? (
                  <InsightBlock title="Getting Your First Customers" icon={TrendingUp} tone="amber">
                    {briefing.customer_acquisition_reality}
                  </InsightBlock>
                ) : null}
                <GroundTruthList title="Why Businesses Like This Fail" items={topFailureModes} />
                {briefing.hidden_gatekeepers?.trim() ? (
                  <InsightBlock title="Hidden Gatekeepers" icon={ShieldAlert} tone="red">
                    {briefing.hidden_gatekeepers}
                  </InsightBlock>
                ) : null}
                {briefing.whats_working_now?.trim() ? (
                  <InsightBlock title="What's Actually Working Right Now" icon={Zap} tone="green">
                    {briefing.whats_working_now}
                  </InsightBlock>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-border-subtle/50 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="lg"
              loading={isGenerating}
              disabled={isGenerating}
              iconRight={<Swords className="h-4 w-4" aria-hidden />}
              className={cn(WAR_ROOM_DEPLOY_CLASS, 'min-w-[200px] flex-1 layout-sm:flex-none')}
              onClick={onDeploy}
            >
              Generate playbook
            </Button>
            {modelLabel || modelUsed ? (
              <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-1">
                <AiModelDisplay modelUsed={modelUsed} label={modelLabel} />
                {isByokActive ? (
                  <span className="text-[11px] text-muted-foreground">· {BYOK_SUBMIT_HINT}</span>
                ) : null}
              </span>
            ) : null}
          </div>
          {isByokActive ? (
            <span className="font-sans text-[11px] text-muted-foreground">{BYOK_SUBMIT_HINT}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

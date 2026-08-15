import { useMemo, type ReactNode } from 'react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { iconClassName } from '@/lib/iconClassNames'
import {
  opportunityCardTopSlotMetaClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

import {
  Users,
  UserCheck,
  Clock as UserClock,
  UserCog,
  AlertCircle,
  Sparkles,
} from '@/lib/icons'

interface HeadcountBreakdown {
  role: string
  count: number
  type: string
}

interface Headcount {
  min?: number
  max?: number
  total?: number
  breakdown: HeadcountBreakdown[]
}

interface Props {
  headcount?: Headcount | null
  isMobile?: boolean
}

function finiteNonNegativeNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'string' ? Number(v.trim()) : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const TYPE_CONFIG: Record<
  string,
  {
    label: string
    variant: 'primary' | 'warning' | 'default'
    icon: React.ElementType
  }
> = {
  full_time: { label: 'Full-time', variant: 'primary', icon: UserCheck },
  part_time: { label: 'Part-time', variant: 'warning', icon: UserClock },
  contract: { label: 'Contract', variant: 'default', icon: UserCog },
  skilled: { label: 'Skilled', variant: 'primary', icon: UserCheck },
  unskilled: { label: 'Unskilled', variant: 'default', icon: UserCog },
  admin: { label: 'Admin', variant: 'warning', icon: UserClock },
}

const ROLE_PALETTE = [
  { hue: 227 },
  { hue: 262 },
  { hue: 152 },
  { hue: 32 },
  { hue: 199 },
  { hue: 340 },
  { hue: 174 },
  { hue: 280 },
] as const

function getRoleColors(index: number) {
  const { hue } = ROLE_PALETTE[index % ROLE_PALETTE.length]
  return {
    hue,
    solid: `hsl(${hue}, 85%, 58%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    text: `hsl(${hue}, 80%, 45%)`,
  }
}

function formatTypeLabel(type: string) {
  return TYPE_CONFIG[type]?.label ?? type.replace(/_/g, ' ')
}

function MetricBadge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
}) {
  const variants = {
    default: 'bg-muted/60 text-muted-foreground border-border-subtle/50',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
        variants[variant],
      )}
    >
      {children}
    </span>
  )
}

function TeamCompositionBar({
  breakdown,
  totalHeadcount,
}: {
  breakdown: HeadcountBreakdown[]
  totalHeadcount: number
}) {
  if (totalHeadcount <= 0) return null

  return (
    <div className="space-y-3">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        {breakdown.map((person, i) => {
          const colors = getRoleColors(i)
          const pct = (person.count / totalHeadcount) * 100
          const left = breakdown
            .slice(0, i)
            .reduce((sum, row) => sum + (row.count / totalHeadcount) * 100, 0)

          return (
            <div
              key={`${person.role}-${i}`}
              className="absolute inset-y-0 transition-all duration-500 ease-out"
              style={{
                left: `${left}%`,
                width: `${pct}%`,
                background: colors.solid,
              }}
              title={`${person.role} · ${person.count} (${Math.round(pct)}%)`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {breakdown.map((person, i) => {
          const colors = getRoleColors(i)
          const pct = Math.round((person.count / totalHeadcount) * 100)
          return (
            <span
              key={`legend-${person.role}-${i}`}
              className="inline-flex max-w-[200px] items-center gap-1.5 font-sans text-[10px] text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: colors.solid }}
                aria-hidden
              />
              <span className="truncate">{person.role}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground/70">{pct}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function RoleRow({
  person,
  index,
  totalHeadcount,
}: {
  person: HeadcountBreakdown
  index: number
  totalHeadcount: number
}) {
  const colors = getRoleColors(index)
  const typeConfig = TYPE_CONFIG[person.type] ?? TYPE_CONFIG.contract
  const TypeIcon = typeConfig.icon
  const pct = totalHeadcount > 0 ? Math.round((person.count / totalHeadcount) * 100) : 0
  const iconTone =
    typeConfig.variant === 'primary' ? 'primary' : typeConfig.variant === 'warning' ? 'amber' : 'muted'

  return (
    <li className="min-w-0 list-none">
      <Card
        padding="sm"
        radius="lg"
        className="h-full"
        topSlot={
          <div className={opportunityCardTopSlotRowClass}>
            <TypeIcon
              className={iconClassName({ tone: iconTone, size: 'sm', active: true })}
              strokeWidth={2.5}
              aria-hidden
            />
            <span
              className={cn(
                opportunityCardTopSlotTitleClass,
                opportunityCardTopSlotTone.default.title,
                'min-w-0 flex-1',
              )}
            >
              {person.role}
            </span>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {pct > 0 ? (
            <span className={opportunityCardTopSlotMetaClass} style={{ color: colors.text }}>
              {pct}%
            </span>
          ) : null}
          <span
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-sans text-[12px] font-black tabular-nums text-white"
            style={{ background: colors.solid }}
          >
            {person.count}
          </span>
          <MetricBadge variant={typeConfig.variant}>
            <span className="flex items-center gap-1">
              <TypeIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              {typeConfig.label}
            </span>
          </MetricBadge>
        </div>
      </Card>
    </li>
  )
}

function useHeadcountMetrics(headcount: Headcount | null | undefined) {
  const totalFromBreakdown = useMemo(() => {
    return Array.isArray(headcount?.breakdown)
      ? headcount!.breakdown.reduce(
          (sum, person) => sum + (finiteNonNegativeNumber(person.count) ?? 0),
          0,
        )
      : 0
  }, [headcount])

  const finiteTotalField = finiteNonNegativeNumber(headcount?.total)
  const minN = finiteNonNegativeNumber(headcount?.min)
  const maxN = finiteNonNegativeNumber(headcount?.max)

  const totalHeadcount = useMemo(() => {
    if (finiteTotalField != null && finiteTotalField > 0) return finiteTotalField
    if (totalFromBreakdown > 0) return totalFromBreakdown
    if (maxN != null && maxN > 0) return maxN
    if (minN != null && minN > 0) return minN
    return 0
  }, [finiteTotalField, totalFromBreakdown, minN, maxN])

  const summaryLabel = useMemo(() => {
    if (minN != null && maxN != null) {
      return minN === maxN ? String(minN) : `${minN}–${maxN}`
    }
    return totalHeadcount > 0 ? String(totalHeadcount) : '—'
  }, [minN, maxN, totalHeadcount])

  const employmentMix = useMemo(() => {
    if (!headcount?.breakdown?.length) return []
    const counts = new Map<string, number>()
    for (const row of headcount.breakdown) {
      const key = personTypeKey(row.type)
      counts.set(key, (counts.get(key) ?? 0) + (finiteNonNegativeNumber(row.count) ?? 0))
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count, label: formatTypeLabel(type) }))
  }, [headcount])

  return {
    totalHeadcount,
    summaryLabel,
    minN,
    maxN,
    roleCount: headcount?.breakdown?.length ?? 0,
    hasBreakdown: (headcount?.breakdown?.length ?? 0) > 0,
    employmentMix,
  }
}

function personTypeKey(type: string) {
  const normalized = type.toLowerCase().trim()
  if (normalized.includes('part')) return 'part_time'
  if (normalized.includes('full')) return 'full_time'
  if (normalized.includes('contract')) return 'contract'
  return normalized || 'other'
}

function HeadcountSection({ headcount, isMobile = false }: Props) {
  const metrics = useHeadcountMetrics(headcount)
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'headcount',
    'team-required',
  )

  if (!headcount) {
    return (
      <section className={opportunitySectionWrapClass(isMobile)}>
        <div className={cn(opportunityDetailCardClass, "p-5")}>
          <div className="flex items-start gap-3 rounded-xl border-0 bg-muted/30 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={2} />
            <p className="font-sans text-[13px] font-medium leading-relaxed text-muted-foreground/70">
              Headcount details being researched. Typically 1–5 people depending on scale.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const { totalHeadcount, summaryLabel, roleCount, hasBreakdown, employmentMix } = metrics

  return (
    <OpportunityDetailSectionShell
      id="od-headcount"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="team-required"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={
        <OpportunityAccordionHeaderRow
          icon={Users}
          title={<OpportunityTermLabel term="team_required" label="Team required" />}
        />
      }
      description={
        summaryLabel !== '—'
          ? `${summaryLabel} people${roleCount > 0 ? ` · ${roleCount} ${roleCount === 1 ? 'role' : 'roles'}` : ''}`
          : `Staffing plan${roleCount > 0 ? ` · ${roleCount} ${roleCount === 1 ? 'role' : 'roles'}` : ''}`
      }
    >
            <div className="flex flex-col gap-5">
              {summaryLabel !== '—' || employmentMix.length > 0 ? (
                <Card
                  padding="sm"
                  radius="lg"
                  className={cn(opportunityDetailCardClass, 'overflow-hidden')}
                  topSlotStyle={opportunityCardTopSlotToneStyle.primary}
                  topSlot={
                    <div className={opportunityCardTopSlotRowClass}>
                      <Users
                        className={iconClassName({ tone: 'primary', size: 'sm', active: true })}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.primary.title)}>
                        Team overview
                      </span>
                    </div>
                  }
                >
                  <p className="font-sans text-2xl font-black tabular-nums tracking-tight text-foreground">
                    {summaryLabel}
                    <span className="ml-1 text-sm font-bold text-muted-foreground">people</span>
                  </p>
                  <p className="mt-1 font-sans text-[12px] text-muted-foreground">
                    {roleCount > 0
                      ? `${roleCount} defined ${roleCount === 1 ? 'role' : 'roles'}`
                      : 'People required to run this business'}
                    {employmentMix.length > 0
                      ? ` · ${employmentMix.map(({ count, label }) => `${count} ${label.toLowerCase()}`).join(' · ')}`
                      : ''}
                  </p>
                </Card>
              ) : null}

              {hasBreakdown && totalHeadcount > 0 ? (
                <div className="space-y-3">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Team composition
                  </p>
                  <TeamCompositionBar breakdown={headcount.breakdown} totalHeadcount={totalHeadcount} />
                </div>
              ) : null}

              {hasBreakdown ? (
                <div className="space-y-3">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Role breakdown
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {headcount.breakdown.map((person, i) => (
                      <RoleRow
                        key={`${person.role}-${i}`}
                        person={person}
                        index={i}
                        totalHeadcount={totalHeadcount}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex items-start gap-3 rounded-xl border-0 bg-muted/20 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={2} />
                <p className="font-sans text-[12px] font-medium leading-relaxed text-muted-foreground">
                  Salary costs are included in the OpEx estimate in the financial projections.
                </p>
              </div>
            </div>
    </OpportunityDetailSectionShell>
  )
}

export default HeadcountSection

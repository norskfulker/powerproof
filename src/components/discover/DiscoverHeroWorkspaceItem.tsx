import type { ReactNode } from 'react'
import type { RemixIcon } from '@/lib/icons'

import {
  metricsDesktopOnlyColClassName,
  useDiscoverHeroWorkspaceLayoutView,
  useDiscoverHeroWorkspaceMetricColumns,
} from '@/components/discover/DiscoverHeroBox'
import { EffortLevelMeter } from '@/components/discover/EffortLevelDashes'
import {
  DiscoverHeroMetricStrip,
  type DiscoverHeroWorkspaceMetric,
} from '@/components/discover/DiscoverHeroMetricStrip'
import {
  ResearchHeroCardHeader,
  researchHeroCardInProgressBadgeClassName,
  type RoomCardIconTone,
} from '@/components/research/researchHeroCardParts'
import { RoomHeroCard, RoomHeroCardBody, RoomHeroCardFooter } from '@/components/shared/RoomHeroCard'
import { cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import { normalizeEaseLevel } from '@/lib/opportunityLabels'
import { cn } from '@/lib/utils'

const metricValueClass: Record<NonNullable<DiscoverHeroWorkspaceMetric['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  muted: 'text-muted-foreground',
}

const stickToneClass = {
  primary: 'bg-primary',
  'in-progress': 'bg-[hsl(var(--saffron-600))] dark:bg-[hsl(var(--saffron-500))]',
  muted: 'bg-muted-foreground/35',
} as const

const inProgressShellClassName = cn(
  '!border-[hsl(var(--saffron-600))]/55 !bg-[hsl(var(--saffron-100))]',
  'dark:!border-[hsl(var(--saffron-500))]/50 dark:!bg-[hsl(var(--saffron-500))]/20',
)

const inProgressRowClassName = cn(
  '!bg-[hsl(var(--saffron-100))] hover:!bg-[hsl(var(--saffron-100))]',
  'dark:!bg-[hsl(var(--saffron-500))]/20 dark:hover:!bg-[hsl(var(--saffron-500))]/25',
)

export function DiscoverHeroWorkspaceItem({
  title,
  categorySlug,
  categoryIcon,
  leading,
  iconOverride,
  iconTone = 'primary',
  metrics,
  effort,
  topSlot,
  metaColumn,
  subtitle,
  highlight = null,
  onActivate,
  disabled = false,
  actions,
  progress,
  className,
  tourAttr,
}: {
  title: string
  categorySlug?: string | null
  categoryIcon?: string | null
  leading?: ReactNode
  iconOverride?: RemixIcon
  iconTone?: RoomCardIconTone
  metrics: readonly DiscoverHeroWorkspaceMetric[]
  /** Effort level (Easy / Medium / Hard) — dashes in the table column / card topSlot. */
  effort?: string | null
  /** Custom header band — overrides the effort topSlot when set. */
  topSlot?: ReactNode
  /** Custom meta column for table mode (Pages, searched date, …). */
  metaColumn?: ReactNode
  /** Muted line under the title in table mode. */
  subtitle?: string | null
  highlight?: 'in-progress' | null
  onActivate?: () => void
  disabled?: boolean
  actions?: ReactNode
  progress?: ReactNode
  className?: string
  tourAttr?: string
}) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const metricColumns = useDiscoverHeroWorkspaceMetricColumns()
  const inProgress = highlight === 'in-progress'
  const metricTrio = metrics.slice(0, 3)
  const effortLevel = normalizeEaseLevel(effort)
  const effortMeter = <EffortLevelMeter effort={effort} />
  const showMetaColumn = metricColumns.metaLabel != null || Boolean(metaColumn) || Boolean(effortLevel)
  const gridTopSlot =
    topSlot ??
    (effortLevel ? (
      <div className={cn(cardTopSlotRowClass, 'justify-between gap-2 layout-sm:gap-3')}>
        <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>Effort</span>
        <EffortLevelMeter effort={effort} size="md" />
      </div>
    ) : undefined)
  const tableMetaCell = metaColumn ?? (effortLevel ? effortMeter : null)
  const inProgressBadge = inProgress ? (
    <span className={researchHeroCardInProgressBadgeClassName} aria-label="In progress">
      In progress
    </span>
  ) : null

  if (layout === 'table') {
    return (
      <tr
        className={cn(
          'group relative border-b border-border-subtle last:border-b-0',
          'transition-colors hover:bg-muted/20',
          inProgress && inProgressRowClassName,
          onActivate && !disabled && 'cursor-pointer',
          disabled && 'opacity-60',
          className,
        )}
        onClick={disabled ? undefined : onActivate}
        data-tour={tourAttr}
      >
        <td className="relative max-w-0 min-w-0 py-3 pl-5 pr-3 align-middle layout-sm:pr-4">
          <span
            className={cn(
              'pointer-events-none absolute left-2 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full',
              stickToneClass[inProgress ? 'in-progress' : 'primary'],
            )}
            aria-hidden
          />
          <div className="min-w-0 overflow-hidden">
            <ResearchHeroCardHeader
              categorySlug={categorySlug}
              categoryIcon={categoryIcon}
              leading={leading}
              iconOverride={iconOverride}
              iconTone={inProgress ? 'amber' : iconTone}
              title={title}
              subtitle={subtitle}
              onTitleClick={disabled ? undefined : onActivate}
              titleDisabled={disabled}
              badge={inProgressBadge}
            />
          </div>
        </td>
        {metricTrio.map((metric, index) => (
          <td
            key={`${metric.label}-${index}`}
            className={cn(
              'max-w-0 min-w-0 px-2 py-3 align-middle layout-sm:px-3',
              index < 3 && metricsDesktopOnlyColClassName,
            )}
          >
            <p className="text-[10px] font-medium text-muted-foreground layout-sm:hidden">
              {metric.label}
            </p>
            <p
              className={cn(
                'truncate text-[13px] font-semibold tabular-nums',
                metricValueClass[metric.tone ?? 'default'],
              )}
              title={metric.value}
            >
              {metric.value || '—'}
            </p>
          </td>
        ))}
        {showMetaColumn ? (
          <td className="max-w-0 min-w-0 px-2 py-3 align-middle layout-sm:px-3">
            <div className="min-w-0 overflow-hidden">{tableMetaCell}</div>
          </td>
        ) : null}
        <td
          className="max-w-0 min-w-0 px-2 py-3 align-middle layout-sm:px-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions ? (
            <div className="flex min-w-0 items-center justify-end gap-1.5">{actions}</div>
          ) : null}
        </td>
      </tr>
    )
  }

  return (
    <RoomHeroCard
      accent="research"
      state={inProgress ? 'pending' : 'default'}
      interactive={Boolean(onActivate)}
      onActivate={disabled ? undefined : onActivate}
      disabled={disabled}
      className={cn(
        'group h-full',
        inProgress && inProgressShellClassName,
        className,
      )}
      contentStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}
      topSlot={gridTopSlot}
      {...(tourAttr ? { 'data-tour': tourAttr } : {})}
    >
      <RoomHeroCardBody className="gap-3 p-4">
        <ResearchHeroCardHeader
          categorySlug={categorySlug}
          categoryIcon={categoryIcon}
          leading={leading}
          iconOverride={iconOverride}
          iconTone={inProgress ? 'amber' : iconTone}
          title={title}
          onTitleClick={disabled ? undefined : onActivate}
          titleDisabled={disabled}
          badge={inProgressBadge}
          badgePlacement={inProgress ? 'below' : 'inline'}
        />
        <DiscoverHeroMetricStrip metrics={metricTrio} />
        {progress}
      </RoomHeroCardBody>
      {actions ? <RoomHeroCardFooter className="px-4 pb-4">{actions}</RoomHeroCardFooter> : null}
    </RoomHeroCard>
  )
}

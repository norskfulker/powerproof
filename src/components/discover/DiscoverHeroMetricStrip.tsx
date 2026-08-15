import { formatSetupBounds } from '@/lib/opportunityFormatters'
import { cn } from '@/lib/utils'

export type DiscoverHeroWorkspaceMetric = {
  label: string
  value: string
  tone?: 'default' | 'success' | 'muted'
}

export const EMPTY_WORKSPACE_FINANCIAL_METRICS: [
  DiscoverHeroWorkspaceMetric,
  DiscoverHeroWorkspaceMetric,
  DiscoverHeroWorkspaceMetric,
] = [
  { label: 'Cost', value: '—', tone: 'muted' },
  { label: 'Revenue', value: '—', tone: 'muted' },
  { label: 'Margin', value: '—', tone: 'muted' },
]

type FinancialMetricSource = {
  setup_min?: number | null
  setup_max?: number | null
  monthly_rev_min?: number | null
  monthly_rev_max?: number | null
  monthly_profit_min?: number | null
  monthly_profit_max?: number | null
  margin_pct?: number | null
}

function derivedMarginPct(row: FinancialMetricSource): number | null {
  const stored = Number(row.margin_pct)
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored)
  const revenue = Number(row.monthly_rev_max ?? row.monthly_rev_min ?? 0)
  const profit = Number(row.monthly_profit_max ?? row.monthly_profit_min ?? 0)
  if (revenue > 0 && profit > 0) return Math.round((profit / revenue) * 100)
  return null
}

export function workspaceFinancialMetrics(
  row: FinancialMetricSource,
  formatMoney: (n: number) => string,
): [DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric] {
  const cost = formatSetupBounds(row.setup_min, row.setup_max, formatMoney)
  const revLow = Number(row.monthly_rev_min ?? 0)
  const revHigh = Number(row.monthly_rev_max ?? 0)
  const revenue =
    revLow > 0 && revHigh > 0
      ? `${formatMoney(revLow)}–${formatMoney(revHigh)}`
      : revHigh > 0
        ? formatMoney(revHigh)
        : revLow > 0
          ? formatMoney(revLow)
          : '—'
  const marginPct = derivedMarginPct(row)

  return [
    { label: 'Cost', value: cost || '—', tone: cost && cost !== '—' ? 'default' : 'muted' },
    { label: 'Revenue', value: revenue, tone: revenue !== '—' ? 'success' : 'muted' },
    {
      label: 'Margin',
      value: marginPct != null ? `${marginPct}%` : '—',
      tone: marginPct != null ? 'default' : 'muted',
    },
  ]
}

/** Numeric sort keys for workspace Cost / Revenue / Margin columns. */
export function workspaceFinancialSortValues(
  row: FinancialMetricSource & { title?: string | null },
): {
  title: string
  cost: number | null
  revenue: number | null
  margin: number | null
} {
  const costMax = Number(row.setup_max ?? 0)
  const costMin = Number(row.setup_min ?? 0)
  const cost = costMax > 0 ? costMax : costMin > 0 ? costMin : null
  const revMax = Number(row.monthly_rev_max ?? 0)
  const revMin = Number(row.monthly_rev_min ?? 0)
  const revenue = revMax > 0 ? revMax : revMin > 0 ? revMin : null
  return {
    title: String(row.title ?? '').trim(),
    cost,
    revenue,
    margin: derivedMarginPct(row),
  }
}

const metricValueClass: Record<NonNullable<DiscoverHeroWorkspaceMetric['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  muted: 'text-muted-foreground',
}

/** Bordered 3-cell metric card — cost / revenue / margin (or any three metrics). */
export function DiscoverHeroMetricStrip({
  metrics,
  className,
}: {
  metrics: readonly DiscoverHeroWorkspaceMetric[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-3 overflow-hidden rounded-xl border border-border-subtle bg-background',
        className,
      )}
    >
      {metrics.slice(0, 3).map((metric, index) => (
        <div
          key={`${metric.label}-${index}`}
          className={cn(
            'flex min-w-0 flex-col gap-1 px-3 py-2.5',
            index > 0 && 'border-l border-border-subtle',
          )}
        >
          <span className="text-[11px] font-medium leading-none tracking-normal text-muted-foreground">
            {metric.label}
          </span>
          <span
            className={cn(
              'truncate text-[13px] font-semibold tabular-nums leading-snug',
              metricValueClass[metric.tone ?? 'default'],
            )}
            title={metric.value}
          >
            {metric.value || '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

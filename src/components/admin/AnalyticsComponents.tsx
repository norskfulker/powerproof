import { TopOpportunity, CategoryStat } from '@/hooks/useAdminAnalytics'
import { renderCategoryIcon } from '@/lib/categoryIcons'

export type DailyActivity = {
  day: string
  views: number
  signups: number
  saves: number
}
import { useNavigate } from 'react-router-dom'
import { BUDGET_BUCKET_LABELS_USD } from '@/lib/opportunityBudgetUsd'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const BUDGET_LABELS: Record<string, string> = { ...BUDGET_BUCKET_LABELS_USD }

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 font-sans text-[22px] font-medium text-foreground">{title}</div>
      <div className="flex items-center gap-2.5">
        <div className="h-0.5 w-6 rounded-full bg-primary" />
        <div className="h-px flex-1 bg-border-default" />
      </div>
    </div>
  )
}

export function KPICard({
  label,
  value,
  sub,
  alert,
}: {
  label: string
  value: unknown
  sub?: string
  alert?: boolean
}) {
  return (
    <Card
      padding="md"
      radius="lg"
      accent="none"
      className={cn(
        'border-l-[3px]',
        alert ? 'border-l-destructive' : 'border-l-primary',
      )}
    >
      <div className="mb-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </div>
      <div className={cn('font-sans text-[26px] font-medium leading-none', alert ? 'text-destructive' : 'text-foreground')}>
        {value ?? '—'}
      </div>
      {sub ? <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div> : null}
    </Card>
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    growth: 'bg-success-bg text-success',
    pro: 'bg-primary-soft text-primary-ink',
    free: 'bg-bg-sunken text-muted-foreground',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', styles[plan] ?? styles.free)}>
      {plan}
    </span>
  )
}

export function OppRow({ opp, rank, maxViews }: { opp: TopOpportunity; rank: number; maxViews: number }) {
  const navigate = useNavigate()
  const pct = Math.round((opp.view_count / Math.max(maxViews, 1)) * 100)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/opportunity/${opp.slug}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/opportunity/${opp.slug}`)
      }}
      className="flex cursor-pointer items-center gap-2.5 border-b border-border-subtle py-2"
    >
      <span className="w-5 shrink-0 font-sans text-xs text-muted-foreground">{rank}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{opp.title}</span>
      <div className="w-[70px] shrink-0">
        <div className="h-[5px] rounded-sm bg-bg-sunken">
          <div
            className="h-[5px] rounded-sm bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-7 shrink-0 text-right font-sans text-xs text-muted-foreground">{opp.view_count}</span>
    </div>
  )
}

export function CatRow({ cat, maxViews }: { cat: CategoryStat; maxViews: number }) {
  const pct = Math.round((cat.total_views / Math.max(maxViews, 1)) * 100)
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle py-1.5">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-primary">
        {renderCategoryIcon(cat.slug ?? '', cat.lucide, 'h-3.5 w-3.5')}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{cat.name}</span>
      <div className="w-14 shrink-0">
        <div className="h-[5px] rounded-sm bg-bg-sunken">
          <div className="h-[5px] rounded-sm bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="w-6 shrink-0 text-right font-sans text-[11px] text-muted-foreground">{cat.total_views}</span>
    </div>
  )
}

export function ContentHealthCard({
  label,
  filled,
  total,
  unit = 'complete',
}: {
  label: string
  filled: number
  total: number
  unit?: string
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : null
  const barColor =
    pct == null ? 'bg-muted-foreground' : pct >= 90 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive'
  const badgeClass =
    pct == null
      ? 'bg-bg-sunken text-text-tertiary'
      : pct >= 90
        ? 'bg-success-bg text-success'
        : pct >= 50
          ? 'bg-warning-bg text-warning'
          : 'bg-status-danger-surface text-destructive'

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="mb-2 text-xs text-muted-foreground">{label}</div>
      <div className="mb-2 font-sans text-[22px] font-medium text-foreground">
        {filled}
        <span className="text-sm text-muted-foreground">/{total}</span>
      </div>
      <div className="mb-2 h-[5px] rounded-full bg-bg-sunken">
        <div className={cn('h-[5px] rounded-full transition-[width] duration-500', barColor)} style={{ width: pct == null ? '0%' : `${pct}%` }} />
      </div>
      <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', badgeClass)}>
        {pct == null ? '—' : `${pct}%`} {unit}
      </span>
    </div>
  )
}

export function ActivityChart({ data }: { data: DailyActivity[] }) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No activity data yet</p>
  }

  const last14 = data.slice(-14)
  const maxVal = Math.max(...last14.map((d) => d.views), 1)

  return (
    <div>
      <div className="mb-4 flex gap-4 text-xs text-muted-foreground">
        {[
          { color: 'bg-primary', label: 'Views' },
          { color: 'bg-success', label: 'Signups' },
          { color: 'bg-warning', label: 'Saves' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', color)} />
            {label}
          </span>
        ))}
      </div>
      <div className="flex h-[120px] items-end gap-1">
        {last14.map((d) => {
          const h = Math.max(Math.round((d.views / maxVal) * 100), d.views > 0 ? 5 : 0)
          const date = new Date(d.day)
          const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          return (
            <div
              key={d.day}
              title={`${label}: ${d.views} views`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="w-full rounded-t-sm bg-primary transition-[height] duration-300" style={{ height: `${h}%` }} />
              <span className="origin-bottom-left -rotate-45 whitespace-nowrap font-sans text-[9px] text-muted-foreground">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="w-full p-8">
      <div className="mb-8 h-10 w-[200px] animate-pulse rounded-lg bg-bg-sunken" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-bg-sunken"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

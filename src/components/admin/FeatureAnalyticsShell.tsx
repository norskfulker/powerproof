import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import {
  AdminPageShell,
  AdminPillButton,
  AdminSurfaceCard,
} from '@/components/admin/adminUi'
import { ProductAnalyticsLinkBar } from '@/components/admin/ProductAnalyticsNav'
import { cn } from '@/lib/utils'

export type FeatureStat = {
  label: string
  value: ReactNode
  sub?: string
}

function PulseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 layout-sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-lg border border-border-subtle bg-bg-sunken" />
      ))}
    </div>
  )
}

function BlockSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-md bg-bg-sunken" />
      ))}
    </div>
  )
}

function PulseCard({ label, value, sub }: FeatureStat) {
  return (
    <Card padding="sm" radius="lg" accent="none" className="border-l-[3px] border-l-primary">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </Card>
  )
}

export function FeatureSectionHeader({ title }: { title: string }) {
  return (
    <h2 className="border-b border-border-subtle pb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      {title}
    </h2>
  )
}

export function FeatureAnalyticsShell({
  title,
  icon,
  loading,
  error,
  lastRefresh,
  onRefresh,
  stats,
  children,
}: {
  title: string
  icon?: ReactNode
  loading: boolean
  error: string | null
  lastRefresh: Date
  onRefresh: () => void
  stats: FeatureStat[]
  children: ReactNode
}) {
  return (
    <AdminPageShell className="max-w-none">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <h1 className="m-0 font-display text-[28px] font-bold tracking-tight text-foreground layout-lg:text-[32px]">
            {title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <AdminPillButton type="button" onClick={() => void onRefresh()}>
            ↻ Refresh
          </AdminPillButton>
        </div>
      </div>

      <ProductAnalyticsLinkBar className="mb-6" />

      {error ? (
        <AdminSurfaceCard padding="md">
          <p className="text-sm text-destructive">{error}</p>
          <AdminPillButton type="button" className="mt-3" onClick={() => void onRefresh()}>
            ↻ Retry
          </AdminPillButton>
        </AdminSurfaceCard>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            {loading ? (
              <PulseSkeleton />
            ) : (
              <div className={cn('grid grid-cols-2 gap-3', stats.length >= 4 ? 'layout-sm:grid-cols-4' : 'layout-sm:grid-cols-3')}>
                {stats.map((stat) => (
                  <PulseCard key={stat.label} {...stat} />
                ))}
              </div>
            )}
          </section>

          {loading ? (
            <BlockSkeleton rows={8} />
          ) : (
            children
          )}
        </div>
      )}
    </AdminPageShell>
  )
}

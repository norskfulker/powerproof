import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@/lib/icons'
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics'
import { CreditsFigure } from '@/components/credits/CreditsIcon'
import { Card } from '@/components/ui/card'
import {
  AdminPillButton,
  AdminSearchInput,
  AdminSurfaceCard,
  AdminTablePagination,
  AdminTableWrap,
  AdminUserAvatar,
  adminTdClass,
  adminThClass,
  useAdminTablePagination,
} from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'
const PRIMARY = 'hsl(227, 100%, 59%)'

type AnalyticsData = ReturnType<typeof useAdminAnalytics>

const FEATURE_STYLES: Record<string, { label: string; className: string; barColor: string }> = {
  research_opportunity: {
    label: 'Research',
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    barColor: 'hsl(217, 91%, 60%)',
  },
  re_research_opportunity: {
    label: 'Re-Research',
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    barColor: 'hsl(217, 91%, 60%)',
  },
  research_task_ponder: {
    label: 'Deep Ponder',
    className: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    barColor: 'hsl(239, 84%, 67%)',
  },
  war_room_playbook: {
    label: 'War Room (Pro)',
    className: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
    barColor: 'hsl(0, 84%, 60%)',
  },
  war_room_playbook_lite: {
    label: 'War Room (Flash)',
    className: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
    barColor: 'hsl(0, 84%, 60%)',
  },
  war_room_scout: {
    label: 'Scout Intel',
    className: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    barColor: 'hsl(25, 95%, 53%)',
  },
  playbook_generation: {
    label: 'Playbook',
    className: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
    barColor: 'hsl(0, 84%, 60%)',
  },
  opportunity_unlock: {
    label: 'Opportunity Unlock',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    barColor: 'hsl(160, 84%, 39%)',
  },
  opportunity_edit: {
    label: 'Section Edit',
    className: 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    barColor: 'hsl(173, 80%, 40%)',
  },
  ai_trend_forecast: {
    label: 'Trend Forecast',
    className: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    barColor: 'hsl(263, 70%, 50%)',
  },
  ai_chat_basic: {
    label: 'AI Chat',
    className: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    barColor: 'hsl(215, 16%, 47%)',
  },
}

const FUNNEL_STEPS: Array<{ key: keyof AnalyticsData['funnel']; label: string }> = [
  { key: 'signedUp', label: 'Signed up' },
  { key: 'onboarded', label: 'Onboarded' },
  { key: 'spentCredits', label: 'Spent credits' },
  { key: 'didSourcing', label: 'Did sourcing' },
  { key: 'didResearch', label: 'Did research' },
  { key: 'didWarroom', label: 'War Room' },
  { key: 'didRoadmap', label: 'Built a roadmap' },
]

function formatInr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function CreditCell({ amount, bold }: { amount: number; bold?: boolean }) {
  return (
    <CreditsFigure
      amount={amount}
      size="sm"
      className={cn('text-[13px]', bold ? 'font-bold text-foreground' : 'text-muted-foreground')}
    />
  )
}

function CreditTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <CreditsFigure amount={Number(payload[0].value ?? 0)} size="sm" />
    </div>
  )
}
function featureStyle(feature: string) {
  return (
    FEATURE_STYLES[feature] ?? {
      label: feature.replace(/_/g, ' '),
      className: 'border-border-subtle bg-muted text-muted-foreground',
      barColor: PRIMARY,
    }
  )
}

function FeatureBadge({ feature }: { feature: string }) {
  const style = featureStyle(feature)
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold', style.className)}>
      {style.label}
    </span>
  )
}

function SectionHeader({
  title,
  onRefresh,
}: {
  title: string
  onRefresh?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-2">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {onRefresh ? (
        <AdminPillButton type="button" onClick={onRefresh}>
          ↻ Refresh
        </AdminPillButton>
      ) : null}
    </div>
  )
}

function PulseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 layout-sm:grid-cols-3 layout-lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
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

function PulseCard({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <Card padding="sm" radius="lg" accent="none" className="border-l-[3px] border-l-primary">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </Card>
  )
}

function relativeDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return '—'
  }
}

function FeatureSpendTable({ rows }: { rows: AnalyticsData['featureSpend'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)

  return (
    <>
      <AdminTableWrap>
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>Feature</th>
              <th className={cn(adminThClass, 'text-right')}>Uses</th>
              <th className={cn(adminThClass, 'text-right')}>Credits spent</th>
              <th className={cn(adminThClass, 'text-right')}>Avg/use</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
              <tr key={row.feature} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>
                  <FeatureBadge feature={row.feature} />
                </td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.uses.toLocaleString()}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>
                  <CreditCell amount={row.creditsSpent} />
                </td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>
                  <CreditCell amount={row.avgPerUse} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />
    </>
  )
}

function TransactionsTable({ rows }: { rows: AnalyticsData['transactions'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)

  return (
    <>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-sunken">
            <th className={adminThClass}>Type</th>
            <th className={cn(adminThClass, 'text-right')}>Count</th>
            <th className={cn(adminThClass, 'text-right')}>Credits</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr>
              <td colSpan={3} className={cn(adminTdClass, 'text-muted-foreground')}>—</td>
            </tr>
          ) : (
            pageItems.map((row) => (
              <tr key={row.type} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>{row.type}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.count}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>
                  <CreditCell amount={row.credits} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        className="px-4 pb-3"
      />
    </>
  )
}

type UserSortKey =
  | 'user'
  | 'joined'
  | 'last_active'
  | 'credits'
  | 'spent'
  | 'research'
  | 'warroom'
  | 'roadmap'

function UsersTable({
  users,
}: {
  users: AnalyticsData['users']
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<UserSortKey>('joined')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: UserSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'user' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [users, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'user':
          cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email)
          break
        case 'joined':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'last_active':
          cmp = new Date(a.last_active_at || 0).getTime() - new Date(b.last_active_at || 0).getTime()
          break
        case 'credits':
          cmp = (a.credits_balance ?? 0) - (b.credits_balance ?? 0)
          break
        case 'spent':
          cmp = (a.lifetime_spent ?? 0) - (b.lifetime_spent ?? 0)
          break
        case 'research':
          cmp = a.research_count - b.research_count
          break
        case 'warroom':
          cmp = a.warroom_count - b.warroom_count
          break
        case 'roadmap':
          cmp = a.roadmap_count - b.roadmap_count
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortDir])

  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(sorted)

  useEffect(() => {
    setPage(1)
  }, [search, sortKey, sortDir, setPage])

  function SortTh({ label, col }: { label: string; col: UserSortKey }) {
    const active = sortKey === col
    return (
      <th className={adminThClass}>
        <button
          type="button"
          onClick={() => handleSort(col)}
          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
        >
          {label}
          {active ? (
            sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </th>
    )
  }

  function CountBadge({ n }: { n: number }) {
    if (n <= 0) return <span className="text-muted-foreground">—</span>
    return (
      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
        {n}
      </span>
    )
  }

  return (
    <div>
      <AdminSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email…"
        className="mb-3"
      />

      <AdminTableWrap>
        <table className="min-w-[960px] w-full border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <SortTh label="User" col="user" />
              <SortTh label="Joined" col="joined" />
              <SortTh label="Last active" col="last_active" />
              <th className={adminThClass}>Onboarded</th>
              <SortTh label="Credits" col="credits" />
              <SortTh label="Spent" col="spent" />
              <SortTh label="Research" col="research" />
              <SortTh label="War Room" col="warroom" />
              <SortTh label="Roadmap" col="roadmap" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((u, i) => (
              <tr key={u.id} className={cn(i < pageItems.length - 1 && 'border-b border-border-subtle')}>
                <td className={adminTdClass}>
                  <div className="flex items-center gap-2.5">
                    <AdminUserAvatar name={u.full_name || u.email || 'U'} />
                    <div>
                      <div className="text-[13px] font-medium">{u.full_name || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className={cn(adminTdClass, 'text-xs text-muted-foreground')}>
                  <div>{relativeDate(u.created_at)}</div>
                  <div className="text-[10px]">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d') : '—'}
                  </div>
                </td>
                <td className={cn(adminTdClass, 'text-xs text-muted-foreground')}>
                  <div>{relativeDate(u.last_active_at)}</div>
                  <div className="text-[10px]">
                    {u.last_active_at ? format(new Date(u.last_active_at), 'MMM d') : '—'}
                  </div>
                </td>
                <td className={adminTdClass}>
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      u.onboarding_completed ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                    )}
                    title={u.onboarding_completed ? 'Onboarded' : 'Not onboarded'}
                  />
                </td>
                <td className={cn(adminTdClass, 'font-sans text-[13px]')}>
                  {(u.credits_balance ?? 0) > 0 ? (
                    <CreditCell amount={u.credits_balance ?? 0} bold />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn(adminTdClass, 'font-sans text-[13px]')}>
                  {(u.lifetime_spent ?? 0) > 0 ? (
                    <CreditCell amount={u.lifetime_spent ?? 0} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={adminTdClass}><CountBadge n={u.research_count} /></td>
                <td className={adminTdClass}><CountBadge n={u.warroom_count} /></td>
                <td className={adminTdClass}><CountBadge n={u.roadmap_count} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>

      <AdminTablePagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />

      <p className="mt-3 text-xs text-muted-foreground">
        <Link to="/admin/users" className="font-semibold text-primary hover:underline">
          Full user management →
        </Link>
      </p>
    </div>
  )
}

export function AdminAnalyticsDashboard() {
  const {
    overview,
    funnel,
    credits,
    revenue,
    featureSpend,
    transactions,
    signupTrend,
    users,
    loading,
    error,
    lastRefresh,
    refresh,
  } = useAdminAnalytics()

  const funnelChartData = useMemo(
    () =>
      FUNNEL_STEPS.map((step, index) => {
        const count = funnel[step.key]
        const pct = overview ? Math.round((count / Math.max(overview.totalUsers, 1)) * 100) : 0
        return {
          label: step.label,
          count,
          pct,
          opacity: 1 - index * 0.03,
        }
      }),
    [funnel, overview],
  )

  const featureChartData = useMemo(
    () =>
      featureSpend.slice(0, 12).map((row) => {
        const style = featureStyle(row.feature)
        return {
          name: style.label,
          credits: row.creditsSpent,
          feature: row.feature,
          fill: style.barColor,
        }
      }),
    [featureSpend],
  )

  const signupChartData = useMemo(
    () =>
      signupTrend.map((d) => ({
        day: format(new Date(d.day), 'MMM d'),
        signups: d.signups,
      })),
    [signupTrend],
  )

  if (loading && !overview) {
    return (
      <div className="space-y-8">
        <PulseSkeleton />
        <BlockSkeleton rows={8} />
        <BlockSkeleton rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <AdminSurfaceCard padding="md">
        <p className="text-sm text-destructive">{error}</p>
        <AdminPillButton type="button" className="mt-3" onClick={() => void refresh()}>
          ↻ Retry
        </AdminPillButton>
      </AdminSurfaceCard>
    )
  }

  if (!overview) return null

  const ov = overview

  return (
    <div className="space-y-10">
      {/* Section 1 — Pulse */}
      <section className="space-y-4">
        <SectionHeader title="Pulse" onRefresh={() => void refresh()} />
        {loading ? (
          <PulseSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 layout-sm:grid-cols-3 layout-lg:grid-cols-6">
            <PulseCard label="Users" value={ov.totalUsers.toLocaleString()} sub={`+${ov.newThisWeek} this week`} />
            <PulseCard label="WAU" value={ov.wau.toLocaleString()} sub={`${ov.mau} MAU`} />
            <PulseCard
              label="Onboarded"
              value={`${ov.onboardingRate}%`}
              sub={`${ov.onboarded} of ${ov.totalUsers}`}
            />
            <PulseCard
              label="Credits circulating"
              value={
                <CreditsFigure
                  amount={credits.totalBalance}
                  size="sm"
                  className="text-2xl font-bold text-foreground"
                />
              }
              sub={`${credits.walletsWithBalance} wallets`}
            />
            <PulseCard label="Burn rate" value={`${credits.burnRate}%`} sub="spent/earned" />
            <PulseCard
              label="Revenue"
              value={formatInr(revenue.allTimeInr)}
              sub={`${revenue.paidCount} purchases · updated ${lastRefresh.toLocaleTimeString()}`}
            />
          </div>
        )}
      </section>

      {/* Section 2 — Funnel */}
      <section className="space-y-4">
        <SectionHeader title="Activation funnel" onRefresh={() => void refresh()} />
        <AdminSurfaceCard padding="md">
          {loading ? (
            <BlockSkeleton rows={10} />
          ) : (
            <div className="space-y-2.5">
              {funnelChartData.map((step) => {
                const widthPct = Math.max(step.pct, step.count > 0 ? 3 : 0)
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="w-[140px] shrink-0 text-right text-xs text-muted-foreground layout-sm:w-[168px] layout-sm:text-[13px]">
                      {step.label}
                    </span>
                    <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded bg-bg-sunken">
                      <div
                        className="flex h-full items-center rounded px-2 transition-[width] duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: PRIMARY,
                          opacity: step.opacity,
                        }}
                      >
                        <span className="text-xs font-semibold text-white">{step.count}</span>
                        <span className="ml-1.5 text-[11px] text-white/80">{step.pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </AdminSurfaceCard>
      </section>

      {/* Section 3 — Feature activity */}
      <section className="space-y-4">
        <SectionHeader title="Feature activity" onRefresh={() => void refresh()} />
        {loading ? (
          <BlockSkeleton rows={6} />
        ) : featureSpend.length > 0 ? (
          <>
            <AdminSurfaceCard padding="md">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={featureChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border-subtle))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <RechartsTooltip content={<CreditTooltip />} />
                    <Bar dataKey="credits" radius={[0, 4, 4, 0]}>
                      {featureChartData.map((entry) => (
                        <Cell key={entry.feature} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AdminSurfaceCard>

            <FeatureSpendTable rows={featureSpend} />
          </>
        ) : (
          <AdminSurfaceCard padding="md">
            <p className="text-sm text-muted-foreground">—</p>
          </AdminSurfaceCard>
        )}
      </section>

      {/* Section 4 — Credits economy */}
      <section className="space-y-4">
            <SectionHeader title="Credits economy" onRefresh={() => void refresh()} />
            {loading ? (
              <BlockSkeleton rows={6} />
            ) : (
              <div className="grid gap-4 layout-lg:grid-cols-3">
                <AdminSurfaceCard padding="md">
                  <div className="space-y-2 text-[13px]">
                    {[
                      ['Total wallets', credits.totalWallets.toLocaleString()],
                      ['With balance', credits.walletsWithBalance.toLocaleString()],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{val}</span>
                      </div>
                    ))}
                    {[
                      ['Total balance', credits.totalBalance],
                      ['Lifetime earned (bonuses/gifts)', credits.lifetimeEarned],
                      ['Lifetime purchased', credits.lifetimePurchased],
                      ['Lifetime spent', credits.lifetimeSpent],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex items-center justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
                        <span className="text-muted-foreground">{label}</span>
                        <CreditCell amount={Number(val)} bold />
                      </div>
                    ))}
                  </div>
                </AdminSurfaceCard>

                <AdminSurfaceCard
                  padding="none"
                  topSlot={
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Transaction types
                    </div>
                  }
                >
                  <TransactionsTable rows={transactions} />
                </AdminSurfaceCard>

                <AdminSurfaceCard padding="md">
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">All-time</span>
                      <span className="font-bold text-foreground">{formatInr(revenue.allTimeInr)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Last 7 days</span>
                      <span className="font-medium text-foreground">{formatInr(revenue.last7dInr)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Paid purchases</span>
                      <span className="font-medium text-foreground">{revenue.paidCount}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    Completed purchases with ₹0 = trial/gifted credits
                  </p>
                </AdminSurfaceCard>
              </div>
            )}
          </section>

          {/* Section 5 — Signup trend */}
          <section className="space-y-4">
            <SectionHeader title="Signup trend" onRefresh={() => void refresh()} />
            <AdminSurfaceCard padding="md">
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis hide />
                    <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke={PRIMARY}
                      strokeWidth={2}
                      dot={{ r: 2, fill: PRIMARY }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AdminSurfaceCard>
          </section>

          {/* Section 6 — Users table */}
          <section className="space-y-4">
            <SectionHeader title="Users" onRefresh={() => void refresh()} />
            {loading ? <BlockSkeleton rows={8} /> : <UsersTable users={users} />}
          </section>

    </div>
  )
}

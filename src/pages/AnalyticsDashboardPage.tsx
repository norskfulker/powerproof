import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyticsTopOpportunitiesBodySkeleton } from '@/components/skeletons/AnalyticsSkeleton'

type TopOpp = { id: string; title: string; view_count: number | null; save_count: number | null }

export function AnalyticsDashboardPage() {
  const [stats, setStats] = useState<{
    totalSearches: number
    totalViews: number
    totalSaves: number
    topOpportunities: TopOpp[]
  }>({
    totalSearches: 0,
    totalViews: 0,
    totalSaves: 0,
    topOpportunities: [],
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [{ count: views, data: viewRows }, { data: opportunityRows }] = await Promise.all([
        supabase
          .from('opportunity_views')
          .select('opportunity_id', { count: 'exact' })
          .limit(10000),
        supabase
          .from('user_opportunities')
          .select('id, title'),
      ])

      const viewsByOpportunity = new Map<string, number>()
      for (const row of viewRows ?? []) {
        const id = String(row.opportunity_id ?? '')
        if (id) viewsByOpportunity.set(id, (viewsByOpportunity.get(id) ?? 0) + 1)
      }
      const opps = ((opportunityRows ?? []) as Array<{ id: string; title: string }>)
        .map<TopOpp>((row) => ({
          ...row,
          view_count: viewsByOpportunity.get(row.id) ?? 0,
          save_count: null,
        }))
        .sort((a, b) => Number(b.view_count ?? 0) - Number(a.view_count ?? 0))
        .slice(0, 10)

      setStats({
        totalSearches: 0,
        totalViews: views || 0,
        totalSaves: 0,
        topOpportunities: opps,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full py-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="font-italic-display text-[22px] font-semibold tracking-tight text-foreground">
            Analytics
          </div>
          <div className="mt-1 font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Command Center funnel
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted/40"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Total searches" value={stats.totalSearches} loading={loading} />
        <StatCard label="Total views" value={stats.totalViews} loading={loading} />
        <StatCard label="Total saves" value={stats.totalSaves} loading={loading} />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="font-italic-display text-[17px] font-semibold text-foreground">
            Top opportunities
          </div>
          <div className="font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            by views
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Title
                </th>
                <th className="px-4 py-2 text-right font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Views
                </th>
                <th className="px-4 py-2 text-right font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Saves
                </th>
                <th className="px-4 py-2 text-right font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Save rate
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AnalyticsTopOpportunitiesBodySkeleton rows={10} />
              ) : (
                <>
                  {stats.topOpportunities.map((opp) => {
                    const views = Number(opp.view_count ?? 0)
                    const saves = Number(opp.save_count ?? 0)
                    const rate = views > 0 ? Math.round((saves / views) * 100) : null
                    return (
                      <tr key={opp.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{opp.title}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[12.5px] font-semibold text-foreground">
                          {views.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[12.5px] font-semibold text-foreground">
                          {saves.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[12.5px] text-muted-foreground">
                          {rate == null ? '—' : `${rate}%`}
                        </td>
                      </tr>
                    )
                  })}
                  {stats.topOpportunities.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                        No data yet.
                      </td>
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="font-semibold text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-semibold text-[22px] font-semibold text-foreground">
        {loading ? <Skeleton className="h-8 w-28" /> : value.toLocaleString('en-IN')}
      </div>
    </div>
  )
}


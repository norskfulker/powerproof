import { Map } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type RoadmapAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import { CreditCell, formatAdminDate, TruncateText } from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { CreditsFigure } from '@/components/credits/CreditsIcon'
import { cn } from '@/lib/utils'

function BreakdownTable({ title, rows, valueLabel }: { title: string; rows: Array<{ label: string; count: number }>; valueLabel: string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <AdminTableWrap>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>{valueLabel}</th>
              <th className={cn(adminThClass, 'text-right')}>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className={cn(adminTdClass, 'text-muted-foreground')}>—</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.label} className="border-b border-border-subtle last:border-b-0">
                  <td className={adminTdClass}>{row.label}</td>
                  <td className={cn(adminTdClass, 'text-right font-sans')}>{row.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  )
}

function RecentActivityTable({ rows }: { rows: RoadmapAnalytics['recentActivity'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[880px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Title / Goal</th>
              <th className={adminThClass}>Persona</th>
              <th className={adminThClass}>Difficulty</th>
              <th className={cn(adminThClass, 'text-right')}>Tasks</th>
              <th className={cn(adminThClass, 'text-right')}>Weeks</th>
              <th className={cn(adminThClass, 'text-right')}>Credits</th>
              <th className={adminThClass}>Date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
                <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                  <td className={adminTdClass}>
                    <AdminOwnerCell userId={row.user_id} profiles={profiles} />
                  </td>
                  <td className={cn(adminTdClass, 'max-w-[220px] font-medium')}>
                    {row.title?.trim() ? row.title : <TruncateText text={row.goal_input} max={50} />}
                  </td>
                  <td className={adminTdClass}>{row.persona ?? 'Unknown'}</td>
                  <td className={adminTdClass}>{row.difficulty ?? '—'}</td>
                  <td className={cn(adminTdClass, 'text-right font-sans')}>{row.total_tasks ?? '—'}</td>
                  <td className={cn(adminTdClass, 'text-right font-sans')}>{row.total_weeks ?? '—'}</td>
                  <td className={cn(adminTdClass, 'text-right')}>
                    <CreditCell amount={row.credits_used} />
                  </td>
                  <td className={adminTdClass}>{formatAdminDate(row.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </AdminTableWrap>
      <AdminTablePagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
    </>
  )
}

export default function AdminRoadmapAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('roadmap')
  const roadmap = data as RoadmapAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  return (
    <FeatureAnalyticsShell
      title="Roadmap Analytics"
      icon={<Map className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        roadmap
          ? [
              { label: 'Total roadmaps', value: roadmap.total.toLocaleString(), sub: `${roadmap.complete} complete` },
              { label: 'Unique users', value: roadmap.uniqueUsers.toLocaleString() },
              {
                label: 'Credits used',
                value: <CreditsFigure amount={roadmap.totalCredits} size="sm" className="text-2xl font-bold" />,
              },
              {
                label: 'Avg tasks',
                value: roadmap.avgTasks.toFixed(1),
                sub: `${roadmap.avgWeeks.toFixed(0)} avg weeks`,
              },
            ]
          : []
      }
    >
      {roadmap ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Breakdown" />
            <div className="grid gap-4 layout-lg:grid-cols-2">
              <BreakdownTable
                title="By persona"
                valueLabel="Persona"
                rows={roadmap.byPersona.map((r) => ({ label: r.persona, count: r.count }))}
              />
              <BreakdownTable
                title="By difficulty"
                valueLabel="Difficulty"
                rows={roadmap.byDifficulty.map((r) => ({ label: r.difficulty, count: r.count }))}
              />
            </div>
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentActivityTable rows={roadmap.recentActivity} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

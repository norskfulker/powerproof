import { FlaskConical } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type ResearchAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import {
  CreditCell,
  formatAdminDate,
  researchStyleLabel,
  StatusBadge,
} from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { CreditsFigure } from '@/components/credits/CreditsIcon'
import { cn } from '@/lib/utils'

function StyleBreakdown({ data }: { data: ResearchAnalytics }) {
  return (
    <AdminTableWrap>
      <table className="w-full min-w-[360px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-sunken">
            <th className={adminThClass}>Style</th>
            <th className={cn(adminThClass, 'text-right')}>Runs</th>
            <th className={cn(adminThClass, 'text-right')}>Credits</th>
            <th className={cn(adminThClass, 'text-right')}>Avg/run</th>
          </tr>
        </thead>
        <tbody>
          {data.byStyle.length === 0 ? (
            <tr>
              <td colSpan={4} className={cn(adminTdClass, 'text-muted-foreground')}>—</td>
            </tr>
          ) : (
            data.byStyle.map((row) => (
              <tr key={row.style} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>{researchStyleLabel(row.style)}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.count}</td>
                <td className={cn(adminTdClass, 'text-right')}>
                  <CreditCell amount={row.credits} />
                </td>
                <td className={cn(adminTdClass, 'text-right')}>
                  <CreditCell amount={row.count > 0 ? Math.round(row.credits / row.count) : 0} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminTableWrap>
  )
}

function RecentActivityTable({ rows }: { rows: ResearchAnalytics['recentActivity'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[720px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Title</th>
              <th className={adminThClass}>Style</th>
              <th className={adminThClass}>Status</th>
              <th className={cn(adminThClass, 'text-right')}>Credits</th>
              <th className={cn(adminThClass, 'text-right')}>Re-runs</th>
              <th className={adminThClass}>Date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
              <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>
                  <AdminOwnerCell userId={row.user_id} profiles={profiles} />
                </td>
                <td className={cn(adminTdClass, 'max-w-[200px] font-medium')}>{row.title}</td>
                <td className={adminTdClass}>{researchStyleLabel(row.research_style)}</td>
                <td className={adminTdClass}>
                  <StatusBadge status={row.research_status} />
                </td>
                <td className={cn(adminTdClass, 'text-right')}>
                  <CreditCell amount={row.credits_used} />
                </td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.re_research_count || '—'}</td>
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

export default function AdminResearchAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('research')
  const research = data as ResearchAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  const completionRate =
    research && research.total > 0 ? Math.round((research.complete / research.total) * 100) : 0

  return (
    <FeatureAnalyticsShell
      title="Research Analytics"
      icon={<FlaskConical className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        research
          ? [
              { label: 'Total runs', value: research.total.toLocaleString(), sub: `${research.complete} complete` },
              { label: 'Unique users', value: research.uniqueUsers.toLocaleString() },
              {
                label: 'Credits used',
                value: <CreditsFigure amount={research.totalCredits} size="sm" className="text-2xl font-bold" />,
                sub: `${research.reruns} re-runs`,
              },
              { label: 'Completion rate', value: `${completionRate}%` },
            ]
          : []
      }
    >
      {research ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Style breakdown" />
            <StyleBreakdown data={research} />
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentActivityTable rows={research.recentActivity} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

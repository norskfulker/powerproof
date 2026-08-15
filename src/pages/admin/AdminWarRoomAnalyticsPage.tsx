import { Swords } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type WarRoomAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import {
  CreditCell,
  formatAdminDate,
  StatusBadge,
  TruncateText,
  warRoomModelLabel,
} from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { CreditsFigure } from '@/components/credits/CreditsIcon'
import { cn } from '@/lib/utils'

function ModelBreakdown({ data }: { data: WarRoomAnalytics }) {
  return (
    <AdminTableWrap>
      <table className="w-full min-w-[360px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-sunken">
            <th className={adminThClass}>Model</th>
            <th className={cn(adminThClass, 'text-right')}>Count</th>
            <th className={cn(adminThClass, 'text-right')}>Credits</th>
          </tr>
        </thead>
        <tbody>
          {data.byModel.length === 0 ? (
            <tr>
              <td colSpan={3} className={cn(adminTdClass, 'text-muted-foreground')}>—</td>
            </tr>
          ) : (
            data.byModel.map((row) => (
              <tr key={row.model} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>{warRoomModelLabel(row.model)}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.count}</td>
                <td className={cn(adminTdClass, 'text-right')}>
                  <CreditCell amount={row.credits} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminTableWrap>
  )
}

function RecentActivityTable({ rows }: { rows: WarRoomAnalytics['recentActivity'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[880px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Business</th>
              <th className={adminThClass}>Description</th>
              <th className={adminThClass}>Status</th>
              <th className={adminThClass}>Model</th>
              <th className={cn(adminThClass, 'text-right')}>Steps</th>
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
                <td className={cn(adminTdClass, 'max-w-[160px] font-medium')}>
                  {row.business_name?.trim() || '—'}
                </td>
                <td className={cn(adminTdClass, 'max-w-[200px] text-muted-foreground')}>
                  <TruncateText text={row.business_description} max={60} />
                </td>
                <td className={adminTdClass}>
                  <StatusBadge status={row.generation_status} />
                </td>
                <td className={adminTdClass}>{warRoomModelLabel(row.model_used)}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.step_count ?? '—'}</td>
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

export default function AdminWarRoomAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('warroom')
  const warroom = data as WarRoomAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  const completionRate =
    warroom && warroom.total > 0 ? Math.round((warroom.complete / warroom.total) * 100) : 0

  return (
    <FeatureAnalyticsShell
      title="War Room Analytics"
      icon={<Swords className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        warroom
          ? [
              { label: 'Total playbooks', value: warroom.total.toLocaleString(), sub: `${warroom.complete} complete` },
              { label: 'Unique users', value: warroom.uniqueUsers.toLocaleString() },
              {
                label: 'Credits used',
                value: <CreditsFigure amount={warroom.totalCredits} size="sm" className="text-2xl font-bold" />,
              },
              { label: 'Completion rate', value: `${completionRate}%`, sub: `${warroom.failed} failed` },
            ]
          : []
      }
    >
      {warroom ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Model breakdown" />
            <ModelBreakdown data={warroom} />
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentActivityTable rows={warroom.recentActivity} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

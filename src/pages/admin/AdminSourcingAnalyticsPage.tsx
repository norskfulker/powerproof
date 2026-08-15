import { PackageSearch } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type SourcingAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import { formatAdminDate, formatInr } from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { cn } from '@/lib/utils'

function TopKeywordsTable({ rows }: { rows: SourcingAnalytics['topKeywords'] }) {
  return (
    <AdminTableWrap>
      <table className="w-full min-w-[400px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-sunken">
            <th className={adminThClass}>Keyword</th>
            <th className={cn(adminThClass, 'text-right')}>Searches</th>
            <th className={cn(adminThClass, 'text-right')}>Avg results</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className={cn(adminTdClass, 'text-muted-foreground')}>—</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.keyword} className="border-b border-border-subtle last:border-b-0">
                <td className={cn(adminTdClass, 'font-medium')}>{row.keyword}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.searches}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.avgResults.toFixed(0)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminTableWrap>
  )
}

function RecentActivityTable({ rows }: { rows: SourcingAnalytics['recentActivity'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[560px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Keyword</th>
              <th className={cn(adminThClass, 'text-right')}>Budget max</th>
              <th className={cn(adminThClass, 'text-right')}>Results</th>
              <th className={adminThClass}>Date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
              <tr key={row.search_id} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>
                  <AdminOwnerCell userId={row.user_id} profiles={profiles} />
                </td>
                <td className={cn(adminTdClass, 'font-medium')}>{row.keyword}</td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>
                  {row.budget_max != null ? formatInr(row.budget_max) : '—'}
                </td>
                <td className={cn(adminTdClass, 'text-right font-sans')}>{row.total_results ?? '—'}</td>
                <td className={adminTdClass}>{formatAdminDate(row.searched_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableWrap>
      <AdminTablePagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
    </>
  )
}

export default function AdminSourcingAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('sourcing')
  const sourcing = data as SourcingAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  return (
    <FeatureAnalyticsShell
      title="Sourcing Analytics"
      icon={<PackageSearch className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        sourcing
          ? [
              { label: 'Total searches', value: sourcing.total.toLocaleString() },
              { label: 'Unique users', value: sourcing.uniqueUsers.toLocaleString() },
              { label: 'Avg results', value: sourcing.avgResults.toFixed(0), sub: 'per search' },
            ]
          : []
      }
    >
      {sourcing ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Top keywords" />
            <TopKeywordsTable rows={sourcing.topKeywords} />
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentActivityTable rows={sourcing.recentActivity} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

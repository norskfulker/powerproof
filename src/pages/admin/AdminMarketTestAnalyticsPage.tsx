import { FlaskConical } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type MarketTestAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import {
  CreditCell,
  formatAdminDate,
  ScoreBadge,
  StatusBadge,
  TruncateText,
  VerdictBadge,
} from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { cn } from '@/lib/utils'

function VerdictBreakdown({ rows }: { rows: MarketTestAnalytics['byVerdict'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <VerdictBadge
          key={row.verdict}
          verdict={row.verdict}
          label={row.verdictLabel}
          count={row.count}
          muted
        />
      ))}
    </div>
  )
}

function RecentActivityTable({ rows }: { rows: MarketTestAnalytics['recentActivity'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[760px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Query</th>
              <th className={adminThClass}>Verdict</th>
              <th className={cn(adminThClass, 'text-right')}>Score</th>
              <th className={adminThClass}>Status</th>
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
                <td className={cn(adminTdClass, 'max-w-[240px] font-medium')}>
                  <TruncateText text={row.query} max={60} />
                </td>
                <td className={adminTdClass}>{row.verdict_label?.trim() || row.verdict || '—'}</td>
                <td className={cn(adminTdClass, 'text-right')}>
                  <ScoreBadge score={row.market_reality_score} />
                </td>
                <td className={adminTdClass}>
                  <StatusBadge status={row.generation_status} />
                </td>
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

export default function AdminMarketTestAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('markettest')
  const marketTest = data as MarketTestAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  return (
    <FeatureAnalyticsShell
      title="Market Test Analytics"
      icon={<FlaskConical className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        marketTest
          ? [
              { label: 'Total tests', value: marketTest.total.toLocaleString(), sub: `${marketTest.complete} complete` },
              { label: 'Unique users', value: marketTest.uniqueUsers.toLocaleString() },
              { label: 'Avg score', value: marketTest.avgScore.toFixed(0), sub: '/100' },
            ]
          : []
      }
    >
      {marketTest ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Verdict breakdown" />
            <VerdictBreakdown rows={marketTest.byVerdict} />
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentActivityTable rows={marketTest.recentActivity} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

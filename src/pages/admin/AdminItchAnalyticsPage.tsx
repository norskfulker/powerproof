import { Sparkles } from '@/lib/icons'
import { useProfile } from '@/hooks/useProfile'
import { useFeatureAnalytics, type ItchAnalytics } from '@/hooks/useAdminAnalytics'
import { AdminAccessDenied, AdminOwnerCell, AdminTablePagination, AdminTableWrap, adminTdClass, adminThClass, useAdminTablePagination } from '@/components/admin/adminUi'
import { FeatureAnalyticsShell, FeatureSectionHeader } from '@/components/admin/FeatureAnalyticsShell'
import { formatAdminDate, shortId } from '@/components/admin/featureAnalyticsHelpers'
import { useAdminOwnerProfiles } from '@/hooks/useAdminOwnerProfiles'
import { cn } from '@/lib/utils'

const REACTION_LABELS: Record<string, { emoji: string; label: string }> = {
  upvoted: { emoji: '👍', label: 'Upvoted' },
  saved: { emoji: '🔖', label: 'Saved' },
  researched: { emoji: '🔬', label: 'Researched' },
}

function ReactionBreakdown({ rows }: { rows: ItchAnalytics['byReaction'] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {rows.map((row) => {
        const meta = REACTION_LABELS[row.reaction] ?? { emoji: '•', label: row.reaction }
        return (
          <span
            key={row.reaction}
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-muted/40 px-3 py-1.5 text-sm font-medium"
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}: <span className="tabular-nums">{row.count}</span>
          </span>
        )
      })}
    </div>
  )
}

function RecentSavesTable({ rows }: { rows: ItchAnalytics['recentSaves'] }) {
  const { page, setPage, totalPages, pageItems, totalItems } = useAdminTablePagination(rows)
  const profiles = useAdminOwnerProfiles(rows.map((row) => row.user_id))

  return (
    <>
      <AdminTableWrap>
        <table className="min-w-[560px] w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-sunken">
              <th className={adminThClass}>User</th>
              <th className={adminThClass}>Reaction</th>
              <th className={adminThClass}>Card ID</th>
              <th className={adminThClass}>Date</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
              <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                <td className={adminTdClass}>
                  <AdminOwnerCell userId={row.user_id} profiles={profiles} />
                </td>
                <td className={adminTdClass}>{row.reaction}</td>
                <td className={cn(adminTdClass, 'font-mono text-xs')} title={row.itch_card_id}>
                  {shortId(row.itch_card_id)}
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

export default function AdminItchAnalyticsPage() {
  const { profile } = useProfile()
  const { data, loading, error, lastRefresh, refresh } = useFeatureAnalytics('itch')
  const itch = data as ItchAnalytics | null

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  return (
    <FeatureAnalyticsShell
      title="ItchMyBack Analytics"
      icon={<Sparkles className="h-6 w-6" />}
      loading={loading}
      error={error}
      lastRefresh={lastRefresh}
      onRefresh={refresh}
      stats={
        itch
          ? [
              { label: 'Total cards', value: itch.totalCards.toLocaleString(), sub: 'public cards' },
              { label: 'Total saves/reactions', value: itch.totalSaves.toLocaleString() },
              { label: 'Unique users', value: itch.uniqueUsers.toLocaleString() },
              { label: 'Session users', value: itch.sessionUsers.toLocaleString(), sub: 'opened the deck' },
            ]
          : []
      }
    >
      {itch ? (
        <>
          <section className="space-y-4">
            <FeatureSectionHeader title="Reaction breakdown" />
            <ReactionBreakdown rows={itch.byReaction} />
          </section>
          <section className="space-y-4">
            <FeatureSectionHeader title="Recent activity" />
            <RecentSavesTable rows={itch.recentSaves} />
          </section>
        </>
      ) : null}
    </FeatureAnalyticsShell>
  )
}

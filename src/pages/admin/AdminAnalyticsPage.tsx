import { useProfile } from '@/hooks/useProfile'
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard'
import { AdminAccessDenied, AdminPageHeader, AdminPageShell } from '@/components/admin/adminUi'
import { ProductAnalyticsShortcutGrid } from '@/components/admin/ProductAnalyticsNav'

export function AdminAnalyticsPage() {
  const { profile } = useProfile()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <AdminAccessDenied />
  }

  return (
    <AdminPageShell className="max-w-none">
      <AdminPageHeader
        title="Analytics"
        description="Monetization, funnel, and users."
      />

      <ProductAnalyticsShortcutGrid className="mb-10" />

      <AdminAnalyticsDashboard />
    </AdminPageShell>
  )
}

export default AdminAnalyticsPage

import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import { AdminWorkspace } from '@/components/page-shells'
import {
  AdminSidebar,
  AdminSidebarMenuButton,
  readAdminSidebarCollapsedPreference,
  writeAdminSidebarCollapsedPreference,
} from '@/components/admin/AdminSidebar'
import { adminSectionTitle } from '@/lib/adminNav'
import { appShellPadClass } from '@/lib/platformLayout'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const AdminPage = () => {
  const { profile, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readAdminSidebarCollapsedPreference())

  const isAnalyticsHome = location.pathname === '/admin/analytics' || location.pathname === '/admin/analytics/'

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(isAnalyticsHome ? '/opportunities' : '/admin/analytics')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <AdminSidebar
          mobileOpen={navOpen}
          onMobileOpenChange={setNavOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={(next) => {
            setSidebarCollapsed(next)
            writeAdminSidebarCollapsedPreference(next)
          }}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className={cn('flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle bg-card layout-sm:gap-3', appShellPadClass)}>
            <AdminSidebarMenuButton onClick={() => setNavOpen(true)} />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={goBack}
              className="h-9 shrink-0 gap-1 px-2.5"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="hidden layout-sm:inline">Back</span>
            </Button>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">
                {adminSectionTitle(location.pathname)}
              </div>
            </div>

            <Link
              to="/room?mode=search"
              className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground layout-sm:hidden"
            >
              Exit admin
            </Link>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <AdminWorkspace className="!pt-6">
              <Outlet />
            </AdminWorkspace>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminPage

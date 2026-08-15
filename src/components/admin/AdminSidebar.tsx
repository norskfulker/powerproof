import { Menu } from '@/lib/icons'
import { AdminSidebarContent } from '@/components/admin/AdminSidebarContent'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const ADMIN_SIDEBAR_STORAGE_KEY = 'powerproof_admin_sidebar_collapsed'

type AdminSidebarProps = {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

export function readAdminSidebarCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeAdminSidebarCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function AdminSidebar({
  mobileOpen = false,
  onMobileOpenChange,
  collapsed = false,
  onCollapsedChange,
  className,
}: AdminSidebarProps) {
  const sidebarBody = (
    <AdminSidebarContent
      collapsed={collapsed}
      collapseEnabled
      onToggleCollapsed={() => {
        const next = !collapsed
        onCollapsedChange?.(next)
        writeAdminSidebarCollapsedPreference(next)
      }}
      onNavigate={() => onMobileOpenChange?.(false)}
    />
  )

  const mobileSidebarBody = (
    <AdminSidebarContent
      collapsed={false}
      collapseEnabled={false}
      layout="sheet"
      onNavigate={() => onMobileOpenChange?.(false)}
    />
  )

  return (
    <>
      <aside
        className={cn(
          'app-sidebar hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-card layout-sm:flex',
          collapsed ? 'is-collapsed w-[52px]' : 'w-[220px]',
          className,
        )}
        aria-label="Admin sidebar"
      >
        {sidebarBody}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex max-h-[min(85dvh,40rem)] flex-col gap-0 border-border-subtle bg-card p-0 pb-[env(safe-area-inset-bottom,0px)] layout-sm:hidden"
        >
          {mobileSidebarBody}
        </SheetContent>
      </Sheet>
    </>
  )
}

export function AdminSidebarMenuButton({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={onClick}
      className={cn('h-9 w-9 shrink-0 rounded-lg !p-0 layout-sm:hidden', className)}
      aria-label="Open admin navigation"
    >
      <Menu className="h-[15px] w-[15px]" aria-hidden />
    </Button>
  )
}

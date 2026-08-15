import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Gift,
  LifeBuoy,
  LogOut,
  Map,
  PackageSearch,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from '@/lib/icons'
import { SidebarNavLabelWithExtension } from '@/components/layout/SidebarNavLabelWithExtension'
import { withNavIconClass } from '@/lib/iconClassNames'
import { sidebarNavItemClassName } from '@/lib/sidebarNavStyles'
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_SECTION_LABELS,
  resolveAdminNavId,
} from '@/lib/adminNav'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { RemixIcon } from '@/lib/icons'

const ADMIN_NAV_ICONS: Record<string, RemixIcon> = {
  analytics: BarChart3,
  opportunities: Briefcase,
  users: Users,
  help: LifeBuoy,
  compliance: ShieldCheck,
  promo: Gift,
  settings: Settings,
  'analytics-war-room': Swords,
  'analytics-research': FlaskConical,
  'analytics-roadmap': Map,
  'analytics-itchmyback': Sparkles,
  'analytics-sourcing': PackageSearch,
  'analytics-market-test': FlaskConical,
}

type AdminSidebarContentProps = {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
  collapseEnabled?: boolean
  layout?: 'desktop' | 'sheet'
  className?: string
}

function adminPathExtension(path: string): string {
  if (path === '/admin' || path === '/admin/') return '/admin'
  return path.replace(/^\/admin/, '') || '/admin'
}

function AdminSidebarNavButton({
  active,
  icon,
  label,
  pathExtension,
  onClick,
  collapsed = false,
  touchLayout = false,
}: {
  active?: boolean
  icon: React.ReactNode
  label: string
  pathExtension?: string
  onClick: () => void
  collapsed?: boolean
  touchLayout?: boolean
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed && pathExtension ? `${label} ${pathExtension}` : collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={sidebarNavItemClassName(active, { touchLayout, collapsed })}
    >
      {withNavIconClass(icon, active, touchLayout ? 'md' : 'sm')}
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <SidebarNavLabelWithExtension label={label} />
      )}
    </button>
  )

  if (!collapsed) return button

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="px-2.5 py-2 text-xs">
        <p className="font-medium">{label}</p>
        {pathExtension ? (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{pathExtension}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

function AdminSidebarSectionLabel({
  children,
  collapsed = false,
}: {
  children: React.ReactNode
  collapsed?: boolean
}) {
  if (collapsed) {
    return (
      <div
        className="sidebar-section-divider mx-auto my-1.5 h-px w-5 shrink-0 rounded-full bg-border-subtle/90"
        role="separator"
        aria-hidden
      />
    )
  }

  return (
    <p className="sidebar-section-label px-2 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
      {children}
    </p>
  )
}

export function AdminSidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  collapseEnabled = true,
  layout = 'desktop',
  className,
}: AdminSidebarContentProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const showCollapsed = collapseEnabled && collapsed
  const isSheet = layout === 'sheet'
  const touchLayout = isSheet
  const activeId = resolveAdminNavId(location.pathname)

  const goTo = (path: string) => {
    navigate(path)
    onNavigate?.()
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {isSheet ? (
        <div className="flex shrink-0 flex-col items-center border-b border-border-subtle/80 px-4 pb-3 pt-2.5">
          <div className="mb-3 h-1 w-10 rounded-full bg-border-subtle" aria-hidden />
          <p className="w-full font-sans text-[15px] font-semibold tracking-tight text-foreground">Admin</p>
        </div>
      ) : (
        <div
          className={cn(
            'shrink-0 overflow-hidden border-b border-border-subtle/80',
            showCollapsed ? 'px-1 py-2' : 'px-2 py-2',
          )}
        >
          <div
            className={cn(
              'sidebar-header flex min-w-0 items-center gap-1',
              showCollapsed ? 'justify-center' : 'justify-between',
              !showCollapsed && collapseEnabled && onToggleCollapsed && 'sidebar-header-expanded group/header',
            )}
          >
            {showCollapsed ? (
              collapseEnabled && onToggleCollapsed ? (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onToggleCollapsed}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-muted/50"
                      aria-label="Expand admin sidebar"
                    >
                      <Shield className="h-4 w-4 shrink-0" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="px-2.5 py-2 text-xs">
                    Admin
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              )
            ) : (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                  <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="sidebar-label truncate text-[13px] font-semibold text-foreground">Admin</span>
                </div>
                {collapseEnabled && onToggleCollapsed ? (
                  <button
                    type="button"
                    onClick={onToggleCollapsed}
                    className={cn(
                      'sidebar-collapse-expanded sidebar-collapse-hover-only inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-subtle/80 bg-card text-muted-foreground',
                      'transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring layout-sm:inline-flex',
                    )}
                    aria-label="Collapse admin sidebar"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <nav
        className={cn(
          'legacy-scrollbar min-h-0 flex-1 overflow-y-auto',
          touchLayout ? 'px-3 py-2' : 'px-1.5 py-1.5',
        )}
        aria-label="Admin navigation"
      >
        <AdminSidebarSectionLabel collapsed={showCollapsed}>
          {ADMIN_NAV_SECTION_LABELS.platform}
        </AdminSidebarSectionLabel>
        <div className="flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.filter((item) => item.section === 'platform').map((item) => {
            const Icon = ADMIN_NAV_ICONS[item.id] ?? Shield
            return (
              <AdminSidebarNavButton
                key={item.id}
                collapsed={showCollapsed}
                touchLayout={touchLayout}
                active={activeId === item.id}
                icon={
                  <Icon
                    className={cn('shrink-0', touchLayout ? 'h-4 w-4' : 'h-3.5 w-3.5')}
                    aria-hidden
                  />
                }
                label={item.label}
                pathExtension={adminPathExtension(item.path)}
                onClick={() => goTo(item.path)}
              />
            )
          })}
        </div>

        <AdminSidebarSectionLabel collapsed={showCollapsed}>
          {ADMIN_NAV_SECTION_LABELS['product-analytics']}
        </AdminSidebarSectionLabel>
        <div className="flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.filter((item) => item.section === 'product-analytics').map((item) => {
            const Icon = ADMIN_NAV_ICONS[item.id] ?? Shield
            return (
              <AdminSidebarNavButton
                key={item.id}
                collapsed={showCollapsed}
                touchLayout={touchLayout}
                active={activeId === item.id}
                icon={
                  <Icon
                    className={cn('shrink-0', touchLayout ? 'h-4 w-4' : 'h-3.5 w-3.5')}
                    aria-hidden
                  />
                }
                label={item.label}
                pathExtension={adminPathExtension(item.path)}
                onClick={() => goTo(item.path)}
              />
            )
          })}
        </div>
      </nav>

      <div
        className={cn(
          'border-t border-border-subtle/80',
          touchLayout
            ? 'flex flex-col gap-1 px-3 py-3'
            : cn('px-1.5 py-2', showCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2'),
        )}
      >
        {collapseEnabled && onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              'sidebar-collapse-touch-only items-center justify-center gap-1.5 rounded-md border border-border-subtle/80 bg-card px-2 py-1.5 text-[11px] font-medium text-muted-foreground',
              'transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'w-full',
            )}
          >
            {showCollapsed ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Expand sidebar</span>
              </>
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        ) : null}

        <AdminSidebarNavButton
          collapsed={showCollapsed}
          touchLayout={touchLayout}
          icon={
            <LogOut
              className={cn('shrink-0', touchLayout ? 'h-4 w-4' : 'h-3.5 w-3.5')}
              aria-hidden
            />
          }
          label="Exit admin"
          pathExtension="/opportunities"
          onClick={() => goTo('/opportunities')}
        />
      </div>
    </div>
  )
}

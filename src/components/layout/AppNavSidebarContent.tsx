import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Gift,
  LayoutLeft,
  Compass,
  LayoutRight,
  Sparkles,
  X,
} from '@/lib/icons'

import { AppChromeProfileMenu } from '@/components/layout/AppChromeProfileMenu'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { SidebarNavLabelWithExtension } from '@/components/layout/SidebarNavLabelWithExtension'
import { withNavIconClass } from '@/lib/iconClassNames'
import {
  sidebarLogoShortClassName,
  sidebarLogoWordmarkClassName,
  sidebarNavItemClassName,
  sidebarNavListClassName,
  sidebarNavListCollapsedClassName,
} from '@/lib/sidebarNavStyles'
import { SidebarWorkspaceNavItem } from '@/components/layout/SidebarWorkspaceNavItem'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { landingSignInTo } from '@/lib/authLanding'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { isOpportunityDetailPath } from '@/lib/appPageBack'
import { hasSubscriptionFeature } from '@/lib/subscriptionStatus'
import {
  isSidebarWorkspaceNavActive,
  sidebarPrimaryNavItems,
  type SidebarWorkspaceNavItem as SidebarWorkspaceNavItemDef,
} from '@/lib/sidebarWorkspaceNav'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/components/ui/sonner'
import { isOpportunityPreviewPath } from '@/lib/publicMarketingPaths'

type AppNavSidebarContentProps = {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
  /** When false (mobile sheet), always render expanded chrome. */
  collapseEnabled?: boolean
  /** Sheet layout -- shows always-visible sidebar controls for touch. */
  layout?: 'desktop' | 'sheet'
  /** Hide Room workspace links (mobile bottom bar shows them). */
  hideWorkspaceNav?: boolean
  /** Onboarding reveal -- block destination clicks. */
  navigationLocked?: boolean
  className?: string
}

function SidebarNavButton({
  active,
  icon,
  label,
  onClick,
  collapsed = false,
  dataTour,
  touchLayout = false,
  denseIcons = false,
}: {
  active?: boolean
  icon: React.ReactNode
  label: string
  pathExtension?: string
  onClick: () => void
  collapsed?: boolean
  dataTour?: string
  touchLayout?: boolean
  denseIcons?: boolean
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      aria-label={collapsed ? label : undefined}
      className={sidebarNavItemClassName(active, { touchLayout, collapsed, denseIcons })}
    >
      {withNavIconClass(icon, active, denseIcons ? 'md' : 'sm')}
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <>
          <SidebarNavLabelWithExtension label={label} />
          <ChevronRight
            className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover/sidebar-nav:opacity-60"
            aria-hidden
          />
        </>
      )}
    </button>
  )

  if (!collapsed) return button

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="px-2.5 py-2 text-xs">
        <p className="font-medium">{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarSectionLabel({
  children,
  collapsed = false,
  touchLayout = false,
}: {
  children: React.ReactNode
  collapsed?: boolean
  touchLayout?: boolean
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
    <p className={cn(
      'sidebar-section-label px-2 pb-0.5 pt-2 font-semibold uppercase tracking-[0.14em] text-muted-foreground/80',
      touchLayout ? 'px-1 pb-1 pt-3 text-[11px]' : 'text-[10px]',
    )}>
      {children}
    </p>
  )
}

function SidebarCollapseButton({
  collapsed,
  onClick,
  className,
  iconClassName,
}: {
  collapsed: boolean
  onClick: () => void
  className?: string
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-border-subtle/50 bg-transparent text-muted-foreground',
        'transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none',
        className,
      )}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? (
        <LayoutRight className={cn('h-3.5 w-3.5', iconClassName)} aria-hidden />
      ) : (
        <LayoutLeft className={cn('h-3.5 w-3.5', iconClassName)} aria-hidden />
      )}
    </button>
  )
}

function SidebarCollapsedLogoSlot({
  onNavigate,
  navigationLocked = false,
}: {
  onNavigate?: () => void
  navigationLocked?: boolean
}) {
  return (
    <div className="flex w-full flex-col items-center border-b border-border-subtle">
      <div className="flex w-full items-center justify-center px-1 py-2">
        <BrandLogoLink
          to={roomPathForMode('scanner')}
          variant="short"
          onClick={(e) => {
            if (navigationLocked) {
              e.preventDefault()
              toast.message('Finish exploring this preview first')
              return
            }
            onNavigate?.()
          }}
          className={cn(
            'sidebar-collapsed-logo-mark h-8 w-8 max-h-8 max-w-8 justify-center !rounded-md !border-0 !p-0',
            'transition-[opacity,transform] duration-200 hover:scale-105 hover:opacity-80',
          )}
          logoClassName={sidebarLogoShortClassName}
        />
      </div>
    </div>
  )
}

export function AppNavSidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  collapseEnabled = true,
  layout = 'desktop',
  hideWorkspaceNav = false,
  navigationLocked = false,
  className,
}: AppNavSidebarContentProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { data: subscriptionStatus } = useSubscriptionStatus()
  const showCollapsed = collapseEnabled && collapsed
  const isSheet = layout === 'sheet'
  const touchLayout = isSheet
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '')
  const primaryNav = sidebarPrimaryNavItems({
    roadmapUnlocked: hasSubscriptionFeature(subscriptionStatus, 'roadmap_unlocked'),
    warroomUnlocked: hasSubscriptionFeature(subscriptionStatus, 'warroom_unlocked'),
    isAdmin,
  })
  const denseIcons =
    !isSheet &&
    (location.pathname === '/room' ||
      location.pathname.startsWith('/room') ||
      location.pathname === '/dashboard' ||
      location.pathname.startsWith('/dashboard/') ||
      location.pathname.startsWith('/scan/') ||
      location.pathname.startsWith('/profile') ||
      location.pathname.startsWith('/referrals') ||
      isOpportunityDetailPath(location.pathname))
  /** Dense room/opp icons are smaller; touch sheet keeps slightly larger targets. */
  const navIconClass = cn('shrink-0', touchLayout ? 'h-3.5 w-3.5' : denseIcons ? 'h-3 w-3' : 'h-3.5 w-3.5')

  const closeAndNavigate = (fn: () => void) => {
    if (navigationLocked) {
      toast.message('Finish exploring this preview first')
      return
    }
    fn()
    onNavigate?.()
  }

  if (!user) {
    if (!isOpportunityPreviewPath(location.pathname)) return null

    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        <div className={cn('shrink-0 overflow-hidden border-b border-border-subtle', showCollapsed ? 'px-1 py-2' : 'px-2 py-2')}>
          <BrandLogoLink
            to="/"
            onClick={() => onNavigate?.()}
            className={cn('h-8 min-w-0 overflow-hidden !px-1', showCollapsed && 'justify-center !px-0')}
            variant={showCollapsed ? 'short' : 'full'}
            logoClassName={showCollapsed ? sidebarLogoShortClassName : sidebarLogoWordmarkClassName}
          />
        </div>
        <nav className={cn('min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 py-1', sidebarNavListClassName)} aria-label="Public navigation">
          <SidebarNavButton
            icon={<Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            label="Explore opportunities"
            onClick={() => closeAndNavigate(() => navigate(roomPathForMode('search')))}
            collapsed={showCollapsed}
            touchLayout={touchLayout}
          />
          <SidebarNavButton
            icon={<Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            label="Sign in"
            onClick={() => closeAndNavigate(() => navigate(landingSignInTo(location.pathname)))}
            collapsed={showCollapsed}
            touchLayout={touchLayout}
          />
        </nav>
      </div>
    )
  }

  const isActive = (value: string) => {
    if (value === 'referrals') return location.pathname === '/referrals'
    return false
  }

  const goTo = (value: string) => {
    if (value === 'referrals') closeAndNavigate(() => navigate('/referrals'))
  }

  const renderWorkspaceNavItem = (item: SidebarWorkspaceNavItemDef) => {
    const Icon = item.icon
    return (
      <SidebarWorkspaceNavItem
        key={item.id}
        collapsed={showCollapsed}
        touchLayout={touchLayout}
        denseIcons={denseIcons}
        active={isSidebarWorkspaceNavActive(item, location.pathname, location.search)}
        icon={<Icon className={navIconClass} aria-hidden />}
        label={item.label}
        dataTour={`sidebar-nav-${item.id}`}
        onNavigate={() => closeAndNavigate(() => navigate(item.href))}
      />
    )
  }

  return (
    <>
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        {isSheet ? (
          <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <BrandLogoLink
              to={roomPathForMode('scanner')}
              onClick={(e) => {
                if (navigationLocked) {
                  e.preventDefault()
                  toast.message('Finish exploring this preview first')
                  return
                }
                onNavigate?.()
              }}
              className="h-8 min-w-0 flex-1 overflow-hidden !px-0"
              logoClassName={sidebarLogoWordmarkClassName}
            />
            <button
              type="button"
              onClick={() => onNavigate?.()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : showCollapsed ? (
          <div className="shrink-0">
            <SidebarCollapsedLogoSlot
              onNavigate={onNavigate}
              navigationLocked={navigationLocked}
            />
          </div>
        ) : (
        <div className="shrink-0 overflow-hidden border-b border-border-subtle px-2 py-2">
          <div className="sidebar-header flex min-w-0 items-center">
            <BrandLogoLink
              to={roomPathForMode('scanner')}
              onClick={(e) => {
                if (navigationLocked) {
                  e.preventDefault()
                  toast.message('Finish exploring this preview first')
                  return
                }
                onNavigate?.()
              }}
              className="h-8 min-w-0 flex-1 overflow-hidden !px-1"
              logoClassName={sidebarLogoWordmarkClassName}
            />
          </div>
        </div>
        )}

        <nav
          className={cn(
            'min-h-0 flex-1',
            // Always allow vertical scroll inside the sidebar — collapsed mode used
            // to clip with `overflow-hidden` which could hide items off the
            // narrow 52px rail. We rely on the inner list class for centering.
            'overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            touchLayout
              ? cn('px-4 py-3', sidebarNavListClassName, 'gap-2')
              : cn(
                  showCollapsed ? 'px-2 py-2' : 'px-2.5 py-3',
                  showCollapsed ? sidebarNavListCollapsedClassName : sidebarNavListClassName,
                ),
          )}
          aria-label="App navigation"
        >
          <div className={cn(showCollapsed ? sidebarNavListCollapsedClassName : sidebarNavListClassName)}>
            {primaryNav.map((item) => renderWorkspaceNavItem(item))}
            <SidebarNavButton
              collapsed={showCollapsed}
              touchLayout={touchLayout}
              denseIcons={denseIcons}
              active={isActive('referrals')}
              icon={<Gift className={navIconClass} aria-hidden />}
              label="Referrals"
              dataTour="sidebar-referrals"
              onClick={() => goTo('referrals')}
            />
          </div>
        </nav>

        <div
          className={cn(
            'mt-auto shrink-0 border-t border-border-subtle',
            touchLayout
              ? 'px-4 py-3'
              : showCollapsed
                ? 'flex flex-col items-center justify-center gap-2 px-2 py-2'
                : 'px-2.5 py-3',
          )}
        >
          <AppChromeProfileMenu
            variant="sidebar"
            collapsed={showCollapsed}
            onNavigate={onNavigate}
          />
          {collapseEnabled && onToggleCollapsed ? (
            showCollapsed ? (
              <SidebarCollapseButton
                collapsed
                onClick={onToggleCollapsed}
                className="h-8 w-8"
              />
            ) : (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  'mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5',
                  'text-[12px] font-medium text-muted-foreground',
                  'transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none',
                )}
              >
                <LayoutLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Collapse</span>
              </button>
            )
          ) : null}
        </div>
      </div>
    </>
  )
}

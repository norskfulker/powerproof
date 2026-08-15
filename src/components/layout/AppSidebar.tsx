import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AppNavSidebarContent } from '@/components/layout/AppNavSidebarContent'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { isOpportunityPreviewPath } from '@/lib/publicMarketingPaths'
import {
  APP_SIDEBAR_COLLAPSED_WIDTH_PX,
  APP_SIDEBAR_EXPANDED_WIDTH_PX,
} from '@/lib/platformLayout'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'powerproof_sidebar_collapsed'

type AppSidebarProps = {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Block nav destinations (onboarding reveal). Collapse still works. */
  navigationLocked?: boolean
  className?: string
}

export function readSidebarCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeSidebarCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function AppSidebar({
  mobileOpen = false,
  onMobileOpenChange,
  collapsed = false,
  onCollapsedChange,
  navigationLocked = false,
  className,
}: AppSidebarProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const showGuestNav = !user && isOpportunityPreviewPath(pathname)
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobile()

  if (!user && !showGuestNav) return null

  // Smooth ease — spring + inline width fought CSS and felt janky.
  const widthTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

  const sidebarBody = (
    <AppNavSidebarContent
      collapsed={isMobile ? false : collapsed}
      collapseEnabled={!isMobile}
      navigationLocked={navigationLocked}
      onToggleCollapsed={() => {
        if (isMobile) return
        const next = !collapsed
        onCollapsedChange?.(next)
        writeSidebarCollapsedPreference(next)
      }}
      onNavigate={() => onMobileOpenChange?.(false)}
    />
  )

  // Width used everywhere (mobile fixed positioning, mobile push offset).
  const expandedWidth = APP_SIDEBAR_EXPANDED_WIDTH_PX

  return (
    <motion.aside
      className={cn(
        'app-sidebar flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-background',
        isMobile && 'fixed inset-y-0 left-0 z-[360]',
        !isMobile && collapsed ? 'is-collapsed' : '',
        className,
      )}
      initial={false}
      animate={
        isMobile
          ? { x: mobileOpen ? 0 : -expandedWidth, width: expandedWidth }
          : {
              // Always clear mobile off-canvas translate when returning to desktop
              // (orientation / resize across the mobile breakpoint).
              x: 0,
              width: collapsed ? APP_SIDEBAR_COLLAPSED_WIDTH_PX : APP_SIDEBAR_EXPANDED_WIDTH_PX,
            }
      }
      transition={widthTransition}
      aria-label="App sidebar"
      aria-hidden={isMobile && !mobileOpen}
    >
      {sidebarBody}
    </motion.aside>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@/lib/icons'

import {
  isSidebarWorkspaceNavActive,
  MOBILE_BOTTOM_NAV,
} from '@/lib/sidebarWorkspaceNav'
import { navIconClassName, navIconClassNameMd } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'

export const APP_BOTTOM_NAV_H_PX = 72

type AppBottomNavProps = {
  moreOpen?: boolean
  onMoreOpenChange?: (open: boolean) => void
}

function bottomNavItemClass(active: boolean) {
  return cn(
    'relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1.5 py-2',
    'rounded-xl text-[10px] font-semibold leading-none tracking-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active
      ? 'text-primary'
      : 'text-muted-foreground hover:bg-muted/35 hover:text-foreground',
  )
}

export function AppBottomNav({ moreOpen = false, onMoreOpenChange }: AppBottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-border-subtle/70 bg-card/90 shadow-[0_-6px_28px_-10px_rgba(0,0,0,0.14)] backdrop-blur-xl layout-sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-4 items-stretch px-1 pt-0.5">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const active = isSidebarWorkspaceNavActive(item, location.pathname, location.search)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.href)}
              data-tour={`sidebar-nav-${item.id}`}
              aria-current={active ? 'page' : undefined}
              className={cn('group', bottomNavItemClass(active))}
            >
              <Icon className={navIconClassNameMd(active)} strokeWidth={active ? 2.25 : 2} aria-hidden />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onMoreOpenChange?.(!moreOpen)}
          aria-expanded={moreOpen}
          aria-label="Open menu"
          aria-haspopup="dialog"
          className={cn('group', bottomNavItemClass(moreOpen))}
        >
          <Menu className={navIconClassNameMd(moreOpen)} strokeWidth={moreOpen ? 2.25 : 2} aria-hidden />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  )
}

export function appBottomNavPaddingClass() {
  return 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] layout-sm:pb-0'
}

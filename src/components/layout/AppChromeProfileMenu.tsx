import { useNavigate } from 'react-router-dom'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/contexts/AuthContext'
import { CreditCard, LogOut, User } from '@/lib/icons'
import { getProfileDisplayName, getProfileInitial } from '@/lib/profileDisplayName'
import { cn } from '@/lib/utils'

const menuItemClassName = cn(
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
  'font-sans text-[13px] font-medium text-foreground',
  'transition-colors hover:bg-muted/60',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
)

type AppChromeProfileMenuProps = {
  variant?: 'header' | 'sidebar'
  collapsed?: boolean
  onNavigate?: () => void
}

export function AppChromeProfileMenu({
  variant = 'header',
  collapsed = false,
  onNavigate,
}: AppChromeProfileMenuProps) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const displayName = getProfileDisplayName(profile, user, 'Account')
  const initial = getProfileInitial(profile, user)
  const isSidebar = variant === 'sidebar'
  const isCollapsedRail = isSidebar && collapsed

  if (!user) return null

  const go = (path: string) => {
    onNavigate?.()
    navigate(path)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
          title={isCollapsedRail ? displayName : undefined}
          className={
            isCollapsedRail
              ? cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  'bg-muted text-[11px] font-semibold text-foreground',
                  'transition-colors hover:bg-muted/80',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )
              : isSidebar
                ? cn(
                    'inline-flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5',
                    'text-left text-[13px] font-medium text-foreground',
                    'transition-colors hover:bg-muted/50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )
                : cn(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    'bg-muted text-[11px] font-semibold text-foreground',
                    'transition-colors hover:bg-muted/80',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )
          }
        >
          {isSidebar && !isCollapsedRail ? (
            <>
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground"
                aria-hidden
              >
                {initial}
              </span>
              <span className="min-w-0 truncate">{displayName}</span>
            </>
          ) : (
            initial
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={isSidebar ? 'start' : 'end'}
        side={isCollapsedRail ? 'right' : 'top'}
        sideOffset={8}
        className="w-56 p-1.5"
      >
        <p className="truncate px-2 py-1.5 font-sans text-[12px] font-semibold text-foreground">
          {displayName}
        </p>
        <button type="button" className={menuItemClassName} onClick={() => go('/profile')}>
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          Profile
        </button>
        <button
          type="button"
          className={menuItemClassName}
          onClick={() => go('/profile?tab=subscription')}
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          Billing
        </button>
        <button
          type="button"
          className={cn(menuItemClassName, 'text-destructive hover:bg-destructive/10')}
          onClick={async () => {
            onNavigate?.()
            await signOut()
            navigate('/', { replace: true })
          }}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Log out
        </button>
      </PopoverContent>
    </Popover>
  )
}

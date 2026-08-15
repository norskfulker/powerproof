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

export function AppChromeProfileMenu() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const displayName = getProfileDisplayName(profile, user, 'Account')
  const initial = getProfileInitial(profile, user)

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'bg-muted text-[11px] font-semibold text-foreground',
            'transition-colors hover:bg-muted/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {initial}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-1.5">
        <p className="truncate px-2 py-1.5 font-sans text-[12px] font-semibold text-foreground">
          {displayName}
        </p>
        <button
          type="button"
          className={menuItemClassName}
          onClick={() => navigate('/profile')}
        >
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          Profile
        </button>
        <button
          type="button"
          className={menuItemClassName}
          onClick={() => navigate('/profile?tab=subscription')}
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          Billing
        </button>
        <button
          type="button"
          className={cn(menuItemClassName, 'text-destructive hover:bg-destructive/10')}
          onClick={async () => {
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

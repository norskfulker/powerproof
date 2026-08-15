import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft } from '@/lib/icons'
import { resolveAppPageBackHref } from '@/lib/appPageBack'
import { cn } from '@/lib/utils'

const backBarButtonClass = cn(
  'inline-flex items-center gap-1.5 rounded-[10px] border border-border-default bg-surface px-3.5 py-2',
  'font-sans text-[13px] font-semibold text-muted-foreground no-underline transition-colors',
  'hover:border-primary/35 hover:bg-surface-hover hover:text-foreground',
)

export function InvestorDetailBackBar() {
  const location = useLocation()
  const backHref = resolveAppPageBackHref(location.pathname, location.state)

  return (
    <div className="flex w-full min-w-0 items-center pb-1 layout-sm:pb-2">
      <Link to={backHref} className={backBarButtonClass}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to Investors
      </Link>
    </div>
  )
}

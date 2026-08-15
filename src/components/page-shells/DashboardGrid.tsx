import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

/** Cards and dashboard-style layouts — width from AppLayout shell */
export function DashboardGrid({ children, className }: PageShellProps) {
  return <div className={cn('w-full py-5 layout-sm:py-8', className)}>{children}</div>
}

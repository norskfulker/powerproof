import { platformContainerClass } from '@/lib/platformLayout'
import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

/** Admin main content — platform width, table-friendly */
export function AdminWorkspace({ children, className }: PageShellProps) {
  return (
    <div className={cn(platformContainerClass, 'px-4 py-6 layout-sm:px-6', className)}>
      {children}
    </div>
  )
}

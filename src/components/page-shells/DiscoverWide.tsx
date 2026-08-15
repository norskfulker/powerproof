import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

/** Page content column — 1200px platform max, centered. */
export function DiscoverWide({ children, className }: PageShellProps) {
  return <div className={cn('mx-auto w-full max-w-platform', className)}>{children}</div>
}

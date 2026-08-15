import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

type DetailSplitProps = PageShellProps & {
  /** @deprecated Use platform (1200px). Other values map to platform for consistency. */
  maxWidth?: 'platform' | '7xl' | '6xl' | 'full'
}

/** Detail / loading states — width from AppLayout shell */
export function DetailSplit({ children, className }: DetailSplitProps) {
  return <div className={cn('w-full', className)}>{children}</div>
}

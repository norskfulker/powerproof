import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

type DocumentColumnProps = PageShellProps & {
  /** @deprecated All widths use platform (1200px). Prop kept for call-site compatibility. */
  width?: 'default' | 'wide' | 'narrow' | 'platform'
}

/** Centered app column — width from AppLayout shell */
export function DocumentColumn({ children, className }: DocumentColumnProps) {
  return <div className={cn('w-full py-6 layout-sm:py-8', className)}>{children}</div>
}

import { cn } from '@/lib/utils'
import type { PageShellProps } from './types'

/** Feed / full-bleed experiences with minimal chrome */
export function ImmersiveFullBleed({ children, className }: PageShellProps) {
  return <div className={cn('min-h-dvh w-full', className)}>{children}</div>
}

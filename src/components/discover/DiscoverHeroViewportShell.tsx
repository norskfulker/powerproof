import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { discoverHeroViewportShellClassName } from '@/components/discover/discoverHeroTokens'

export function DiscoverHeroViewportShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        discoverHeroViewportShellClassName,
        'relative isolate flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-visible bg-background',
        className,
      )}
    >
      {children}
    </div>
  )
}

import { cn } from '@/lib/utils'

export function InvestorsFullWidthSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 border-t border-border-subtle',
        className,
      )}
      role="separator"
    />
  )
}

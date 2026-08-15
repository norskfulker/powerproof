import { cn } from '@/lib/utils'

/** @deprecated Blur/gating removed — list is shown unlocked. Kept for import safety. */
export function InvestorsLockedPlaceholderList({ className }: { className?: string }) {
  return <div className={cn('hidden', className)} aria-hidden data-locked-investors-list />
}

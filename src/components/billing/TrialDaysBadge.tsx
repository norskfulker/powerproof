import { Clock, Sparkles } from '@/lib/icons'
import type { SubscriptionStatus } from '@/lib/subscriptionStatus'
import {
  getTrialDaysRemaining,
  getTrialSeverity,
  trialLabel,
  type TrialSeverity,
} from '@/lib/subscriptionStatus'
import { cn } from '@/lib/utils'

type TrialDaysBadgeProps = {
  status: SubscriptionStatus | null | undefined
  /**
   * Visual density.
   *   `pill`    — standalone pill (used in pricing/profile banner)
   *   `inline`  — short text (used in sidebar/UsageBadge secondary line)
   */
  variant?: 'pill' | 'inline'
  className?: string
}

const SEVERITY_PILL_STYLES: Record<TrialSeverity, string> = {
  normal:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-300',
  warning:
    'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-300/60 dark:border-amber-300/40 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-300/30',
  urgent:
    'border-red-200 bg-red-50 text-red-700 ring-1 ring-red-300/60 dark:border-red-300/30 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-300/30',
  expired:
    'border-red-300 bg-red-100 text-red-800 dark:border-red-300/40 dark:bg-red-500/15 dark:text-red-200',
}

const SEVERITY_INLINE_STYLES: Record<TrialSeverity, string> = {
  normal: 'text-amber-700 dark:text-amber-300',
  warning: 'text-amber-700 dark:text-amber-200',
  urgent: 'font-medium text-red-600 dark:text-red-300',
  expired: 'font-medium text-red-600 dark:text-red-300',
}

/**
 * Renders the trial-expiry indicator for a user's current subscription.
 *
 * Returns `null` when there is no trial to surface (paid / free /
 * unauthed), so consumers can drop it into any plan badge slot without
 * conditional checks.
 *
 * Severity escalates the visual treatment as the trial approaches expiry:
 *   `> 2 days`  → calm saffron text
 *   `== 2 days` → saffron with ring
 *   `== 1 day`  → red pill, "Last day of trial"
 *   `== 0 days` → red, "Trial ended"
 */
export function TrialDaysBadge({ status, variant = 'pill', className }: TrialDaysBadgeProps) {
  const days = getTrialDaysRemaining(status)
  if (days === null) return null
  const severity = getTrialSeverity(days)

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 truncate text-[10.5px]',
          SEVERITY_INLINE_STYLES[severity],
          className,
        )}
        aria-label={trialLabel(days)}
      >
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        {trialLabel(days)}
      </span>
    )
  }

  const isEndingSoon = severity === 'urgent' || severity === 'expired'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        SEVERITY_PILL_STYLES[severity],
        className,
      )}
      role="status"
      aria-label={trialLabel(days)}
    >
      {isEndingSoon ? (
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {trialLabel(days)}
    </span>
  )
}
export type SubscriptionFeatureLocks = {
  roadmap_unlocked: boolean
  warroom_unlocked: boolean
  investors_list_unlocked: boolean
  chat_unlimited: boolean
}

export type SubscriptionUsageItem = {
  used: number
  allowance: number
  remaining: number
}

export type SubscriptionUsageBucket =
  | 'reports_standard'
  | 'reports_premium'
  | 'sourcing'
  | 'market_test'
  | 'edits'
  | 'roadmap'
  | 'warroom'

export type SubscriptionUsage = Partial<Record<SubscriptionUsageBucket, SubscriptionUsageItem>>

export type SubscriptionChatStatus =
  | {
      unlimited: true
    }
  | {
      unlimited: false
      used: number
      allowance: number
      remaining: number
      resets: 'daily'
    }

export type PendingSubscription = {
  plan_id: string
  plan_slug: string
  plan_name: string
  razorpay_subscription_id: string
  created_at: string
}

export type ActiveSubscriptionStatus = {
  success: true
  plan: {
    slug: string
    name: string
  }
  status: string
  period_start: string | null
  period_end: string | null
  cancel_at_period_end: boolean
  feature_locks: SubscriptionFeatureLocks
  usage: SubscriptionUsage
  chat: SubscriptionChatStatus
  pending_subscription: PendingSubscription | null
  /**
   * Whole days remaining in the user's active trial. Populated by
   * `get_my_subscription_status()` only when `status === 'trialing'`. The
   * backend uses ceiling math, so a user with 5 days 12 hours left sees 6,
   * never 5. Always `null` for paid / free (non-trialing) statuses.
   */
  trial_days_remaining: number | null
}

export type InactiveSubscriptionStatus = {
  success: false
  error: 'no_active_subscription' | 'unauthorized' | string
  pending_subscription: PendingSubscription | null
}

export type SubscriptionStatus = ActiveSubscriptionStatus | InactiveSubscriptionStatus

export function hasSubscriptionFeature(
  status: SubscriptionStatus | null | undefined,
  feature: keyof SubscriptionFeatureLocks,
): boolean {
  return status?.success === true && status.feature_locks[feature] === true
}

/**
 * Paid Unlimited plan for marketing / usage UI — never surface numeric run caps.
 * Prefer feature lock + slug so display stays correct if the plan name changes.
 */
export function isUnlimitedPaidPlanDisplay(
  status: ActiveSubscriptionStatus | null | undefined,
): boolean {
  if (!status) return false
  if (status.plan.slug === 'pro') return true
  if (status.feature_locks.chat_unlimited) return true
  if (status.chat.unlimited === true) return true
  return false
}

/**
 * Trial-end signaling. The RPC only populates `trial_days_remaining` while
 * `status === 'trialing'`, so this guard is the single source of truth for
 * "should we show a trial-expiry hint?". Returns `null` when the indicator
 * should NOT be rendered (paid / free, expired trial, or status pending).
 * Returns the integer count otherwise.
 */
export function getTrialDaysRemaining(
  status: SubscriptionStatus | null | undefined,
): number | null {
  if (!status || status.success !== true) return null
  if (status.status !== 'trialing') return null
  const days = status.trial_days_remaining
  if (days == null || !Number.isFinite(days)) return null
  return Math.max(0, Math.floor(days))
}

/**
 * Severity tier for the trial-expiry indicator. The pricing+profile surfaces
 * use this to escalate the visual treatment (red ring, urgency copy) when the
 * trial is about to lapse.
 *
 *   >  2 days  → 'normal'   (saffron pill, calm)
 *   == 2 days  → 'warning'  (saffron ring, "Ending soon")
 *   == 1 day   → 'urgent'   (red pill, "Last day")
 *   == 0 days  → 'expired'  (red, "Trial ended")
 */
export type TrialSeverity = 'normal' | 'warning' | 'urgent' | 'expired'

export function getTrialSeverity(days: number): TrialSeverity {
  if (days <= 0) return 'expired'
  if (days === 1) return 'urgent'
  if (days === 2) return 'warning'
  return 'normal'
}

/** Human copy for a trial-expiry indicator. */
export function trialLabel(days: number): string {
  if (days <= 0) return 'Trial ended'
  if (days === 1) return 'Last day of trial'
  return `${days} days left in trial`
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionCancel } from '@/hooks/useSubscriptionCancel'
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout'
import { useSubscriptionPlans, type SubscriptionPlan } from '@/hooks/useSubscriptionPlans'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { landingSignInTo } from '@/lib/authLanding'
import { TrialDaysBadge } from '@/components/billing/TrialDaysBadge'
import {
  getTrialDaysRemaining,
  getTrialSeverity,
  isUnlimitedPaidPlanDisplay,
} from '@/lib/subscriptionStatus'
import { Check, MessageCircle } from '@/lib/icons'
import { getProfileDisplayName } from '@/lib/profileDisplayName'
import type { ActiveSubscriptionStatus } from '@/lib/subscriptionStatus'
import { cn } from '@/lib/utils'

/** Marketing feature lines for the paid Unlimited plan — never surface numeric caps. */
const UNLIMITED_PLAN_FEATURES = [
  'Unlimited Standard Reports',
  'Unlimited Premium Reports',
  'Unlimited Sourcing Runs',
  'Unlimited Market Tests',
  'Unlimited AI Edits',
  'Unlimited Sourcing Runs',
  'Website Scanner',
  'Unlimited AI Chat',
  'Investor Library included',
] as const

function planIsUnlimitedMarketing(plan: SubscriptionPlan): boolean {
  return plan.slug === 'pro' || plan.chat_unlimited === true
}

type SubscriptionPlansProps = {
  className?: string
  compact?: boolean
}

export function SubscriptionPlans({ className, compact = false }: SubscriptionPlansProps) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { data: plans, isLoading, isError } = useSubscriptionPlans()
  const { data: subscriptionStatus, refetch: refetchSubscriptionStatus } = useSubscriptionStatus()
  const { startCheckout, isLoading: checkoutLoading } = useSubscriptionCheckout()
  const { cancelSubscription, isLoading: cancelLoading } = useSubscriptionCancel()
  const [activatingPlanSlug, setActivatingPlanSlug] = useState<string | null>(null)
  const [cancelPlanConfirmOpen, setCancelPlanConfirmOpen] = useState(false)

  const activeStatus: ActiveSubscriptionStatus | null =
    subscriptionStatus?.success ? subscriptionStatus : null
  const currentPlanSlug = activeStatus?.plan.slug ?? null
  const pendingSubscription = subscriptionStatus?.pending_subscription ?? null
  const paidPlans = useMemo(
    () => (plans ?? []).filter((plan) => plan.slug !== 'trial' && plan.slug !== 'free'),
    [plans],
  )

  useEffect(() => {
    if (!activatingPlanSlug) return

    if (currentPlanSlug === activatingPlanSlug) {
      setActivatingPlanSlug(null)
      toast.success('Plan activated', {
        description: `Your ${activeStatus?.plan.name ?? 'new'} plan is ready to use.`,
      })
      return
    }

    const poll = window.setInterval(() => {
      void refetchSubscriptionStatus()
    }, 2_500)
    const timeout = window.setTimeout(() => {
      setActivatingPlanSlug(null)
      toast.info('Plan activation is taking longer than expected', {
        description: 'Razorpay confirmation may still be processing. Your plan status will update automatically.',
      })
    }, 30_000)

    return () => {
      window.clearInterval(poll)
      window.clearTimeout(timeout)
    }
  }, [
    activeStatus?.plan.name,
    activatingPlanSlug,
    currentPlanSlug,
    refetchSubscriptionStatus,
  ])

  const subscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate(landingSignInTo('/pricing'))
      return
    }

    const result = await startCheckout(plan.id, {
      userEmail: profile?.email || user.email || '',
      userName: getProfileDisplayName(profile, user, 'PowerProof user'),
      userPhone: profile?.phone ?? undefined,
    })

    if (result.success) {
      setActivatingPlanSlug(plan.slug)
      toast.success(currentPlanSlug ? 'Plan updated' : 'Payment submitted', {
        description: `Activating your ${plan.name} plan after Razorpay confirms the payment…`,
      })
    } else if (result.reason !== 'dismissed') {
      toast.error('Could not start subscription', {
        description:
          result.reason === 'already_subscribed'
            ? `${plan.name} is already your current plan.`
            : result.reason,
      })
    }
  }

  if (isLoading) {
    return (
      <div className={cn('mx-auto max-w-lg', className)} aria-label="Loading plans">
        <div className={cn('animate-pulse rounded-2xl bg-muted', compact ? 'h-72' : 'h-[28rem]')} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('mx-auto max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center text-sm text-destructive', className)}>
        Plans could not be loaded. Please try again.
      </div>
    )
  }

  const trialDays = getTrialDaysRemaining(activeStatus)
  const trialSeverity = trialDays !== null ? getTrialSeverity(trialDays) : null
  const isFreeTier = activeStatus?.plan.slug === 'free'
  const isTrialTier = activeStatus?.plan.slug === 'trial' || trialDays !== null
  const showBanner = !compact && (trialDays !== null || isFreeTier)
  const singlePaid = paidPlans.length <= 1

  return (
    <>
      {showBanner ? (
        trialDays !== null ? (
          <TrialBanner days={trialDays} severity={trialSeverity!} />
        ) : isFreeTier ? (
          <FreePlanBanner planName={paidPlans[0]?.name ?? 'Unlimited'} />
        ) : null
      ) : null}
      <div
        className={cn(
          singlePaid ? (compact ? 'mx-auto w-full max-w-none' : 'mx-auto max-w-lg') : 'grid gap-4 sm:grid-cols-2',
          className,
        )}
      >
        {paidPlans.map((plan) => {
          const current = currentPlanSlug === plan.slug
          const checkoutReady = Boolean(plan.razorpay_plan_id)
          const activating = activatingPlanSlug === plan.slug
          const pending = pendingSubscription?.plan_slug === plan.slug
          const unlimitedMarketing = planIsUnlimitedMarketing(plan)
          const onUnlimited =
            current && activeStatus ? isUnlimitedPaidPlanDisplay(activeStatus) : unlimitedMarketing

          const signedInCta = currentPlanSlug
            ? currentPlanSlug === 'free' || currentPlanSlug === 'trial'
              ? `Get ${plan.name}`
              : `Switch to ${plan.name}`
            : `Choose ${plan.name}`

          return (
            <section
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-card',
                compact ? 'border-0 p-0 shadow-none' : 'p-6 shadow-sm',
                !compact && unlimitedMarketing
                  ? 'border-primary/40 ring-1 ring-primary/15'
                  : !compact
                    ? 'border-border-subtle'
                    : null,
              )}
            >
              <div>
                {!compact ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    One plan. Everything included.
                  </p>
                ) : null}
                <div className={cn('flex flex-wrap items-center gap-2', !compact && 'mt-2')}>
                  <h2 className={cn('font-display font-medium text-foreground', compact ? 'text-lg' : 'text-xl')}>
                    {plan.name}
                  </h2>
                  {compact && isFreeTier ? (
                    <span
                      className="inline-flex items-center rounded-full border border-border-default bg-bg-sunken px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                      aria-label="Current plan: Free"
                    >
                      Free
                    </span>
                  ) : null}
                  {compact && isTrialTier && !isFreeTier ? (
                    <TrialDaysBadge status={subscriptionStatus} variant="pill" className="!px-2 !py-0.5 !text-[10.5px]" />
                  ) : null}
                </div>
                {!compact ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No tiers to compare. No features held back. Just one plan that covers research,
                    sourcing, investor library, website scanner, and AI chat.
                  </p>
                ) : null}
                <div className={cn('flex items-end gap-1', compact ? 'mt-2' : 'mt-4')}>
                  <span className={cn('font-bold text-foreground', compact ? 'text-2xl' : 'text-3xl')}>
                    ₹{Number(plan.price_inr).toLocaleString('en-IN')}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">/ month</span>
                </div>
              </div>

              <ul
                className={cn(
                  'flex flex-1 flex-col gap-2',
                  compact ? 'mt-3' : 'mt-6',
                )}
                aria-label={`${plan.name} includes`}
              >
                {UNLIMITED_PLAN_FEATURES.map((label) => (
                  <li
                    key={label}
                    className={cn(
                      'flex min-w-0 items-start gap-2 leading-snug text-foreground',
                      compact ? 'text-[12.5px]' : 'text-[13px]',
                    )}
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>
                      {onUnlimited && current && label.startsWith('Unlimited') ? (
                        <>
                          <strong className="font-semibold">{label}</strong>
                        </>
                      ) : (
                        label
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {!compact && current && onUnlimited ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  You&apos;re on Unlimited — no monthly run meters to watch.
                </p>
              ) : null}

              <div className={cn('flex w-full items-center gap-2', compact ? 'mt-4' : 'mt-7')}>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={current || checkoutLoading || Boolean(activatingPlanSlug) || !checkoutReady}
                  onClick={() => void subscribe(plan)}
                >
                  {current
                    ? 'Current Plan'
                    : activating
                      ? `Activating ${plan.name}…`
                      : pending
                        ? 'Resume Checkout'
                        : checkoutReady
                          ? user
                            ? signedInCta
                            : `Sign in to choose ${plan.name}`
                          : 'Checkout setup pending'}
                </Button>
                {current && user ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    disabled={cancelLoading}
                    onClick={() => setCancelPlanConfirmOpen(true)}
                    className="shrink-0"
                  >
                    Cancel plan
                  </Button>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
      <ConfirmDialog
        open={cancelPlanConfirmOpen}
        title="Cancel your plan?"
        description="Your subscription will be cancelled and plan access may end immediately."
        confirmLabel={cancelLoading ? 'Cancelling…' : 'Cancel Plan'}
        cancelLabel="Keep Plan"
        destructive
        loading={cancelLoading}
        onCancel={() => {
          if (!cancelLoading) setCancelPlanConfirmOpen(false)
        }}
        onConfirm={async () => {
          const result = await cancelSubscription()
          if (result.success) {
            toast.success('Plan cancelled', {
              description: 'Your access will end at the close of the current period.',
            })
            await refetchSubscriptionStatus()
            setCancelPlanConfirmOpen(false)
          } else {
            toast.error('Could not cancel your plan', {
              description:
                'reason' in result && result.reason ? result.reason : 'Please try again.',
            })
          }
        }}
      />
    </>
  )
}

function TrialBanner({ days, severity }: { days: number; severity: 'normal' | 'warning' | 'urgent' | 'expired' }) {
  const isEndingSoon = severity === 'urgent' || severity === 'expired'
  const isWarning = severity === 'warning'

  let title: string
  let body: string
  if (severity === 'expired') {
    title = 'Your trial has ended'
    body = 'Choose Unlimited below to keep your reports, chat, and saved research. Your data stays.'
  } else if (severity === 'urgent') {
    title = 'Last day of your trial'
    body = 'Your trial ends today. Choose Unlimited below to keep your access — nothing changes until you do.'
  } else if (severity === 'warning') {
    title = 'Two days left in your trial'
    body = 'Your trial ends soon. Choose Unlimited below any time to keep your access.'
  } else {
    title = `You're on a ${days}-day trial`
    body = 'Explore freely. One plan covers everything when you are ready — no tiers to compare.'
  }

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4',
        isEndingSoon
          ? 'border-red-200 bg-red-50/60 dark:border-red-300/30 dark:bg-red-500/10'
          : isWarning
            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-300/30 dark:bg-amber-500/10'
            : 'border-amber-200 bg-amber-50/40 dark:border-amber-300/20 dark:bg-amber-500/5',
      )}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-display text-[15px] font-medium leading-tight tracking-heading',
            isEndingSoon
              ? 'text-red-700 dark:text-red-300'
              : 'text-amber-700 dark:text-amber-300',
          )}
        >
          {title}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
      <TrialDaysBadge
        status={{
          success: true,
          plan: { slug: 'trial', name: 'Trial' },
          status: 'trialing',
          period_start: null,
          period_end: null,
          cancel_at_period_end: false,
          feature_locks: {
            roadmap_unlocked: false,
            warroom_unlocked: false,
            investors_list_unlocked: false,
            chat_unlimited: false,
          },
          usage: {},
          chat: { unlimited: false, used: 0, allowance: 0, remaining: 0, resets: 'daily' },
          pending_subscription: null,
          trial_days_remaining: days,
        }}
        variant="pill"
      />
    </div>
  )
}

function FreePlanBanner({ planName }: { planName: string }) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-start gap-3 rounded-2xl border border-border-subtle bg-card/70 px-4 py-3.5 sm:px-5 sm:py-4',
      )}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-medium leading-tight tracking-heading text-foreground">
          You&apos;re on the Free plan
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {planName} includes everything — research, sourcing, investor library, website scanner,
          investors, and AI chat — with no tiers to compare.
        </p>
      </div>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-sunken px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        aria-label="Current plan: Free"
      >
        Free plan
      </span>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { Crown } from '@/lib/icons'
import {
  getTrialDaysRemaining,
  isUnlimitedPaidPlanDisplay,
  trialLabel,
  type ActiveSubscriptionStatus,
} from '@/lib/subscriptionStatus'
import { TrialDaysBadge } from '@/components/billing/TrialDaysBadge'
import { openSubscriptionPricingDialog } from '@/store/filterStore'
import { cn } from '@/lib/utils'

function usageSummary(status: ActiveSubscriptionStatus): string | null {
  if (isUnlimitedPaidPlanDisplay(status)) return 'Unlimited'
  const reports = status.usage.reports_standard
  if (!reports || !Number.isFinite(reports.allowance)) return null
  return `${reports.remaining.toLocaleString('en-IN')} of ${reports.allowance.toLocaleString('en-IN')} reports left`
}

export function UsageBadge({
  collapsed = false,
  touchLayout = false,
  className,
  onNavigate,
}: {
  collapsed?: boolean
  touchLayout?: boolean
  className?: string
  onNavigate?: () => void
}) {
  const { data, isLoading, isError, refetch } = useSubscriptionStatus()

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-lg bg-muted',
          collapsed ? 'mx-auto h-9 w-9' : touchLayout ? 'h-12 w-full' : 'h-9 w-full',
          className,
        )}
        aria-label="Loading plan usage"
      />
    )
  }

  if (data?.success === false && data.error === 'unauthorized') return null

  const openPlans = () => {
    openSubscriptionPricingDialog()
    onNavigate?.()
  }

  const trialDays = data?.success ? getTrialDaysRemaining(data) : null
  const trialLabelText = trialDays !== null ? trialLabel(trialDays) : null

  const content = data?.success ? (
    <>
      <span className="truncate font-semibold">{data.plan.name}</span>
      {!collapsed && trialDays === null && usageSummary(data) ? (
        <span className="truncate text-[10px] font-normal text-muted-foreground">
          {usageSummary(data)}
        </span>
      ) : null}
    </>
  ) : (
    <span className="truncate font-semibold">
      {isError ? 'Plan unavailable' : 'Choose a plan'}
    </span>
  )

  const ariaExtras = data?.success
    ? [trialLabelText, usageSummary(data)].filter(Boolean).join(', ')
    : ''

  const button = (
    <Button
      type="button"
      variant="secondary"
      onClick={isError ? () => void refetch() : openPlans}
      className={cn(
        'min-w-0 border border-border-subtle bg-card text-foreground shadow-none hover:bg-muted/60',
        collapsed
          ? 'h-9 w-full px-0'
          : touchLayout
            ? 'h-12 w-full justify-start gap-2.5 px-3'
            : 'h-9 w-full justify-start gap-2 px-2.5',
        className,
      )}
      aria-label={
        data?.success
          ? `${data.plan.name} plan${ariaExtras ? `, ${ariaExtras}` : ''}`
          : isError
            ? 'Plan unavailable, retry'
            : 'Choose a plan'
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Crown className="h-3 w-3" aria-hidden />
      </span>
      {!collapsed ? (
        <span className="flex min-w-0 flex-col items-start leading-tight">
          {content}
          {trialDays !== null ? (
            <TrialDaysBadge
              status={data}
              variant="inline"
              className="mt-0.5"
            />
          ) : null}
        </span>
      ) : null}
    </Button>
  )

  if (!collapsed) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">
        {data?.success
          ? trialLabelText
            ? `${data.plan.name} · ${trialLabelText}${usageSummary(data) ? ` · ${usageSummary(data)}` : ''}`
            : `${data.plan.name}${usageSummary(data) ? ` · ${usageSummary(data)}` : ''}`
          : isError
            ? 'Retry plan status'
            : 'Choose a plan'}
      </TooltipContent>
    </Tooltip>
  )
}

import { EdgeApiError } from '@/lib/edgeApiError'

export type PlanGateReason =
  | 'no_active_subscription'
  | 'feature_locked'
  | 'limit_exceeded'

export function planGateReason(error: unknown): PlanGateReason | null {
  const code =
    error instanceof EdgeApiError
      ? error.code
      : error instanceof Error
        ? error.message
        : String(error ?? '')

  if (code === 'no_active_subscription') return 'no_active_subscription'
  if (code === 'feature_locked') return 'feature_locked'
  if (code === 'limit_exceeded' || code === 'insufficient_credits') return 'limit_exceeded'
  return null
}

export function formatPlanGateMessage(error: unknown): string {
  const reason = planGateReason(error)
  if (reason === 'no_active_subscription') {
    return 'You need an active plan to use this feature.'
  }
  if (reason === 'feature_locked') {
    return 'This feature requires an Unlimited plan.'
  }
  if (reason === 'limit_exceeded') {
    if (error instanceof EdgeApiError) {
      // Never echo raw allowance numbers (abuse ceilings) to the user.
      const reset = error.resetsAt
        ? ` It resets on ${new Date(error.resetsAt).toLocaleDateString()}.`
        : ''
      return `You have reached your plan limit for this month.${reset}`
    }
    return 'You have reached your plan limit for this month.'
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

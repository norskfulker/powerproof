import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { subscriptionStatusQueryKey } from '@/hooks/useSubscriptionStatus'
import { supabase } from '@/lib/supabase'

type CancelSubscriptionResponse = {
  cancelled: true
  status: 'cancelled'
}

export function useSubscriptionCancel() {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const cancelSubscription = useCallback(async (): Promise<
    { success: true } | { success: false; reason: string }
  > => {
    setIsLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return { success: false, reason: 'unauthorized' }

      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
      if (!baseUrl) return { success: false, reason: 'supabase_not_configured' }

      const response = await fetch(
        `${baseUrl}/functions/v1/payments-cancel-subscription`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      const payload = (await response.json().catch(() => ({}))) as
        | CancelSubscriptionResponse
        | { error?: string }

      if (!response.ok || !('cancelled' in payload) || payload.cancelled !== true) {
        return {
          success: false,
          reason: ('error' in payload && payload.error) || 'subscription_cancel_failed',
        }
      }

      await queryClient.invalidateQueries({
        queryKey: subscriptionStatusQueryKey(sessionData.session.user.id),
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'subscription_cancel_failed',
      }
    } finally {
      setIsLoading(false)
    }
  }, [queryClient])

  return useMemo(
    () => ({ cancelSubscription, isLoading }),
    [cancelSubscription, isLoading],
  )
}

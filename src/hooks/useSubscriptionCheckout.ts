import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { subscriptionStatusQueryKey } from '@/hooks/useSubscriptionStatus'
import { openRazorpayCheckout } from '@/lib/razorpayCheckout'
import { supabase } from '@/lib/supabase'

type CheckoutProfile = {
  userEmail: string
  userName: string
  userPhone?: string
}

type CreateSubscriptionResponse = {
  subscriptionId: string
  keyId: string
  plan: { id: string; slug: string; name: string }
}

export function useSubscriptionCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const startCheckout = useCallback(
    async (
      planId: string,
      profile: CheckoutProfile,
    ): Promise<{ success: true } | { success: false; reason: string }> => {
      setIsLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return { success: false, reason: 'unauthorized' }
        const userId = sessionData.session.user.id

        const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
        if (!baseUrl) return { success: false, reason: 'supabase_not_configured' }

        const response = await fetch(
          `${baseUrl}/functions/v1/payments-create-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ planId }),
          },
        )
        const payload = (await response.json().catch(() => ({}))) as
          | CreateSubscriptionResponse
          | { error?: string }

        if (!response.ok || !('subscriptionId' in payload)) {
          return {
            success: false,
            reason:
              ('error' in payload && payload.error) || 'subscription_checkout_failed',
          }
        }

        void queryClient.invalidateQueries({
          queryKey: subscriptionStatusQueryKey(userId),
        })

        return await new Promise((resolve) => {
          void openRazorpayCheckout({
            keyId: payload.keyId,
            subscriptionId: payload.subscriptionId,
            name: 'PowerProof',
            description: `${payload.plan.name} subscription`,
            prefill: {
              name: profile.userName,
              email: profile.userEmail,
              contact: profile.userPhone,
            },
            notes: {
              app_plan_id: payload.plan.id,
              plan_slug: payload.plan.slug,
            },
            onSuccess: () => {
              const refreshStatus = () =>
                queryClient.invalidateQueries({
                  queryKey: subscriptionStatusQueryKey(userId),
                })
              void refreshStatus()
              window.setTimeout(() => void refreshStatus(), 2_000)
              window.setTimeout(() => void refreshStatus(), 5_000)
              resolve({ success: true })
            },
            onDismiss: () => resolve({ success: false, reason: 'dismissed' }),
            onError: (error) =>
              resolve({
                success: false,
                reason: error instanceof Error ? error.message : 'checkout_error',
              }),
          })
        })
      } catch (error) {
        return {
          success: false,
          reason: error instanceof Error ? error.message : 'checkout_init_failed',
        }
      } finally {
        setIsLoading(false)
      }
    },
    [queryClient],
  )

  return useMemo(() => ({ startCheckout, isLoading }), [isLoading, startCheckout])
}

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { SubscriptionStatus } from '@/lib/subscriptionStatus'

export const subscriptionStatusQueryKey = (userId: string | undefined) =>
  ['subscription-status', userId] as const

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { data, error } = await supabase.rpc('get_my_subscription_status')

  if (error) throw error
  return data as SubscriptionStatus
}

export function useSubscriptionStatus() {
  const { user } = useAuth()

  return useQuery({
    queryKey: subscriptionStatusQueryKey(user?.id),
    queryFn: fetchSubscriptionStatus,
    enabled: Boolean(user?.id),
  })
}

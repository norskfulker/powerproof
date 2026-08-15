import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

/** Marketing/checkout plan row — bucket count ceilings are intentionally omitted. */
export type SubscriptionPlan = {
  id: string
  slug: string
  name: string
  price_inr: number
  price_usd: number
  razorpay_plan_id: string | null
  roadmap_unlocked: boolean | null
  warroom_unlocked: boolean | null
  investors_list_unlocked: boolean | null
  chat_unlimited: boolean | null
  sort_order: number | null
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(
          'id,slug,name,price_inr,price_usd,razorpay_plan_id,roadmap_unlocked,warroom_unlocked,investors_list_unlocked,chat_unlimited,sort_order',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as SubscriptionPlan[]
    },
  })
}

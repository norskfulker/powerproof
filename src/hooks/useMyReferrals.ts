import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildReferralLink } from '@/lib/referrals'

export type ReferredUserRow = {
  id: string
  referred_user_id: string
  status: 'registered' | 'purchased'
  signup_reward_credits: number
  purchase_reward_credits: number
  referred_purchase_credits: number
  created_at: string
  referred_username: string | null
  referred_display: string | null
  referred_email: string | null
}

export function useMyReferrals(userId: string | undefined) {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<ReferredUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const referralLink = referralCode ? buildReferralLink(referralCode) : null

  const load = useCallback(async () => {
    if (!userId) {
      setReferralCode(null)
      setReferrals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: codeData, error: codeError } = await supabase.rpc('ensure_user_referral_code')
      if (codeError) throw codeError
      setReferralCode(typeof codeData === 'string' ? codeData : String(codeData ?? ''))

      const { data: rows, error: rowsError } = await supabase
        .from('user_referrals')
        .select(
          `
          id,
          referred_user_id,
          status,
          signup_reward_credits,
          purchase_reward_credits,
          referred_purchase_credits,
          created_at,
          referred:profiles!referred_user_id (
            username,
            display_name,
            full_name,
            email
          )
        `,
        )
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false })

      if (rowsError) throw rowsError

      const mapped: ReferredUserRow[] =
        (rows ?? []).map((r: any) => {
          const p = r.referred
          return {
            id: r.id,
            referred_user_id: r.referred_user_id,
            status: r.status,
            signup_reward_credits: Number(r.signup_reward_credits ?? 0),
            purchase_reward_credits: Number(r.purchase_reward_credits ?? 0),
            referred_purchase_credits: Number(r.referred_purchase_credits ?? 0),
            created_at: r.created_at,
            referred_username: p?.username ?? null,
            referred_display: p?.display_name ?? p?.full_name ?? null,
            referred_email: p?.email ?? null,
          }
        }) ?? []

      setReferrals(mapped)
    } catch (e) {
      console.error('[Referrals] load:', e)
      setError(e instanceof Error ? e.message : 'Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`my_referrals:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_referrals', filter: `referrer_user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe()

    return () => {
      void channel.unsubscribe()
    }
  }, [userId, load])

  return {
    referralCode,
    referralLink,
    referrals,
    loading,
    error,
    reload: load,
  }
}

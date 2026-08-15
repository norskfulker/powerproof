import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export const INVESTORS_LIST_PRICE_INR = 499

export function useInvestorsListAccess(): {
  isUnlocked: boolean
  isLoading: boolean
} {
  const { profile, profileLoading, isAdmin } = useAuth()

  const isUnlocked = useMemo(() => {
    if (isAdmin) return true
    return Boolean(profile?.investors_list_unlocked_at)
  }, [isAdmin, profile?.investors_list_unlocked_at])

  return {
    isUnlocked,
    isLoading: profileLoading,
  }
}

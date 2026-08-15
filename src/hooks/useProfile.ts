import { useAuth } from '@/contexts/AuthContext'

export function useProfile() {
  const { profile, isLoading, profileLoading, refreshProfile } = useAuth()
  return { profile, isLoading, profileLoading, refreshProfile }
}

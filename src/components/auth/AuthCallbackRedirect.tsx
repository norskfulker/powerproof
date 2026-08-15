import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  AUTH_CALLBACK_PATH,
  isAuthCallbackHash,
  landingSignInTo,
  parseAuthCallbackHash,
  resolvePostLoginPath,
} from '@/lib/authLanding'
import { tryClaimPreviewAndNavigate } from '@/lib/claimPreviewSession'

/**
 * Legacy fallbacks: if Supabase still redirects to `/room` or `/` with tokens in the hash,
 * forward to the dedicated callback route or strip tokens after sign-in.
 */
export function AuthCallbackRedirect() {
  const { user, isLoading, profileLoading, isAdmin, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthCallbackHash(location.hash)) return

    if (location.pathname !== AUTH_CALLBACK_PATH) {
      navigate(
        {
          pathname: AUTH_CALLBACK_PATH,
          search: location.search,
          hash: location.hash,
        },
        { replace: true },
      )
      return
    }

    if (isLoading || profileLoading) return

    const callback = parseAuthCallbackHash(location.hash)
    if (!callback) return

    if (callback.error) {
      navigate(landingSignInTo(), { replace: true })
      return
    }

    if (!user) return

    void (async () => {
      const claimed = await tryClaimPreviewAndNavigate(user.id, navigate)
      if (claimed) return
      navigate(
        resolvePostLoginPath(location.search, null, {
          isAdmin,
          onboarding: profile?.onboarding,
        }),
        { replace: true },
      )
    })()
  }, [
    user,
    isLoading,
    profileLoading,
    isAdmin,
    profile?.onboarding,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ])

  return null
}

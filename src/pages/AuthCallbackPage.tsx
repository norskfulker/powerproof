import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  landingSignInTo,
  parseAuthCallbackHash,
  resolvePostLoginPath,
} from '@/lib/authLanding'
import { handleSupabaseError } from '@/lib/handleError'
import { tryClaimPreviewAndNavigate } from '@/lib/claimPreviewSession'
import { Loader2 } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui'

const WAIT_MS = 12_000

/**
 * Handles Supabase email confirmation and OAuth redirects.
 * Keeps auth tokens off protected routes so they are not stripped before session recovery.
 */
export default function AuthCallbackPage() {
  const { user, profile, profileLoading, isLoading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [timedOut, setTimedOut] = useState(false)

  const callbackError = useMemo(() => {
    const fromHash = parseAuthCallbackHash(location.hash)
    if (fromHash?.error) {
      return handleSupabaseError({
        message: fromHash.errorDescription ?? fromHash.error,
      } as Error)
    }
    return null
  }, [location.hash])

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), WAIT_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    void supabase.auth.getSession()
  }, [])

  useEffect(() => {
    if (callbackError) return
    if (isLoading || profileLoading) return
    if (!user) return

    void (async () => {
      const claimed = await tryClaimPreviewAndNavigate(user.id, navigate)
      if (claimed) return
      navigate(
        resolvePostLoginPath(`?${searchParams.toString()}`, null, {
          isAdmin,
          onboarding: profile?.onboarding,
        }),
        { replace: true },
      )
    })()
  }, [
    callbackError,
    isAdmin,
    isLoading,
    navigate,
    profile?.onboarding,
    profileLoading,
    searchParams,
    user,
  ])

  if (callbackError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Sign-in link problem</h1>
        <p className="max-w-md text-sm text-muted-foreground">{callbackError}</p>
        <Button asChild className="h-11 font-bold">
          <Link to={landingSignInTo()}>Back to sign in</Link>
        </Button>
      </div>
    )
  }

  if (!user && timedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Could not finish sign-in</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This link may have expired or already been used. Try signing in again with Google.
        </p>
        <Button asChild className="h-11 font-bold">
          <Link to={landingSignInTo()}>Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">Finishing sign-in…</p>
      <p className="max-w-sm text-xs text-muted-foreground">You&apos;ll be sent to your dashboard in a moment.</p>
    </div>
  )
}

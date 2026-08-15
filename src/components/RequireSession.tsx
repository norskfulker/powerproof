import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authReturnPath, hasPendingAuthCallback, signInRedirectTarget } from '@/lib/authLanding'
import { isAuthExemptPath } from '@/lib/authPublicPaths'
import { Loader2 } from '@/lib/icons'

/**
 * Gates AppShell child routes: signed-out users may only hit auth-exempt paths (else → landing).
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isAuthExemptPath(location.pathname)) {
    return <>{children}</>
  }

  const pendingAuthCallback = hasPendingAuthCallback(location.hash, location.search)

  if (isLoading || pendingAuthCallback) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!user) {
    const returnPath = authReturnPath(location.pathname, location.search)
    return (
      <Navigate
        to={signInRedirectTarget(returnPath)}
        replace
        state={returnPath !== '/' ? { from: returnPath } : undefined}
      />
    )
  }

  return <>{children}</>
}

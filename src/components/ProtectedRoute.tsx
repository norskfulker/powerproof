import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { authReturnPath, signInRedirectTarget } from '@/lib/authLanding'
import { Loader2 } from '@/lib/icons'
import {
  hasSubscriptionFeature,
  type SubscriptionFeatureLocks,
} from '@/lib/subscriptionStatus'

interface Props {
  children: ReactNode
  requireAdmin?: boolean
  requiredFeature?: keyof SubscriptionFeatureLocks
}

const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
)

function SubscriptionFeatureRoute({
  children,
  feature,
}: {
  children: ReactNode
  feature: keyof SubscriptionFeatureLocks
}) {
  const { data, isLoading } = useSubscriptionStatus()
  if (isLoading) return <FullPageSpinner />
  if (!hasSubscriptionFeature(data, feature)) {
    return <Navigate to="/pricing" replace />
  }
  return <>{children}</>
}

const ProtectedRoute = ({ children, requireAdmin = false, requiredFeature }: Props) => {
  const { user, profile, isLoading, profileLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullPageSpinner />
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
  if (requireAdmin && profileLoading) return <FullPageSpinner />
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return <Navigate to="/" replace />
  }
  if (requiredFeature) {
    return <SubscriptionFeatureRoute feature={requiredFeature}>{children}</SubscriptionFeatureRoute>
  }
  return <>{children}</>
}

export default ProtectedRoute

import { Navigate, useLocation } from 'react-router-dom'
import { legacyDiscoverPathToRoom } from '@/lib/discoverHeroRoutes'

/** Redirects legacy discover hero URLs to `/room?mode=…` (preserves query + state). */
export function LegacyDiscoverHeroRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={legacyDiscoverPathToRoom(location.pathname, location.search)}
      replace
      state={location.state}
    />
  )
}

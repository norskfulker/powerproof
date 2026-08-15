import { isPublicMarketingPath } from '@/lib/publicMarketingPaths'

import { AUTH_CALLBACK_PATH } from '@/lib/authLanding'

/** OAuth callback + dedicated auth pages — no session required. */
const AUTH_RECOVERY_PATHS = new Set([
  AUTH_CALLBACK_PATH,
  '/',
  '/sign-in',
  '/login',
  '/sign-up',
])

/**
 * Routes reachable without a Supabase session.
 * Marketing/landing surfaces plus the OAuth callback only.
 */
export function isAuthExemptPath(pathname: string): boolean {
  if (AUTH_RECOVERY_PATHS.has(pathname)) return true
  return isPublicMarketingPath(pathname)
}

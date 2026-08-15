import {
  shouldForceOnboardingPath,
} from '@/lib/onboardingResearchDemo'

export const LANDING_SIGN_IN_INTENT_PARAM = 'intent'

import { roomPathForMode } from '@/lib/discoverHeroRoutes'

/** Identifies which marketing-tab the user came from when opening the sign-in form. */
export type LandingProductNavIcon =
  | 'opportunities'
  | 'research'
  | 'source'
  | 'itchmyback'
  | 'library'
  | 'scanner'

/** Default in-app destination after sign-in when no `next` / `redirect` is provided. */
export const DEFAULT_POST_LOGIN_PATH = roomPathForMode('scanner')

/** Pathname + search for post-login return (no hash). */
export function authReturnPath(pathname: string, search = ''): string {
  return `${pathname}${search}`
}

/** Landing sign-in URL that preserves the protected route the user tried to open. */
export function signInRedirectTarget(returnPath: string): string {
  const trimmed = returnPath.trim()
  if (!trimmed || trimmed === '/') return '/'
  return landingSignInTo(trimmed)
}

/**
 * Safe in-app path after auth.
 * Forces research onboarding only for first-time registrations (same session),
 * not on every subsequent login. Explicit `next` / `redirect` / router state wins
 * once onboarding is complete or the user is a returning sign-in.
 */
export function resolvePostLoginPath(
  search: string,
  fromState?: string | null,
  opts?: { isAdmin?: boolean; onboarding?: boolean | null; isNewRegistration?: boolean },
): string {
  if (
    opts &&
    shouldForceOnboardingPath({
      onboarding: opts.onboarding,
      isNewRegistration: opts.isNewRegistration,
    })
  ) {
    return DEFAULT_POST_LOGIN_PATH
  }

  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const redirectRaw = (fromState ?? '').trim() || sp.get('next') || sp.get('redirect') || ''
  if (!redirectRaw || !redirectRaw.startsWith('/') || redirectRaw.startsWith('//')) {
    return DEFAULT_POST_LOGIN_PATH
  }
  return redirectRaw
}

/** Opens the dedicated sign-in page. */
export const POWERPROOF_OPEN_SIGN_IN_EVENT = 'powerproof:open-sign-in'

/** Dispatched when sign-in is already open so inputs can focus + highlight. */
export const POWERPROOF_FOCUS_SIGN_IN_EVENT = 'powerproof:focus-sign-in'

export function dispatchOpenLandingSignIn() {
  const next = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : '/'
  const target = landingSignInTo(next === '/' ? null : next)
  if (typeof window !== 'undefined') {
    window.location.assign(target)
  }
}

export function dispatchFocusLandingSignIn() {
  window.dispatchEvent(new CustomEvent(POWERPROOF_FOCUS_SIGN_IN_EVENT))
}

/**
 * Path for the dedicated sign-in page.
 * Preserves `next` when the user must return to a protected URL after auth.
 */
export function landingSignInTo(
  next?: string | null,
  intent?: LandingProductNavIcon | null,
) {
  const n = (next ?? '').trim()
  const sp = new URLSearchParams()
  if (n && n !== '/') sp.set('next', n)
  if (intent) sp.set(LANDING_SIGN_IN_INTENT_PARAM, intent)
  const qs = sp.toString()
  return qs ? `/sign-in?${qs}` : '/sign-in'
}

export function parseLandingSignInIntent(
  search: string,
): LandingProductNavIcon | null {
  const raw = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  ).get(LANDING_SIGN_IN_INTENT_PARAM)
  if (
    raw === 'opportunities' ||
    raw === 'research' ||
    raw === 'source' ||
    raw === 'itchmyback' ||
    raw === 'library' ||
    raw === 'scanner'
  ) {
    return raw
  }
  return null
}

const AUTH_REDIRECT_FALLBACK_ORIGIN = 'https://powerproof.live'

/** Target session lifetime — configure matching values in Supabase Dashboard → Auth → Sessions. */
export const AUTH_SESSION_TARGET_DAYS = 30

export type AuthCallbackHash = {
  type: string | null
  hasTokens: boolean
  hasCode: boolean
  error: string | null
  errorDescription: string | null
}

/** Parse Supabase auth tokens/errors from the URL hash after email or OAuth redirect. */
export function parseAuthCallbackHash(hash: string): AuthCallbackHash | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  if (!params.has('access_token') && !params.has('error') && !params.has('code')) {
    return null
  }
  return {
    type: params.get('type'),
    hasTokens: params.has('access_token'),
    hasCode: params.has('code'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  }
}

export function isAuthCallbackHash(hash: string): boolean {
  return parseAuthCallbackHash(hash) !== null
}

function authRedirectOrigin(): string {
  if (typeof window === 'undefined') return AUTH_REDIRECT_FALLBACK_ORIGIN
  return window.location.origin
}

/** Supabase email / OAuth return handler (must be on redirect allowlist). */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/** Redirect target for signup confirmation emails and OAuth. */
export function authEmailRedirectTo(): string {
  return `${authRedirectOrigin()}${AUTH_CALLBACK_PATH}`
}

/** OAuth return URL (Google, etc.). */
export function authOAuthRedirectTo(): string {
  return authEmailRedirectTo()
}

/** True while the URL still carries Supabase auth callback params (hash or PKCE code). */
export function hasPendingAuthCallback(
  hash = typeof window !== 'undefined' ? window.location.hash : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  if (isAuthCallbackHash(hash)) return true
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return sp.has('code')
}

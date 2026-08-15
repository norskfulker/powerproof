import { roomPathForMode } from '@/lib/discoverHeroRoutes'

const DEFAULT_ONBOARDING_FALLBACK = roomPathForMode('research')

const PENDING_REVEAL_STORAGE_KEY = 'powerproof.onboarding.pending-reveal'
/** Set once when a brand-new account signs in — cleared after claim / onboarding finish. */
const FIRST_REGISTRATION_STORAGE_KEY = 'powerproof.onboarding.first-registration'

/** Persist reveal URL so leaving without claiming can bounce the user back (same session). */
export function savePendingOnboardingRevealPath(path: string): void {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return
  try {
    sessionStorage.setItem(PENDING_REVEAL_STORAGE_KEY, trimmed)
  } catch {
    /* ignore */
  }
}

export function readPendingOnboardingRevealPath(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REVEAL_STORAGE_KEY)?.trim() ?? ''
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  } catch {
    return null
  }
}

export function clearPendingOnboardingRevealPath(): void {
  try {
    sessionStorage.removeItem(PENDING_REVEAL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Mark this browser session as a first-time registration onboarding flow. */
export function markFirstRegistrationOnboarding(): void {
  try {
    sessionStorage.setItem(FIRST_REGISTRATION_STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isFirstRegistrationOnboardingActive(): boolean {
  try {
    return sessionStorage.getItem(FIRST_REGISTRATION_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function clearFirstRegistrationOnboarding(): void {
  try {
    sessionStorage.removeItem(FIRST_REGISTRATION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Clear all first-run onboarding session markers (after claim or skip). */
export function clearOnboardingSessionMarkers(): void {
  clearPendingOnboardingRevealPath()
  clearFirstRegistrationOnboarding()
}

/**
 * Where an incomplete (unclaimed) onboarding user should be sent.
 * Prefer the last ready reveal URL; otherwise research workspace.
 */
export function resolveIncompleteOnboardingPath(): string {
  return readPendingOnboardingRevealPath() ?? DEFAULT_ONBOARDING_FALLBACK
}

/**
 * Post-login destination for research onboarding.
 * Only first-time registrations (same browser session) are forced — not returning logins,
 * even if `profile.onboarding` is still false.
 */
export function shouldForceOnboardingPath(opts: {
  onboarding?: boolean | null
  /** Explicit override; defaults to the first-registration session flag. */
  isNewRegistration?: boolean
}): boolean {
  if (opts.onboarding) return false
  const isNew =
    opts.isNewRegistration ??
    (typeof window !== 'undefined' && isFirstRegistrationOnboardingActive())
  return Boolean(isNew)
}

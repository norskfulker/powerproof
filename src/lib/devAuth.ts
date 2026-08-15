/** True when running the Vite app on a local dev host (not production). */
export function isLocalhostDev(): boolean {
  if (typeof window === 'undefined') return false
  if (!import.meta.env.DEV) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export type DevSignInBuildMode = 'prod' | 'dev'

const DEV_SIGN_IN_BUILD_MODE_KEY = 'powerproof:dev-sign-in-build-mode'

/** Localhost sign-in preview: prod (Google) vs dev (alias/password). */
export function readDevSignInBuildMode(): DevSignInBuildMode {
  if (typeof window === 'undefined') return 'dev'
  const stored = sessionStorage.getItem(DEV_SIGN_IN_BUILD_MODE_KEY)
  return stored === 'prod' ? 'prod' : 'dev'
}

export function writeDevSignInBuildMode(mode: DevSignInBuildMode) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(DEV_SIGN_IN_BUILD_MODE_KEY, mode)
}

export function devLoginPasswordFromEnv(): string {
  return String(import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '').trim()
}

export function normalizeDevLoginAlias(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}

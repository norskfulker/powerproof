export const LEGAL_SUPPORT_EMAIL = 'amaze@powerproof.app'
export const LEGAL_SITE_URL = 'https://powerproof.app'
export const LEGAL_EFFECTIVE_DATE = '15 August 2026'

export const LEGAL_PATHS = {
  privacy: '/privacy',
  terms: '/terms',
} as const

export function isLegalPath(pathname: string): boolean {
  return (
    pathname === LEGAL_PATHS.privacy ||
    pathname === LEGAL_PATHS.terms ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service'
  )
}

/**
 * Shared app paths for links, redirects, and share URLs.
 *
 * Use ROUTES.* for path-only strings (Link `to=`, navigate(), etc.)
 * Use absUrl(ROUTES.*) for full URLs (clipboard, og:url, …).
 */

export const ROUTES = {
  workspace: (projectId: string) => `/workspace/${projectId}`,
  workspaceEdit: (projectId: string) => `/workspace/${projectId}#workspace-details`,
} as const

export const PUBLIC_BASE =
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.replace(/\/+$/, '') ??
  (typeof window !== 'undefined' ? window.location.origin : '')

export const absUrl = (path: string) => `${PUBLIC_BASE}${path}`

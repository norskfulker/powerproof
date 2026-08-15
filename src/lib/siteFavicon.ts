/**
 * Best-effort hostname from a typed URL (with or without scheme), for favicons
 * while the user is still typing.
 */
export function hostnameFromLooseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const host = new URL(candidate).hostname.replace(/^www\./i, '').toLowerCase()
    // Wait for a real-looking domain (needs a dot) so "ht" / "https" don't flash icons.
    if (!host || !host.includes('.') || !/^[a-z0-9.-]+$/i.test(host)) return null
    return host
  } catch {
    return null
  }
}

/** Public favicon URL for a hostname (works before any scan finishes). */
export function siteFaviconUrl(hostname: string, size = 64): string {
  const host = hostname.trim().toLowerCase().replace(/^www\./, '')
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
}

/** Build absolute URL from origin and a path (or absolute URL) from SEO settings. */
export function absoluteFromSeoPath(origin: string, canonicalPath: string | undefined | null, fallbackPath: string): string {
  const base = origin.replace(/\/$/, '')
  const raw = (canonicalPath ?? '').trim()
  if (!raw) return `${base}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${path}`
}

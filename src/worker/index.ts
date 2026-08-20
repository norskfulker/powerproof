/**
 * Cloudflare Worker entrypoint for the PowerProof SPA.
 *
 * Wraps the assets binding so we can attach security headers + per-path
 * Cache-Control for HTML, assets, and public routes.
 * Everything else — auth, data, edge functions — still lives in Supabase.
 */

/** Default security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

/** Pattern → Cache-Control value. First match wins. */
const CACHE_RULES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /^\/sw\.js$/, value: 'public, max-age=0, must-revalidate' },
  { pattern: /^\/workbox-.+\.js$/, value: 'public, max-age=31536000, immutable' },
  {
    pattern: /^\/manifest\.webmanifest$/,
    value: 'public, max-age=0, must-revalidate',
  },
  { pattern: /^\/o\/.+/, value: 'public, max-age=3600, stale-while-revalidate=86400' },
  { pattern: /^\/blog\/.+/, value: 'public, max-age=3600, stale-while-revalidate=86400' },
]

const MANIFEST_CONTENT_TYPE = 'application/manifest+json'

function cacheControlFor(pathname: string): string | null {
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(pathname)) return rule.value
  }
  return null
}

export default {
  async fetch(
    request: Request,
    env: { ASSETS: Fetcher },
  ): Promise<Response> {
    const response = await env.ASSETS.fetch(request)

    // Clone so we can mutate headers without touching the cached body.
    const headers = new Headers(response.headers)

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value)
    }

    const url = new URL(request.url)
    const cacheControl = cacheControlFor(url.pathname)
    if (cacheControl) {
      headers.set('Cache-Control', cacheControl)
    }

    if (url.pathname === '/manifest.webmanifest') {
      headers.set('Content-Type', MANIFEST_CONTENT_TYPE)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
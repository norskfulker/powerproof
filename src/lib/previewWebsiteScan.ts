import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'
import type { PreviewSaturationVerdict } from '@/types/previewResearch'
import type {
  PreviewWebsiteScanAi,
  PreviewWebsiteScanCompetitor,
  PreviewWebsiteScanErrorCode,
  PreviewWebsiteScanFinding,
  PreviewWebsiteScanGetErrorCode,
  PreviewWebsiteScanGetResponse,
  PreviewWebsiteScanLockedFinding,
  PreviewWebsiteScanPreview,
  PreviewWebsiteScanResponse,
  PreviewWebsiteScanSeo,
} from '@/types/previewWebsiteScan'

export const PREVIEW_WEBSITE_SCAN_FUNCTION = 'preview-website-scan'
export const PREVIEW_WEBSITE_SCAN_GET_FUNCTION = 'preview-website-scan-get'
export const PREVIEW_WEBSITE_TOKEN_PARAM = 'preview_token'
/** Query param on `/start` so a completed preview survives refresh and is shareable. */
export const START_SESSION_TOKEN_PARAM = 'session_token'
export const PREVIEW_WEBSITE_TOKEN_KEY = 'powerproof_website_preview_token'

/** Client wait — the crawl + Gemini pass can take ~15–45s. */
export const PREVIEW_WEBSITE_SCAN_TIMEOUT_MS = 60_000
/** Saved-preview lookup is a DB read — fail fast if the function is unreachable. */
export const PREVIEW_WEBSITE_SCAN_GET_TIMEOUT_MS = 15_000

export const PREVIEW_WEBSITE_URL_PLACEHOLDER = 'yourbusiness.com'

/**
 * Scripted wait copy while `preview-website-scan` is in flight.
 * Not backend progress — hold the last stage, never loop.
 */
export const PREVIEW_WEBSITE_LOADING_STAGES = [
  { atMs: 0, message: 'Reading your website…' },
  { atMs: 8_000, message: 'Scanning SEO signals…' },
  { atMs: 18_000, message: 'Analyzing your positioning…' },
  { atMs: 28_000, message: 'Checking the competitive landscape…' },
  { atMs: 38_000, message: 'Almost there…' },
] as const

/** In-loader copy if the request is still open after the staged sequence. */
export const PREVIEW_WEBSITE_LOADING_PATIENCE_MS = 50_000
export const PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE =
  'This is taking longer than expected…'

export function previewWebsiteScanLoadingMessage(elapsedMs: number): string {
  const elapsed = Math.max(0, elapsedMs)
  if (elapsed >= PREVIEW_WEBSITE_LOADING_PATIENCE_MS) {
    return PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE
  }
  let message: string = PREVIEW_WEBSITE_LOADING_STAGES[0].message
  for (const stage of PREVIEW_WEBSITE_LOADING_STAGES) {
    if (elapsed >= stage.atMs) message = stage.message
  }
  return message
}

export const PREVIEW_WEBSITE_EMPTY_URL_MESSAGE = 'Enter your website URL to continue.'
export const PREVIEW_WEBSITE_EXPIRED_MESSAGE =
  'This preview has expired — try another URL'

const FETCH_FAILED_MESSAGE =
  "Site is not reachable. Either 404 or JavaScript error."
const MISCONFIGURED_MESSAGE = 'Something went wrong. Try again shortly.'
const TIMEOUT_MESSAGE =
  'This is taking longer than expected. Check your connection and try again.'
const NETWORK_MESSAGE = "We couldn't connect. Check your internet and try again."
const UNKNOWN_MESSAGE = 'Something went wrong generating your preview. Try again.'

const KNOWN_ERROR_CODES = new Set<PreviewWebsiteScanErrorCode>([
  'missing_url',
  'invalid_url',
  'fetch_failed',
  'misconfigured',
  'network',
  'timeout',
  'unknown',
])

const KNOWN_GET_ERROR_CODES = new Set<PreviewWebsiteScanGetErrorCode>([
  'invalid_session_token',
  'not_found',
  'expired',
  'lookup_failed',
  'network',
  'timeout',
  'unknown',
])

const VERDICTS = new Set<PreviewSaturationVerdict>([
  'Saturated',
  'Competitive but Viable',
  'Blue Ocean',
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function findingSeverity(value: unknown): PreviewWebsiteScanFinding['severity'] {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (s === 'good' || s === 'ok' || s === 'positive') return 'good'
  if (s === 'bad' || s === 'critical' || s === 'error' || s === 'high') return 'bad'
  return 'warn'
}

function normalizeFinding(value: unknown): PreviewWebsiteScanFinding | null {
  const row = asRecord(value)
  const title = asNonEmptyString(row.title)
  if (!title) return null
  return {
    title,
    severity: findingSeverity(row.severity),
    detail: asNonEmptyString(row.detail) ?? '',
  }
}

function normalizeLockedFinding(value: unknown): PreviewWebsiteScanLockedFinding | null {
  const row = asRecord(value)
  const title = asNonEmptyString(row.title)
  if (!title) return null
  return {
    title,
    severity: findingSeverity(row.severity),
  }
}

function normalizeCompetitors(value: unknown): PreviewWebsiteScanCompetitor[] {
  if (!Array.isArray(value)) return []
  const out: PreviewWebsiteScanCompetitor[] = []
  for (const item of value) {
    const row = asRecord(item)
    const name = asNonEmptyString(row.name)
    if (!name) continue
    out.push({
      name,
      whyThreat: asNonEmptyString(row.whyThreat) ?? '',
    })
  }
  return out
}

function normalizeInsights(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function normalizeSeo(value: unknown): PreviewWebsiteScanSeo {
  const seo = asRecord(value)
  const findings = Array.isArray(seo.topFindings)
    ? seo.topFindings.map(normalizeFinding).filter((item): item is PreviewWebsiteScanFinding => Boolean(item))
    : []
  const lockedPreview = Array.isArray(seo.lockedFindingsPreview)
    ? seo.lockedFindingsPreview
        .map(normalizeLockedFinding)
        .filter((item): item is PreviewWebsiteScanLockedFinding => Boolean(item))
    : []
  const lockedFindingsCount = Math.max(0, Math.round(asFiniteNumber(seo.lockedFindingsCount)))

  return {
    score: Math.min(100, Math.max(0, Math.round(asFiniteNumber(seo.score)))),
    title: asNonEmptyString(seo.title),
    description: asNonEmptyString(seo.description),
    hasViewport: asBoolean(seo.hasViewport),
    hasFavicon: asBoolean(seo.hasFavicon),
    h1Count: Math.max(0, Math.round(asFiniteNumber(seo.h1Count))),
    imagesTotal: Math.max(0, Math.round(asFiniteNumber(seo.imagesTotal))),
    imagesMissingAlt: Math.max(0, Math.round(asFiniteNumber(seo.imagesMissingAlt))),
    hasOpenGraph: asBoolean(seo.hasOpenGraph),
    hasJsonLd: asBoolean(seo.hasJsonLd),
    wordCount: Math.max(0, Math.round(asFiniteNumber(seo.wordCount))),
    topFindings: findings,
    lockedFindingsCount,
    lockedFindingsPreview: lockedFindingsCount > 0 ? lockedPreview.slice(0, lockedFindingsCount) : [],
  }
}

function normalizeVerdict(value: unknown): PreviewSaturationVerdict | null {
  return typeof value === 'string' && VERDICTS.has(value as PreviewSaturationVerdict)
    ? (value as PreviewSaturationVerdict)
    : null
}

function normalizeAi(value: unknown): PreviewWebsiteScanAi {
  const ai = asRecord(value)
  return {
    businessSnapshot: asNonEmptyString(ai.businessSnapshot),
    verdict: normalizeVerdict(ai.verdict),
    verdictReason: asNonEmptyString(ai.verdictReason),
    likelyCompetitors: normalizeCompetitors(ai.likelyCompetitors),
    standoutInsights: normalizeInsights(ai.standoutInsights),
    oneBigRisk: asNonEmptyString(ai.oneBigRisk),
    oneBigOpportunity: asNonEmptyString(ai.oneBigOpportunity),
    fullAuditTeaser: asNonEmptyString(ai.fullAuditTeaser),
  }
}

export function normalizePreviewWebsiteScanResponse(
  payload: unknown,
): PreviewWebsiteScanResponse | null {
  const data = asRecord(payload)
  const previewRaw = data.preview
  if (!previewRaw || typeof previewRaw !== 'object') return null
  const previewObj = asRecord(previewRaw)

  const preview: PreviewWebsiteScanPreview = {
    seo: normalizeSeo(previewObj.seo),
    ai: normalizeAi(previewObj.ai),
  }

  return {
    preview,
    session_token: asNonEmptyString(data.session_token),
  }
}

export function normalizePreviewWebsiteScanGetResponse(
  payload: unknown,
  sessionToken: string,
): PreviewWebsiteScanGetResponse | null {
  const token = sessionToken.trim()
  if (!token) return null
  const scan = normalizePreviewWebsiteScanResponse({
    preview: asRecord(payload).preview,
    session_token: token,
  })
  if (!scan) return null
  const data = asRecord(payload)
  return {
    ...scan,
    url: asNonEmptyString(data.url),
    normalized_url: asNonEmptyString(data.normalized_url),
    expires_at: asNonEmptyString(data.expires_at),
  }
}

export function previewWebsiteScanErrorMessage(
  code: PreviewWebsiteScanErrorCode,
  backendError?: string | null,
): string {
  if (code === 'invalid_url' || code === 'missing_url') {
    return asNonEmptyString(backendError) ?? PREVIEW_WEBSITE_EMPTY_URL_MESSAGE
  }
  if (code === 'fetch_failed') return FETCH_FAILED_MESSAGE
  if (code === 'misconfigured') return MISCONFIGURED_MESSAGE
  if (code === 'timeout') return TIMEOUT_MESSAGE
  if (code === 'network') return NETWORK_MESSAGE
  return asNonEmptyString(backendError) ?? UNKNOWN_MESSAGE
}

function normalizeGetErrorCode(
  code: string | undefined,
  status?: number,
): PreviewWebsiteScanGetErrorCode {
  if (code && KNOWN_GET_ERROR_CODES.has(code as PreviewWebsiteScanGetErrorCode)) {
    return code as PreviewWebsiteScanGetErrorCode
  }
  if (status === 400) return 'invalid_session_token'
  if (status === 404) return 'not_found'
  if (status === 410) return 'expired'
  if (status === 500) return 'lookup_failed'
  return 'unknown'
}

export function previewWebsiteScanGetErrorMessage(
  code: PreviewWebsiteScanGetErrorCode,
  backendError?: string | null,
): string {
  if (code === 'expired' || code === 'not_found') return PREVIEW_WEBSITE_EXPIRED_MESSAGE
  if (code === 'timeout') return TIMEOUT_MESSAGE
  if (code === 'network') return NETWORK_MESSAGE
  return asNonEmptyString(backendError) ?? UNKNOWN_MESSAGE
}

/** Calm copy for restore failures that should return the visitor to the URL form. */
export function previewRestoreFallbackMessage(
  code: PreviewWebsiteScanGetErrorCode,
): string | null {
  if (code === 'expired' || code === 'not_found') return PREVIEW_WEBSITE_EXPIRED_MESSAGE
  return null
}

function normalizeErrorCode(code: string | undefined, status?: number): PreviewWebsiteScanErrorCode {
  if (code && KNOWN_ERROR_CODES.has(code as PreviewWebsiteScanErrorCode)) {
    return code as PreviewWebsiteScanErrorCode
  }
  if (status === 400) return 'invalid_url'
  if (status === 502) return 'fetch_failed'
  if (status === 500) return 'misconfigured'
  return 'unknown'
}

export function persistWebsitePreviewToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    const value = token?.trim() ?? ''
    if (value) sessionStorage.setItem(PREVIEW_WEBSITE_TOKEN_KEY, value)
    else sessionStorage.removeItem(PREVIEW_WEBSITE_TOKEN_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

export function readWebsitePreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(PREVIEW_WEBSITE_TOKEN_KEY)?.trim() || null
  } catch {
    return null
  }
}

export function captureWebsitePreviewTokenFromSearch(search: string) {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const token = sp.get(PREVIEW_WEBSITE_TOKEN_PARAM)?.trim()
  if (token) persistWebsitePreviewToken(token)
}

/** Signup URL, carrying the preview session token when the backend returned one. */
export function startSignUpPath(sessionToken: string | null): string {
  const token = sessionToken?.trim() || null
  if (token) persistWebsitePreviewToken(token)
  const sp = new URLSearchParams()
  if (token) sp.set(PREVIEW_WEBSITE_TOKEN_PARAM, token)
  const qs = sp.toString()
  return qs ? `/sign-in?${qs}` : '/sign-in'
}

export function readStartSessionToken(search: string): string | null {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return sp.get(START_SESSION_TOKEN_PARAM)?.trim() || null
}

/** `/start` URL that reloads the saved preview for this session token. */
export function startPreviewPath(sessionToken: string | null): string {
  const token = sessionToken?.trim() || null
  if (!token) return '/start'
  const sp = new URLSearchParams()
  sp.set(START_SESSION_TOKEN_PARAM, token)
  return `/start?${sp.toString()}`
}

export function displayUrlFromPreviewGet(data: PreviewWebsiteScanGetResponse): string {
  return data.normalized_url ?? data.url ?? ''
}

export type FetchPreviewWebsiteScanResult =
  | { ok: true; data: PreviewWebsiteScanResponse }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; code: PreviewWebsiteScanErrorCode; message: string }

export async function fetchPreviewWebsiteScan(
  url: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchPreviewWebsiteScanResult> {
  const trimmed = url.trim()
  if (!trimmed) {
    return {
      ok: false,
      code: 'missing_url',
      message: PREVIEW_WEBSITE_EMPTY_URL_MESSAGE,
    }
  }

  if (options.signal?.aborted) {
    return { ok: false, cancelled: true }
  }

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PREVIEW_WEBSITE_SCAN_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${PREVIEW_WEBSITE_SCAN_FUNCTION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ url: trimmed }),
      signal: controller.signal,
    })

    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      const parsed = edgeApiErrorFromPayload(res.status, payload)
      const code = normalizeErrorCode(parsed.code, res.status)
      return {
        ok: false,
        code,
        message: previewWebsiteScanErrorMessage(code, parsed.displayMessage),
      }
    }

    const data = normalizePreviewWebsiteScanResponse(payload)
    if (!data) {
      return { ok: false, code: 'unknown', message: UNKNOWN_MESSAGE }
    }

    if (data.session_token) persistWebsitePreviewToken(data.session_token)
    return { ok: true, data }
  } catch (error) {
    if (options.signal?.aborted && !timedOut) {
      return { ok: false, cancelled: true }
    }
    const aborted =
      timedOut ||
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    if (aborted) {
      return { ok: false, code: 'timeout', message: TIMEOUT_MESSAGE }
    }
    return { ok: false, code: 'network', message: NETWORK_MESSAGE }
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}

export type FetchPreviewWebsiteScanGetResult =
  | { ok: true; data: PreviewWebsiteScanGetResponse }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; code: PreviewWebsiteScanGetErrorCode; message: string }

export async function fetchPreviewWebsiteScanByToken(
  sessionToken: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchPreviewWebsiteScanGetResult> {
  const token = sessionToken.trim()
  if (!token) {
    return {
      ok: false,
      code: 'invalid_session_token',
      message: previewWebsiteScanGetErrorMessage('invalid_session_token'),
    }
  }

  if (options.signal?.aborted) {
    return { ok: false, cancelled: true }
  }

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PREVIEW_WEBSITE_SCAN_GET_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${PREVIEW_WEBSITE_SCAN_GET_FUNCTION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ session_token: token }),
      signal: controller.signal,
    })

    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      const parsed = edgeApiErrorFromPayload(res.status, payload)
      const code = normalizeGetErrorCode(parsed.code, res.status)
      return {
        ok: false,
        code,
        message: previewWebsiteScanGetErrorMessage(code, parsed.displayMessage),
      }
    }

    const data = normalizePreviewWebsiteScanGetResponse(payload, token)
    if (!data) {
      return { ok: false, code: 'unknown', message: UNKNOWN_MESSAGE }
    }

    persistWebsitePreviewToken(token)
    return { ok: true, data }
  } catch (error) {
    if (options.signal?.aborted && !timedOut) {
      return { ok: false, cancelled: true }
    }
    const aborted =
      timedOut ||
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    if (aborted) {
      return { ok: false, code: 'timeout', message: TIMEOUT_MESSAGE }
    }
    return { ok: false, code: 'network', message: NETWORK_MESSAGE }
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}

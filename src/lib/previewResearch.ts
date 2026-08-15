import type {
  ClaimPreviewSessionResult,
  PreviewRateLimitedResponse,
  PreviewResearchResponse,
  PreviewResult,
  PreviewVagueQueryResponse,
} from '@/types/previewResearch'
import { moderateText } from '@/lib/textModeration'
import { isFrontendVague } from '@/lib/previewVagueQuery'

export { isFrontendVague } from '@/lib/previewVagueQuery'
export type { FrontendVagueCheck } from '@/lib/previewVagueQuery'

export const PREVIEW_SESSION_KEY = 'powerproof_preview_session'
export const PREVIEW_DATA_KEY = 'powerproof_preview_data'
export const PREVIEW_QUERY_KEY = 'powerproof_preview_query'
export const PREVIEW_PENDING_QUERY_KEY = 'powerproof_preview_pending_query'
export const PREVIEW_RATE_TIMESTAMPS_KEY = 'powerproof_preview_rate_timestamps'

export const PREVIEW_MAX_PER_HOUR = 3
export const PREVIEW_MIN_QUERY_LENGTH = 5
export const PREVIEW_RATE_WINDOW_MS = 60 * 60 * 1000
export const PREVIEW_RATE_LIMIT_MESSAGE =
  "You've used your 3 free previews this hour. Sign up for unlimited research."

export const PREVIEW_PLACEHOLDERS = [
  'tiffin service for IT offices in Pune',
  'EV charging network in Tier 2 cities',
  'edtech platform for competitive exams',
  'cloud kitchen with regional cuisine',
  'B2B SaaS for MSME inventory management',
] as const

export const PREVIEW_LOADING_MESSAGES = [
  'Understanding your idea...',
  'Reading the market...',
  'Mapping competitors...',
  'Plotting your roadmap...',
  'Almost there...',
] as const

export type PreviewQueryValidation =
  | { ok: true }
  | { ok: false; message: string }

export function validatePreviewQuery(query: string): PreviewQueryValidation {
  const trimmed = query.trim()

  const vague = isFrontendVague(trimmed)
  if (vague.vague) {
    return { ok: false, message: vague.message }
  }

  const moderation = moderateText(trimmed)
  if (!moderation.ok) {
    return { ok: false, message: moderation.message }
  }

  return { ok: true }
}

function readPreviewRateTimestamps(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PREVIEW_RATE_TIMESTAMPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  } catch {
    return []
  }
}

function writePreviewRateTimestamps(timestamps: number[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREVIEW_RATE_TIMESTAMPS_KEY, JSON.stringify(timestamps))
}

function prunePreviewRateTimestamps(timestamps: number[], now = Date.now()): number[] {
  return timestamps.filter((timestamp) => now - timestamp < PREVIEW_RATE_WINDOW_MS)
}

export function getPreviewRateLimitInfo(now = Date.now()): {
  limited: boolean
  remaining: number
  resetsAt: number | null
} {
  const timestamps = prunePreviewRateTimestamps(readPreviewRateTimestamps(), now)
  if (timestamps.length !== readPreviewRateTimestamps().length) {
    writePreviewRateTimestamps(timestamps)
  }

  const limited = timestamps.length >= PREVIEW_MAX_PER_HOUR
  const resetsAt =
    limited && timestamps.length > 0
      ? Math.min(...timestamps) + PREVIEW_RATE_WINDOW_MS
      : null

  return {
    limited,
    remaining: Math.max(0, PREVIEW_MAX_PER_HOUR - timestamps.length),
    resetsAt,
  }
}

/** Record a preview API attempt — max {@link PREVIEW_MAX_PER_HOUR} per rolling hour. */
export function recordPreviewRequest(now = Date.now()) {
  const timestamps = [...prunePreviewRateTimestamps(readPreviewRateTimestamps(), now), now]
  writePreviewRateTimestamps(timestamps.slice(-PREVIEW_MAX_PER_HOUR))
}

/** Atomically check the hourly cap and consume one preview slot. */
export function tryConsumePreviewRequestSlot(now = Date.now()): boolean {
  const timestamps = prunePreviewRateTimestamps(readPreviewRateTimestamps(), now)
  if (timestamps.length >= PREVIEW_MAX_PER_HOUR) {
    writePreviewRateTimestamps(timestamps)
    return false
  }
  writePreviewRateTimestamps([...timestamps, now].slice(-PREVIEW_MAX_PER_HOUR))
  return true
}

export function canStartPreviewRequest(now = Date.now()): boolean {
  return !getPreviewRateLimitInfo(now).limited
}

export function setPreviewPendingQuery(query: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PREVIEW_PENDING_QUERY_KEY, query.trim())
}

/** Read and clear a query staged from the landing hero before navigation. */
export function consumePendingPreviewQuery(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const query = sessionStorage.getItem(PREVIEW_PENDING_QUERY_KEY)?.trim() ?? ''
    sessionStorage.removeItem(PREVIEW_PENDING_QUERY_KEY)
    return query || null
  } catch {
    return null
  }
}

export function readStoredPreview(): {
  sessionToken: string | null
  previewData: PreviewResult | null
  previewQuery: string
} {
  if (typeof window === 'undefined') {
    return { sessionToken: null, previewData: null, previewQuery: '' }
  }
  try {
    const token = localStorage.getItem(PREVIEW_SESSION_KEY)
    const raw = localStorage.getItem(PREVIEW_DATA_KEY)
    const query = localStorage.getItem(PREVIEW_QUERY_KEY) ?? ''
    return {
      sessionToken: token,
      previewData: raw ? (JSON.parse(raw) as PreviewResult) : null,
      previewQuery: query,
    }
  } catch {
    return { sessionToken: null, previewData: null, previewQuery: '' }
  }
}

export function persistPreviewSession(opts: {
  sessionToken: string | null
  preview: PreviewResult
  query: string
}) {
  if (typeof window === 'undefined') return
  if (opts.sessionToken) {
    localStorage.setItem(PREVIEW_SESSION_KEY, opts.sessionToken)
  }
  localStorage.setItem(PREVIEW_DATA_KEY, JSON.stringify(opts.preview))
  localStorage.setItem(PREVIEW_QUERY_KEY, opts.query)
}

export function clearPreviewSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREVIEW_SESSION_KEY)
  localStorage.removeItem(PREVIEW_DATA_KEY)
  localStorage.removeItem(PREVIEW_QUERY_KEY)
}

/** Restore the most recent preview slot when the server rejects a vague query. */
export function refundLastPreviewRequestSlot() {
  const timestamps = prunePreviewRateTimestamps(readPreviewRateTimestamps())
  if (timestamps.length === 0) return
  writePreviewRateTimestamps(timestamps.slice(0, -1))
}

export async function fetchPreviewResearch(
  query: string,
  country: string,
): Promise<
  | { ok: true; data: PreviewResearchResponse }
  | { ok: false; rateLimited: true; message: string }
  | { ok: false; vague: true; message: string; suggestion: string | null }
  | { ok: false; rateLimited: false; vague: false; message: string }
> {
  const trimmed = query.trim()
  const vague = isFrontendVague(trimmed)
  if (vague.vague) {
    return { ok: false, vague: true, message: vague.message, suggestion: null }
  }

  const validation = validatePreviewQuery(trimmed)
  if (!validation.ok) {
    return { ok: false, rateLimited: false, vague: false, message: validation.message }
  }

  if (!tryConsumePreviewRequestSlot()) {
    return { ok: false, rateLimited: true, message: PREVIEW_RATE_LIMIT_MESSAGE }
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!baseUrl || !anonKey) {
    refundLastPreviewRequestSlot()
    return { ok: false, rateLimited: false, vague: false, message: 'App is not configured for previews.' }
  }

  const res = await fetch(`${baseUrl}/functions/v1/preview-research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ query: trimmed, country }),
  })

  const data = (await res.json().catch(() => ({}))) as
    | PreviewResearchResponse
    | PreviewRateLimitedResponse
    | PreviewVagueQueryResponse
    | { error?: string; message?: string }

  if (res.status === 429 && data && 'code' in data && data.code === 'preview_limit_reached') {
    return {
      ok: false,
      rateLimited: true,
      message: data.message ?? PREVIEW_RATE_LIMIT_MESSAGE,
    }
  }

  if (
    res.status === 422 &&
    data &&
    'code' in data &&
    data.code === 'vague_query'
  ) {
    refundLastPreviewRequestSlot()
    const vagueBody = data as PreviewVagueQueryResponse
    return {
      ok: false,
      vague: true,
      message: vagueBody.message,
      suggestion: vagueBody.suggestion ?? null,
    }
  }

  if (!res.ok) {
    refundLastPreviewRequestSlot()
    const msg =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Something went wrong generating your preview.'
    return { ok: false, rateLimited: false, vague: false, message: msg }
  }

  if (!('preview' in data) || !data.preview) {
    refundLastPreviewRequestSlot()
    return { ok: false, rateLimited: false, vague: false, message: 'Invalid preview response.' }
  }

  return { ok: true, data: data as PreviewResearchResponse }
}

export function landingSignUpWithPreview(): string {
  return '/?preview=true#sign-in'
}

export function isPreviewSignInIntent(search: string): boolean {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return sp.get('preview') === 'true'
}

export function parsePreviewDataFromContext(
  researchContext: unknown,
): PreviewResult | null {
  if (!researchContext || typeof researchContext !== 'object') return null
  const preview = (researchContext as Record<string, unknown>).preview_data
  if (!preview || typeof preview !== 'object') return null
  return preview as PreviewResult
}

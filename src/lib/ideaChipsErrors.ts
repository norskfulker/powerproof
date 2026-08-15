export type IdeaChipsErrorInfo = {
  message: string
  code?: string
  resetsAt?: string
}

export const IDEA_CHIPS_GENERIC_ERROR = 'Could not load idea suggestions. Try again in a moment.'

const RATE_LIMIT_CODES = new Set(['hourly_limit_exceeded', 'daily_limit_exceeded'])

export function isIdeaChipsRateLimitError(error: IdeaChipsErrorInfo | null | undefined): boolean {
  return Boolean(error?.code && RATE_LIMIT_CODES.has(error.code))
}

export function readIdeaChipsErrorPayload(raw: unknown): IdeaChipsErrorInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const message = typeof record.error === 'string' ? record.error.trim() : ''
  if (!message) return null
  return {
    message,
    code: typeof record.code === 'string' ? record.code : undefined,
    resetsAt: typeof record.resets_at === 'string' ? record.resets_at : undefined,
  }
}

/** Parse JSON body from `generate-idea-chips` (fetch or invoke `data`). */
export function parseIdeaChipsResponseBody(
  payload: unknown,
  httpStatus?: number,
): IdeaChipsErrorInfo | null {
  const fromPayload = readIdeaChipsErrorPayload(payload)
  if (fromPayload) return fromPayload

  if (httpStatus === 401) return { message: 'Unauthorized' }
  if (httpStatus === 429) {
    return { message: 'Rate limit exceeded. Try again later.', code: 'hourly_limit_exceeded' }
  }

  return null
}

export async function readIdeaChipsErrorFromInvokeContext(
  invokeError: unknown,
): Promise<IdeaChipsErrorInfo | null> {
  if (!invokeError || typeof invokeError !== 'object') return null

  const record = invokeError as Record<string, unknown>
  const direct = readIdeaChipsErrorPayload(record)
  if (direct) return direct

  const ctx = record.context
  const fromContext = readIdeaChipsErrorPayload(ctx)
  if (fromContext) return fromContext

  if (ctx instanceof Response) {
    try {
      const json = await ctx.clone().json()
      return readIdeaChipsErrorPayload(json)
    } catch {
      return null
    }
  }

  return null
}

export function parseIdeaChipsInvokeFailure(
  invokeError: unknown,
  data: unknown,
): IdeaChipsErrorInfo {
  const fromData = readIdeaChipsErrorPayload(data)
  if (fromData) return fromData

  if (invokeError && typeof invokeError === 'object') {
    const ctx = (invokeError as { context?: unknown }).context
    const fromContext = readIdeaChipsErrorPayload(ctx)
    if (fromContext) return fromContext
  }

  if (invokeError instanceof Error && invokeError.message.trim()) {
    return { message: invokeError.message.trim() }
  }

  return { message: IDEA_CHIPS_GENERIC_ERROR }
}

const ISO_TIMESTAMP_IN_TEXT_RE =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/

/** e.g. `1 hour, 5 mins, 30 seconds` */
export function formatTimeUntilIdeaChipsReset(iso: string, nowMs = Date.now()): string {
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return iso

  let remainingMs = Math.max(0, target - nowMs)
  const hours = Math.floor(remainingMs / 3_600_000)
  remainingMs %= 3_600_000
  const minutes = Math.floor(remainingMs / 60_000)
  remainingMs %= 60_000
  const seconds = Math.floor(remainingMs / 1_000)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes > 0) parts.push(`${minutes} mins`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)

  return parts.join(', ')
}

export function formatIdeaChipsResetsAt(iso: string, nowMs = Date.now()): string {
  return formatTimeUntilIdeaChipsReset(iso, nowMs)
}

/** User-facing copy — swaps ISO timestamps for a countdown. */
export function formatIdeaChipsErrorForDisplay(error: IdeaChipsErrorInfo, nowMs = Date.now()): string {
  const iso = error.resetsAt ?? error.message.match(ISO_TIMESTAMP_IN_TEXT_RE)?.[0]
  if (!iso) return error.message

  const countdown = formatTimeUntilIdeaChipsReset(iso, nowMs)
  let message = error.message

  if (message.includes(iso)) {
    message = message.replace(iso, countdown)
    message = message.replace(/\bResets at\b/i, 'Resets in')
    return message
  }

  const trimmed = message.replace(/\.\s*$/, '')
  return `${trimmed}. Resets in ${countdown}.`
}

export function ideaChipsErrorShowsResetsLine(error: IdeaChipsErrorInfo): boolean {
  if (!error.resetsAt) return false
  return !error.message.includes(error.resetsAt)
}

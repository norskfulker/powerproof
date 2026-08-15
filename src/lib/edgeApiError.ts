type EdgeErrorPayload = Record<string, unknown>

function asRecord(value: unknown): EdgeErrorPayload {
  return value && typeof value === 'object' ? (value as EdgeErrorPayload) : {}
}

function asFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function asNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

export class EdgeApiError extends Error {
  readonly status?: number
  readonly code: string
  readonly displayMessage: string
  readonly requiredCredits?: number
  readonly currentCredits?: number
  readonly used?: number
  readonly allowance?: number
  readonly resetsAt?: string
  readonly creditsRefunded?: boolean

  constructor(options: {
    status?: number
    code: string
    displayMessage?: string
    requiredCredits?: number
    currentCredits?: number
    used?: number
    allowance?: number
    resetsAt?: string
    creditsRefunded?: boolean
  }) {
    // Keep the machine code as Error.message while legacy callers migrate to typed checks.
    super(options.code)
    this.name = 'EdgeApiError'
    this.status = options.status
    this.code = options.code
    this.displayMessage = options.displayMessage ?? options.code
    this.requiredCredits = options.requiredCredits
    this.currentCredits = options.currentCredits
    this.used = options.used
    this.allowance = options.allowance
    this.resetsAt = options.resetsAt
    this.creditsRefunded = options.creditsRefunded
  }
}

export function edgeApiErrorFromPayload(
  status: number | undefined,
  payload: unknown,
  fallbackMessage = status ? `Request failed (${status})` : 'Request failed',
): EdgeApiError {
  const data = asRecord(payload)
  const explicitCode = asNonEmptyString(data.code)
  const errorText = asNonEmptyString(data.error)
  const messageText = asNonEmptyString(data.message)
  const searchableText = `${errorText ?? ''} ${messageText ?? ''}`.toLowerCase()
  const code =
    explicitCode ??
    (status === 402 ? 'insufficient_credits' : undefined) ??
    (searchableText.includes('insufficient_credits') ? 'insufficient_credits' : undefined) ??
    (searchableText.includes('gemini') ? 'gemini_failure' : undefined) ??
    errorText ??
    `http_${status ?? 'error'}`

  return new EdgeApiError({
    status,
    code,
    displayMessage: asNonEmptyString(messageText, errorText, fallbackMessage),
    requiredCredits: asFiniteNumber(data.required_credits, data.required),
    currentCredits: asFiniteNumber(data.current_credits, data.balance),
    used: asFiniteNumber(data.used, data.usage_count),
    allowance: asFiniteNumber(data.allowance, data.limit),
    resetsAt: asNonEmptyString(data.resets_at, data.reset_at, data.period_end),
    creditsRefunded:
      typeof data.credits_refunded === 'boolean' ? data.credits_refunded : undefined,
  })
}

export function edgeApiErrorFromSupabase(
  error: unknown,
  data: unknown,
  fallbackMessage = 'Request failed',
): EdgeApiError | null {
  if (!error) return null
  const record = asRecord(error)
  const context = asRecord(record.context)
  const status = asFiniteNumber(context.status, record.status, record.statusCode)
  const payload = Object.keys(asRecord(data)).length ? data : error
  return edgeApiErrorFromPayload(status, payload, fallbackMessage)
}

export function isEdgeApiError(error: unknown, code?: string): error is EdgeApiError {
  return error instanceof EdgeApiError && (code == null || error.code === code)
}

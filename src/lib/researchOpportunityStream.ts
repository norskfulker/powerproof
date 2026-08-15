import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'

export type ResearchVisibility = 'private' | 'catalog'

export type ResearchStreamStarted = {
  id: string
  slug: string
  credits_used?: number
  credits_remaining?: number
  visibility?: ResearchVisibility
}

export type ResearchStreamComplete = ResearchStreamStarted & {
  research_style?: string
  project_id?: string
  byok_used?: boolean
}

export type ResearchStreamError = {
  message: string
  refunded?: boolean
  detail?: string
}

export type ResearchStreamHandlers = {
  onStarted?: (data: ResearchStreamStarted) => void
  onProgress?: (data: { chars: number }) => void
  onComplete?: (data: ResearchStreamComplete) => void
  onError?: (data: ResearchStreamError) => void
}

export type ResearchStreamResult =
  | { outcome: 'complete'; data: ResearchStreamComplete }
  | { outcome: 'error'; data: ResearchStreamError }
  | { outcome: 'aborted' }

function dispatchNamedSseEvent(
  eventName: string,
  data: unknown,
  handlers: ResearchStreamHandlers,
): ResearchStreamResult | null {
  switch (eventName) {
    case 'started':
      handlers.onStarted?.(data as ResearchStreamStarted)
      return null
    case 'progress':
      handlers.onProgress?.(data as { chars: number })
      return null
    case 'complete': {
      const complete = data as ResearchStreamComplete
      handlers.onComplete?.(complete)
      return { outcome: 'complete', data: complete }
    }
    case 'error': {
      const err = data as ResearchStreamError
      handlers.onError?.(err)
      return { outcome: 'error', data: err }
    }
    default:
      return null
  }
}

function processSseLines(
  lines: string[],
  pendingEventRef: { value: string },
  handlers: ResearchStreamHandlers,
): ResearchStreamResult | null {
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      pendingEventRef.value = line.slice(7).trim()
      continue
    }
    if (!line.startsWith('data: ')) continue

    const eventName = pendingEventRef.value
    if (!eventName) continue

    try {
      const data = JSON.parse(line.slice(6).trim()) as unknown
      const result = dispatchNamedSseEvent(eventName, data, handlers)
      pendingEventRef.value = ''
      if (result) return result
    } catch {
      pendingEventRef.value = ''
    }
  }
  return null
}

async function parseJsonResearchResponse(
  res: Response,
  handlers: ResearchStreamHandlers,
): Promise<ResearchStreamResult> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok || data.error) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Research failed (${res.status})`
    const err: ResearchStreamError = {
      message,
      detail: typeof data.detail === 'string' ? data.detail : undefined,
      refunded:
        data.credits_refunded === true ||
        String(message).toLowerCase().includes('refunded') ||
        res.status === 500,
    }
    handlers.onError?.(err)
    return { outcome: 'error', data: err }
  }

  const status = data.status
  if (status === 'complete' || status === 'pending') {
    const complete: ResearchStreamComplete = {
      id: String(data.id ?? ''),
      slug: String(data.slug ?? ''),
      credits_used: typeof data.credits_used === 'number' ? data.credits_used : undefined,
      credits_remaining:
        typeof data.credits_remaining === 'number' ? data.credits_remaining : undefined,
      visibility:
        data.visibility === 'private' || data.visibility === 'catalog'
          ? data.visibility
          : undefined,
      research_style:
        typeof data.research_style === 'string' ? data.research_style : undefined,
      project_id: typeof data.project_id === 'string' ? data.project_id : undefined,
      byok_used: data.byok_used === true,
    }
    handlers.onComplete?.(complete)
    return { outcome: 'complete', data: complete }
  }

  const err: ResearchStreamError = { message: 'Unexpected response from research service.' }
  handlers.onError?.(err)
  return { outcome: 'error', data: err }
}

/** Consume `research-opportunity` SSE (v42+) or JSON fallback. */
export async function streamResearchOpportunity(
  supabaseUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
  handlers: ResearchStreamHandlers,
  signal?: AbortSignal,
): Promise<ResearchStreamResult> {
  const res = await fetch(`${supabaseUrl}/functions/v1/research-opportunity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
      ...byokRequestHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  })

  const contentType = res.headers.get('Content-Type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    return parseJsonResearchResponse(res, handlers)
  }

  if (!res.ok || !res.body) {
    return parseJsonResearchResponse(res, handlers)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const pendingEventRef = { value: '' }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      const result = processSseLines(lines, pendingEventRef, handlers)
      if (result) return result
    }

    if (buffer.trim()) {
      const result = processSseLines([buffer], pendingEventRef, handlers)
      if (result) return result
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { outcome: 'aborted' }
    }
    const message = formatByokAwareError(
      err instanceof Error ? err.message : 'Network error. Please try again.',
    )
    const error: ResearchStreamError = { message }
    handlers.onError?.(error)
    return { outcome: 'error', data: error }
  }

  const message = 'Research stream ended unexpectedly.'
  const error: ResearchStreamError = { message }
  handlers.onError?.(error)
  return { outcome: 'error', data: error }
}

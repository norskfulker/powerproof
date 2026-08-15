/** Read Supabase Edge Function SSE (data: {...}\\n\\n) or JSON fallback. */

import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { SUPABASE_ANON_KEY } from '@/lib/supabase'

export function parseSseBlocks<T = Record<string, unknown>>(
  buffer: string,
): { events: T[]; rest: string } {
  const events: T[] = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr) continue
      try {
        events.push(JSON.parse(jsonStr) as T)
      } catch {
        /* skip malformed */
      }
    }
  }
  return { events, rest }
}

export async function fetchSupabaseFunctionStream<T extends { type: string }>(
  baseUrl: string,
  functionName: string,
  accessToken: string,
  body: Record<string, unknown>,
  handlers: { onEvent: (event: T) => void },
): Promise<void> {
  const res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
      apikey: SUPABASE_ANON_KEY,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify({ ...body, stream: true }),
  })

  const contentType = res.headers.get('Content-Type') ?? ''

  if (!contentType.includes('text/event-stream')) {
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const message = String(json.error ?? `Request failed (${functionName})`)
      handlers.onEvent({ type: 'error', message, code: json.code } as T)
      if (res.status === 402) throw edgeApiErrorFromPayload(res.status, json, message)
      throw new Error(formatByokAwareError(message))
    }
    handlers.onEvent({ type: 'done', ...json } as T)
    return
  }

  if (!res.ok || !res.body) {
    const text = await res.text()
    let message = `Request failed (${functionName})`
    try {
      const j = JSON.parse(text) as { error?: string }
      message = j.error ?? message
    } catch {
      if (text) message = text.slice(0, 200)
    }
    handlers.onEvent({ type: 'error', message } as T)
    throw new Error(formatByokAwareError(message))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseBlocks<T>(buffer)
    buffer = rest
    for (const ev of events) {
      handlers.onEvent(ev)
      if ((ev as { type?: string }).type === 'error') {
        if ((ev as { code?: string }).code === 'insufficient_credits') {
          throw edgeApiErrorFromPayload(402, ev)
        }
        throw new Error(
          formatByokAwareError(String((ev as { message?: string }).message ?? 'Stream error')),
        )
      }
    }
  }

  const { events } = parseSseBlocks<T>(buffer + '\n\n')
  for (const ev of events) {
    handlers.onEvent(ev)
    if ((ev as { type?: string }).type === 'error') {
      if ((ev as { code?: string }).code === 'insufficient_credits') {
        throw edgeApiErrorFromPayload(402, ev)
      }
      throw new Error(
        formatByokAwareError(String((ev as { message?: string }).message ?? 'Stream error')),
      )
    }
  }
}

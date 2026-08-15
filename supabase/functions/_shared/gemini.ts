export type GeminiRole = 'user' | 'model'

export type GeminiContent = { role: GeminiRole; parts: Array<{ text: string }> }

export function toGeminiContents(messages: Array<{ role?: string; content?: string }>): GeminiContent[] {
  const out: GeminiContent[] = []
  for (const m of messages) {
    const role: GeminiRole = m.role === 'assistant' ? 'model' : 'user'
    const text = typeof m.content === 'string' ? m.content : ''
    if (!text.trim()) continue
    out.push({ role, parts: [{ text }] })
  }
  return out
}

export function anthropicFromText(text: string) {
  return { content: [{ type: 'text', text }] }
}

function uniqueModelChain(primary: string, fallbacks: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [primary, ...fallbacks]) {
    const m = raw.replace(/^models\//, '').trim()
    if (!m || seen.has(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out
}

function isQuotaOrRateLimitError(status: number, message: string): boolean {
  if (status === 429) return true
  const m = message.toLowerCase()
  return (
    m.includes('quota') ||
    m.includes('resource_exhausted') ||
    m.includes('rate limit') ||
    m.includes('exceeded') ||
    m.includes('limit: 0')
  )
}

export async function generateGeminiText(opts: {
  apiKey: string
  system?: string
  contents: GeminiContent[]
  maxOutputTokens: number
  model?: string
  modelFallbacks?: string[]
  temperature?: number
  topP?: number
}): Promise<{ ok: true; text: string; modelUsed: string } | { ok: false; status: number; error: string }> {
  const primary = (opts.model?.trim() || 'gemini-2.5-flash-lite').replace(/^models\//, '')
  const modelChain = uniqueModelChain(primary, [...(opts.modelFallbacks ?? []), 'gemini-2.5-flash'])

  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      maxOutputTokens: Math.min(Math.max(1, opts.maxOutputTokens), 8192),
      temperature: typeof opts.temperature === 'number' ? opts.temperature : undefined,
      topP: typeof opts.topP === 'number' ? opts.topP : undefined,
    },
  }
  if (opts.system && opts.system.trim()) {
    body.systemInstruction = { parts: [{ text: opts.system }] }
  }

  let lastMsg = 'Gemini request failed'
  let lastStatus = 502

  for (let i = 0; i < modelChain.length; i += 1) {
    const model = modelChain[i]
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    if (res.ok) {
      const candidates = data.candidates as Array<Record<string, unknown>> | undefined
      const first = candidates?.[0]
      const content = first?.content as Record<string, unknown> | undefined
      const parts = content?.parts as Array<Record<string, unknown>> | undefined
      const texts: string[] = []
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (typeof p?.text === 'string') texts.push(p.text)
        }
      }
      const joined = texts.join('').trim()
      if (!joined) return { ok: false, status: 502, error: 'Empty model response' }
      return { ok: true, text: joined, modelUsed: model }
    }

    const errObj = data?.error as Record<string, unknown> | undefined
    const msg = typeof errObj?.message === 'string' ? errObj.message : `Gemini request failed (${res.status})`
    lastMsg = msg
    lastStatus = res.status >= 400 && res.status < 600 ? res.status : 502

    const tryNext = i < modelChain.length - 1 && isQuotaOrRateLimitError(res.status, msg)
    if (!tryNext) return { ok: false, status: lastStatus, error: lastMsg }
  }

  return { ok: false, status: lastStatus, error: lastMsg }
}


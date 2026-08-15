import type { ClarifyAnswer, ClarifyQuestion } from '@/types/research'
import type { Persona } from '@/types/persona'
import { isPersona } from '@/types/persona'
import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import { parseClarifyInvalidInput } from '@/lib/clarifyInvalidInput'

export type ClarifyRoadmapPromptBody = {
  query: string
  country: string
  round: number
  previous_answers: ClarifyAnswer[]
  detected_persona: Persona | null
}

export type ClarifyRoadmapNeedsMoreResponse = {
  status: 'needs_more'
  round: number
  questions: ClarifyQuestion[]
  detected_persona: Persona | null
  byok: boolean
}

export type ClarifyRoadmapReadyResponse = {
  status: 'ready'
  refined_prompt: string
  summary: string
  detected_persona: Persona
  round: number
  byok: boolean
}

export type ClarifyRoadmapPromptResponse =
  | ClarifyRoadmapNeedsMoreResponse
  | ClarifyRoadmapReadyResponse

function parsePersona(value: unknown): Persona | null {
  return isPersona(value) ? value : null
}

export async function invokeClarifyRoadmapPrompt(
  accessToken: string,
  body: ClarifyRoadmapPromptBody,
): Promise<ClarifyRoadmapPromptResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL.')
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/clarify-roadmap-prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  const invalidInput = parseClarifyInvalidInput(res, data)
  if (invalidInput) throw invalidInput

  if (!res.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Clarification failed (${res.status})`
    throw new Error(formatByokAwareError(msg))
  }

  const byok = Boolean(data.byok)

  if (data.status === 'ready' && typeof data.refined_prompt === 'string') {
    const persona = parsePersona(data.detected_persona)
    if (!persona) {
      throw new Error('Unexpected response from clarification service.')
    }
    return {
      status: 'ready',
      refined_prompt: data.refined_prompt,
      summary: typeof data.summary === 'string' ? data.summary : '',
      detected_persona: persona,
      round: typeof data.round === 'number' ? data.round : body.round,
      byok,
    }
  }

  if (data.status === 'needs_more' && Array.isArray(data.questions)) {
    return {
      status: 'needs_more',
      round: typeof data.round === 'number' ? data.round : body.round + 1,
      questions: data.questions as ClarifyQuestion[],
      detected_persona: parsePersona(data.detected_persona),
      byok,
    }
  }

  throw new Error('Unexpected response from clarification service.')
}

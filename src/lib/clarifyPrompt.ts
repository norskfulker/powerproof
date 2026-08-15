import type { ClarifyAnswer, ClarifyQuestion, ClarifyResearchPromptResponse } from '@/types/research'
import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import { parseClarifyInvalidInput } from '@/lib/clarifyInvalidInput'

export type ClarifyPromptBody = {
  query: string
  country: string
  round: number
  previous_answers: ClarifyAnswer[]
}

export async function invokeClarifyPrompt(
  functionName: string,
  accessToken: string,
  body: ClarifyPromptBody,
): Promise<ClarifyResearchPromptResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL.')
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
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

  if (data.status === 'ready' && typeof data.refined_prompt === 'string') {
    return {
      status: 'ready',
      refined_prompt: data.refined_prompt,
      summary: typeof data.summary === 'string' ? data.summary : '',
      round: typeof data.round === 'number' ? data.round : body.round,
    }
  }

  if (data.status === 'needs_more' && Array.isArray(data.questions)) {
    return {
      status: 'needs_more',
      round: typeof data.round === 'number' ? data.round : body.round + 1,
      questions: data.questions as ClarifyQuestion[],
    }
  }

  throw new Error('Unexpected response from clarification service.')
}

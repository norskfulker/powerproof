import type { ClarifyAnswer, ClarifyQuestion, SaturationData } from '@/types/research'

export type ClarifyStatePersisted = {
  status: 'needs_more' | 'ready'
  round: number
  previous_answers: ClarifyAnswer[]
  questions: ClarifyQuestion[]
  refined_prompt: string | null
  summary: string | null
  saturation: SaturationData | null
}

export function parseClarifyState(raw: unknown): ClarifyStatePersisted | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const status = o.status
  if (status !== 'needs_more' && status !== 'ready') return null
  if (typeof o.round !== 'number') return null
  if (!Array.isArray(o.previous_answers)) return null
  if (!Array.isArray(o.questions)) return null

  return {
    status,
    round: o.round,
    previous_answers: o.previous_answers as ClarifyAnswer[],
    questions: o.questions as ClarifyQuestion[],
    refined_prompt: typeof o.refined_prompt === 'string' ? o.refined_prompt : null,
    summary: typeof o.summary === 'string' ? o.summary : null,
    saturation:
      o.saturation && typeof o.saturation === 'object'
        ? (o.saturation as SaturationData)
        : null,
  }
}

export function clarifyStateFromNeedsMore(
  round: number,
  previousAnswers: ClarifyAnswer[],
  questions: ClarifyQuestion[],
): ClarifyStatePersisted {
  return {
    status: 'needs_more',
    round,
    previous_answers: previousAnswers,
    questions,
    refined_prompt: null,
    summary: null,
    saturation: null,
  }
}

export function clarifyStateFromReady(
  round: number,
  previousAnswers: ClarifyAnswer[],
  refinedPrompt: string,
  summary: string,
  saturation: SaturationData | null = null,
): ClarifyStatePersisted {
  return {
    status: 'ready',
    round,
    previous_answers: previousAnswers,
    questions: [],
    refined_prompt: refinedPrompt,
    summary,
    saturation,
  }
}

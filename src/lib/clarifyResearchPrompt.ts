import type { ClarifyAnswer, ClarifyResearchPromptResponse } from '@/types/research'
import { invokeClarifyPrompt } from '@/lib/clarifyPrompt'

export async function invokeClarifyResearchPrompt(
  accessToken: string,
  body: {
    query: string
    country: string
    round: number
    previous_answers: ClarifyAnswer[]
  },
): Promise<ClarifyResearchPromptResponse> {
  return invokeClarifyPrompt('clarify-research-prompt', accessToken, body)
}

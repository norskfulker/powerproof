import type { ClarifyResearchPromptResponse } from '@/types/research'
import { invokeClarifyPrompt, type ClarifyPromptBody } from '@/lib/clarifyPrompt'

export async function invokeClarifyWarRoomPrompt(
  accessToken: string,
  body: ClarifyPromptBody,
): Promise<ClarifyResearchPromptResponse> {
  return invokeClarifyPrompt('clarify-warroom-prompt', accessToken, body)
}

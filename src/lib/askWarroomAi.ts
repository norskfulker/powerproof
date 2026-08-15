import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import type {
  AskAiHistoryResponse,
  AskAiMessageResponse,
  AskAiNewSessionResponse,
  AskAiSession,
  AskAiSuggestion,
} from '@/lib/askAiTypes'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'

export const WARROOM_ASK_AI_FALLBACK_SUGGESTIONS: AskAiSuggestion[] = [
  {
    label: 'Which step should I do first?',
    prefill: 'Which step in the playbook should I execute first and why?',
  },
  {
    label: 'What is my 30-day sprint?',
    prefill: 'Break down my 30-day sprint into a week-by-week action plan.',
  },
  {
    label: 'Where am I most likely to fail?',
    prefill: 'Where in this playbook am I most likely to fail and how do I prevent it?',
  },
  {
    label: 'How do I validate step 1?',
    prefill: 'How do I know if I have successfully completed the first step?',
  },
]

async function invokeAskWarroomAi<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-warroom-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (res.status === 402) {
    throw edgeApiErrorFromPayload(res.status, data)
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
          ? data.message
          : `Request failed (${res.status})`
    throw new Error(formatByokAwareError(msg))
  }

  return data as T
}

function withFallbackSuggestions(suggestions: AskAiSuggestion[] | undefined): AskAiSuggestion[] {
  return suggestions?.length ? suggestions : WARROOM_ASK_AI_FALLBACK_SUGGESTIONS
}

export async function createAskWarroomSession(
  playbookId: string,
): Promise<AskAiNewSessionResponse> {
  const result = await invokeAskWarroomAi<AskAiNewSessionResponse>({
    mode: 'new_session',
    playbook_id: playbookId,
  })
  return {
    ...result,
    suggestions: withFallbackSuggestions(result.suggestions),
  }
}

export async function sendAskWarroomMessage(
  playbookId: string,
  sessionId: string,
  message: string,
): Promise<AskAiMessageResponse> {
  return invokeAskWarroomAi<AskAiMessageResponse>({
    mode: 'message',
    playbook_id: playbookId,
    session_id: sessionId,
    message,
  })
}

export async function fetchAskWarroomHistory(playbookId: string): Promise<AskAiHistoryResponse> {
  const result = await invokeAskWarroomAi<AskAiHistoryResponse>({
    mode: 'history',
    playbook_id: playbookId,
  })
  return { sessions: result.sessions ?? [] }
}

export function askWarroomSessionPreview(session: AskAiSession): string {
  const firstUser = session.messages?.find((m) => m.role === 'user')
  if (firstUser?.content.trim()) return firstUser.content.trim()
  return 'Conversation'
}

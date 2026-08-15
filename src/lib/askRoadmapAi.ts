import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'

import type { AskAiSuggestion } from '@/lib/askAiTypes'

export type AskRoadmapSuggestion = {
  label: string
  prefill: string
}

export type AskRoadmapMessage = {
  role: 'user' | 'assistant'
  content: string
  next_actions?: string[]
  created_at: string
  byok?: boolean
}

export type AskRoadmapSession = {
  session_id: string
  created_at: string
  updated_at?: string
  messages?: AskRoadmapMessage[]
}

export type AskRoadmapNewSessionResponse = {
  session_id: string
  status: 'pending' | 'active'
  suggestions: AskRoadmapSuggestion[]
}

export type AskRoadmapMessageResponse = {
  reply: string
  next_actions?: string[]
  byok_used: boolean
  suggestions?: AskAiSuggestion[]
}

export type AskRoadmapHistoryResponse = {
  sessions: AskRoadmapSession[]
}

export const ROADMAP_ASK_AI_FALLBACK_SUGGESTIONS: AskAiSuggestion[] = [
  {
    label: 'What should I do this week?',
    prefill: 'What should I focus on this week in this roadmap?',
  },
  {
    label: 'Which phase is riskiest?',
    prefill: 'Which phase in this roadmap is the riskiest and how do I de-risk it?',
  },
  {
    label: 'How do I speed up progress?',
    prefill: 'How can I speed up progress without skipping important steps?',
  },
  {
    label: 'What can I skip or defer?',
    prefill: 'What steps can I safely skip or defer in this roadmap?',
  },
]

async function invokeAskRoadmapAi<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-roadmap-ai`, {
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

export async function createAskRoadmapSession(
  roadmapId: string,
): Promise<AskRoadmapNewSessionResponse> {
  return invokeAskRoadmapAi<AskRoadmapNewSessionResponse>({
    mode: 'new_session',
    roadmap_id: roadmapId,
  })
}

export async function sendAskRoadmapMessage(
  roadmapId: string,
  sessionId: string,
  message: string,
): Promise<AskRoadmapMessageResponse> {
  return invokeAskRoadmapAi<AskRoadmapMessageResponse>({
    mode: 'message',
    roadmap_id: roadmapId,
    session_id: sessionId,
    message,
  })
}

export async function fetchAskRoadmapHistory(
  roadmapId: string,
): Promise<AskRoadmapHistoryResponse> {
  return invokeAskRoadmapAi<AskRoadmapHistoryResponse>({
    mode: 'history',
    roadmap_id: roadmapId,
  })
}

export function askRoadmapSessionPreview(session: AskRoadmapSession): string {
  const firstUser = session.messages?.find((m) => m.role === 'user')
  if (firstUser?.content.trim()) return firstUser.content.trim()
  return 'Conversation'
}

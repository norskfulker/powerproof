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

export const MARKET_TEST_ASK_AI_FALLBACK_SUGGESTIONS: AskAiSuggestion[] = [
  {
    label: 'Who should I target on Meta?',
    prefill: 'Who should I target on Meta ads for this business?',
  },
  {
    label: 'Best subreddits to post in',
    prefill: 'Which subreddits should I post in to validate this idea?',
  },
  {
    label: 'Write a LinkedIn cold DM',
    prefill: 'Write me a cold DM script for LinkedIn outreach for this business.',
  },
  {
    label: 'Instagram hook angles',
    prefill: 'What are the best hook angles for Instagram Reels for this idea?',
  },
  {
    label: 'Google keywords to target',
    prefill: 'What Google keywords should I target — paid vs organic?',
  },
  {
    label: 'Draft a landing page outline',
    prefill: 'Draft a landing page outline for this business idea.',
  },
]

async function invokeMarketTestChat<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/market-test-chat`, {
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
  return suggestions?.length ? suggestions : MARKET_TEST_ASK_AI_FALLBACK_SUGGESTIONS
}

export async function createMarketTestChatSession(
  marketTestId: string,
): Promise<AskAiNewSessionResponse> {
  const result = await invokeMarketTestChat<AskAiNewSessionResponse>({
    mode: 'new_session',
    market_test_id: marketTestId,
  })
  return {
    ...result,
    suggestions: withFallbackSuggestions(result.suggestions),
  }
}

export async function sendMarketTestChatMessage(
  marketTestId: string,
  sessionId: string,
  message: string,
): Promise<AskAiMessageResponse> {
  return invokeMarketTestChat<AskAiMessageResponse>({
    mode: 'message',
    market_test_id: marketTestId,
    session_id: sessionId,
    message,
  })
}

export async function fetchMarketTestChatHistory(
  marketTestId: string,
): Promise<AskAiHistoryResponse> {
  const result = await invokeMarketTestChat<AskAiHistoryResponse & { suggestions?: AskAiSuggestion[] }>(
    {
      mode: 'history',
      market_test_id: marketTestId,
    },
  )
  return { sessions: result.sessions ?? [] }
}

export function marketTestChatSessionPreview(session: AskAiSession): string {
  const firstUser = session.messages?.find((m) => m.role === 'user')
  if (firstUser?.content.trim()) return firstUser.content.trim()
  return 'Conversation'
}

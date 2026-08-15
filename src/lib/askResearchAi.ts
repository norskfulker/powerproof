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

export const RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS: AskAiSuggestion[] = [
  {
    label: 'How do I get my first customer?',
    prefill: 'What is the fastest way to get my first customer for this business?',
  },
  {
    label: 'Who are my real competitors?',
    prefill: 'Who are my most dangerous competitors and how do I differentiate?',
  },
  {
    label: 'Biggest risk to address first',
    prefill: 'What is the biggest risk in this business and how should I address it first?',
  },
  {
    label: 'How much capital do I need?',
    prefill: 'How much capital do I realistically need to start and reach break-even?',
  },
]

async function invokeAskResearchAi<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-research-ai`, {
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
  return suggestions?.length ? suggestions : RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS
}

export async function createAskResearchSession(
  userOpportunityId: string,
): Promise<AskAiNewSessionResponse> {
  const result = await invokeAskResearchAi<AskAiNewSessionResponse>({
    mode: 'new_session',
    user_opportunity_id: userOpportunityId,
  })
  return {
    ...result,
    suggestions: withFallbackSuggestions(result.suggestions),
  }
}

export async function sendAskResearchMessage(
  userOpportunityId: string,
  sessionId: string,
  message: string,
  options?: { applyOpportunityEdit?: boolean },
): Promise<AskAiMessageResponse> {
  return invokeAskResearchAi<AskAiMessageResponse>({
    mode: 'message',
    user_opportunity_id: userOpportunityId,
    session_id: sessionId,
    message,
    ...(options?.applyOpportunityEdit ? { apply_opportunity_edit: true } : {}),
  })
}

export async function fetchAskResearchHistory(
  userOpportunityId: string,
): Promise<AskAiHistoryResponse> {
  const result = await invokeAskResearchAi<AskAiHistoryResponse>({
    mode: 'history',
    user_opportunity_id: userOpportunityId,
  })
  return { sessions: result.sessions ?? [] }
}

/** Catalog opportunity Ask AI (`ask-research-ai` + opportunity_id). */
export async function createAskCatalogOpportunitySession(
  opportunityId: string,
  options?: { onboardingDemo?: boolean },
): Promise<AskAiNewSessionResponse> {
  const result = await invokeAskResearchAi<AskAiNewSessionResponse>({
    mode: 'new_session',
    opportunity_id: opportunityId,
    ...(options?.onboardingDemo ? { onboarding_demo: true } : {}),
  })
  return {
    ...result,
    suggestions: withFallbackSuggestions(result.suggestions),
  }
}

export async function sendAskCatalogOpportunityMessage(
  opportunityId: string,
  sessionId: string,
  message: string,
  options?: {
    recentMessages?: Array<{ role: string; content: string }>
    onboardingDemo?: boolean
  },
): Promise<AskAiMessageResponse> {
  return invokeAskResearchAi<AskAiMessageResponse>({
    mode: 'message',
    opportunity_id: opportunityId,
    session_id: sessionId,
    message,
    ...(options?.onboardingDemo ? { onboarding_demo: true } : {}),
    ...(options?.recentMessages?.length
      ? { recent_messages: options.recentMessages }
      : {}),
  })
}

export async function fetchAskCatalogOpportunityHistory(
  opportunityId: string,
  options?: { onboardingDemo?: boolean },
): Promise<AskAiHistoryResponse> {
  const result = await invokeAskResearchAi<AskAiHistoryResponse>({
    mode: 'history',
    opportunity_id: opportunityId,
    ...(options?.onboardingDemo ? { onboarding_demo: true } : {}),
  })
  return { sessions: result.sessions ?? [] }
}

export function askResearchSessionPreview(session: AskAiSession): string {
  const firstUser = session.messages?.find((m) => m.role === 'user')
  if (firstUser?.content.trim()) return firstUser.content.trim()
  return 'Conversation'
}

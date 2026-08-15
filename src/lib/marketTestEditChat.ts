import { supabase } from '@/lib/supabase'
import { edgeApiErrorFromPayload, edgeApiErrorFromSupabase } from '@/lib/edgeApiError'
import type {
  EditChatAnswerResponse,
  EditChatCompleteResponse,
  EditChatHistoryResponse,
  EditChatHistorySession,
  EditChatMessageResponse,
  EditChatNewSessionResponse,
  EditChatQuestionsResponse,
  EditChatSuggestion,
} from '@/lib/opportunityEditChat'
import {
  editChatErrorMessage,
  isEditChatSessionNotFound,
} from '@/lib/opportunityEditChat'

export type {
  EditChatAnswerResponse,
  EditChatCompleteResponse,
  EditChatHistoryResponse,
  EditChatHistorySession,
  EditChatMessageResponse,
  EditChatNewSessionResponse,
  EditChatQuestionsResponse,
  EditChatSuggestion,
}
export { editChatErrorMessage, isEditChatSessionNotFound }

export const MARKET_TEST_SECTION_LABELS: Record<string, string> = {
  demand_signals: 'Demand Signals',
  red_flags: 'Red Flags',
  past_failures: 'Past Failures (similar companies)',
  past_successes: 'Past Successes (similar companies)',
  pros: 'Pros',
  cons: 'Cons',
  honest_verdict: 'Honest Verdict',
}

export const MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS: EditChatSuggestion[] = [
  {
    label: 'Demand Signals',
    prefill: 'Make the demand signals more skeptical and evidence-heavy.',
    section: 'demand_signals',
    has_data: true,
  },
  {
    label: 'Red Flags',
    prefill: 'Tighten the red flags — call out the biggest risks more clearly.',
    section: 'red_flags',
    has_data: true,
  },
  {
    label: 'Pros & Cons',
    prefill: 'Rewrite pros and cons to be more decisive and less hedged.',
    section: 'pros',
    has_data: true,
  },
  {
    label: 'Honest Verdict',
    prefill: 'Sharpen the honest verdict — more blunt, less corporate.',
    section: 'honest_verdict',
    has_data: true,
  },
]

export function getMarketTestSectionLabel(sectionKey: string): string {
  return MARKET_TEST_SECTION_LABELS[sectionKey] ?? sectionKey.replace(/_/g, ' ')
}

async function invokeMarketTestEditChat<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('market-test-edit-chat', { body })
  const apiError = edgeApiErrorFromSupabase(error, data)
  if (apiError) throw apiError
  if (data && typeof data === 'object' && ('error' in data || 'code' in data)) {
    throw edgeApiErrorFromPayload(undefined, data)
  }
  return data as T
}

function normalizeHistorySession(raw: unknown): EditChatHistorySession | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const sessionId =
    typeof o.session_id === 'string'
      ? o.session_id
      : typeof o.id === 'string'
        ? o.id
        : null
  if (!sessionId) return null
  return {
    session_id: sessionId,
    created_at: typeof o.created_at === 'string' ? o.created_at : new Date().toISOString(),
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
    messages: Array.isArray(o.messages) ? o.messages : [],
    message_count: typeof o.message_count === 'number' ? o.message_count : undefined,
  }
}

export async function createMarketTestEditSession(
  marketTestId: string,
): Promise<EditChatNewSessionResponse> {
  return invokeMarketTestEditChat<EditChatNewSessionResponse>({
    mode: 'new_session',
    market_test_id: marketTestId,
  })
}

export async function fetchMarketTestEditHistory(
  marketTestId: string,
): Promise<EditChatHistoryResponse> {
  const data = await invokeMarketTestEditChat<{ sessions?: unknown[] }>({
    mode: 'history',
    market_test_id: marketTestId,
  })
  const sessions = (data.sessions ?? [])
    .map(normalizeHistorySession)
    .filter((s): s is EditChatHistorySession => s != null)
  return { sessions }
}

export async function sendMarketTestEditMessage(
  marketTestId: string,
  sessionId: string,
  message: string,
): Promise<EditChatMessageResponse> {
  return invokeMarketTestEditChat<EditChatMessageResponse>({
    mode: 'message',
    market_test_id: marketTestId,
    session_id: sessionId,
    message,
  })
}

export async function confirmMarketTestEditSections(
  marketTestId: string,
  sessionId: string,
  confirmedSections: string[],
  editIntent: string,
): Promise<EditChatQuestionsResponse> {
  return invokeMarketTestEditChat<EditChatQuestionsResponse>({
    mode: 'confirm',
    market_test_id: marketTestId,
    session_id: sessionId,
    confirmed_sections: confirmedSections,
    edit_intent: editIntent,
  })
}

export async function submitMarketTestEditAnswers(
  marketTestId: string,
  sessionId: string,
  confirmedSections: string[],
  editIntent: string,
  answers: Record<string, string>,
): Promise<EditChatAnswerResponse> {
  return invokeMarketTestEditChat<EditChatAnswerResponse>({
    mode: 'answer',
    market_test_id: marketTestId,
    session_id: sessionId,
    confirmed_sections: confirmedSections,
    edit_intent: editIntent,
    answers,
  })
}

/** Fire-and-forget — UI updates locally; refunds handled server-side. */
export function cancelMarketTestEdit(marketTestId: string, sessionId: string): void {
  void supabase.functions.invoke('market-test-edit-chat', {
    body: {
      mode: 'cancel',
      market_test_id: marketTestId,
      session_id: sessionId,
    },
  })
}

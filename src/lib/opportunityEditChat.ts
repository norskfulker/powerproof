import { supabase } from '@/lib/supabase'
import { edgeApiErrorFromPayload, edgeApiErrorFromSupabase } from '@/lib/edgeApiError'

export type EditChatConfidence = 'high' | 'medium' | 'low'

export type EditChatQuestion = {
  id: string
  text: string
  type: 'single_select' | 'multi_select' | 'text'
  options?: string[]
  required: boolean
}

export type EditChatSuggestion = {
  label: string
  prefill: string
  section: string
  has_data: boolean
}

export type EditChatChatResponse = {
  type: 'chat'
  reply: string
  suggestions: EditChatSuggestion[]
}

export type EditChatConfirmResponse = {
  type: 'confirm'
  confirm_question: string
  inferred_sections: string[]
  inferred_labels: string[]
  edit_intent: string
  confidence: EditChatConfidence
}

export type EditChatMessageResponse = EditChatChatResponse | EditChatConfirmResponse

export type EditChatQuestionsResponse = {
  type: 'questions'
  questions: EditChatQuestion[]
  confirmed_sections: string[]
  edit_intent: string
}

export type EditChatCompleteResponse = {
  type: 'edit_complete'
  sections_updated: string[]
  sections_labels: string[]
  version_saved: number
  updated_data: Record<string, unknown>
}

export type EditChatCancelledResponse = {
  type: 'cancelled'
  message?: string
}

export type EditChatAnswerResponse = EditChatCompleteResponse | EditChatCancelledResponse

export type EditChatNewSessionResponse = {
  session_id: string
  status: 'pending' | 'active'
  suggestions?: EditChatSuggestion[]
}

export type EditChatHistorySession = {
  session_id: string
  created_at: string
  updated_at?: string
  messages: unknown[]
  message_count?: number
}

export type EditChatHistoryResponse = {
  type?: 'history'
  sessions: EditChatHistorySession[]
}

export { focusOpportunityEditSection as scrollToOpportunitySection } from '@/lib/opportunityEditSectionFocus'

export function isEditChatSessionNotFound(error: unknown, data: unknown): boolean {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const code = record.error ?? record.code
    if (typeof code === 'string') {
      const normalized = code.toLowerCase()
      if (
        normalized.includes('not_found') ||
        normalized.includes('session_not_found') ||
        normalized === '404'
      ) {
        return true
      }
    }
    if (record.status === 404 || record.statusCode === 404) return true
  }
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: { status?: number } }).context
    if (ctx?.status === 404) return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('404') || msg.includes('not found') || msg.includes('session_not_found')) {
      return true
    }
  }
  return false
}

async function invokeEditChat<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('opportunity-edit-chat', { body })
  const apiError = edgeApiErrorFromSupabase(error, data)
  if (apiError) throw apiError
  if (data && typeof data === 'object' && ('error' in data || 'code' in data)) {
    throw edgeApiErrorFromPayload(undefined, data)
  }
  return data as T
}

export async function createEditChatSession(userOpportunityId: string): Promise<EditChatNewSessionResponse> {
  return invokeEditChat<EditChatNewSessionResponse>({
    mode: 'new_session',
    user_opportunity_id: userOpportunityId,
  })
}

export async function fetchEditChatHistory(
  userOpportunityId: string,
): Promise<EditChatHistoryResponse> {
  return invokeEditChat<EditChatHistoryResponse>({
    mode: 'history',
    user_opportunity_id: userOpportunityId,
  })
}

export async function sendEditChatMessage(
  userOpportunityId: string,
  sessionId: string,
  message: string,
): Promise<EditChatMessageResponse> {
  return invokeEditChat<EditChatMessageResponse>({
    mode: 'message',
    user_opportunity_id: userOpportunityId,
    session_id: sessionId,
    message,
  })
}

export async function confirmEditChatSections(
  userOpportunityId: string,
  sessionId: string,
  confirmedSections: string[],
  editIntent: string,
): Promise<EditChatQuestionsResponse> {
  return invokeEditChat<EditChatQuestionsResponse>({
    mode: 'confirm',
    user_opportunity_id: userOpportunityId,
    session_id: sessionId,
    confirmed_sections: confirmedSections,
    edit_intent: editIntent,
  })
}

export async function submitEditChatAnswers(
  userOpportunityId: string,
  sessionId: string,
  confirmedSections: string[],
  editIntent: string,
  answers: Record<string, string>,
): Promise<EditChatAnswerResponse> {
  return invokeEditChat<EditChatAnswerResponse>({
    mode: 'answer',
    user_opportunity_id: userOpportunityId,
    session_id: sessionId,
    confirmed_sections: confirmedSections,
    edit_intent: editIntent,
    answers,
  })
}

/** Fire-and-forget — UI updates locally; no response handling needed. */
export function cancelEditChat(userOpportunityId: string, sessionId: string): void {
  void supabase.functions.invoke('opportunity-edit-chat', {
    body: {
      mode: 'cancel',
      user_opportunity_id: userOpportunityId,
      session_id: sessionId,
    },
  })
}

export function editChatErrorMessage(code: string): { text: string } {
  if (code === 'insufficient_credits' || code === 'limit_exceeded') {
    return { text: 'You have reached your edit allowance for this period.' }
  }
  if (code === 'no_active_subscription') {
    return { text: 'You need an active plan to edit this content.' }
  }
  if (code === 'feature_locked') {
    return { text: 'AI edits require an Unlimited plan.' }
  }
  if (code === 'gemini_failure') {
    return { text: 'Edit failed. Please try again.' }
  }
  return { text: 'Something went wrong. Please try again.' }
}

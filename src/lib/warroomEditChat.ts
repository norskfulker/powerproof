import { supabase } from '@/lib/supabase'
import { edgeApiErrorFromPayload, edgeApiErrorFromSupabase } from '@/lib/edgeApiError'
import type {
  EditChatConfidence,
  EditChatHistoryResponse,
  EditChatHistorySession,
  EditChatNewSessionResponse,
  EditChatQuestion,
  EditChatSuggestion,
} from '@/lib/opportunityEditChat'
import {
  editChatErrorMessage,
  isEditChatSessionNotFound,
} from '@/lib/opportunityEditChat'

export type { EditChatHistoryResponse, EditChatHistorySession, EditChatQuestion, EditChatSuggestion }
export { editChatErrorMessage, isEditChatSessionNotFound }

export type WarroomEditTarget = 'flat' | 'steps'

export const WARROOM_SECTION_LABELS: Record<string, string> = {
  red_flags: 'Plan Killers (Red Flags)',
  founder_honest_take: "Founder's Honest Take",
  thirty_day_sprint: '30-Day Sprint',
  steps: 'Playbook Steps',
}

export const WARROOM_EDIT_FALLBACK_SUGGESTIONS: EditChatSuggestion[] = [
  {
    label: 'Red Flags',
    prefill: 'Make the red flags sharper — call out the real plan killers.',
    section: 'red_flags',
    has_data: true,
  },
  {
    label: 'Honest Take',
    prefill: "Rewrite the founder's honest take to be more blunt and specific.",
    section: 'founder_honest_take',
    has_data: true,
  },
  {
    label: '30-Day Sprint',
    prefill: 'Tighten the 30-day sprint — more concrete weekly moves.',
    section: 'thirty_day_sprint',
    has_data: true,
  },
  {
    label: 'A step',
    prefill: 'Rewrite step 1 to be more aggressive and actionable.',
    section: 'steps',
    has_data: true,
  },
]

export function getWarroomSectionLabel(sectionKey: string): string {
  return WARROOM_SECTION_LABELS[sectionKey] ?? sectionKey.replace(/_/g, ' ')
}

export type WarroomEditChatResponse = {
  type: 'chat'
  reply: string
  suggestions: EditChatSuggestion[]
}

export type WarroomEditConfirmFlatResponse = {
  type: 'confirm'
  confirm_question: string
  edit_target: 'flat'
  inferred_sections: string[]
  inferred_labels: string[]
  edit_intent: string
  confidence: EditChatConfidence
}

export type WarroomEditConfirmStepsResponse = {
  type: 'confirm'
  confirm_question: string
  edit_target: 'steps'
  target_steps: number[]
  target_labels: string[]
  edit_intent: string
  confidence: EditChatConfidence
}

export type WarroomEditConfirmResponse =
  | WarroomEditConfirmFlatResponse
  | WarroomEditConfirmStepsResponse

export type WarroomEditMessageResponse = WarroomEditChatResponse | WarroomEditConfirmResponse

export type WarroomEditQuestionsResponse = {
  type: 'questions'
  questions: EditChatQuestion[]
  edit_target: WarroomEditTarget
  confirmed_sections?: string[]
  target_steps?: number[]
  edit_intent: string
}

export type WarroomEditCompleteResponse = {
  type: 'edit_complete'
  summary_label: string
  version_saved: number
  byok_used?: boolean
  updated_data: Record<string, unknown>
}

export type WarroomEditCancelledResponse = {
  type: 'cancelled'
  message?: string
}

export type WarroomEditAnswerResponse = WarroomEditCompleteResponse | WarroomEditCancelledResponse

async function invokeWarroomEditChat<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('warroom-edit-chat', { body })
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

export async function createWarroomEditSession(
  playbookId: string,
): Promise<EditChatNewSessionResponse> {
  return invokeWarroomEditChat<EditChatNewSessionResponse>({
    mode: 'new_session',
    playbook_id: playbookId,
  })
}

export async function fetchWarroomEditHistory(
  playbookId: string,
): Promise<EditChatHistoryResponse> {
  const data = await invokeWarroomEditChat<{ sessions?: unknown[] }>({
    mode: 'history',
    playbook_id: playbookId,
  })
  const sessions = (data.sessions ?? [])
    .map(normalizeHistorySession)
    .filter((s): s is EditChatHistorySession => s != null)
  return { sessions }
}

export async function sendWarroomEditMessage(
  playbookId: string,
  sessionId: string,
  message: string,
): Promise<WarroomEditMessageResponse> {
  return invokeWarroomEditChat<WarroomEditMessageResponse>({
    mode: 'message',
    playbook_id: playbookId,
    session_id: sessionId,
    message,
  })
}

export async function confirmWarroomEdit(
  playbookId: string,
  sessionId: string,
  params: {
    editTarget: WarroomEditTarget
    editIntent: string
    confirmedSections?: string[]
    targetSteps?: number[]
  },
): Promise<WarroomEditQuestionsResponse> {
  return invokeWarroomEditChat<WarroomEditQuestionsResponse>({
    mode: 'confirm',
    playbook_id: playbookId,
    session_id: sessionId,
    edit_target: params.editTarget,
    edit_intent: params.editIntent,
    ...(params.editTarget === 'flat'
      ? { confirmed_sections: params.confirmedSections ?? [] }
      : { target_steps: params.targetSteps ?? [] }),
  })
}

export async function submitWarroomEditAnswers(
  playbookId: string,
  sessionId: string,
  params: {
    editTarget: WarroomEditTarget
    editIntent: string
    confirmedSections?: string[]
    targetSteps?: number[]
    answers: Record<string, string>
  },
): Promise<WarroomEditAnswerResponse> {
  return invokeWarroomEditChat<WarroomEditAnswerResponse>({
    mode: 'answer',
    playbook_id: playbookId,
    session_id: sessionId,
    edit_target: params.editTarget,
    edit_intent: params.editIntent,
    answers: params.answers,
    ...(params.editTarget === 'flat'
      ? { confirmed_sections: params.confirmedSections ?? [] }
      : { target_steps: params.targetSteps ?? [] }),
  })
}

/** Fire-and-forget — refunds handled server-side. */
export function cancelWarroomEdit(playbookId: string, sessionId: string): void {
  void supabase.functions.invoke('warroom-edit-chat', {
    body: {
      mode: 'cancel',
      playbook_id: playbookId,
      session_id: sessionId,
    },
  })
}

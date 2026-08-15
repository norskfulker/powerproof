export type AskAiSuggestion = {
  label: string
  prefill: string
}

export type AskAiMessage = {
  role: 'user' | 'assistant'
  content: string
  next_actions?: string[]
  created_at: string
  byok?: boolean
}

export type AskAiSession = {
  session_id: string
  created_at: string
  updated_at?: string
  messages?: AskAiMessage[]
}

export type AskAiNewSessionResponse = {
  session_id: string
  status: 'pending' | 'active'
  suggestions: AskAiSuggestion[]
}

export type AskAiMessageResponse = {
  reply: string
  next_actions?: string[]
  byok_used: boolean
  credits_remaining: number
  suggestions?: AskAiSuggestion[]
}

export type AskAiHistoryResponse = {
  sessions: AskAiSession[]
}

export type AskAiSendOptions = {
  applyOpportunityEdit?: boolean
  /** Optional recent turns for ephemeral / onboarding sessions. */
  recentMessages?: Array<{ role: string; content: string }>
}

export type AskAiAdapter = {
  placeholder: string
  emptyHistoryCopy: string
  defaultSuggestions: AskAiSuggestion[]
  createSession: (resourceId: string) => Promise<AskAiNewSessionResponse>
  sendMessage: (
    resourceId: string,
    sessionId: string,
    message: string,
    options?: AskAiSendOptions,
  ) => Promise<AskAiMessageResponse>
  fetchHistory: (resourceId: string) => Promise<AskAiHistoryResponse>
  sessionPreview: (session: AskAiSession) => string
}

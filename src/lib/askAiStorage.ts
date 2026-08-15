import type { AskAiMessage, AskAiSuggestion } from '@/lib/askAiTypes'

const SESSION_KEY_PREFIX = 'nirm_ask_ai_session_'
const PANEL_OPEN_KEY_PREFIX = 'nirm_ask_ai_panel_open_'
const SUGGESTIONS_KEY_PREFIX = 'nirm_ask_ai_suggestions_'
const MESSAGES_KEY_PREFIX = 'nirm_ask_ai_messages_'

export type AskAiStorageNamespace = 'roadmap' | 'playbook' | 'market_test' | 'research' | 'workspace'

function sessionKey(namespace: AskAiStorageNamespace, resourceId: string): string {
  return `${SESSION_KEY_PREFIX}${namespace}_${resourceId}`
}

function panelOpenKey(namespace: AskAiStorageNamespace, resourceId: string): string {
  return `${PANEL_OPEN_KEY_PREFIX}${namespace}_${resourceId}`
}

export function getStoredAskAiSessionId(
  namespace: AskAiStorageNamespace,
  resourceId: string,
): string | null {
  try {
    return localStorage.getItem(sessionKey(namespace, resourceId))
  } catch {
    return null
  }
}

export function setStoredAskAiSessionId(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
): void {
  try {
    localStorage.setItem(sessionKey(namespace, resourceId), sessionId)
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredAskAiSessionId(
  namespace: AskAiStorageNamespace,
  resourceId: string,
): void {
  try {
    localStorage.removeItem(sessionKey(namespace, resourceId))
  } catch {
    /* ignore */
  }
}

export function getStoredAskAiPanelOpen(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  defaultOpen = false,
): boolean {
  try {
    const stored = localStorage.getItem(panelOpenKey(namespace, resourceId))
    if (stored === null) return defaultOpen
    return stored === 'true'
  } catch {
    return defaultOpen
  }
}

export function setStoredAskAiPanelOpen(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  open: boolean,
): void {
  try {
    localStorage.setItem(panelOpenKey(namespace, resourceId), open ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

function suggestionsKey(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
): string {
  return `${SUGGESTIONS_KEY_PREFIX}${namespace}_${resourceId}_${sessionId}`
}

export function getStoredAskAiSuggestions(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
): AskAiSuggestion[] | null {
  try {
    const raw = localStorage.getItem(suggestionsKey(namespace, resourceId, sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const items = parsed.filter(
      (item): item is AskAiSuggestion =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { prefill?: unknown }).prefill === 'string',
    )
    return items.length > 0 ? items : null
  } catch {
    return null
  }
}

export function setStoredAskAiSuggestions(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
  suggestions: AskAiSuggestion[],
): void {
  if (!suggestions.length) return
  try {
    localStorage.setItem(
      suggestionsKey(namespace, resourceId, sessionId),
      JSON.stringify(suggestions),
    )
  } catch {
    /* ignore quota errors */
  }
}

function messagesKey(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
): string {
  return `${MESSAGES_KEY_PREFIX}${namespace}_${resourceId}_${sessionId}`
}

function isAskAiMessage(value: unknown): value is AskAiMessage {
  if (!value || typeof value !== 'object') return false
  const row = value as { role?: unknown; content?: unknown; created_at?: unknown }
  return (
    (row.role === 'user' || row.role === 'assistant') &&
    typeof row.content === 'string' &&
    typeof row.created_at === 'string'
  )
}

export function getStoredAskAiMessages(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
): AskAiMessage[] | null {
  try {
    const raw = localStorage.getItem(messagesKey(namespace, resourceId, sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const items = parsed.filter(isAskAiMessage)
    return items.length > 0 ? items : null
  } catch {
    return null
  }
}

export function setStoredAskAiMessages(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  sessionId: string,
  messages: AskAiMessage[],
): void {
  if (!messages.length) return
  try {
    localStorage.setItem(
      messagesKey(namespace, resourceId, sessionId),
      JSON.stringify(messages),
    )
  } catch {
    /* ignore quota errors */
  }
}

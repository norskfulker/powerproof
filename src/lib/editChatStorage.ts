const SESSION_KEY_PREFIX = 'nirm_edit_session_'
const PANEL_OPEN_KEY_PREFIX = 'nirm_edit_panel_open_'

export function editChatSessionStorageKey(userOpportunityId: string): string {
  return `${SESSION_KEY_PREFIX}${userOpportunityId}`
}

export function editChatPanelOpenStorageKey(userOpportunityId: string): string {
  return `${PANEL_OPEN_KEY_PREFIX}${userOpportunityId}`
}

export function getStoredEditChatSessionId(userOpportunityId: string): string | null {
  try {
    return localStorage.getItem(editChatSessionStorageKey(userOpportunityId))
  } catch {
    return null
  }
}

export function setStoredEditChatSessionId(userOpportunityId: string, sessionId: string): void {
  try {
    localStorage.setItem(editChatSessionStorageKey(userOpportunityId), sessionId)
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredEditChatSessionId(userOpportunityId: string): void {
  try {
    localStorage.removeItem(editChatSessionStorageKey(userOpportunityId))
  } catch {
    /* ignore */
  }
}

export function getStoredEditChatPanelOpen(userOpportunityId: string): boolean {
  try {
    return localStorage.getItem(editChatPanelOpenStorageKey(userOpportunityId)) === 'true'
  } catch {
    return false
  }
}

export function setStoredEditChatPanelOpen(userOpportunityId: string, open: boolean): void {
  try {
    localStorage.setItem(editChatPanelOpenStorageKey(userOpportunityId), open ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

/** Returns the first opportunity id with panel open flag, if any. */
export function findOpenEditChatPanelOpportunityId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PANEL_OPEN_KEY_PREFIX)) continue
      if (localStorage.getItem(key) !== 'true') continue
      return key.slice(PANEL_OPEN_KEY_PREFIX.length)
    }
  } catch {
    /* ignore */
  }
  return null
}

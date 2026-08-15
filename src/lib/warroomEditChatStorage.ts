const SESSION_KEY_PREFIX = 'nirm_wr_edit_session_'

export function warroomEditSessionStorageKey(playbookId: string): string {
  return `${SESSION_KEY_PREFIX}${playbookId}`
}

export function getStoredWarroomEditSessionId(playbookId: string): string | null {
  try {
    return localStorage.getItem(warroomEditSessionStorageKey(playbookId))
  } catch {
    return null
  }
}

export function setStoredWarroomEditSessionId(playbookId: string, sessionId: string): void {
  try {
    localStorage.setItem(warroomEditSessionStorageKey(playbookId), sessionId)
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredWarroomEditSessionId(playbookId: string): void {
  try {
    localStorage.removeItem(warroomEditSessionStorageKey(playbookId))
  } catch {
    /* ignore */
  }
}

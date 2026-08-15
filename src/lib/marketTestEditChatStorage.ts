const SESSION_KEY_PREFIX = 'nirm_mt_edit_session_'

export function marketTestEditSessionStorageKey(marketTestId: string): string {
  return `${SESSION_KEY_PREFIX}${marketTestId}`
}

export function getStoredMarketTestEditSessionId(marketTestId: string): string | null {
  try {
    return localStorage.getItem(marketTestEditSessionStorageKey(marketTestId))
  } catch {
    return null
  }
}

export function setStoredMarketTestEditSessionId(marketTestId: string, sessionId: string): void {
  try {
    localStorage.setItem(marketTestEditSessionStorageKey(marketTestId), sessionId)
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredMarketTestEditSessionId(marketTestId: string): void {
  try {
    localStorage.removeItem(marketTestEditSessionStorageKey(marketTestId))
  } catch {
    /* ignore */
  }
}

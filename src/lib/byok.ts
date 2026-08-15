const BYOK_KEY = 'powerproof_gemini_key'

export const BYOK_CHANGE_EVENT = 'powerproof-byok-change'

export const BYOK_SETTINGS_PATH = '/profile?tab=preferences#api-key'

export const BYOK_SUBMIT_HINT = 'Using your API key'

export const BYOK_SUCCESS_DETAIL = 'Generated using your API key · 0 credits used'

function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BYOK_CHANGE_EVENT))
  }
}

export const byok = {
  get(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(BYOK_KEY) || null
  },
  set(key: string): void {
    localStorage.setItem(BYOK_KEY, key.trim())
    emitChange()
  },
  clear(): void {
    localStorage.removeItem(BYOK_KEY)
    emitChange()
  },
  isActive(): boolean {
    return Boolean(this.get())
  },
}

/** Headers for edge functions that support BYOK (`x-gemini-key`). */
export function byokRequestHeaders(): Record<string, string> {
  const userKey = byok.get()
  if (!userKey) return {}
  return { 'x-gemini-key': userKey }
}

export function formatByokAwareError(fallback: string): string {
  if (!byok.isActive()) return fallback
  return 'Your API key appears to be invalid. Check it in Settings.'
}

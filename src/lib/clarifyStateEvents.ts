export const CLARIFY_STATE_UPDATED_EVENT = 'powerproof:clarify-state-updated'

export function dispatchClarifyHistoryRefetch(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CLARIFY_STATE_UPDATED_EVENT))
}

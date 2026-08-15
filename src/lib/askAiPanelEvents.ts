/** Temporary kill-switch: hide all Ask AI UI without deleting the feature. */
export const ASK_AI_UI_ENABLED = false

export const REQUEST_ASK_AI_OPEN_EVENT = 'powerproof:ask-ai-open'

export type AskAiOpenRequestDetail = {
  /** Research only — pre-select Edit report mode in the Ask/Edit toggle. */
  editMode?: boolean
  /** Open Ask AI in the side panel (default) or fullscreen floating dialog. */
  presentation?: 'sidebar' | 'dialog'
}

export function requestAskAiOpen(detail?: AskAiOpenRequestDetail) {
  if (!ASK_AI_UI_ENABLED) return
  window.dispatchEvent(
    new CustomEvent<AskAiOpenRequestDetail>(REQUEST_ASK_AI_OPEN_EVENT, { detail }),
  )
}

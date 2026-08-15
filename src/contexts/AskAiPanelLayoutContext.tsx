import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type AskAiPanelLayoutContextValue = {
  /** True while Ask AI is shown in the fullscreen floating dialog. */
  fullscreenDialog: boolean
  setFullscreenDialog: (next: boolean) => void
}

const AskAiPanelLayoutContext = createContext<AskAiPanelLayoutContextValue | null>(null)

export function AskAiPanelLayoutProvider({ children }: { children: ReactNode }) {
  const [fullscreenDialog, setFullscreenDialogState] = useState(false)

  const setFullscreenDialog = useCallback((next: boolean) => {
    setFullscreenDialogState(next)
  }, [])

  const value = useMemo(
    () => ({
      fullscreenDialog,
      setFullscreenDialog,
    }),
    [fullscreenDialog, setFullscreenDialog],
  )

  return (
    <AskAiPanelLayoutContext.Provider value={value}>{children}</AskAiPanelLayoutContext.Provider>
  )
}

export function useAskAiPanelLayoutOptional() {
  return useContext(AskAiPanelLayoutContext)
}

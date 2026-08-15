import { useCallback, useEffect, useState } from 'react'
import { useAskAiPanelLayoutOptional } from '@/contexts/AskAiPanelLayoutContext'
import type { AskAiStorageNamespace } from '@/lib/askAiStorage'

/** @deprecated Half-screen split removed — use fullscreen dialog via AskAiSidebarShell. */
export function useAskAiSidebarHalfScreen(
  _namespace: AskAiStorageNamespace,
  _resourceId: string | undefined,
) {
  const panelLayout = useAskAiPanelLayoutOptional()
  const [halfScreen, setHalfScreenState] = useState(false)

  useEffect(() => {
    panelLayout?.setFullscreenDialog(halfScreen)
    return () => panelLayout?.setFullscreenDialog(false)
  }, [halfScreen, panelLayout])

  const setHalfScreen = useCallback((next: boolean) => {
    setHalfScreenState(next)
  }, [])

  return [halfScreen, setHalfScreen] as const
}

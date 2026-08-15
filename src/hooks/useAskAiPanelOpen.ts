import { useCallback, useEffect, useState } from 'react'
import {
  setStoredAskAiPanelOpen,
  type AskAiStorageNamespace,
} from '@/lib/askAiStorage'

export function useAskAiPanelOpen(
  namespace: AskAiStorageNamespace,
  resourceId: string | undefined,
  _defaultOpen = false,
) {
  const [open, setOpenState] = useState(false)

  useEffect(() => {
    setOpenState(false)
  }, [namespace, resourceId])

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      if (resourceId) setStoredAskAiPanelOpen(namespace, resourceId, next)
    },
    [namespace, resourceId],
  )

  return [open, setOpen] as const
}

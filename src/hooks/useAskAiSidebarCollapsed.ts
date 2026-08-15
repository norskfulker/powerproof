import { useCallback, useEffect, useState } from 'react'
import type { AskAiStorageNamespace } from '@/lib/askAiStorage'

/** Ask AI sidebar starts collapsed — opens only via explicit user action (chrome button, etc.). */
export function useAskAiSidebarCollapsed(
  namespace: AskAiStorageNamespace,
  resourceId: string | undefined,
) {
  const [collapsed, setCollapsedState] = useState(true)

  useEffect(() => {
    setCollapsedState(true)
  }, [namespace, resourceId])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
  }, [])

  return [collapsed, setCollapsed] as const
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  findOpenEditChatPanelOpportunityId,
  getStoredEditChatPanelOpen,
  setStoredEditChatPanelOpen,
} from '@/lib/editChatStorage'
import type { EditChatCompleteResponse } from '@/lib/opportunityEditChat'
import type { ResearchStyle } from '@/lib/researchStyles'

export type OpportunityEditChatRegistration = {
  userOpportunityId: string
  /** Opportunity / research title shown in the edit context chip. */
  pageLabel?: string
  researchStyle?: ResearchStyle | string | null
  onRefresh?: () => void
  onEditComplete?: (payload: EditChatCompleteResponse) => void
  /** When true, the page uses unified Ask AI — skip the legacy edit chat panel. */
  unifiedAskAi?: boolean
}

type OpportunityEditChatContextValue = {
  activeOpportunityId: string | null
  isOpen: boolean
  openPanel: (userOpportunityId: string) => void
  closePanel: () => void
  pendingReResearch: boolean
  openWithReResearch: (userOpportunityId: string) => void
  clearPendingReResearch: () => void
  setOpportunityMeta: (userOpportunityId: string, meta: OpportunityEditChatRegistration | null) => void
  getOpportunityMeta: (userOpportunityId: string) => OpportunityEditChatRegistration | null
  activePageOpportunityId: string | null
  setActivePageOpportunityId: (id: string | null) => void
  /** @deprecated Use isOpen */
  open: boolean
  /** @deprecated Use openPanel / closePanel */
  setOpen: (open: boolean) => void
}

const OpportunityEditChatContext = createContext<OpportunityEditChatContextValue | null>(null)

export function OpportunityEditChatProvider({ children }: { children: ReactNode }) {
  const [activeOpportunityId, setActiveOpportunityId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [pendingReResearch, setPendingReResearch] = useState(false)
  const [metaByOppId, setMetaByOppId] = useState<Record<string, OpportunityEditChatRegistration>>(
    {},
  )
  const [activePageOpportunityId, setActivePageOpportunityId] = useState<string | null>(null)

  useEffect(() => {
    const restoredId = findOpenEditChatPanelOpportunityId()
    if (restoredId && getStoredEditChatPanelOpen(restoredId)) {
      setActiveOpportunityId(restoredId)
      setIsOpen(true)
    }
  }, [])

  const setOpportunityMeta = useCallback(
    (userOpportunityId: string, meta: OpportunityEditChatRegistration | null) => {
      setMetaByOppId((prev) => {
        if (!meta) {
          if (!(userOpportunityId in prev)) return prev
          const next = { ...prev }
          delete next[userOpportunityId]
          return next
        }
        return { ...prev, [userOpportunityId]: meta }
      })
    },
    [],
  )

  const getOpportunityMeta = useCallback(
    (userOpportunityId: string) => metaByOppId[userOpportunityId] ?? null,
    [metaByOppId],
  )

  const openPanel = useCallback((userOpportunityId: string) => {
    setActiveOpportunityId(userOpportunityId)
    setIsOpen(true)
    setStoredEditChatPanelOpen(userOpportunityId, true)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen((wasOpen) => {
      if (activeOpportunityId && wasOpen) {
        setStoredEditChatPanelOpen(activeOpportunityId, false)
      }
      return false
    })
  }, [activeOpportunityId])

  const openWithReResearch = useCallback(
    (userOpportunityId: string) => {
      setPendingReResearch(true)
      openPanel(userOpportunityId)
    },
    [openPanel],
  )

  const clearPendingReResearch = useCallback(() => {
    setPendingReResearch(false)
  }, [])

  const setOpen = useCallback(
    (open: boolean) => {
      if (open) {
        if (activeOpportunityId) openPanel(activeOpportunityId)
        else if (activePageOpportunityId) openPanel(activePageOpportunityId)
      } else {
        closePanel()
      }
    },
    [activeOpportunityId, activePageOpportunityId, openPanel, closePanel],
  )

  const value = useMemo(
    () => ({
      activeOpportunityId,
      isOpen,
      openPanel,
      closePanel,
      pendingReResearch,
      openWithReResearch,
      clearPendingReResearch,
      setOpportunityMeta,
      getOpportunityMeta,
      activePageOpportunityId,
      setActivePageOpportunityId,
      open: isOpen,
      setOpen,
    }),
    [
      activeOpportunityId,
      isOpen,
      openPanel,
      closePanel,
      pendingReResearch,
      openWithReResearch,
      clearPendingReResearch,
      setOpportunityMeta,
      getOpportunityMeta,
      activePageOpportunityId,
      setOpen,
    ],
  )

  return (
    <OpportunityEditChatContext.Provider value={value}>{children}</OpportunityEditChatContext.Provider>
  )
}

export function useOpportunityEditChat() {
  const ctx = useContext(OpportunityEditChatContext)
  if (!ctx) {
    throw new Error('useOpportunityEditChat must be used within OpportunityEditChatProvider')
  }
  return ctx
}

export function useOpportunityEditChatOptional() {
  return useContext(OpportunityEditChatContext)
}

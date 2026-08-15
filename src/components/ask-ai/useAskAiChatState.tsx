import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { AskAiAdapter, AskAiMessage, AskAiSession, AskAiSuggestion } from '@/lib/askAiTypes'
import {
  clearStoredAskAiSessionId,
  getStoredAskAiMessages,
  getStoredAskAiSessionId,
  getStoredAskAiSuggestions,
  setStoredAskAiMessages,
  setStoredAskAiSessionId,
  setStoredAskAiSuggestions,
  type AskAiStorageNamespace,
} from '@/lib/askAiStorage'
import { formatByokAwareError } from '@/lib/byok'
import { useAppChromeHeaderOptional } from '@/contexts/AppChromeHeaderContext'
import { useAskAiPanelOpen } from '@/hooks/useAskAiPanelOpen'
import { useTypewriterFill } from '@/hooks/useTypewriterFill'
import {
  ASK_AI_UI_ENABLED,
  REQUEST_ASK_AI_OPEN_EVENT,
  type AskAiOpenRequestDetail,
} from '@/lib/askAiPanelEvents'

export const ASK_AI_COMPOSER_INPUT_ID = 'ask-ai-composer-input'

export type AskAiChatLayout = 'dock' | 'sidebar'

export type AskAiEditModeControls = {
  handleNewChat: () => void
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  isBootstrapping: boolean
}

export type AskAiChatConfig = {
  resourceId: string
  resourceTitle: string
  storageNamespace: AskAiStorageNamespace
  adapter: AskAiAdapter
  ariaTitle: string
  layout?: AskAiChatLayout
  defaultPanelOpen?: boolean
  /** Show Ask vs Edit mode picker in composer (Research, Market Test, etc.). */
  showOpportunityEditToggle?: boolean
  /** Label for the Edit option in the mode picker. Default: "Edit report". */
  editToggleLabel?: string
  /** When Edit mode is active, render this panel instead of the ask composer. */
  editModePanel?: ReactNode
  /** Onboarding reveal — pulse / ring highlight on the Ask AI panel. */
  panelHighlight?: boolean
  /** Optional hint under the empty state headline. */
  emptyStateHint?: string
}

type AskAiChatStateContextValue = AskAiChatConfig & {
  enabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  messages: AskAiMessage[]
  suggestions: AskAiSuggestion[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  isBootstrapping: boolean
  error: string | null
  sessionId: string | null
  listRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleExpand: () => void
  handleCollapse: () => void
  handleNewChat: () => void
  handleSend: (overrideMessage?: string) => Promise<void>
  handleNextActionChipClick: (action: string, messageCreatedAt: string) => void
  usedChipForMessage: string | null
  handleHistorySessionSelect: (session: AskAiSession) => void
  handleSuggestionSelect: (prefill: string) => void
  cancelTypewriter: () => void
  isTypingSuggestion: boolean
  isTypingReply: boolean
  animatingReplyKey: string | null
  onReplyTypewriterComplete: () => void
  scrollToBottom: () => void
  showSuggestionChips: boolean
  suggestionsKey: string
  inputDisabled: boolean
  showExpanded: boolean
  showMessagesCard: boolean
  layout: AskAiChatLayout
  showOpportunityEditToggle: boolean
  editToggleLabel: string
  editModePanel: ReactNode | null
  defaultPanelOpen: boolean
  panelHighlight: boolean
  emptyStateHint: string | null
  applyOpportunityEdit: boolean
  setApplyOpportunityEdit: (next: boolean) => void
  registerEditModeControls: (controls: AskAiEditModeControls | null) => void
  editModeControls: AskAiEditModeControls | null
}

const AskAiChatStateContext = createContext<AskAiChatStateContextValue | null>(null)

export function useAskAiChatStateOptional() {
  return useContext(AskAiChatStateContext)
}

export function useAskAiChatState() {
  const ctx = useContext(AskAiChatStateContext)
  if (!ctx) throw new Error('useAskAiChatState must be used within AskAiChatStateProvider')
  return ctx
}

type AskAiChatStateProviderProps = AskAiChatConfig & {
  children: ReactNode
  enabled?: boolean
}

export function AskAiChatStateProvider({
  children,
  resourceId,
  resourceTitle: _resourceTitle,
  storageNamespace,
  adapter,
  ariaTitle: _ariaTitle,
  enabled = true,
  layout = 'sidebar',
  defaultPanelOpen = false,
  showOpportunityEditToggle = false,
  editToggleLabel = 'Edit report',
  editModePanel = null,
  panelHighlight = false,
  emptyStateHint = null,
}: AskAiChatStateProviderProps) {
  const [open, setOpen] = useAskAiPanelOpen(
    storageNamespace,
    enabled ? resourceId : undefined,
    defaultPanelOpen,
  )

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AskAiMessage[]>([])
  const [suggestions, setSuggestions] = useState<AskAiSuggestion[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animatingReplyKey, setAnimatingReplyKey] = useState<string | null>(null)
  const [usedChipForMessage, setUsedChipForMessage] = useState<string | null>(null)
  const [applyOpportunityEdit, setApplyOpportunityEdit] = useState(false)
  const [editModeControls, setEditModeControls] = useState<AskAiEditModeControls | null>(null)

  const registerEditModeControls = useCallback((controls: AskAiEditModeControls | null) => {
    setEditModeControls(controls)
  }, [])

  const chrome = useAppChromeHeaderOptional()
  useEffect(() => {
    if (!chrome) return
    chrome.setAskAiAvailable(ASK_AI_UI_ENABLED && Boolean(enabled && resourceId))
    return () => {
      chrome.setAskAiAvailable(false)
    }
  }, [chrome, enabled, resourceId])

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initializedResourceRef = useRef<string | null>(null)
  const ensureSessionPromiseRef = useRef<Promise<string> | null>(null)
  const sendInFlightRef = useRef(false)
  const { fill: typewriterFill, cancel: cancelTypewriter, isTyping: isTypingSuggestion } =
    useTypewriterFill('fast')

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  const persistSessionId = useCallback(
    (id: string) => {
      setStoredAskAiSessionId(storageNamespace, resourceId, id)
    },
    [resourceId, storageNamespace],
  )

  const applySessionSuggestions = useCallback(
    (targetSessionId: string, fromApi?: AskAiSuggestion[]) => {
      const next =
        fromApi?.length
          ? fromApi
          : getStoredAskAiSuggestions(storageNamespace, resourceId, targetSessionId) ??
            adapter.defaultSuggestions
      setSuggestions(next)
      setStoredAskAiSuggestions(storageNamespace, resourceId, targetSessionId, next)
    },
    [adapter.defaultSuggestions, resourceId, storageNamespace],
  )

  const createFreshSession = useCallback(async () => {
    const result = await adapter.createSession(resourceId)
    persistSessionId(result.session_id)
    setSessionId(result.session_id)
    applySessionSuggestions(result.session_id, result.suggestions ?? [])
    setMessages([])
    return result.session_id
  }, [adapter, applySessionSuggestions, persistSessionId, resourceId])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    if (ensureSessionPromiseRef.current) return ensureSessionPromiseRef.current

    const run = (async () => {
      try {
        // Prefer persisted session on refresh — never create a fresh one while one is stored.
        const storedSessionId = getStoredAskAiSessionId(storageNamespace, resourceId)
        if (storedSessionId) {
          setSessionId(storedSessionId)
          applySessionSuggestions(storedSessionId)
          const cachedMessages = getStoredAskAiMessages(
            storageNamespace,
            resourceId,
            storedSessionId,
          )
          if (cachedMessages?.length) {
            setMessages(cachedMessages)
          }
          return storedSessionId
        }
        return await createFreshSession()
      } finally {
        ensureSessionPromiseRef.current = null
      }
    })()

    ensureSessionPromiseRef.current = run
    return run
  }, [applySessionSuggestions, createFreshSession, resourceId, sessionId, storageNamespace])

  const refreshStoredSessionInBackground = useCallback(
    async (storedSessionId: string) => {
      try {
        const { sessions } = await adapter.fetchHistory(resourceId)
        const match = sessions?.find((session) => session.session_id === storedSessionId)
        if (match?.messages?.length) {
          setMessages(match.messages)
          setStoredAskAiMessages(storageNamespace, resourceId, storedSessionId, match.messages)
          return
        }
        if (!match) {
          clearStoredAskAiSessionId(storageNamespace, resourceId)
          setSessionId(null)
          setMessages([])
          await ensureSession()
        }
      } catch {
        /* keep cached session state */
      }
    },
    [adapter, ensureSession, resourceId, storageNamespace],
  )

  const hydrateFromStorage = useCallback(() => {
    const storedSessionId = getStoredAskAiSessionId(storageNamespace, resourceId)
    if (storedSessionId) {
      setSessionId(storedSessionId)
      applySessionSuggestions(storedSessionId)
      const cachedMessages = getStoredAskAiMessages(storageNamespace, resourceId, storedSessionId)
      if (cachedMessages?.length) {
        setMessages(cachedMessages)
      }
      void refreshStoredSessionInBackground(storedSessionId)
      return
    }

    setSuggestions(adapter.defaultSuggestions)
  }, [
    adapter.defaultSuggestions,
    applySessionSuggestions,
    refreshStoredSessionInBackground,
    resourceId,
    storageNamespace,
  ])

  useEffect(() => {
    initializedResourceRef.current = null
    setSessionId(null)
    setMessages([])
    setSuggestions([])
    setInput('')
    setError(null)
    setHistoryOpen(false)
    cancelTypewriter()
    setAnimatingReplyKey(null)
    setUsedChipForMessage(null)
    setApplyOpportunityEdit(false)
    setEditModeControls(null)
  }, [cancelTypewriter, resourceId])

  useEffect(() => {
    if (!enabled) return
    if (initializedResourceRef.current === resourceId) return

    initializedResourceRef.current = resourceId
    hydrateFromStorage()
  }, [enabled, hydrateFromStorage, resourceId])

  useEffect(() => {
    if (!sessionId || messages.length === 0) return
    setStoredAskAiMessages(storageNamespace, resourceId, sessionId, messages)
  }, [messages, resourceId, sessionId, storageNamespace])

  useEffect(() => {
    if (layout === 'sidebar' && enabled && open && !sessionId && initializedResourceRef.current === resourceId) {
      void ensureSession()
    }
  }, [enabled, ensureSession, layout, open, resourceId, sessionId])

  useEffect(() => {
    if (open || layout === 'sidebar') scrollToBottom()
  }, [isLoading, layout, messages, open, scrollToBottom])

  const handleExpand = useCallback(() => {
    if (!open) setOpen(true)
    if (sessionId && suggestions.length === 0) {
      applySessionSuggestions(sessionId)
    }
    if (!sessionId) {
      void ensureSession()
    }
  }, [applySessionSuggestions, ensureSession, open, sessionId, setOpen, suggestions.length])

  const handleCollapse = useCallback(() => {
    setHistoryOpen(false)
    setOpen(false)
  }, [setOpen])

  useEffect(() => {
    if (!enabled) return

    const handleOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<AskAiOpenRequestDetail>).detail
      if (detail?.editMode !== undefined && showOpportunityEditToggle) {
        setApplyOpportunityEdit(detail.editMode)
      }
      setOpen(true)
      handleExpand()
    }

    window.addEventListener(REQUEST_ASK_AI_OPEN_EVENT, handleOpenRequest)
    return () => window.removeEventListener(REQUEST_ASK_AI_OPEN_EVENT, handleOpenRequest)
  }, [enabled, handleExpand, setApplyOpportunityEdit, setOpen, showOpportunityEditToggle])

  const handleNewChat = useCallback(() => {
    if (messages.length === 0) {
      toast.message('Ask something first', {
        description: 'Start this chat before creating a new session.',
      })
      setOpen(true)
      return
    }

    setHistoryOpen(false)
    cancelTypewriter()
    setAnimatingReplyKey(null)
    setUsedChipForMessage(null)
    setInput('')
    setError(null)
    setIsBootstrapping(true)
    setOpen(true)

    void (async () => {
      try {
        await createFreshSession()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not start chat.'
        setError(formatByokAwareError(msg))
      } finally {
        setIsBootstrapping(false)
      }
    })()
  }, [cancelTypewriter, createFreshSession, messages.length, setOpen])

  const onReplyTypewriterComplete = useCallback(() => {
    setAnimatingReplyKey(null)
  }, [])

  const isTypingReply = animatingReplyKey !== null

  const handleSend = useCallback(async (overrideMessage?: string) => {
    if (
      isTypingSuggestion ||
      isTypingReply ||
      isLoading ||
      isBootstrapping ||
      sendInFlightRef.current ||
      !enabled
    ) {
      return
    }

    const text = (overrideMessage ?? input).trim()
    if (!text) return

    sendInFlightRef.current = true

    const userMessage: AskAiMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    setOpen(true)
    setIsLoading(true)
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, userMessage])

    let activeSessionId = sessionId

    try {
      if (!activeSessionId) {
        activeSessionId = await ensureSession()
      }

      const result = await adapter.sendMessage(resourceId, activeSessionId, text, {
        applyOpportunityEdit: showOpportunityEditToggle ? applyOpportunityEdit : undefined,
        recentMessages: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })
      const assistantMessage: AskAiMessage = {
        role: 'assistant',
        content: result.reply,
        next_actions: result.next_actions ?? [],
        created_at: new Date().toISOString(),
        byok: result.byok_used,
      }
      setAnimatingReplyKey(assistantMessage.created_at)
      setMessages((prev) => [...prev, assistantMessage])
      if (result.suggestions?.length) {
        applySessionSuggestions(activeSessionId, result.suggestions)
      }
      persistSessionId(activeSessionId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Message failed.'
      setError(formatByokAwareError(msg))
      setMessages((prev) => prev.filter((m) => m !== userMessage))
      if (!overrideMessage) {
        setInput(text)
      }
      setUsedChipForMessage(null)
    } finally {
      sendInFlightRef.current = false
      setIsLoading(false)
    }
  }, [
    adapter,
    applySessionSuggestions,
    enabled,
    ensureSession,
    input,
    isBootstrapping,
    isLoading,
    isTypingReply,
    isTypingSuggestion,
    messages,
    persistSessionId,
    resourceId,
    sessionId,
    applyOpportunityEdit,
    showOpportunityEditToggle,
    setOpen,
  ])

  const handleNextActionChipClick = useCallback(
    (action: string, messageCreatedAt: string) => {
      if (usedChipForMessage === messageCreatedAt) return
      if (isTypingSuggestion || isTypingReply || isLoading || isBootstrapping || sendInFlightRef.current) {
        return
      }
      setUsedChipForMessage(messageCreatedAt)
      void handleSend(action)
    },
    [handleSend, isBootstrapping, isLoading, isTypingReply, isTypingSuggestion, usedChipForMessage],
  )

  const handleHistorySessionSelect = useCallback(
    (session: AskAiSession) => {
      const nextMessages = session.messages ?? []
      setAnimatingReplyKey(null)
      setUsedChipForMessage(null)
      setSessionId(session.session_id)
      setMessages(nextMessages)
      applySessionSuggestions(session.session_id)
      if (nextMessages.length) {
        setStoredAskAiMessages(storageNamespace, resourceId, session.session_id, nextMessages)
      }
      setHistoryOpen(false)
      setError(null)
      persistSessionId(session.session_id)
      setOpen(true)
    },
    [applySessionSuggestions, persistSessionId, resourceId, setOpen, storageNamespace],
  )

  const handleSuggestionSelect = useCallback(
    (prefill: string) => {
      if (isTypingSuggestion || isTypingReply || isLoading || isBootstrapping || sendInFlightRef.current) {
        return
      }
      setOpen(true)
      typewriterFill(prefill, setInput, {
        inputId: ASK_AI_COMPOSER_INPUT_ID,
        onComplete: () => inputRef.current?.focus(),
      })
    },
    [isBootstrapping, isLoading, isTypingReply, isTypingSuggestion, setOpen, typewriterFill],
  )

  const showSuggestionChips =
    enabled &&
    suggestions.length > 0 &&
    messages.length === 0 &&
    !isBootstrapping &&
    !isLoading &&
    !isTypingSuggestion &&
    !isTypingReply &&
    !historyOpen

  const suggestionsKey = useMemo(
    () => suggestions.map((suggestion) => suggestion.label).join('\0'),
    [suggestions],
  )

  const inputDisabled = isBootstrapping || isLoading || isTypingSuggestion || isTypingReply
  const showExpanded = true
  const showMessagesCard = enabled

  const value = useMemo<AskAiChatStateContextValue>(
    () => ({
      enabled,
      resourceId,
      resourceTitle: _resourceTitle,
      storageNamespace,
      adapter,
      ariaTitle: _ariaTitle,
      open,
      onOpenChange: setOpen,
      historyOpen,
      setHistoryOpen,
      messages,
      suggestions,
      input,
      setInput,
      isLoading,
      isBootstrapping,
      error,
      sessionId,
      listRef,
      inputRef,
      handleExpand,
      handleCollapse,
      handleNewChat,
      handleSend,
      handleNextActionChipClick,
      usedChipForMessage,
      handleHistorySessionSelect,
      handleSuggestionSelect,
      cancelTypewriter,
      isTypingSuggestion,
      isTypingReply,
      animatingReplyKey,
      onReplyTypewriterComplete,
      scrollToBottom,
      showSuggestionChips,
      suggestionsKey,
      inputDisabled,
      showExpanded,
      showMessagesCard,
      layout,
      showOpportunityEditToggle,
      editToggleLabel,
      editModePanel,
      defaultPanelOpen,
      panelHighlight,
      emptyStateHint,
      applyOpportunityEdit,
      setApplyOpportunityEdit,
      registerEditModeControls,
      editModeControls,
    }),
    [
      enabled,
      resourceId,
      _resourceTitle,
      storageNamespace,
      adapter,
      _ariaTitle,
      open,
      setOpen,
      historyOpen,
      messages,
      suggestions,
      input,
      isLoading,
      isBootstrapping,
      error,
      sessionId,
      handleExpand,
      handleCollapse,
      handleNewChat,
      handleSend,
      handleNextActionChipClick,
      usedChipForMessage,
      handleHistorySessionSelect,
      handleSuggestionSelect,
      cancelTypewriter,
      isTypingSuggestion,
      isTypingReply,
      animatingReplyKey,
      onReplyTypewriterComplete,
      scrollToBottom,
      showSuggestionChips,
      suggestionsKey,
      inputDisabled,
      showExpanded,
      showMessagesCard,
      layout,
      showOpportunityEditToggle,
      editToggleLabel,
      editModePanel,
      defaultPanelOpen,
      panelHighlight,
      emptyStateHint,
      applyOpportunityEdit,
      setApplyOpportunityEdit,
      registerEditModeControls,
      editModeControls,
    ],
  )

  return <AskAiChatStateContext.Provider value={value}>{children}</AskAiChatStateContext.Provider>
}

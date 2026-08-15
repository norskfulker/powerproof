import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AskAiChatMarkdown } from '@/components/ask-ai/AskAiChatMarkdown'
import { useAskAiChatState } from '@/components/ask-ai/useAskAiChatState'
import {
  EditChatHistoryPanel,
} from '@/components/opportunity/edit-chat/EditChatHistoryDrawer'
import { EditChatSuggestionChips } from '@/components/opportunity/edit-chat/EditChatSuggestionChips'
import { SharedCommandComposerShell } from '@/components/layout/SharedCommandComposerShell'
import { DiscoverHeroComposerInput } from '@/components/discover/ComposerTextarea'
import { discoverHeroButtonPrimaryClassName } from '@/components/discover/discoverHeroTokens'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/Pill'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowUp, Loader2, X, XCircle } from '@/lib/icons'
import {
  extractLatestChatSuggestions,
  hydrateEditChatMessages,
  type HydratedChatMessage,
} from '@/lib/editChatMessageHydration'
import {
  cancelMarketTestEdit,
  confirmMarketTestEditSections,
  createMarketTestEditSession,
  editChatErrorMessage,
  fetchMarketTestEditHistory,
  getMarketTestSectionLabel,
  isEditChatSessionNotFound,
  MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS,
  sendMarketTestEditMessage,
  submitMarketTestEditAnswers,
  type EditChatCompleteResponse,
  type EditChatHistorySession,
  type EditChatQuestion,
  type EditChatSuggestion,
} from '@/lib/marketTestEditChat'
import {
  clearStoredMarketTestEditSessionId,
  getStoredMarketTestEditSessionId,
  setStoredMarketTestEditSessionId,
} from '@/lib/marketTestEditChatStorage'
import { focusMarketTestEditSection } from '@/lib/marketTestEditSectionFocus'
import { keepNestedWheelScrollLocal } from '@/lib/appScrollRoot'
import { cn } from '@/lib/utils'

type ChatPhase =
  | 'creating_session'
  | 'welcome'
  | 'inferring'
  | 'confirming'
  | 'asking'
  | 'answering'
  | 'editing'
  | 'complete'

type ConfirmMessage = Extract<HydratedChatMessage, { kind: 'confirm' }>
type QuestionsMessage = Extract<HydratedChatMessage, { kind: 'questions' }>

type Props = {
  marketTestId: string
  onEditComplete?: (payload: EditChatCompleteResponse) => void
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isQuestionAnswered(question: EditChatQuestion, answers: Record<string, string>): boolean {
  const value = answers[question.id]?.trim() ?? ''
  if (!question.required) return true
  return value.length > 0
}

export function MarketTestEditChatPanel({ marketTestId, onEditComplete }: Props) {
  const { setApplyOpportunityEdit, registerEditModeControls } = useAskAiChatState()

  const [phase, setPhase] = useState<ChatPhase>('welcome')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<HydratedChatMessage[]>([])
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [activeQuestions, setActiveQuestions] = useState<QuestionsMessage | null>(null)
  const [welcomeSuggestions, setWelcomeSuggestions] = useState<EditChatSuggestion[]>(
    MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [startingSession, setStartingSession] = useState(false)
  const [restoringSession, setRestoringSession] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const initCalledRef = useRef<string | null>(null)
  const editCancelledRef = useRef(false)

  const showSuggestionChips = input.trim().length === 0 && phase !== 'editing'

  const footerSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg?.kind === 'chat') return msg.suggestions
    }
    return welcomeSuggestions
  }, [messages, welcomeSuggestions])

  const pushMessage = (msg: HydratedChatMessage) => setMessages((prev) => [...prev, msg])

  const handleNewChat = useCallback(async () => {
    if (!marketTestId || startingSession) return
    setHistoryOpen(false)
    setActiveQuestions(null)
    setAnswers({})
    setInput('')
    setStartingSession(true)
    setPhase('creating_session')
    try {
      const res = await createMarketTestEditSession(marketTestId)
      setStoredMarketTestEditSessionId(marketTestId, res.session_id)
      setSessionId(res.session_id)
      setWelcomeSuggestions(res.suggestions ?? MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS)
      setMessages([])
      setPhase('welcome')
    } catch (e) {
      const code = e instanceof Error ? e.message : 'network_error'
      const { text } = editChatErrorMessage(code)
      setMessages([{ id: uid(), kind: 'error', text, retryable: true }])
      setPhase('welcome')
    } finally {
      setStartingSession(false)
      setRestoringSession(false)
    }
  }, [marketTestId, startingSession])

  useEffect(() => {
    registerEditModeControls({
      handleNewChat: () => {
        void handleNewChat()
      },
      historyOpen,
      setHistoryOpen,
      isBootstrapping: startingSession && !restoringSession,
    })
    return () => registerEditModeControls(null)
  }, [
    handleNewChat,
    historyOpen,
    registerEditModeControls,
    restoringSession,
    startingSession,
  ])

  useEffect(() => {
    if (!marketTestId) return
    if (initCalledRef.current === marketTestId) return
    initCalledRef.current = marketTestId

    let cancelled = false

    async function initSession(id: string) {
      const storedSessionId = getStoredMarketTestEditSessionId(id)
      if (storedSessionId) {
        setRestoringSession(true)
        try {
          const { sessions } = await fetchMarketTestEditHistory(id)
          if (cancelled) return
          const match = sessions?.find((s) => s.session_id === storedSessionId)
          if (match && (match.messages?.length ?? 0) > 0) {
            const hydrated = hydrateEditChatMessages(match.messages)
            setSessionId(storedSessionId)
            setMessages(hydrated)
            setWelcomeSuggestions(
              extractLatestChatSuggestions(hydrated).length
                ? extractLatestChatSuggestions(hydrated)
                : MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS,
            )
            setPhase('welcome')
            setStartingSession(false)
            setRestoringSession(false)
            return
          }
          clearStoredMarketTestEditSessionId(id)
        } catch (e) {
          if (isEditChatSessionNotFound(e, null)) {
            clearStoredMarketTestEditSessionId(id)
          }
        }
        if (cancelled) return
        setRestoringSession(false)
      }

      setStartingSession(true)
      setPhase('creating_session')
      try {
        const res = await createMarketTestEditSession(id)
        if (cancelled) return
        setStoredMarketTestEditSessionId(id, res.session_id)
        setSessionId(res.session_id)
        setWelcomeSuggestions(res.suggestions ?? MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS)
        setMessages([])
        setPhase('welcome')
      } catch (e) {
        if (cancelled) return
        const code = e instanceof Error ? e.message : 'network_error'
        const { text } = editChatErrorMessage(code)
        setMessages([{ id: uid(), kind: 'error', text, retryable: true }])
        setPhase('welcome')
      } finally {
        if (!cancelled) {
          setStartingSession(false)
          setRestoringSession(false)
        }
      }
    }

    void initSession(marketTestId)
    return () => {
      cancelled = true
    }
  }, [marketTestId])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleHistorySessionSelect = (session: EditChatHistorySession) => {
    const hydrated = hydrateEditChatMessages(session.messages)
    setSessionId(session.session_id)
    setStoredMarketTestEditSessionId(marketTestId, session.session_id)
    setMessages(hydrated)
    setWelcomeSuggestions(
      extractLatestChatSuggestions(hydrated).length
        ? extractLatestChatSuggestions(hydrated)
        : MARKET_TEST_EDIT_FALLBACK_SUGGESTIONS,
    )
    setPhase('welcome')
    setActiveQuestions(null)
    setAnswers({})
    setInput('')
    setHistoryOpen(false)
  }

  const handleSuggestionSelect = (prefill: string) => {
    setInput(prefill)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !marketTestId || !sessionId) return
    if (
      phase === 'confirming' ||
      phase === 'asking' ||
      phase === 'answering' ||
      phase === 'creating_session' ||
      phase === 'inferring' ||
      phase === 'editing'
    ) {
      return
    }

    if (phase === 'complete') setPhase('welcome')

    pushMessage({ id: uid(), kind: 'user', text })
    setInput('')
    setPhase('inferring')
    const typingId = uid()
    pushMessage({ id: typingId, kind: 'typing' })

    try {
      const res = await sendMarketTestEditMessage(marketTestId, sessionId, text)
      setMessages((prev) => prev.filter((m) => m.id !== typingId))
      if (res.type === 'chat') {
        pushMessage({
          id: uid(),
          kind: 'chat',
          reply: res.reply,
          suggestions: res.suggestions ?? [],
        })
        setWelcomeSuggestions(res.suggestions ?? [])
        setPhase('welcome')
        return
      }

      pushMessage({
        id: uid(),
        kind: 'confirm',
        question: res.confirm_question,
        inferredSections: res.inferred_sections,
        inferredLabels: res.inferred_labels,
        editIntent: res.edit_intent,
      })
      setPhase('confirming')
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId))
      if (isEditChatSessionNotFound(e, null)) {
        clearStoredMarketTestEditSessionId(marketTestId)
        setSessionId(null)
        initCalledRef.current = null
        pushMessage({
          id: uid(),
          kind: 'error',
          text: 'Session expired. Start a new chat.',
          retryable: false,
        })
        setPhase('welcome')
        return
      }
      const code = e instanceof Error ? e.message : 'network_error'
      const { text: errText } = editChatErrorMessage(code)
      pushMessage({ id: uid(), kind: 'error', text: errText, retryable: true })
      setPhase('welcome')
    }
  }

  const handleConfirmYes = async (msg: ConfirmMessage) => {
    if (!sessionId || msg.resolved) return
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id && m.kind === 'confirm' ? { ...m, resolved: true } : m)),
    )
    setPhase('asking')
    const confirmLoadingId = uid()
    const confirmSectionLabels =
      msg.inferredLabels.length > 0
        ? msg.inferredLabels
        : msg.inferredSections.map((key) => getMarketTestSectionLabel(key))
    pushMessage({
      id: confirmLoadingId,
      kind: 'loading',
      sectionLabels: confirmSectionLabels,
      cancellable: false,
    })
    try {
      const res = await confirmMarketTestEditSections(
        marketTestId,
        sessionId,
        msg.inferredSections,
        msg.editIntent,
      )
      setMessages((prev) => prev.filter((m) => m.id !== confirmLoadingId))
      const questionsMsg: QuestionsMessage = {
        id: uid(),
        kind: 'questions',
        questions: res.questions,
        confirmedSections: res.confirmed_sections,
        editIntent: res.edit_intent,
      }
      setActiveQuestions(questionsMsg)
      setAnswers({})
      pushMessage(questionsMsg)
      setPhase('answering')
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== confirmLoadingId))
      const code = e instanceof Error ? e.message : 'network_error'
      const { text } = editChatErrorMessage(code)
      pushMessage({ id: uid(), kind: 'error', text, retryable: true })
      setPhase('welcome')
    }
  }

  const handleConfirmNo = (msg: ConfirmMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id && m.kind === 'confirm' ? { ...m, resolved: true } : m)),
    )
    setPhase('welcome')
  }

  const handleCancelEdit = (loadingId: string) => {
    if (!sessionId || !marketTestId) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === loadingId && m.kind === 'loading' ? { ...m, cancelDisabled: true } : m,
      ),
    )
    cancelMarketTestEdit(marketTestId, sessionId)
    editCancelledRef.current = true
    setMessages((prev) => {
      const withoutLoading = prev.filter((m) => m.id !== loadingId)
      return [...withoutLoading, { id: uid(), kind: 'cancelled' as const }]
    })
    setPhase('welcome')
    setAnswers({})
    setActiveQuestions(null)
  }

  const handleProceed = async (msg: QuestionsMessage) => {
    if (!sessionId || msg.submitted) return
    if (!msg.questions.every((q) => isQuestionAnswered(q, answers))) return

    const sectionLabels = msg.confirmedSections.map((key) => getMarketTestSectionLabel(key))

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id && m.kind === 'questions' ? { ...m, submitted: true } : m)),
    )
    setActiveQuestions(null)
    setPhase('editing')
    editCancelledRef.current = false
    const loadingId = uid()
    pushMessage({
      id: loadingId,
      kind: 'loading',
      sectionLabels,
      cancellable: true,
    })

    try {
      const res = await submitMarketTestEditAnswers(
        marketTestId,
        sessionId,
        msg.confirmedSections,
        msg.editIntent,
        answers,
      )
      if (editCancelledRef.current) return
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
      if (res.type === 'cancelled') {
        pushMessage({ id: uid(), kind: 'cancelled' })
        setPhase('welcome')
        setAnswers({})
        setActiveQuestions(null)
        return
      }
      const sectionsUpdated = res.sections_updated ?? msg.confirmedSections ?? []
      pushMessage({
        id: uid(),
        kind: 'complete',
        sectionsLabels:
          res.sections_labels ?? sectionsUpdated.map((key) => getMarketTestSectionLabel(key)),
        sectionsUpdated,
        version: res.version_saved ?? 0,
      })
      setPhase('complete')
      setAnswers({})
      onEditComplete?.(res)
      const firstSection = sectionsUpdated[0]
      if (firstSection) focusMarketTestEditSection(firstSection)
    } catch (e) {
      if (editCancelledRef.current) return
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
      const code = e instanceof Error ? e.message : 'network_error'
      const { text } = editChatErrorMessage(code)
      pushMessage({ id: uid(), kind: 'error', text, retryable: true })
      setPhase('welcome')
    }
  }

  const setSingleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.split('|').filter(Boolean) ?? []
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option]
      return { ...prev, [questionId]: next.join('|') }
    })
  }

  const renderMessage = (msg: HydratedChatMessage) => {
    if (msg.kind === 'user') {
      return (
        <div key={msg.id} className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
            {msg.text}
          </div>
        </div>
      )
    }
    if (msg.kind === 'chat') {
      return (
        <div
          key={msg.id}
          className="max-w-[92%] rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-2 text-sm text-foreground"
        >
          <AskAiChatMarkdown text={msg.reply} />
        </div>
      )
    }
    if (msg.kind === 'confirm') {
      return (
        <div
          key={msg.id}
          className="space-y-3 rounded-xl border border-border-subtle bg-card px-3 py-3 text-sm"
        >
          <p>{msg.question}</p>
          {!msg.resolved ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mb-0"
                onClick={() => void handleConfirmYes(msg)}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-0"
                onClick={() => handleConfirmNo(msg)}
              >
                No
              </Button>
            </div>
          ) : null}
        </div>
      )
    }
    if (msg.kind === 'questions') {
      const isActive = activeQuestions?.id === msg.id && !msg.submitted
      const allAnswered = msg.questions.every((q) => isQuestionAnswered(q, answers))
      return (
        <div
          key={msg.id}
          className="space-y-3 rounded-xl border border-border-subtle bg-card px-3 py-3 text-sm"
        >
          {msg.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">{q.text}</p>
              {q.type === 'text' ? (
                <textarea
                  value={answers[q.id] ?? ''}
                  disabled={!isActive}
                  onChange={(e) => setSingleAnswer(q.id, e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(q.options ?? []).map((opt) => {
                    const selected =
                      q.type === 'single_select'
                        ? answers[q.id] === opt
                        : (answers[q.id]?.split('|').filter(Boolean) ?? []).includes(opt)
                    return (
                      <Pill
                        key={opt}
                        as="button"
                        type="button"
                        active={selected}
                        disabled={!isActive}
                        onClick={() =>
                          q.type === 'single_select'
                            ? setSingleAnswer(q.id, opt)
                            : toggleMultiAnswer(q.id, opt)
                        }
                      >
                        {opt}
                      </Pill>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {isActive ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mb-0"
              disabled={!allAnswered}
              onClick={() => void handleProceed(msg)}
            >
              Proceed
            </Button>
          ) : null}
        </div>
      )
    }
    if (msg.kind === 'typing') {
      return (
        <div
          key={msg.id}
          className="max-w-[92%] rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-2.5"
        >
          <span className="inline-flex items-center gap-1" aria-label="Thinking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
                aria-hidden
              />
            ))}
          </span>
        </div>
      )
    }
    if (msg.kind === 'loading') {
      const sectionText = msg.sectionLabels.join(', ') || 'section'
      return (
        <div
          key={msg.id}
          className="max-w-[92%] space-y-2.5 rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-3 text-sm"
        >
          <div className="flex items-start gap-2 text-muted-foreground">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <div className="min-w-0 leading-snug">
              <span>Rewriting </span>
              <span className="animate-pulse font-medium text-foreground">{sectionText}</span>
              <span>…</span>
              <p className="mt-1 text-xs">This can take 15–30 seconds.</p>
            </div>
          </div>
          {msg.cancellable && !msg.cancelDisabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-0 h-8 px-2 text-muted-foreground"
              icon={<X className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => handleCancelEdit(msg.id)}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      )
    }
    if (msg.kind === 'cancelled') {
      return (
        <div
          key={msg.id}
          className="inline-flex max-w-[92%] items-center gap-1.5 text-sm text-muted-foreground"
        >
          <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <span>Edit cancelled.</span>
        </div>
      )
    }
    if (msg.kind === 'complete') {
      const label = msg.sectionsLabels.join(', ') || 'Section'
      return (
        <div
          key={msg.id}
          className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 text-sm"
        >
          <p>
            Done. {label} updated
            {msg.version > 0 ? ` · Version ${msg.version} saved` : ''}.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-0"
            onClick={() => {
              const key = msg.sectionsUpdated[0]
              if (key) focusMarketTestEditSection(key)
            }}
          >
            View changes
          </Button>
        </div>
      )
    }
    if (msg.kind === 'error') {
      return (
        <div
          key={msg.id}
          className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <p>{msg.text}</p>
          <div className="flex flex-wrap gap-2">
            {msg.retryable ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-0"
                onClick={() => {
                  setMessages((prev) => prev.filter((m) => m.id !== msg.id))
                  setPhase('welcome')
                }}
              >
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      )
    }
    return null
  }

  const showSessionLoader = (phase === 'creating_session' || startingSession) && !restoringSession
  const inputDisabled =
    phase === 'editing' || phase === 'creating_session' || startingSession || phase === 'inferring'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-3 pb-3 pt-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle/60 bg-muted/20">
            <div
              ref={listRef}
              className="min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain px-2.5 pb-2 pt-2 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]"
              onWheel={keepNestedWheelScrollLocal}
            >
              {showSessionLoader ? (
                <div className="flex min-h-[5rem] flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
                  <p className="text-sm font-medium text-primary">Starting edit session…</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-[8rem] flex-col items-center justify-center px-3 text-center">
                  <p className="text-sm font-medium text-foreground">Edit this market test</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Say what to change — we&apos;ll confirm sections before writing.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 text-left">{messages.map(renderMessage)}</div>
              )}
            </div>

            <EditChatHistoryPanel
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              resourceId={marketTestId}
              activeSessionId={sessionId}
              onSelectSession={handleHistorySessionSelect}
              fetchHistory={fetchMarketTestEditHistory}
            />
          </div>
        </div>

        <div className="shrink-0 space-y-2.5">
          {showSuggestionChips && !showSessionLoader && !historyOpen ? (
            <EditChatSuggestionChips
              suggestions={footerSuggestions}
              visible
              onSelect={handleSuggestionSelect}
            />
          ) : null}

          <SharedCommandComposerShell
            variant="hero"
            className="w-full shrink-0"
            innerClassName="!px-2.5 !py-1.5 layout-sm:!px-2.5 layout-sm:!py-1.5"
          >
            <div
              className="mb-2 flex w-full items-center justify-center"
              role="group"
              aria-label="Message mode"
            >
              <div className="inline-flex rounded-full border border-border-subtle/70 bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setApplyOpportunityEdit(false)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  aria-pressed={false}
                >
                  Ask
                </button>
                <button
                  type="button"
                  className="rounded-full bg-card px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm"
                  aria-pressed
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-row items-center gap-2">
              <div className="min-w-0 flex-1">
                <DiscoverHeroComposerInput
                  ref={inputRef}
                  value={input}
                  compact
                  truncatePlaceholder
                  autoGrow
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!inputDisabled) void handleSend()
                    }
                  }}
                  disabled={inputDisabled}
                  placeholder="Describe what to change…"
                  className="min-h-[2.5rem] max-h-32 !px-0 !py-0"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="primary"
                    size="icon"
                    className={cn(
                      discoverHeroButtonPrimaryClassName,
                      'mb-0 h-11 w-11 min-h-11 min-w-11 shrink-0 self-center rounded-full border border-primary/20 p-0 sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9',
                    )}
                    disabled={!input.trim() || inputDisabled}
                    loading={phase === 'inferring'}
                    onClick={() => void handleSend()}
                    aria-label="Send"
                    icon={
                      <ArrowUp
                        className="h-4 w-4 transition-transform duration-200 ease-out group-hover/composer:rotate-90"
                        aria-hidden
                      />
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Send message</TooltipContent>
              </Tooltip>
            </div>
          </SharedCommandComposerShell>

          <p className="shrink-0 px-1 text-center text-[10px] text-muted-foreground">
            Edit mode may update market test sections
          </p>
        </div>
      </div>
    </div>
  )
}

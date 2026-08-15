import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EditChatComposerFooter } from '@/components/opportunity/edit-chat/EditChatComposerFooter'
import { AskAiChatMarkdown } from '@/components/ask-ai/AskAiChatMarkdown'
import {
  EditChatHistoryPanel,
  EditChatHistoryToggle,
} from '@/components/opportunity/edit-chat/EditChatHistoryDrawer'
import { EditChatSectionPicker } from '@/components/opportunity/edit-chat/EditChatSectionPicker'
import { EditChatSuggestionChips } from '@/components/opportunity/edit-chat/EditChatSuggestionChips'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pill } from '@/components/ui/Pill'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useOpportunityEditChat } from '@/contexts/OpportunityEditChatContext'
import type { OpportunityEditChatRegistration } from '@/contexts/OpportunityEditChatContext'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { ArrowUp, Loader2, PenLine, Pencil, Sparkles, X, XCircle } from '@/lib/icons'
import type { AIModelId } from '@/lib/aiModels'
import { DEFAULT_AI_MODEL_ID } from '@/lib/aiModels'
import { dispatchBackgroundJobsRefetch } from '@/lib/backgroundJobEvents'
import { formatByokAwareError } from '@/lib/byok'
import {
  extractLatestChatSuggestions,
  hydrateEditChatMessages,
  type HydratedChatMessage,
} from '@/lib/editChatMessageHydration'
import {
  clearStoredEditChatSessionId,
  getStoredEditChatPanelOpen,
  getStoredEditChatSessionId,
  setStoredEditChatPanelOpen,
  setStoredEditChatSessionId,
} from '@/lib/editChatStorage'
import {
  cancelEditChat,
  confirmEditChatSections,
  createEditChatSession,
  editChatErrorMessage,
  fetchEditChatHistory,
  isEditChatSessionNotFound,
  sendEditChatMessage,
  submitEditChatAnswers,
  type EditChatHistorySession,
  type EditChatQuestion,
  type EditChatSuggestion,
} from '@/lib/opportunityEditChat'
import { focusOpportunityEditSection } from '@/lib/opportunityEditSectionFocus'
import {
  getReResearchSectionLabel,
  isValidReResearchSectionForStyle,
  type ReResearchSectionKey,
} from '@/lib/reResearchSections'
import { RE_RESEARCH_CONFIRM } from '@/lib/rerunConfirm'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { supabase, SUPABASE_URL } from '@/lib/supabase'
import { fetchSupabaseFunctionStream } from '@/lib/supabaseFunctionStream'
import { cn } from '@/lib/utils'
import { normalizeSaturationData } from '@/lib/saturation'
import type { SaturationData } from '@/types/research'

type ChatPhase =
  | 'creating_session'
  | 'welcome'
  | 'inferring'
  | 'confirming'
  | 'asking'
  | 'answering'
  | 'editing'
  | 'complete'
  | 'section_picker_open'
  | 're_researching'

type UserMessage = { id: string; kind: 'user'; text: string }
type ChatBubbleMessage = {
  id: string
  kind: 'chat'
  reply: string
  suggestions: EditChatSuggestion[]
}
type ConfirmMessage = {
  id: string
  kind: 'confirm'
  question: string
  inferredSections: string[]
  inferredLabels: string[]
  editIntent: string
  resolved?: boolean
}
type QuestionsMessage = {
  id: string
  kind: 'questions'
  questions: EditChatQuestion[]
  confirmedSections: string[]
  editIntent: string
  submitted?: boolean
}
type TypingMessage = { id: string; kind: 'typing' }
type LoadingMessage = {
  id: string
  kind: 'loading'
  sectionLabels: string[]
  cancellable?: boolean
  cancelDisabled?: boolean
}
type CancelledMessage = { id: string; kind: 'cancelled' }
type ReResearchLoadingMessage = {
  id: string
  kind: 're_research_loading'
  sectionLabels: string[]
  styleLabel: string
}
type CompleteMessage = {
  id: string
  kind: 'complete'
  sectionsLabels: string[]
  sectionsUpdated: string[]
  version: number
}
type ReResearchCompleteMessage = {
  id: string
  kind: 're_research_complete'
  sectionsLabels: string[]
  sectionsUpdated: string[]
  version: number
  styleLabel: string
}
type ErrorMessage = {
  id: string
  kind: 'error'
  text: string
  retryable?: boolean
}

type ChatMessage = HydratedChatMessage

type PanelSnapshot = {
  sessionId: string | null
  messages: ChatMessage[]
  phase: ChatPhase
  welcomeSuggestions: EditChatSuggestion[]
  editTarget: EditTarget | null
  input: string
  answers: Record<string, string>
  researchStyle: ResearchStyle
  selectedModel: AIModelId
  selectedSections: ReResearchSectionKey[]
  phaseBeforePicker: ChatPhase
  sectionPickerOpen: boolean
}

const DESKTOP_PANEL_WIDTH = 380
const MOBILE_PANEL_HEIGHT = 'min(70vh, 520px)'
const RE_RESEARCH_DEFAULT_MODEL: AIModelId = DEFAULT_AI_MODEL_ID

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function resolveResearchStyle(value: unknown): ResearchStyle {
  const raw = typeof value === 'string' ? value : 'standard'
  return RESEARCH_STYLE_OPTIONS.some((o) => o.value === raw) ? (raw as ResearchStyle) : 'standard'
}

function isQuestionAnswered(question: EditChatQuestion, answers: Record<string, string>): boolean {
  const value = answers[question.id]?.trim() ?? ''
  if (!question.required) return true
  return value.length > 0
}

type EditTarget = {
  sectionKeys: string[]
  sectionLabels: string[]
  editIntent: string
}

function resolveSectionLabels(sectionKeys?: string[] | null, sectionLabels?: string[] | null): string {
  if (sectionLabels?.length) return sectionLabels.join(', ')
  if (!sectionKeys?.length) return 'Section'
  return (
    sectionKeys
      .map((key) => getReResearchSectionLabel(key))
      .join(', ') || 'Section'
  )
}

function buildSaturationPromptContext(saturation: SaturationData | null, userPrompt: string): string {
  const prompt = userPrompt.trim()
  if (!saturation) return prompt
  const penalties = saturation.score_penalties
  const context = `[SATURATION CONTEXT - do not ignore]
This market was assessed as: ${saturation.verdict} (score: ${Math.round(saturation.score)}/100)
Reasons: ${saturation.reasons.join(' | ')}
Score penalties applied: market_momentum ${penalties.market_momentum}, ease ${penalties.ease}, profitability ${penalties.profitability}
Factor this into your analysis and score breakdown. Do not soften or omit this finding.
[END SATURATION CONTEXT]`
  return prompt ? `${context}\n\n${prompt}` : context
}

function EditContextChip({
  pageLabel,
  sectionLabel,
  onClear,
  disabled,
}: {
  pageLabel: string
  sectionLabel: string
  onClear: () => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-primary/25 bg-primary/[0.07] py-0.5 pl-2.5 pr-0.5 text-xs">
      <span className="min-w-0 truncate leading-snug">
        <span className="font-semibold text-foreground">{pageLabel}</span>
        <span className="text-muted-foreground"> · </span>
        <span className="font-medium text-foreground/90">{sectionLabel}</span>
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        aria-label="Clear edit target"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function useOpportunityEditChatRegistration(config: OpportunityEditChatRegistration | null) {
  const { setOpportunityMeta, setActivePageOpportunityId, openPanel, closePanel } =
    useOpportunityEditChat()

  useEffect(() => {
    if (!config) return
    const { userOpportunityId, unifiedAskAi } = config
    setOpportunityMeta(userOpportunityId, config)
    if (unifiedAskAi) {
      setStoredEditChatPanelOpen(userOpportunityId, false)
      closePanel()
    } else {
      setActivePageOpportunityId(userOpportunityId)
      if (getStoredEditChatPanelOpen(userOpportunityId)) {
        openPanel(userOpportunityId)
      }
    }
    return () => {
      setOpportunityMeta(userOpportunityId, null)
      if (!unifiedAskAi) {
        setActivePageOpportunityId(null)
        closePanel()
      }
    }
  }, [config, setOpportunityMeta, setActivePageOpportunityId, openPanel, closePanel])
}

export function OpportunityEditChatTrigger() {
  return null
}

export function OpportunityEditChatPanel() {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const {
    isOpen,
    closePanel,
    activeOpportunityId,
    getOpportunityMeta,
    pendingReResearch,
    clearPendingReResearch,
  } = useOpportunityEditChat()

  const registration = activeOpportunityId ? getOpportunityMeta(activeOpportunityId) : null
  const userOpportunityId = activeOpportunityId ?? ''
  const pageLabel = registration?.pageLabel ?? 'Research'
  const onRefresh = registration?.onRefresh
  const onEditComplete = registration?.onEditComplete
  const defaultResearchStyle = resolveResearchStyle(registration?.researchStyle)

  const [phase, setPhase] = useState<ChatPhase>('welcome')
  const [phaseBeforePicker, setPhaseBeforePicker] = useState<ChatPhase>('welcome')
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [activeQuestions, setActiveQuestions] = useState<QuestionsMessage | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [welcomeSuggestions, setWelcomeSuggestions] = useState<EditChatSuggestion[]>([])

  const [sectionPickerOpen, setSectionPickerOpen] = useState(false)
  const [reResearchConfirmOpen, setReResearchConfirmOpen] = useState(false)
  const [researchStyle, setResearchStyle] = useState<ResearchStyle>(defaultResearchStyle)
  const [selectedModel, setSelectedModel] = useState<AIModelId>(RE_RESEARCH_DEFAULT_MODEL)
  const [selectedSections, setSelectedSections] = useState<Set<ReResearchSectionKey>>(new Set())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoringSession, setRestoringSession] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const snapshotsRef = useRef<Map<string, PanelSnapshot>>(new Map())
  const initCalledForOppRef = useRef<string | null>(null)
  const prevOppIdRef = useRef<string | null>(null)
  const editCancelledRef = useRef(false)

  const selectedSectionCount = selectedSections.size
  const styleLabel =
    RESEARCH_STYLE_OPTIONS.find((o) => o.value === researchStyle)?.label ?? 'Standard'

  const showSuggestionChips = input.trim().length === 0 && phase !== 're_researching'

  const footerSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg?.kind === 'chat') return msg.suggestions
    }
    return welcomeSuggestions
  }, [messages, welcomeSuggestions])

  const captureSnapshot = useCallback((): PanelSnapshot => {
    return {
      sessionId,
      messages,
      phase,
      welcomeSuggestions,
      editTarget,
      input,
      answers,
      researchStyle,
      selectedModel,
      selectedSections: Array.from(selectedSections),
      phaseBeforePicker,
      sectionPickerOpen,
    }
  }, [
    sessionId,
    messages,
    phase,
    welcomeSuggestions,
    editTarget,
    input,
    answers,
    researchStyle,
    selectedModel,
    selectedSections,
    phaseBeforePicker,
    sectionPickerOpen,
  ])

  const applySnapshot = useCallback((snapshot: PanelSnapshot) => {
    setSessionId(snapshot.sessionId)
    setMessages(snapshot.messages)
    setPhase(snapshot.phase)
    setWelcomeSuggestions(snapshot.welcomeSuggestions)
    setEditTarget(snapshot.editTarget)
    setInput(snapshot.input)
    setAnswers(snapshot.answers)
    setResearchStyle(snapshot.researchStyle)
    setSelectedModel(DEFAULT_AI_MODEL_ID)
    setSelectedSections(new Set(snapshot.selectedSections))
    setPhaseBeforePicker(snapshot.phaseBeforePicker)
    setSectionPickerOpen(snapshot.sectionPickerOpen)
    setStartingSession(false)
    setRestoringSession(false)
    setActiveQuestions(
      [...snapshot.messages].reverse().find((m): m is QuestionsMessage => m.kind === 'questions') ??
        null,
    )
  }, [])

  const clearEditTarget = useCallback(() => {
    if (phase === 'editing' || phase === 'creating_session' || phase === 'inferring' || phase === 're_researching') return
    setEditTarget(null)
    setActiveQuestions(null)
    setAnswers({})
    setPhase('welcome')
  }, [phase])

  const handleNewChat = async () => {
    if (!userOpportunityId || startingSession) return
    setHistoryOpen(false)
    setSectionPickerOpen(false)
    setEditTarget(null)
    setActiveQuestions(null)
    setAnswers({})
    setInput('')
    setStartingSession(true)
    setPhase('creating_session')
    try {
      const res = await createEditChatSession(userOpportunityId)
      setStoredEditChatSessionId(userOpportunityId, res.session_id)
      setSessionId(res.session_id)
      setWelcomeSuggestions(res.suggestions ?? [])
      setMessages([])
      setPhase('welcome')
      snapshotsRef.current.set(userOpportunityId, {
        sessionId: res.session_id,
        messages: [],
        phase: 'welcome',
        welcomeSuggestions: res.suggestions ?? [],
        editTarget: null,
        input: '',
        answers: {},
        researchStyle,
        selectedModel,
        selectedSections: Array.from(selectedSections),
        phaseBeforePicker: 'welcome',
        sectionPickerOpen: false,
      })
    } catch (e) {
      const code = e instanceof Error ? e.message : 'network_error'
      const { text } = editChatErrorMessage(code)
      setMessages([{ id: uid(), kind: 'error', text, retryable: true }])
      setPhase('welcome')
    } finally {
      setStartingSession(false)
      setRestoringSession(false)
    }
  }

  const handleClose = () => {
    if (activeOpportunityId) {
      snapshotsRef.current.set(activeOpportunityId, captureSnapshot())
    }
    setHistoryOpen(false)
    closePanel()
    clearPendingReResearch()
  }

  const handleHistorySessionSelect = (session: EditChatHistorySession) => {
    if (!activeOpportunityId) return
    const hydrated = hydrateEditChatMessages(session.messages)
    setSessionId(session.session_id)
    setStoredEditChatSessionId(activeOpportunityId, session.session_id)
    setMessages(hydrated)
    setWelcomeSuggestions(extractLatestChatSuggestions(hydrated))
    setPhase('welcome')
    setEditTarget(null)
    setActiveQuestions(null)
    setAnswers({})
    setInput('')
    setHistoryOpen(false)
    const suggestions = extractLatestChatSuggestions(hydrated)
    snapshotsRef.current.set(activeOpportunityId, {
      sessionId: session.session_id,
      messages: hydrated,
      phase: 'welcome',
      welcomeSuggestions: suggestions,
      editTarget: null,
      input: '',
      answers: {},
      researchStyle,
      selectedModel,
      selectedSections: Array.from(selectedSections),
      phaseBeforePicker,
      sectionPickerOpen,
    })
  }

  const handleSuggestionSelect = (prefill: string) => {
    setInput(prefill)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleResearchStyleChange = (style: ResearchStyle) => {
    setResearchStyle(style)
    setSelectedSections((prev) => {
      const next = new Set<ReResearchSectionKey>()
      for (const key of prev) {
        if (isValidReResearchSectionForStyle(key, style)) next.add(key)
      }
      return next
    })
  }

  const openSectionPicker = () => {
    if (sectionPickerOpen) {
      closeSectionPicker()
      return
    }
    setHistoryOpen(false)
    setPhaseBeforePicker(phase === 'section_picker_open' ? 'welcome' : phase)
    setSectionPickerOpen(true)
    setPhase('section_picker_open')
  }

  const closeSectionPicker = () => {
    setSectionPickerOpen(false)
    setPhase(phaseBeforePicker === 'section_picker_open' ? 'welcome' : phaseBeforePicker)
  }

  useEffect(() => {
    if (!userOpportunityId) return
    if (initCalledForOppRef.current === userOpportunityId) return

    const prevId = prevOppIdRef.current
    if (prevId && prevId !== userOpportunityId) {
      snapshotsRef.current.set(prevId, captureSnapshot())
      setHistoryOpen(false)
    }
    prevOppIdRef.current = userOpportunityId

    const cached = snapshotsRef.current.get(userOpportunityId)
    if (cached?.sessionId) {
      applySnapshot(cached)
      initCalledForOppRef.current = userOpportunityId
      return
    }

    initCalledForOppRef.current = userOpportunityId

    let cancelled = false

    async function initSession(oppId: string) {
      const storedSessionId = getStoredEditChatSessionId(oppId)

      if (storedSessionId) {
        setRestoringSession(true)
        try {
          const { sessions } = await fetchEditChatHistory(oppId)
          if (cancelled) return
          const match = sessions?.find((s) => s.session_id === storedSessionId)
          if (match) {
            const messageCount = match.messages?.length ?? 0
            if (messageCount > 0) {
              const hydrated = hydrateEditChatMessages(match.messages)
              setSessionId(storedSessionId)
              setMessages(hydrated)
              setWelcomeSuggestions(extractLatestChatSuggestions(hydrated))
              setPhase('welcome')
              setStartingSession(false)
              setRestoringSession(false)
              return
            }
            clearStoredEditChatSessionId(oppId)
          } else {
            clearStoredEditChatSessionId(oppId)
          }
        } catch (e) {
          if (isEditChatSessionNotFound(e, null)) {
            clearStoredEditChatSessionId(oppId)
          }
        }
        if (cancelled) return
        setRestoringSession(false)
      }

      setStartingSession(true)
      setPhase('creating_session')
      try {
        const res = await createEditChatSession(oppId)
        if (cancelled) return
        setStoredEditChatSessionId(oppId, res.session_id)
        setSessionId(res.session_id)
        setWelcomeSuggestions(res.suggestions ?? [])
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

    void initSession(userOpportunityId)

    return () => {
      cancelled = true
    }
  }, [userOpportunityId])

  useEffect(() => {
    if (!isOpen || !activeOpportunityId) return
    if (pendingReResearch) {
      setSectionPickerOpen(true)
      setPhase('section_picker_open')
      setPhaseBeforePicker('welcome')
      clearPendingReResearch()
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [isOpen, activeOpportunityId, pendingReResearch, clearPendingReResearch])

  useEffect(() => {
    setResearchStyle(defaultResearchStyle)
  }, [defaultResearchStyle])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sectionPickerOpen])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

  const pushMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !userOpportunityId) return
    if (phase === 'confirming' || phase === 'asking' || phase === 'answering') return
    if (phase === 'creating_session' || phase === 'inferring' || phase === 'editing' || phase === 're_researching') return

    if (phase === 'complete' || phase === 'section_picker_open') {
      setPhase('welcome')
      setSectionPickerOpen(false)
    }

    if (!sessionId) return

    pushMessage({ id: uid(), kind: 'user', text })
    setInput('')
    setPhase('inferring')
    const typingId = uid()
    pushMessage({ id: typingId, kind: 'typing' })

    try {
      const res = await sendEditChatMessage(userOpportunityId, sessionId, text)
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
      setEditTarget({
        sectionKeys: res.inferred_sections ?? [],
        sectionLabels: res.inferred_labels ?? [],
        editIntent: res.edit_intent,
      })
      setPhase('confirming')
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId))
      if (isEditChatSessionNotFound(e, null) && userOpportunityId) {
        clearStoredEditChatSessionId(userOpportunityId)
        setSessionId(null)
        initCalledForOppRef.current = null
        setMessages((prev) => prev.filter((m) => m.kind !== 'user' || m.text !== text))
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
        : msg.inferredSections.map((key) => getReResearchSectionLabel(key))
    pushMessage({
      id: confirmLoadingId,
      kind: 'loading',
      sectionLabels: confirmSectionLabels,
      cancellable: false,
    })
    try {
      const res = await confirmEditChatSections(userOpportunityId, sessionId, msg.inferredSections, msg.editIntent)
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
      const confirmedSections = res.confirmed_sections ?? []
      setEditTarget({
        sectionKeys: confirmedSections,
        sectionLabels: confirmedSections.map((key) => getReResearchSectionLabel(key)),
        editIntent: res.edit_intent,
      })
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

  const handleCancelEdit = (loadingId: string) => {
    if (!sessionId || !userOpportunityId) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === loadingId && m.kind === 'loading' ? { ...m, cancelDisabled: true } : m,
      ),
    )
    cancelEditChat(userOpportunityId, sessionId)
    editCancelledRef.current = true
    setMessages((prev) => {
      const withoutLoading = prev.filter((m) => m.id !== loadingId)
      return [...withoutLoading, { id: uid(), kind: 'cancelled' as const }]
    })
    setPhase('welcome')
    setEditTarget(null)
    setAnswers({})
    setActiveQuestions(null)
  }

  const handleConfirmNo = (msg: ConfirmMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id && m.kind === 'confirm' ? { ...m, resolved: true } : m)),
    )
    setEditTarget(null)
    setPhase('welcome')
  }

  const handleProceed = async (msg: QuestionsMessage) => {
    if (!sessionId || msg.submitted) return
    if (!msg.questions.every((q) => isQuestionAnswered(q, answers))) return

    const sectionLabels =
      msg.confirmedSections.map((key) => getReResearchSectionLabel(key)) || ['section']

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
      const res = await submitEditChatAnswers(
        userOpportunityId,
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
        setEditTarget(null)
        return
      }
      const sectionsUpdated = res.sections_updated ?? msg.confirmedSections ?? []
      pushMessage({
        id: uid(),
        kind: 'complete',
        sectionsLabels: res.sections_labels ?? sectionsUpdated.map((key) => getReResearchSectionLabel(key)),
        sectionsUpdated,
        version: res.version_saved ?? 0,
      })
      setPhase('complete')
      setAnswers({})
      setEditTarget({
        sectionKeys: sectionsUpdated,
        sectionLabels: res.sections_labels ?? sectionsUpdated.map((key) => getReResearchSectionLabel(key)),
        editIntent: msg.editIntent,
      })
      onEditComplete?.(res)
      onRefresh?.()
      const firstSection = sectionsUpdated[0]
      if (firstSection) focusOpportunityEditSection(firstSection)
    } catch (e) {
      if (editCancelledRef.current) return
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
      const code = e instanceof Error ? e.message : 'network_error'
      const { text } = editChatErrorMessage(code)
      pushMessage({ id: uid(), kind: 'error', text, retryable: true })
      setPhase('welcome')
    }
  }

  const handleRunReResearch = async () => {
    if (selectedSectionCount === 0) return

    const sectionKeys = Array.from(selectedSections)
    const sectionLabels = sectionKeys.map((key) => getReResearchSectionLabel(key))
    const loadingId = uid()

    setPhase('re_researching')
    pushMessage({
      id: loadingId,
      kind: 're_research_loading',
      sectionLabels,
      styleLabel,
    })
    dispatchBackgroundJobsRefetch()

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Please sign in.')

      const { data: opportunityRow } = await supabase
        .from('user_opportunities')
        .select('research_context, re_research_prompt')
        .eq('id', userOpportunityId)
        .maybeSingle()
      const opportunityContext = opportunityRow as {
        research_context?: Record<string, unknown> | null
        re_research_prompt?: string | null
      } | null
      const saturation = normalizeSaturationData(opportunityContext?.research_context?.saturation)
      const improvePrompt = buildSaturationPromptContext(
        saturation,
        opportunityContext?.re_research_prompt ?? '',
      )

      await fetchSupabaseFunctionStream(
        SUPABASE_URL,
        're-research-opportunity',
        session.access_token,
        {
          opportunity_id: userOpportunityId,
          sections: sectionKeys,
          improve_prompt: improvePrompt || undefined,
          research_style: researchStyle,
          model: DEFAULT_AI_MODEL_ID,
        },
        { onEvent: () => {} },
      )

      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
      pushMessage({
        id: uid(),
        kind: 're_research_complete',
        sectionsLabels: sectionLabels,
        sectionsUpdated: sectionKeys,
        version: 0,
        styleLabel,
      })
      setPhase('complete')
      setSectionPickerOpen(false)
      onRefresh?.()
      const firstSection = sectionKeys[0]
      if (firstSection) focusOpportunityEditSection(firstSection)
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId))
      pushMessage({
        id: uid(),
        kind: 'error',
        text: formatByokAwareError(e instanceof Error ? e.message : 'Ask AI failed.'),
        retryable: true,
      })
      setPhase('welcome')
      setSectionPickerOpen(false)
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

  const renderMessage = (msg: ChatMessage) => {
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
        <div key={msg.id} className="space-y-3 rounded-xl border border-border-subtle bg-card px-3 py-3 text-sm">
          <p>{msg.question}</p>
          {!msg.resolved ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" className="mb-0" onClick={() => void handleConfirmYes(msg)}>
                ✓ Yes
              </Button>
              <Button type="button" variant="secondary" size="sm" className="mb-0" onClick={() => handleConfirmNo(msg)}>
                ✗ No
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
        <div key={msg.id} className="space-y-3 rounded-xl border border-border-subtle bg-card px-3 py-3 text-sm">
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
                        {q.type === 'single_select' ? `○ ${opt}` : opt}
                      </Pill>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {isActive ? (
            <Button type="button" variant="primary" size="sm" className="mb-0" disabled={!allAnswered} onClick={() => void handleProceed(msg)}>
              Proceed →
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
    if (msg.kind === 're_research_loading') {
      const sectionText = msg.sectionLabels.join(', ')
      return (
        <div
          key={msg.id}
          className="max-w-[92%] space-y-1 rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-3 text-sm text-muted-foreground"
        >
          <div className="flex items-start gap-2">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <div className="min-w-0 leading-snug">
              <span>Asking AI to update </span>
              <span className="animate-pulse font-medium text-foreground">{sectionText}</span>
              <span>
                {' '}
                as {msg.styleLabel}…
              </span>
            </div>
          </div>
        </div>
      )
    }
    if (msg.kind === 'cancelled') {
      return (
        <div
          key={msg.id}
          className="max-w-[92%] inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <span>Edit cancelled.</span>
        </div>
      )
    }
    if (msg.kind === 'complete') {
      const label = msg.sectionsLabels.join(', ') || 'Section'
      return (
        <div key={msg.id} className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 text-sm">
          <p>✓ Done! {label} updated. Version {msg.version} saved — you can roll back anytime.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-0"
            onClick={() => {
              const key = msg.sectionsUpdated[0]
              if (key) focusOpportunityEditSection(key)
            }}
          >
            View Changes ↓
          </Button>
        </div>
      )
    }
    if (msg.kind === 're_research_complete') {
      const label = msg.sectionsLabels.join(', ') || 'sections'
      return (
        <div key={msg.id} className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 text-sm">
          <p>
            ✓ Done! {msg.sectionsUpdated.length} section
            {msg.sectionsUpdated.length === 1 ? '' : 's'} updated as {msg.styleLabel}.
            {msg.version > 0 ? ` Version ${msg.version} saved — roll back anytime.` : ''}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-0"
            onClick={() => {
              const key = msg.sectionsUpdated[0]
              if (key) focusOpportunityEditSection(key)
            }}
          >
            View Changes ↓
          </Button>
        </div>
      )
    }
    if (msg.kind === 'error') {
      return (
        <div key={msg.id} className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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

  if (!activeOpportunityId) return null

  const showSessionLoader =
    (phase === 'creating_session' || startingSession) && !restoringSession

  const inputDisabled =
    phase === 'editing' ||
    phase === 'creating_session' ||
    phase === 're_researching' ||
    startingSession

  const panelInner = (
    <div
      className="flex h-full min-h-0 flex-col bg-surface"
      style={{ fontFamily: 'var(--font-sans)', width: isMobile ? '100%' : DESKTOP_PANEL_WIDTH }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">Ask AI</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <EditChatHistoryToggle open={historyOpen} onOpenChange={setHistoryOpen} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0 h-8 w-8 min-h-8 min-w-8"
                disabled={startingSession}
                onClick={() => void handleNewChat()}
                aria-label="New chat"
                icon={<PenLine className="h-4 w-4" aria-hidden />}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">New chat</TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {editTarget ? (
        <div className="shrink-0 border-b border-border-subtle px-3 py-2">
          <EditContextChip
            pageLabel={pageLabel}
            sectionLabel={resolveSectionLabels(editTarget.sectionKeys, editTarget.sectionLabels)}
            onClear={clearEditTarget}
            disabled={phase === 'editing' || phase === 'inferring' || phase === 'creating_session' || phase === 're_researching'}
          />
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {sectionPickerOpen ? (
          <EditChatSectionPicker
            researchStyle={researchStyle}
            onResearchStyleChange={handleResearchStyleChange}
            selected={selectedSections}
            onSelectedChange={setSelectedSections}
            onRun={() => setReResearchConfirmOpen(true)}
            onBack={closeSectionPicker}
            running={phase === 're_researching'}
          />
        ) : (
        <div ref={listRef} className="h-full overflow-y-auto px-3 py-3">
        {showSessionLoader ? (
          <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2.5">
            <Loader2 className="h-6 w-6 shrink-0 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-primary">Starting session…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[10rem] flex-col items-center justify-center px-2 text-center">
            <p className="font-sans text-[15px] font-medium tracking-tight text-muted-foreground">
              What would you like to change?
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">{messages.map(renderMessage)}</div>
        )}
        </div>
        )}
        <EditChatHistoryPanel
          open={historyOpen && !sectionPickerOpen}
          onOpenChange={setHistoryOpen}
          resourceId={userOpportunityId}
          activeSessionId={sessionId}
          onSelectSession={handleHistorySessionSelect}
          fetchHistory={fetchEditChatHistory}
        />
      </div>

      {!sectionPickerOpen ? (
      <footer className="shrink-0 border-t border-border-subtle p-3">
        <div className="flex flex-col gap-0 rounded-xl border border-border-subtle bg-background p-2">
          <EditChatSuggestionChips
            suggestions={footerSuggestions}
            visible={showSuggestionChips && !showSessionLoader}
            onSelect={handleSuggestionSelect}
            className="pb-2"
          />
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (phase === 'complete') setPhase('welcome')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              rows={1}
              disabled={inputDisabled}
              placeholder="Describe what to change…"
              className="min-h-[2.25rem] max-h-[7.5rem] flex-1 resize-none border-0 bg-transparent py-1.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            <Button
              type="button"
              variant="primary"
              size="icon"
              className="mb-0 h-9 w-9 min-h-9 min-w-9 shrink-0"
              disabled={!input.trim() || inputDisabled || phase === 'inferring'}
              onClick={() => void handleSend()}
              aria-label="Send"
              icon={<ArrowUp className="h-4 w-4" aria-hidden />}
            />
          </div>
          <EditChatComposerFooter
            researchStyle={researchStyle}
            onResearchStyleChange={handleResearchStyleChange}
            onOpenSectionPicker={openSectionPicker}
            sectionPickerActive={sectionPickerOpen}
            disabled={inputDisabled || phase === 'editing'}
          />
        </div>
      </footer>
      ) : null}

      <ConfirmDialog
        open={reResearchConfirmOpen}
        title={RE_RESEARCH_CONFIRM.title}
        description={RE_RESEARCH_CONFIRM.description}
        confirmLabel={RE_RESEARCH_CONFIRM.confirmLabel}
        onConfirm={() => {
          setReResearchConfirmOpen(false)
          void handleRunReResearch()
        }}
        onCancel={() => setReResearchConfirmOpen(false)}
      />
    </div>
  )

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {isOpen ? (
            <motion.button
              type="button"
              key="edit-chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-[2px] md:hidden"
              aria-label="Close edit panel"
              onClick={handleClose}
            />
          ) : null}
        </AnimatePresence>
        <motion.div
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 overflow-hidden border-t border-border-default bg-surface md:hidden',
            !isOpen && 'pointer-events-none',
          )}
          initial={false}
          animate={{
            height: isOpen ? MOBILE_PANEL_HEIGHT : 0,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: prefersReducedMotion ? 0.15 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={!isOpen}
        >
          {panelInner}
        </motion.div>
      </>
    )
  }

  return (
    <motion.aside
      className="z-50 hidden shrink-0 overflow-hidden border-l border-border-default bg-surface md:block"
      initial={false}
      animate={{ width: isOpen ? DESKTOP_PANEL_WIDTH : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: prefersReducedMotion ? 0.15 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!isOpen}
    >
      {panelInner}
    </motion.aside>
  )
}

/** @deprecated Use useOpportunityEditChatRegistration + Trigger + Panel */
export type OpportunityEditChatProps = OpportunityEditChatRegistration

export function OpportunityEditChat(props: OpportunityEditChatProps) {
  useOpportunityEditChatRegistration(props)
  return <OpportunityEditChatTrigger />
}

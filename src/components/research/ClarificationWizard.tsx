import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, RefreshCw } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { invokeClarifyResearchPrompt } from '@/lib/clarifyResearchPrompt'
import { BYOK_SUBMIT_HINT, formatByokAwareError } from '@/lib/byok'
import { useByok } from '@/hooks/useByok'
import { supabase } from '@/lib/supabase'
import type {
  ClarifyAnswer,
  ClarifyQuestion,
  ClarifyResearchPromptResponse,
  ClarifyRound,
  ClarificationDraft,
  ClarificationDraftStatus,
  SaturationData,
} from '@/types/research'
import type { ClarifyStatePersisted } from '@/types/clarifyState'
import { clarifyStateFromNeedsMore, clarifyStateFromReady } from '@/types/clarifyState'
import type { Persona } from '@/types/persona'
import { PersonaBadge } from '@/components/persona/PersonaBadge'
import { cn } from '@/lib/utils'
import { countryNameForPrompt } from '@/lib/countries'
import {
  discoverHeroButtonOutlineBlueClassName,
  discoverHeroButtonPrimaryClassName,
  discoverHeroItchButtonRowClassName,
} from '@/components/discover/discoverHeroTokens'
import { ClarificationFlowLayout } from '@/components/research/ClarificationFlowLayout'
import {
  buildClarificationNavModel,
  clarifyNavBlockMessage,
  findSessionAnswer,
  formatAnswerPreview,
} from '@/lib/clarifyNav'

export type ClarifyStagedProgressStep = {
  headline: string
  subtext: string
}

const MAX_ROUNDS = 3

const DEFAULT_STAGED_PROGRESS: readonly ClarifyStagedProgressStep[] = [
  { headline: 'Scanning your input…', subtext: 'Pulling out what matters.' },
  { headline: 'Sharpening the angle…', subtext: 'Refining your research angle.' },
  { headline: 'Locking it in…', subtext: 'Almost got your brief ready.' },
]

/** Keeps question fields readable instead of stretching across the full content column. */
const CLARIFY_FIELD_MAX_WIDTH = 'w-full max-w-xl'

export type ClarifyInvokeFn = (
  accessToken: string,
  body: {
    query: string
    country: string
    round: number
    previous_answers: ClarifyAnswer[]
    detected_persona?: Persona | null
  },
) => Promise<ClarifyResearchPromptResponse>

export interface ClarificationWizardProps {
  userId: string
  originalQuery: string
  country: string
  initialRound: number
  initialQuestions: ClarifyQuestion[]
  resumeDraftId?: string | null
  onComplete: (
    refinedPrompt: string,
    session: ClarifyRound[],
    draftId?: string | null,
    summary?: string,
    saturation?: SaturationData | null,
  ) => void
  onCancel: () => void
  researchCreditCost: number
  invokeClarify?: ClarifyInvokeFn
  contextLabel?: string
  reviewingTitle?: string
  reviewingSubtitle?: string
  stagedProgress?: readonly ClarifyStagedProgressStep[]
  persistDrafts?: boolean
  readyTitle?: string
  refinedPromptLabel?: string
  runButtonLabel?: string
  runButtonLoadingLabel?: string
  canAffordCredits?: (balance: number, cost: number) => boolean
  initialPreviousAnswers?: ClarifyAnswer[]
  initialReady?: { refined_prompt: string; summary: string; saturation?: SaturationData | null } | null
  initialDetectedPersona?: Persona | null
  onDetectedPersonaChange?: (persona: Persona | null) => void
  onPersistClarifyState?: (state: ClarifyStatePersisted) => Promise<void>
}

type WizardPhase = 'clarifying' | 'ready'

type SaveDraftPayload = {
  draftId: string | null
  originalQuery: string
  country: string
  currentRound: number
  session: ClarifyRound[]
  pendingQuestions: ClarifyQuestion[] | null
  refinedPrompt?: string | null
  summary?: string | null
  status: ClarificationDraftStatus
}

function ClarifyPanel({
  children,
  footer,
  constrainWidth = false,
}: {
  children: ReactNode
  footer?: ReactNode
  constrainWidth?: boolean
}) {
  return (
    <div className={cn('min-w-0 space-y-5', constrainWidth && CLARIFY_FIELD_MAX_WIDTH)}>
      {children}
      {footer ? (
        <div className={cn(discoverHeroItchButtonRowClassName, 'justify-start')}>{footer}</div>
      ) : null}
    </div>
  )
}

function sessionToPreviousAnswers(session: ClarifyRound[]): ClarifyAnswer[] {
  return session.flatMap((r) => r.answers)
}

function answerValueForQuestion(
  question: ClarifyQuestion,
  draft: Record<string, string | string[] | boolean>,
): string | string[] | undefined {
  const raw = draft[question.id]
  if (question.type === 'checkbox') {
    if (raw === true || raw === 'yes') return 'yes'
    if (raw === false || raw === 'no') return 'no'
    return undefined
  }
  if (question.type === 'multi_select') {
    return Array.isArray(raw) && raw.length > 0 ? raw : undefined
  }
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

function isQuestionAnswered(
  question: ClarifyQuestion,
  draft: Record<string, string | string[] | boolean>,
): boolean {
  if (!question.required) return true
  return answerValueForQuestion(question, draft) !== undefined
}

export function ClarificationReviewingState({
  title = 'Reviewing your prompt',
  subtitle = 'Checking whether we need a few quick questions before research starts.',
}: {
  query?: string
  contextLabel?: string
  title?: string
  subtitle?: string
}) {
  return (
    <ClarifyPanel>
      <div className="flex min-h-[168px] flex-col items-center justify-center gap-4 py-2 text-center">
        <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/10" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </ClarifyPanel>
  )
}

function RefinedPromptCard({
  refinedPrompt,
  summary,
  onRun,
  readyTitle = 'Ready to research',
  refinedPromptLabel = "This is what we'll research",
  runButtonLabel,
  runButtonLoadingLabel = 'Starting research…',
}: {
  refinedPrompt: string
  summary: string
  onRun: () => void
  readyTitle?: string
  refinedPromptLabel?: string
  runButtonLabel?: string
  runButtonLoadingLabel?: string
}) {
  const [running, setRunning] = useState(false)
  const isByokActive = useByok()
  const defaultRunLabel = isByokActive
    ? `Run Research → ${BYOK_SUBMIT_HINT}`
    : 'Run Research'
  const resolvedRunLabel = runButtonLabel ?? defaultRunLabel

  const handleRun = () => {
    if (running || !refinedPrompt.trim()) return
    setRunning(true)
    onRun()
  }

  return (
    <ClarifyPanel
      constrainWidth
      footer={
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={cn(
            discoverHeroButtonPrimaryClassName,
          )}
          onClick={handleRun}
          disabled={running || !refinedPrompt.trim()}
          aria-disabled={running || !refinedPrompt.trim() ? true : undefined}
        >
          {running ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              {runButtonLoadingLabel}
            </>
          ) : (
            resolvedRunLabel
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-success">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/10">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">{readyTitle}</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            {refinedPromptLabel}
          </p>
          <p className="text-sm font-medium leading-relaxed text-foreground">{refinedPrompt}</p>
          {summary ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summary}</p> : null}
        </div>
      </div>
    </ClarifyPanel>
  )
}

function ClarifyRadioOption({
  id,
  value,
  label,
}: {
  id: string
  value: string
  label: string
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      id={id}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200',
        'border-border-subtle bg-bg-surface/80 hover:border-primary/25 hover:bg-primary/[0.04]',
        'data-[state=checked]:border-primary/35 data-[state=checked]:bg-primary/[0.07] data-[state=checked]:shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/70 transition-all duration-200',
          'group-data-[state=checked]:border-primary group-data-[state=checked]:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]',
        )}
        aria-hidden
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-primary" />
        </RadioGroupPrimitive.Indicator>
      </span>
      <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
    </RadioGroupPrimitive.Item>
  )
}

function QuizOptionRow({
  id,
  label,
  control,
  selected = false,
}: {
  id: string
  label: string
  control: ReactNode
  selected?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200',
        selected
          ? 'border-primary/35 bg-primary/[0.07] shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]'
          : 'border-border-subtle bg-bg-surface/80 hover:border-primary/25 hover:bg-primary/[0.04]',
      )}
    >
      <span className="mt-0.5 shrink-0">{control}</span>
      <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
    </label>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: ClarifyQuestion
  value: string | string[] | boolean | undefined
  onChange: (next: string | string[] | boolean) => void
}) {
  if (question.type === 'text') {
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer"
        className="h-11 rounded-xl border-border-subtle bg-background text-sm"
        wrapperClassName={CLARIFY_FIELD_MAX_WIDTH}
        autoFocus
      />
    )
  }

  if (question.type === 'checkbox') {
    const selected = value === 'yes' || value === true ? 'yes' : value === 'no' || value === false ? 'no' : ''
    return (
      <RadioGroup
        value={selected}
        onValueChange={onChange}
        className={cn('flex flex-col gap-2.5', CLARIFY_FIELD_MAX_WIDTH)}
      >
        {(['yes', 'no'] as const).map((opt) => (
          <ClarifyRadioOption
            key={opt}
            id={`${question.id}-${opt}`}
            value={opt}
            label={opt === 'yes' ? 'Yes' : 'No'}
          />
        ))}
      </RadioGroup>
    )
  }

  const options = question.options ?? []

  if (question.type === 'single_select') {
    const selected = typeof value === 'string' ? value : ''
    return (
      <RadioGroup
        value={selected}
        onValueChange={onChange}
        className={cn('flex flex-col gap-2.5', CLARIFY_FIELD_MAX_WIDTH)}
      >
        {options.map((opt) => (
          <ClarifyRadioOption
            key={opt}
            id={`${question.id}-${opt}`}
            value={opt}
            label={opt}
          />
        ))}
      </RadioGroup>
    )
  }

  const selected = Array.isArray(value) ? value : []
  return (
    <div className={cn('flex flex-col gap-2.5', CLARIFY_FIELD_MAX_WIDTH)}>
      {options.map((opt) => {
        const checked = selected.includes(opt)
        const optionId = `${question.id}-${opt}`
        return (
          <QuizOptionRow
            key={opt}
            id={optionId}
            label={opt}
            selected={checked}
            control={
              <Checkbox
                id={optionId}
                checked={checked}
                onCheckedChange={(next) => {
                  if (next === true) onChange([...selected, opt])
                  else onChange(selected.filter((v) => v !== opt))
                }}
              />
            }
          />
        )
      })}
    </div>
  )
}

function DraftSaveIndicator({
  isSavingDraft,
  showSaved,
}: {
  isSavingDraft: boolean
  showSaved: boolean
}) {
  if (!isSavingDraft && !showSaved) return null

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border-subtle/70 bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm transition-opacity duration-500',
        showSaved && !isSavingDraft ? 'opacity-100' : 'opacity-80',
      )}
      aria-live="polite"
    >
      {isSavingDraft ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Saving draft…
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-primary" aria-hidden />
          Draft saved
        </>
      )}
    </div>
  )
}

function ResumeBanner({ onStartFresh }: { onStartFresh: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/[0.05] px-3.5 py-2.5 text-xs">
      <span className="flex items-center gap-2 text-foreground/90">
        <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden />
        Continuing where you left off
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-semibold text-primary hover:text-primary/80"
        onClick={onStartFresh}
      >
        Start fresh
      </Button>
    </div>
  )
}

function ClarificationQuestionReview({
  roundIndex,
  questionIndex,
  session,
}: {
  roundIndex: number
  questionIndex: number
  session: ClarifyRound[]
  onBackToCurrent: () => void
}) {
  const data = findSessionAnswer(session, roundIndex, questionIndex)
  if (!data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
        Answer not found for this question.
      </div>
    )
  }

  const { question, answer } = data
  const answerText = formatAnswerPreview(answer)

  return (
    <div className={cn('space-y-4', CLARIFY_FIELD_MAX_WIDTH)}>
      <p className="text-[15px] font-semibold leading-snug text-foreground">{question.text}</p>
      <div className="rounded-lg border border-border-subtle bg-muted/20 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your answer
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{answerText}</p>
      </div>
    </div>
  )
}

export function ClarificationWizard({
  userId,
  originalQuery,
  country,
  initialRound,
  initialQuestions,
  resumeDraftId = null,
  onComplete,
  onCancel,
  invokeClarify = invokeClarifyResearchPrompt,
  contextLabel = 'Research clarification ~ takes 2-3 minutes',
  reviewingTitle,
  reviewingSubtitle,
  stagedProgress = DEFAULT_STAGED_PROGRESS,
  persistDrafts = true,
  readyTitle,
  refinedPromptLabel,
  runButtonLabel,
  runButtonLoadingLabel,
  initialPreviousAnswers = [],
  initialReady = null,
  initialDetectedPersona = null,
  onDetectedPersonaChange,
  onPersistClarifyState,
}: ClarificationWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>(
    initialReady?.refined_prompt ? 'ready' : 'clarifying',
  )
  const [round, setRound] = useState(initialRound)
  const [questions, setQuestions] = useState<ClarifyQuestion[]>(initialQuestions)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [session, setSession] = useState<ClarifyRound[]>([])
  const [previousAnswers, setPreviousAnswers] = useState<ClarifyAnswer[]>(initialPreviousAnswers)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string | string[] | boolean>>({})
  const [refinedPrompt, setRefinedPrompt] = useState(initialReady?.refined_prompt ?? '')
  const [summary, setSummary] = useState(initialReady?.summary ?? '')
  const [saturation, setSaturation] = useState<SaturationData | null>(initialReady?.saturation ?? null)
  const [detectedPersona, setDetectedPersona] = useState<Persona | null>(initialDetectedPersona)
  const detectedPersonaRef = useRef<Persona | null>(initialDetectedPersona)
  const [loading, setLoading] = useState(false)
  const [progressStage, setProgressStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [draftHydrating, setDraftHydrating] = useState(persistDrafts)
  const [reviewTarget, setReviewTarget] = useState<{
    round: number
    questionIndex: number
  } | null>(null)
  const [navHint, setNavHint] = useState<string | null>(null)

  const draftIdRef = useRef<string | null>(resumeDraftId)
  const sessionRef = useRef<ClarifyRound[]>([])
  const initialSaveDoneRef = useRef(false)
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQuestion = questions[questionIndex]
  const isLastQuestion = questionIndex >= questions.length - 1
  const canAdvance = currentQuestion
    ? isQuestionAnswered(currentQuestion, draftAnswers)
    : false

  const stagedProgressStep =
    stagedProgress[Math.min(progressStage, stagedProgress.length - 1)] ??
    DEFAULT_STAGED_PROGRESS[0]

  useEffect(() => {
    if (!loading) {
      setProgressStage(0)
      return
    }

    const t1 = setTimeout(() => setProgressStage(1), 3000)
    const t2 = setTimeout(() => setProgressStage(2), 8000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [loading])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (resumeDraftId) draftIdRef.current = resumeDraftId
  }, [resumeDraftId])

  useEffect(() => {
    return () => {
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current)
    }
  }, [])

  const saveDraftToDB = useCallback(
    async (payload: SaveDraftPayload): Promise<string | null> => {
      if (!persistDrafts) return null
      try {
        const { data, error: rpcError } = await supabase.rpc('save_clarification_draft', {
          p_user_id: userId,
          p_original_query: payload.originalQuery,
          p_country: payload.country,
          p_current_round: payload.currentRound,
          p_session: payload.session,
          p_pending_questions: payload.pendingQuestions,
          p_refined_prompt: payload.refinedPrompt ?? null,
          p_summary: payload.summary ?? null,
          p_status: payload.status,
          p_draft_id: payload.draftId ?? draftIdRef.current,
        })

        if (rpcError) {
          console.warn('[clarify] draft save failed:', rpcError.message)
          return draftIdRef.current
        }

        const savedId =
          typeof data === 'string'
            ? data
            : payload.draftId ?? draftIdRef.current

        if (savedId) draftIdRef.current = savedId
        return savedId
      } catch (e) {
        console.warn('[clarify] draft save exception:', e)
        return draftIdRef.current
      }
    },
    [persistDrafts, userId],
  )

  const saveDraftInBackground = useCallback(
    async (payload: SaveDraftPayload) => {
      if (!persistDrafts) return
      setIsSavingDraft(true)
      setShowSaved(false)
      if (savedFadeTimerRef.current) {
        clearTimeout(savedFadeTimerRef.current)
        savedFadeTimerRef.current = null
      }

      const savedId = await saveDraftToDB(payload)
      if (savedId) {
        setShowSaved(true)
        savedFadeTimerRef.current = setTimeout(() => {
          setShowSaved(false)
          savedFadeTimerRef.current = null
        }, 2000)
      }
      setIsSavingDraft(false)
    },
    [persistDrafts, saveDraftToDB],
  )

  const applyDraftFromRow = useCallback((draft: ClarificationDraft, showBanner: boolean) => {
    draftIdRef.current = draft.id
    initialSaveDoneRef.current = true
    const restoredSession = draft.session ?? []
    sessionRef.current = restoredSession
    setRound(draft.current_round)
    setSession(restoredSession)
    setPreviousAnswers(sessionToPreviousAnswers(restoredSession))
    setQuestions(draft.pending_questions ?? [])
    setDraftAnswers({})
    setQuestionIndex(0)
    if (showBanner) setShowResumeBanner(true)

    if (draft.status === 'ready' && draft.refined_prompt) {
      setRefinedPrompt(draft.refined_prompt)
      setSummary(draft.summary ?? '')
      setPhase('ready')
    } else {
      setPhase('clarifying')
    }
  }, [])

  useEffect(() => {
    if (!persistDrafts) return
    let cancelled = false

    async function hydrateDraft() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_active_clarification_draft', {
          p_user_id: userId,
        })
        if (rpcError) throw rpcError
        if (cancelled) return

        const draft = (Array.isArray(data) ? data[0] : data) as ClarificationDraft | null
        if (!draft) return

        const queryMatches =
          draft.original_query.trim().toLowerCase() === originalQuery.trim().toLowerCase()
        const pinResume = resumeDraftId != null && draft.id === resumeDraftId

        if (!queryMatches && !pinResume) return

        applyDraftFromRow(draft, !pinResume)
      } catch (e) {
        console.warn('[clarify] draft hydrate failed:', e)
      } finally {
        if (!cancelled) setDraftHydrating(false)
      }
    }

    void hydrateDraft()
    return () => {
      cancelled = true
    }
  }, [persistDrafts, userId, originalQuery, resumeDraftId, applyDraftFromRow])

  useEffect(() => {
    if (!persistDrafts) return
    if (draftHydrating) return
    if (initialSaveDoneRef.current) return
    if (phase !== 'clarifying' || questions.length === 0) return

    initialSaveDoneRef.current = true
    void saveDraftInBackground({
      draftId: draftIdRef.current,
      originalQuery,
      country,
      currentRound: round,
      session: sessionRef.current,
      pendingQuestions: questions,
      status: 'in_progress',
    })
  }, [
    country,
    draftHydrating,
    originalQuery,
    phase,
    questions,
    round,
    persistDrafts,
    saveDraftInBackground,
  ])

  useEffect(() => {
    setQuestionIndex(0)
  }, [questions, round])

  const dismissResumeBanner = useCallback(() => {
    setShowResumeBanner(false)
  }, [])

  const resetToFreshState = useCallback(() => {
    draftIdRef.current = null
    initialSaveDoneRef.current = false
    sessionRef.current = []
    setShowResumeBanner(false)
    setPhase('clarifying')
    setRound(initialRound)
    setQuestions(initialQuestions)
    setSession([])
    setPreviousAnswers([])
    setDraftAnswers({})
    setQuestionIndex(0)
    setRefinedPrompt('')
    setSummary('')
    setSaturation(null)
    setError(null)
    setReviewTarget(null)
  }, [initialQuestions, initialRound])

  const handleStartFresh = useCallback(() => {
    if (persistDrafts) {
      const id = draftIdRef.current
      if (id) {
        void supabase.rpc('abandon_clarification_draft', {
          p_draft_id: id,
          p_user_id: userId,
        })
      }
    }
    resetToFreshState()
  }, [persistDrafts, resetToFreshState, userId])

  const handleAnswerChange = useCallback(
    (questionId: string, next: string | string[] | boolean) => {
      setDraftAnswers((prev) => ({ ...prev, [questionId]: next }))
      setNavHint(null)
      if (showResumeBanner) dismissResumeBanner()
    },
    [dismissResumeBanner, showResumeBanner],
  )

  const handleClarifyResponse = useCallback(
    async (result: ClarifyResearchPromptResponse, nextSession: ClarifyRound[]) => {
      const nextPrevious = sessionToPreviousAnswers(nextSession)
      const roadmapPersona = (result as { detected_persona?: Persona | null }).detected_persona

      if (roadmapPersona) {
        detectedPersonaRef.current = roadmapPersona
        setDetectedPersona(roadmapPersona)
        onDetectedPersonaChange?.(roadmapPersona)
      }

      if (result.status === 'ready') {
        await saveDraftToDB({
          draftId: draftIdRef.current,
          originalQuery,
          country,
          currentRound: result.round,
          session: nextSession,
          pendingQuestions: null,
          refinedPrompt: result.refined_prompt,
          summary: result.summary,
          status: 'ready',
        })

        if (onPersistClarifyState) {
          await onPersistClarifyState(
            clarifyStateFromReady(
              result.round,
              nextPrevious,
              result.refined_prompt,
              result.summary,
              result.saturation ?? null,
            ),
          )
        }

        setSession(nextSession)
        sessionRef.current = nextSession
        setRefinedPrompt(result.refined_prompt)
        setSummary(result.summary)
        setSaturation(result.saturation ?? null)
        setPhase('ready')
        return
      }

      if (round + 1 >= MAX_ROUNDS) {
        throw new Error('Maximum clarification rounds reached. Try refining your prompt.')
      }

      if (onPersistClarifyState) {
        await onPersistClarifyState(
          clarifyStateFromNeedsMore(result.round, nextPrevious, result.questions),
        )
      }

      setRound(result.round)
      setQuestions(result.questions)
      setDraftAnswers({})
      setQuestionIndex(0)
      setReviewTarget(null)

      void saveDraftInBackground({
        draftId: draftIdRef.current,
        originalQuery,
        country,
        currentRound: result.round,
        session: nextSession,
        pendingQuestions: result.questions,
        status: 'in_progress',
      })
    },
    [
      country,
      onDetectedPersonaChange,
      onPersistClarifyState,
      originalQuery,
      round,
      saveDraftInBackground,
      saveDraftToDB,
    ],
  )

  const submitAnswers = useCallback(async () => {
    if (!canAdvance || !currentQuestion) return

    setLoading(true)
    setError(null)

    const roundAnswers: ClarifyAnswer[] = questions.map((q) => ({
      question_id: q.id,
      question_text: q.text,
      answer: answerValueForQuestion(q, draftAnswers)!,
    }))

    const nextPrevious = [...previousAnswers, ...roundAnswers]
    const nextSession: ClarifyRound[] = [
      ...sessionRef.current,
      { round, questions, answers: roundAnswers },
    ]
    sessionRef.current = nextSession
    setSession(nextSession)
    setPreviousAnswers(nextPrevious)

    try {
      await saveDraftToDB({
        draftId: draftIdRef.current,
        originalQuery,
        country,
        currentRound: round,
        session: nextSession,
        pendingQuestions: questions,
        status: 'in_progress',
      })

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()
      if (!authSession) throw new Error('Please sign in to continue.')

      const result = await invokeClarify(authSession.access_token, {
        query: originalQuery,
        country: countryNameForPrompt(country),
        round: round + 1,
        previous_answers: nextPrevious,
        detected_persona: detectedPersonaRef.current,
      })

      await handleClarifyResponse(result, nextSession)
    } catch (err) {
      setError(formatByokAwareError(err instanceof Error ? err.message : 'Something went wrong.'))
    } finally {
      setLoading(false)
    }
  }, [
    canAdvance,
    country,
    currentQuestion,
    draftAnswers,
    handleClarifyResponse,
    originalQuery,
    previousAnswers,
    questions,
    round,
    invokeClarify,
    saveDraftToDB,
  ])

  const goNext = useCallback(() => {
    if (!canAdvance || loading) return
    setNavHint(null)
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1)
      return
    }
    void submitAnswers()
  }, [canAdvance, isLastQuestion, loading, submitAnswers])

  const goBack = useCallback(() => {
    if (loading) return
    if (reviewTarget) {
      setReviewTarget(null)
      return
    }
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1)
      return
    }
    onCancel()
  }, [loading, onCancel, questionIndex, reviewTarget])

  const navModel = useMemo(() => {
    const effectivePhase =
      persistDrafts && draftHydrating ? ('welcome' as const) : phase
    return buildClarificationNavModel({
      phase: effectivePhase,
      originalQuery,
      session,
      round,
      questions,
      questionIndex,
      draftAnswers,
      summary,
      hydrating: persistDrafts && draftHydrating,
      reviewTarget,
      loading,
    })
  }, [
    persistDrafts,
    draftHydrating,
    phase,
    originalQuery,
    session,
    round,
    questions,
    questionIndex,
    draftAnswers,
    summary,
    reviewTarget,
    loading,
  ])

  const handleSelectNavItem = useCallback(
    (id: string) => {
      if (id === 'summary') {
        if (phase !== 'ready') {
          setNavHint('Please complete clarification first.')
        }
        return
      }
      const match = /^round-(\d+)-q-(\d+)$/.exec(id)
      if (!match) return
      const roundIndex = Number(match[1])
      const qIndex = Number(match[2])
      if (!Number.isFinite(roundIndex) || !Number.isFinite(qIndex)) return

      if (phase === 'clarifying' && roundIndex === round) {
        const answered =
          qIndex < questionIndex ||
          isQuestionAnswered(questions[qIndex]!, draftAnswers)
        if (!answered && qIndex > questionIndex) {
          const blockingQuestion = questions[questionIndex]
          setNavHint(
            clarifyNavBlockMessage(round, questionIndex, blockingQuestion?.text),
          )
          return
        }
        setNavHint(null)
        setReviewTarget(null)
        setQuestionIndex(qIndex)
        return
      }

      if (findSessionAnswer(session, roundIndex, qIndex)) {
        setNavHint(null)
        setReviewTarget({ round: roundIndex, questionIndex: qIndex })
        return
      }

      if (phase === 'clarifying' && roundIndex > round) {
        const blockingQuestion = questions[questionIndex]
        setNavHint(
          clarifyNavBlockMessage(round, questionIndex, blockingQuestion?.text),
        )
      }
    },
    [phase, round, questionIndex, questions, draftAnswers, session],
  )

  const wrapWithLayout = useCallback(
    (content: ReactNode) => (
      <ClarificationFlowLayout navModel={navModel} onSelectNavItem={handleSelectNavItem}>
        {content}
      </ClarificationFlowLayout>
    ),
    [navModel, handleSelectNavItem],
  )

  if (persistDrafts && draftHydrating) {
    return wrapWithLayout(
      <ClarifyPanel>
        <div className="flex min-h-[168px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Loading your session…
        </div>
      </ClarifyPanel>,
    )
  }

  if (phase === 'ready') {
    return wrapWithLayout(
      <div className="relative">
        {showResumeBanner ? <ResumeBanner onStartFresh={handleStartFresh} /> : null}
        <RefinedPromptCard
          refinedPrompt={refinedPrompt}
          summary={summary}
          readyTitle={readyTitle}
          refinedPromptLabel={refinedPromptLabel}
          runButtonLabel={runButtonLabel}
          runButtonLoadingLabel={runButtonLoadingLabel}
          onRun={() =>
            onComplete(refinedPrompt.trim(), session, draftIdRef.current, summary, saturation)
          }
        />
        {persistDrafts ? (
          <DraftSaveIndicator isSavingDraft={isSavingDraft} showSaved={showSaved} />
        ) : null}
      </div>,
    )
  }

  if (!currentQuestion && !reviewTarget) {
    return wrapWithLayout(
      <ClarifyPanel>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load clarification questions. Edit your prompt and try again.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(discoverHeroButtonOutlineBlueClassName, 'self-start')}
            onClick={onCancel}
          >
            Edit prompt
          </Button>
        </div>
      </ClarifyPanel>,
    )
  }

  const inReviewMode = reviewTarget != null

  return wrapWithLayout(
    <div className="relative">
      {showResumeBanner ? <ResumeBanner onStartFresh={handleStartFresh} /> : null}

      <ClarifyPanel
        constrainWidth
        footer={
          inReviewMode ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={discoverHeroButtonOutlineBlueClassName}
              onClick={() => {
                setNavHint(null)
                setReviewTarget(null)
              }}
            >
              Back to current question
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={discoverHeroButtonOutlineBlueClassName}
                onClick={goBack}
                disabled={loading}
              >
                {questionIndex === 0 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={discoverHeroButtonPrimaryClassName}
                onClick={goNext}
                disabled={!canAdvance || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                    Thinking…
                  </>
                ) : isLastQuestion ? (
                  'Submit answers'
                ) : (
                  'Next question'
                )}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-5">
          {detectedPersona ? (
            <PersonaBadge persona={detectedPersona} className="w-fit" />
          ) : null}

          {navHint ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-foreground" role="status">
              {navHint}
            </p>
          ) : null}

          {loading ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium text-foreground">{stagedProgressStep.headline}</p>
              <p className="text-xs text-muted-foreground">{stagedProgressStep.subtext}</p>
            </div>
          ) : inReviewMode && reviewTarget ? (
            <ClarificationQuestionReview
              roundIndex={reviewTarget.round}
              questionIndex={reviewTarget.questionIndex}
              session={session}
              onBackToCurrent={() => setReviewTarget(null)}
            />
          ) : currentQuestion ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${round}-${currentQuestion.id}-${questionIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={cn('space-y-4', CLARIFY_FIELD_MAX_WIDTH)}
              >
                <p className="text-[15px] font-semibold leading-snug text-foreground">
                  {currentQuestion.text}
                  {currentQuestion.required ? (
                    <span className="ml-0.5 text-primary" aria-hidden>
                      *
                    </span>
                  ) : null}
                </p>
                <QuestionField
                  question={currentQuestion}
                  value={draftAnswers[currentQuestion.id]}
                  onChange={(next) => handleAnswerChange(currentQuestion.id, next)}
                />
              </motion.div>
            </AnimatePresence>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
              {error}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 h-auto p-0 font-semibold underline"
                onClick={() => void submitAnswers()}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </ClarifyPanel>

      {persistDrafts ? (
        <DraftSaveIndicator isSavingDraft={isSavingDraft} showSaved={showSaved} />
      ) : null}
    </div>,
  )
}

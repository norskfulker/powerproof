import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/sonner'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import { resolveActiveProjectId, useActiveWorkspace } from '@/hooks/useActiveWorkspace'
import { supabase } from '@/lib/supabase'
import { invokeClarifyResearchPrompt } from '@/lib/clarifyResearchPrompt'
import { BYOK_SUCCESS_DETAIL, formatByokAwareError } from '@/lib/byok'
import { dispatchBackgroundJobsRefetch } from '@/lib/backgroundJobEvents'
import { invokeCancelResearch } from '@/lib/researchCancel'
import {
  streamResearchOpportunity,
  type ResearchVisibility,
} from '@/lib/researchOpportunityStream'
import { RESEARCH_STREAM_EXPECTED_CHARS } from '@/lib/researchStreamProgress'
import { countryNameForPrompt } from '@/lib/countries'
import { RESEARCH_CLARIFY_ROUTE, roomPathForMode } from '@/lib/discoverHeroRoutes'
import { isClarifyInvalidInputError } from '@/lib/clarifyInvalidInput'
import type { ResearchStyle } from '@/lib/researchStyles'
import type { ClarifyQuestion, ClarifyRound, SaturationData } from '@/types/research'

function researchDetailPath(slug: string): string {
  return `/my-research/${encodeURIComponent(slug)}`
}

export type ResearchFlowStep =
  | 'input'
  | 'wizard'
  | 'warning'
  | 'researching'
  | 'done'

export type ResearchFlowError = {
  message: string
  detail?: string
  creditsRefunded?: boolean
}

export type ResearchRunOpts = {
  badge?: string
  badge_label?: string
  project_id?: string
  research_style?: ResearchStyle
  model?: string
  visibility?: ResearchVisibility
  /** Debug / onboarding demo — skip credit affordability and deduction. */
  skipCredits?: boolean
}

export function useResearchOpportunity() {
  const navigate = useNavigate()
  const { activeProject } = useActiveWorkspace()
  const { selectedModel } = usePreferredAiModel()
  const [step, setStep] = useState<ResearchFlowStep>('input')
  const [error, setError] = useState<ResearchFlowError | null>(null)
  const [pendingResearchId, setPendingResearchId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [wizardRound, setWizardRound] = useState(0)
  const [wizardQuestions, setWizardQuestions] = useState<ClarifyQuestion[]>([])
  const [wizardLoading, setWizardLoading] = useState(false)
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null)
  const [researchStartedAt, setResearchStartedAt] = useState<string | null>(null)
  const [activeQuery, setActiveQuery] = useState<string | null>(null)
  const [activeResearchStyle, setActiveResearchStyle] = useState<ResearchStyle>('standard')
  const [pendingSaturationWarning, setPendingSaturationWarning] = useState<SaturationData | null>(null)
  const [clarifyQuery, setClarifyQuery] = useState('')
  const [clarifyCountry, setClarifyCountry] = useState('India')
  const [inputError, setInputError] = useState<string | null>(null)
  const [streamProgressChars, setStreamProgressChars] = useState<number | null>(null)

  const userCancelledRef = useRef(false)
  const researchAbortRef = useRef<AbortController | null>(null)
  const pendingRunOptsRef = useRef<ResearchRunOpts | undefined>(undefined)
  const pendingCountryRef = useRef('India')
  const pendingClarificationDraftIdRef = useRef<string | null>(null)
  const pendingReadyPayloadRef = useRef<{ refinedPrompt: string; session: ClarifyRound[]; saturation: SaturationData | null } | null>(null)

  const clearResearchSession = useCallback(() => {
    researchAbortRef.current?.abort()
    researchAbortRef.current = null
    setPendingResearchId(null)
    setIsCancelling(false)
    setResearchStartedAt(null)
    setActiveQuery(null)
    setActiveResearchStyle('standard')
    setPendingSaturationWarning(null)
    pendingReadyPayloadRef.current = null
    setStreamProgressChars(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearInputError = useCallback(() => {
    setInputError(null)
  }, [])

  const resetResearch = useCallback(() => {
    userCancelledRef.current = false
    clearResearchSession()
    setStep('input')
    setError(null)
    setInputError(null)
    setWizardRound(0)
    setWizardQuestions([])
    setWizardLoading(false)
    setResumeDraftId(null)
    pendingRunOptsRef.current = undefined
    pendingCountryRef.current = 'India'
    setClarifyQuery('')
    setClarifyCountry('India')
  }, [clearResearchSession])

  const attachPendingResearch = useCallback(
    (
      opportunityId: string,
      startedAt?: string | null,
      query?: string | null,
      slug?: string | null,
    ) => {
      userCancelledRef.current = false
      researchAbortRef.current?.abort()
      researchAbortRef.current = null

      if (slug?.trim()) {
        navigate(researchDetailPath(slug.trim()), { replace: true })
        return
      }

      setPendingResearchId(opportunityId)
      setActiveQuery(query?.trim() || null)
      setResearchStartedAt(startedAt ?? new Date().toISOString())
      setError(null)
      setStep('researching')
    },
    [navigate],
  )

  const cancelResearch = useCallback(async () => {
    if (!pendingResearchId || isCancelling) return

    setIsCancelling(true)
    userCancelledRef.current = true
    researchAbortRef.current?.abort()

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please sign in to cancel research.')
        return
      }

      const result = await invokeCancelResearch(pendingResearchId, session.access_token)
      if (result.success) {
        clearResearchSession()
        researchAbortRef.current?.abort()
        setStep('input')
        toast('Research cancelled')
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate(roomPathForMode('research'))
        }
        return
      }

      if (result.code === 'not_cancellable') {
        toast.error('Research already finished — refresh to see your report.')
      } else {
        toast.error(result.error ?? 'Could not cancel research')
      }
      userCancelledRef.current = false
    } finally {
      setIsCancelling(false)
    }
  }, [clearResearchSession, isCancelling, navigate, pendingResearchId])

  const runResearch = useCallback(
    async (
      query: string,
      country: string,
      skipWeakCheck = false,
      opts?: ResearchRunOpts,
      clarificationSession?: ClarifyRound[],
      saturation?: SaturationData | null,
    ) => {
      const trimmed = query.trim()
      if (!trimmed) return

      const projectId = resolveActiveProjectId(opts?.project_id ?? activeProject?.id ?? null)
      if (!projectId) {
        setError({
          message: 'Select a workspace in the project picker before running research.',
        })
        setStep('input')
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
      if (!supabaseUrl) {
        setError({ message: 'Missing VITE_SUPABASE_URL.' })
        return
      }

      userCancelledRef.current = false
      clearResearchSession()
      setError(null)
      setStep('researching')
      setResearchStartedAt(new Date().toISOString())
      setActiveQuery(trimmed)
      setActiveResearchStyle(opts?.research_style ?? 'standard')
      setStreamProgressChars(0)

      const abortController = new AbortController()
      researchAbortRef.current = abortController

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError({ message: 'Please sign in to research ideas.' })
          setStep('input')
          clearResearchSession()
          return
        }

        dispatchBackgroundJobsRefetch()

        const result = await streamResearchOpportunity(
          supabaseUrl,
          session.access_token,
          {
            query: trimmed,
            country,
            currency: 'USD',
            project_id: projectId,
            badge: opts?.badge ?? '',
            badge_label: opts?.badge_label ?? '',
            research_style: opts?.research_style ?? 'standard',
            model: opts?.model ?? selectedModel,
            skip_weak_check: skipWeakCheck,
            onboarding_demo: opts?.skipCredits === true,
            clarification_session: clarificationSession?.length ? clarificationSession : undefined,
            saturation_data: saturation ?? undefined,
            ...(opts?.visibility ? { visibility: opts.visibility } : {}),
          },
          {
            onStarted: (data) => {
              setPendingResearchId(data.id)
            },
            onProgress: (data) => {
              setStreamProgressChars(data.chars)
            },
          },
          abortController.signal,
        )

        if (userCancelledRef.current || result.outcome === 'aborted') {
          setStep('input')
          clearResearchSession()
          return
        }

        if (result.outcome === 'error') {
          setError({
            message: formatByokAwareError(result.data.message),
            detail: result.data.detail,
            creditsRefunded: result.data.refunded === true,
          })
          setStep('input')
          clearResearchSession()
          return
        }

        const data = result.data
        const researchSlug = data.slug?.trim()
        if (!researchSlug) {
          setError({ message: 'Research completed but slug was missing.' })
          setStep('input')
          clearResearchSession()
          return
        }

        setStreamProgressChars((chars) => chars ?? RESEARCH_STREAM_EXPECTED_CHARS)

        if (data.visibility === 'catalog') {
          toast.success('Research complete', {
            description: 'Published to the public catalog.',
          })
        } else if (data.byok_used === true) {
          toast.success('Research complete', { description: BYOK_SUCCESS_DETAIL })
        }
        const draftId = pendingClarificationDraftIdRef.current
        pendingClarificationDraftIdRef.current = null
        if (draftId) {
          void supabase.rpc('complete_clarification_draft', {
            p_draft_id: draftId,
            p_user_id: session.user.id,
          })
        }

        navigate(researchDetailPath(researchSlug), { replace: true })
        clearResearchSession()
        setStep('input')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          if (!userCancelledRef.current) {
            setError({
              message: formatByokAwareError('Research was interrupted.'),
              creditsRefunded: false,
            })
            setStep('input')
          } else {
            setStep('input')
          }
          clearResearchSession()
          return
        }

        setError({
          message: formatByokAwareError('Network error. Please try again.'),
          detail: 'fetch',
          creditsRefunded: false,
        })
        setStep('input')
        clearResearchSession()
      } finally {
        researchAbortRef.current = null
      }
    },
    [activeProject?.id, clearResearchSession, navigate, selectedModel],
  )

  const proceedWithReadyPrompt = useCallback(
    (
      refinedPrompt: string,
      country: string,
      opts: ResearchRunOpts | undefined,
      session: ClarifyRound[],
      saturation: SaturationData | null,
    ) => {
      if (saturation?.show_warning) {
        pendingReadyPayloadRef.current = { refinedPrompt, session, saturation }
        setPendingSaturationWarning(saturation)
        setStep('warning')
        return
      }
      void runResearch(refinedPrompt, country, true, opts, session, saturation)
    },
    [runResearch],
  )

  const beginResearch = useCallback(
    async (query: string, country: string, opts?: ResearchRunOpts) => {
      const trimmed = query.trim()
      if (!trimmed) return

      const projectId = resolveActiveProjectId(opts?.project_id ?? activeProject?.id ?? null)
      if (!projectId) {
        setError({
          message: 'Select a workspace in the project picker before running research.',
        })
        setStep('input')
        return
      }

      pendingRunOptsRef.current = opts
      pendingCountryRef.current = countryNameForPrompt(country)
      setActiveResearchStyle(opts?.research_style ?? 'standard')
      setClarifyCountry(pendingCountryRef.current)
      setClarifyQuery(trimmed)
      setError(null)
      setInputError(null)
      setWizardLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError({ message: 'Please sign in to research ideas.' })
          setStep('input')
          return
        }

        const result = await invokeClarifyResearchPrompt(session.access_token, {
          query: trimmed,
          country,
          round: 0,
          previous_answers: [],
        })

        setInputError(null)

        if (result.status === 'ready') {
          proceedWithReadyPrompt(
            result.refined_prompt,
            country,
            opts,
            [],
            result.saturation ?? null,
          )
          return
        }

        setWizardRound(result.round)
        setWizardQuestions(result.questions)
        setStep('wizard')
        navigate(RESEARCH_CLARIFY_ROUTE)
      } catch (err) {
        if (isClarifyInvalidInputError(err)) {
          setInputError(err.message)
          setStep('input')
          return
        }
        setError({
          message: formatByokAwareError(
            err instanceof Error ? err.message : 'Could not start clarification.',
          ),
        })
        setStep('input')
      } finally {
        setWizardLoading(false)
      }
    },
    [activeProject?.id, navigate, proceedWithReadyPrompt],
  )

  const completeWizard = useCallback(
    (
      refinedPrompt: string,
      session: ClarifyRound[],
      draftId?: string | null,
      _summary?: string,
      saturation?: SaturationData | null,
    ) => {
      pendingClarificationDraftIdRef.current = draftId ?? null
      proceedWithReadyPrompt(
        refinedPrompt,
        pendingCountryRef.current,
        pendingRunOptsRef.current,
        session,
        saturation ?? null,
      )
    },
    [proceedWithReadyPrompt],
  )

  const proceedAfterSaturationWarning = useCallback(() => {
    const payload = pendingReadyPayloadRef.current
    if (!payload) {
      setStep('input')
      return
    }
    setPendingSaturationWarning(null)
    pendingReadyPayloadRef.current = null
    void runResearch(
      payload.refinedPrompt,
      pendingCountryRef.current,
      true,
      pendingRunOptsRef.current,
      payload.session,
      payload.saturation,
    )
  }, [runResearch])

  const cancelAfterSaturationWarning = useCallback(() => {
    pendingReadyPayloadRef.current = null
    setPendingSaturationWarning(null)
    setStep('input')
  }, [])

  const resumeClarificationDraft = useCallback(
    (draft: {
      id: string
      original_query: string
      country: string
      current_round: number
      pending_questions: ClarifyQuestion[] | null
    }) => {
      userCancelledRef.current = false
      clearResearchSession()
      setError(null)
      pendingCountryRef.current = countryNameForPrompt(draft.country)
      setClarifyCountry(pendingCountryRef.current)
      setClarifyQuery(draft.original_query.trim())
      setResumeDraftId(draft.id)
      setWizardRound(draft.current_round)
      setWizardQuestions(draft.pending_questions ?? [])
      setWizardLoading(false)
      setStep('wizard')
      navigate(RESEARCH_CLARIFY_ROUTE)
    },
    [clearResearchSession, navigate],
  )

  return {
    step,
    error,
    inputError,
    clearError,
    clearInputError,
    resetResearch,
    beginResearch,
    completeWizard,
    resumeClarificationDraft,
    runResearch,
    wizardRound,
    wizardQuestions,
    wizardLoading,
    pendingSaturationWarning,
    proceedAfterSaturationWarning,
    cancelAfterSaturationWarning,
    resumeDraftId,
    clarifyQuery,
    clarifyCountry,
    pendingResearchId,
    researchStartedAt,
    activeQuery,
    activeResearchStyle,
    isCancelling,
    cancelResearch,
    attachPendingResearch,
    streamProgressChars,
    isBusy: step === 'researching' || step === 'done' || wizardLoading,
  }
}

import { useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import { supabase } from '@/lib/supabase'
import type {
  BriefingResult,
  InferredContext,
  PlaybookQuestionsResponse,
  UserPlaybook,
  WarRoomExtractedContext,
} from '@/lib/playbookTypes'
import { fetchPlaybookQuestionsStream } from '@/lib/playbookQuestionsStream'
import { byok, formatByokAwareError } from '@/lib/byok'
import { formatPlanGateMessage } from '@/lib/planGate'
import { fetchGeneratePlaybookStream } from '@/lib/generatePlaybookStream'
import { userPlaybookFromGenerateDone } from '@/lib/normalizePlaybookSteps'
import {
  assertWarRoomEntryCredits,
  staticWarRoomCosts,
  deductWarRoomScoutCredits,
  playbookCreditsForModel,
  type WarRoomCreditCosts,
} from '@/lib/warRoomCredits'
import { dispatchBackgroundJobsRefetch } from '@/lib/backgroundJobEvents'
import {
  clearWarRoomIntakeDraft,
  isWarRoomBriefingReady,
  loadWarRoomIntakeDraft,
  saveWarRoomIntakeDraft,
  type WarRoomIntakeDraft,
} from '@/lib/warRoomDraft'
import {
  WAR_ROOM_DEFAULT_COUNTRY,
  normalizeWarRoomCountry,
  type WarRoomCountry,
} from '@/lib/warRoomCountries'
import type { AIModelId } from '@/lib/aiModels'
import { resolveAiModelId } from '@/lib/aiModels'
import { invokeClarifyWarRoomPrompt } from '@/lib/clarifyWarRoomPrompt'
import { isClarifyInvalidInputError } from '@/lib/clarifyInvalidInput'
import type { ClarifyQuestion } from '@/types/research'
import {
  clarifyStateFromNeedsMore,
  clarifyStateFromReady,
  parseClarifyState,
} from '@/types/clarifyState'
import type { ClarifyStatePersisted } from '@/types/clarifyState'
import {
  createWarRoomClarifyPlaybook,
  discardWarRoomClarifyPlaybook,
  saveWarRoomClarifyState,
} from '@/lib/warRoomClarifyPersistence'
import { hasRecentPendingPlaybook } from '@/lib/warRoomGenerateGuard'
import { countryNameForPrompt } from '@/lib/countries'
import { WAR_ROOM_CLARIFY_ROUTE, playbookDetailPath } from '@/lib/discoverHeroRoutes'

export type ExtractedContext = WarRoomExtractedContext

export type WarRoomPhase = 'idle' | 'scouting' | 'briefing' | 'generating' | 'done' | 'error'

export type WarRoomClarifyStep = 'none' | 'loading' | 'wizard'

function applyBriefingResponse(json: PlaybookQuestionsResponse) {
  return {
    briefing: json.briefing,
    inferredContext: json.inferred_context,
    extractedContext: json.extracted_context,
    country: json.country?.trim() || WAR_ROOM_DEFAULT_COUNTRY,
    model: resolveAiModelId(json.model),
  }
}

export function useWarRoom(userId: string | null | undefined) {
  const navigate = useNavigate()
  const { selectedModel } = usePreferredAiModel()
  const [phase, setPhase] = useState<WarRoomPhase>('idle')
  const [briefing, setBriefing] = useState<BriefingResult | null>(null)
  const [inferredContext, setInferredContext] = useState<InferredContext | null>(null)
  const [country, setCountryState] = useState<WarRoomCountry>(WAR_ROOM_DEFAULT_COUNTRY)
  const promptCountryRef = useRef<string>(WAR_ROOM_DEFAULT_COUNTRY)
  const setCountry = useCallback((_next: string) => {
    promptCountryRef.current = WAR_ROOM_DEFAULT_COUNTRY
    setCountryState(WAR_ROOM_DEFAULT_COUNTRY)
  }, [])
  const [scoutModel, setScoutModel] = useState<AIModelId>(selectedModel)
  const [extractedContext, setExtractedContext] = useState<ExtractedContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [lastBusinessDescription, setLastBusinessDescription] = useState('')
  const [streamStatus, setStreamStatus] = useState('')
  const [streamText, setStreamText] = useState('')
  const [streamPhase, setStreamPhase] = useState<string | null>(null)
  const [lastPingAt, setLastPingAt] = useState<number | null>(null)
  const [generatedPlaybook, setGeneratedPlaybook] = useState<UserPlaybook | null>(null)
  const [scoutCreditsSpent, setScoutCreditsSpent] = useState(0)
  const [clarifyStep, setClarifyStep] = useState<WarRoomClarifyStep>('none')
  const [wizardRound, setWizardRound] = useState(0)
  const [wizardQuestions, setWizardQuestions] = useState<ClarifyQuestion[]>([])
  const [wizardLoading, setWizardLoading] = useState(false)
  const [clarifySummary, setClarifySummary] = useState('')
  const [wizardPreviousAnswers, setWizardPreviousAnswers] = useState<
    import('@/types/research').ClarifyAnswer[]
  >([])
  const [clarifyReadyResume, setClarifyReadyResume] = useState<{
    refined_prompt: string
    summary: string
  } | null>(null)
  const [clarifyQuery, setClarifyQuery] = useState('')
  const [clarifyCountry, setClarifyCountry] = useState(WAR_ROOM_DEFAULT_COUNTRY)
  const clarifyPlaybookIdRef = useRef<string | null>(null)
  const clarifyOriginalQueryRef = useRef('')
  const refinedBusinessDescriptionRef = useRef('')
  const briefedForDeployRef = useRef(false)
  const generateInFlightRef = useRef(false)
  const streamTextByPhase = useRef<Record<string, string>>({})
  const flowModelRef = useRef<AIModelId | null>(null)

  const activeModel = useCallback(
    () => flowModelRef.current ?? selectedModel,
    [selectedModel],
  )

  const creditCosts: WarRoomCreditCosts = useMemo(() => staticWarRoomCosts(), [])

  const deployCreditsRequired = useMemo(
    () => playbookCreditsForModel(creditCosts, selectedModel),
    [creditCosts, selectedModel],
  )

  const setEmptyDescriptionError = useCallback(() => {
    setError('Describe your business to generate a War Room Playbook.')
    setPhase('error')
  }, [])

  const clearInputError = useCallback(() => {
    setInputError(null)
  }, [])

  const attachPendingPlaybook = useCallback(() => {
    setPhase('generating')
    setError(null)
    setStreamStatus('Building your War Room playbook…')
    setStreamText('')
    setStreamPhase('generating')
  }, [])

  const resetClarify = useCallback(() => {
    setClarifyStep('none')
    setWizardRound(0)
    setWizardQuestions([])
    setWizardLoading(false)
    setClarifySummary('')
    setWizardPreviousAnswers([])
    setClarifyReadyResume(null)
    setInputError(null)
    clarifyPlaybookIdRef.current = null
    clarifyOriginalQueryRef.current = ''
  }, [])

  const persistClarifyState = useCallback(
    async (state: ClarifyStatePersisted) => {
      if (!userId) return
      const query = clarifyOriginalQueryRef.current.trim()
      if (!query) return

      let id = clarifyPlaybookIdRef.current
      if (!id) {
        id = await createWarRoomClarifyPlaybook(
          userId,
          query,
          promptCountryRef.current,
          activeModel(),
          state,
        )
        clarifyPlaybookIdRef.current = id
      } else {
        await saveWarRoomClarifyState(id, state)
      }
    },
    [activeModel, userId],
  )

  const reset = useCallback(() => {
    flowModelRef.current = null
    setPhase('idle')
    setBriefing(null)
    setInferredContext(null)
    setCountryState(WAR_ROOM_DEFAULT_COUNTRY)
    promptCountryRef.current = WAR_ROOM_DEFAULT_COUNTRY
    setScoutModel(selectedModel)
    setExtractedContext(null)
    setError(null)
    setElapsed(0)
    setLastBusinessDescription('')
    setStreamStatus('')
    setStreamText('')
    setStreamPhase(null)
    setLastPingAt(null)
    setGeneratedPlaybook(null)
    setScoutCreditsSpent(0)
    resetClarify()
    streamTextByPhase.current = {}
    refinedBusinessDescriptionRef.current = ''
    briefedForDeployRef.current = false
    generateInFlightRef.current = false
  }, [resetClarify, selectedModel])

  const applyDraft = useCallback(
    (draft: WarRoomIntakeDraft) => {
      setLastBusinessDescription(draft.business_description)
      setCountryState(normalizeWarRoomCountry(draft.country || WAR_ROOM_DEFAULT_COUNTRY))
      promptCountryRef.current =
        countryNameForPrompt(draft.country) || promptCountryRef.current
      if (draft.model) setScoutModel(resolveAiModelId(draft.model))
      setExtractedContext(draft.extracted_context ?? null)
      setScoutCreditsSpent(draft.scout_credits_deducted ? creditCosts.scout : 0)

      if (isWarRoomBriefingReady(draft)) {
        setBriefing(draft.briefing)
        setInferredContext(draft.inferred_context)
        setPhase('briefing')
        return { hasBriefing: true as const, description: draft.business_description }
      }
      setBriefing(null)
      setInferredContext(null)
      setPhase('idle')
      return { hasBriefing: false as const, description: draft.business_description }
    },
    [creditCosts.scout],
  )

  /** Resume from saved intake draft — only call when the user explicitly continues from history. */
  const resumeFromIntakeDraft = useCallback(async (): Promise<{
    restored: boolean
    description?: string
    resumeBriefing?: boolean
  }> => {
    if (!userId) return { restored: false }
    const draft = await loadWarRoomIntakeDraft(userId)
    if (!draft?.business_description?.trim()) {
      return { restored: false }
    }
    const result = applyDraft(draft)
    return {
      restored: true,
      description: result.description,
      resumeBriefing: result.hasBriefing,
    }
  }, [userId, applyDraft])

  const loadBriefing = useCallback(
    async (businessDescription: string, options?: { summary?: string }) => {
      const desc = businessDescription.trim()
      const summary = options?.summary?.trim() ?? ''
      refinedBusinessDescriptionRef.current = desc
      briefedForDeployRef.current = false
      setLastBusinessDescription(desc)
      setClarifyStep('none')
      setWizardLoading(false)
      setPhase('scouting')
      setBriefing(null)
      setInferredContext(null)
      setScoutCreditsSpent(0)
      setError(null)
      setClarifySummary(summary)
      setStreamStatus(
        summary
          ? `Understood. Entering the War Room for: ${summary}`
          : 'Connecting to War Room intelligence…',
      )
      setStreamText('')
      setStreamPhase(null)
      setLastPingAt(null)
      streamTextByPhase.current = {}

      if (!userId) {
        setError('Sign in to use War Room.')
        setPhase('error')
        return
      }

      if (!desc) {
        setEmptyDescriptionError()
        return
      }

      const costs = staticWarRoomCosts()
      if (!byok.isActive()) {
        const entryCheck = await assertWarRoomEntryCredits(userId, costs.minEntry)
        if (!entryCheck.ok) {
          setError(entryCheck.message)
          setPhase('error')
          return
        }
      }

      const model = activeModel()
      setScoutModel(model)

      await saveWarRoomIntakeDraft(userId, {
        version: 3,
        business_description: desc,
        country: promptCountryRef.current,
        model,
        briefing: null,
        inferred_context: null,
      })

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error('Not logged in')

        const baseUrl = import.meta.env.VITE_SUPABASE_URL as string

        const applyDone = async (json: PlaybookQuestionsResponse) => {
          const applied = applyBriefingResponse(json)

          if (!byok.isActive()) {
            const deduct = await deductWarRoomScoutCredits(userId, costs.scout, desc)
            if (!deduct.success) {
              throw new Error(
                deduct.error ?? 'Intel is ready but scout credits could not be deducted. Check your balance.',
              )
            }
            setScoutCreditsSpent(costs.scout)
          } else {
            setScoutCreditsSpent(0)
          }

          setBriefing(applied.briefing)
          setInferredContext(applied.inferredContext)
          setExtractedContext(applied.extractedContext)
          setCountryState(normalizeWarRoomCountry(applied.country))
          setScoutModel(applied.model)
          setPhase('briefing')
          briefedForDeployRef.current = true

          const clarifyingPlaybookId = clarifyPlaybookIdRef.current
          if (clarifyingPlaybookId) {
            clarifyPlaybookIdRef.current = null
            void discardWarRoomClarifyPlaybook(clarifyingPlaybookId).catch((err) => {
              console.warn('[warRoom] discard clarify placeholder failed:', err)
            })
          }

          void saveWarRoomIntakeDraft(userId, {
            version: 3,
            business_description: desc,
            country: applied.country,
            model: applied.model,
            briefing: applied.briefing,
            inferred_context: applied.inferredContext,
            extracted_context: applied.extractedContext,
            scout_credits_deducted: !byok.isActive(),
          })
        }

        const handleStreamError = (msg: string, code?: string) => {
          if (code === 'gemini_unavailable' || msg.includes('503') || msg.includes('AI is busy')) {
            throw new Error('AI is busy right now. Please wait a moment and try again.')
          }
          if (code === 'playbook_json_parse_failed' || msg.includes('Could not parse')) {
            throw new Error('Could not read battlefield briefing. Please try again.')
          }
          if (code === 'no_context' || code === 'no_input') {
            throw new Error(msg)
          }
          throw new Error(formatByokAwareError(msg))
        }

        let donePayload: PlaybookQuestionsResponse | null = null
        await fetchPlaybookQuestionsStream(
          baseUrl,
          session.access_token,
          {
            business_description: desc,
            country: promptCountryRef.current,
            model,
            stream: true,
          },
          {
            onEvent: (ev) => {
              if (ev.type === 'ping') {
                setLastPingAt(ev.ts)
                return
              }
              if (ev.type === 'status') {
                setStreamStatus(ev.message)
                if (ev.phase) setStreamPhase(ev.phase)
                return
              }
              if (ev.type === 'delta') {
                const p = ev.phase ?? 'default'
                const next = (streamTextByPhase.current[p] ?? '') + ev.text
                streamTextByPhase.current[p] = next
                setStreamPhase(p)
                setStreamText(next)
                return
              }
              if (ev.type === 'error') {
                handleStreamError(ev.message, ev.code)
              }
              if (ev.type === 'done') {
                if (ev.mode !== 'briefing' || !ev.briefing || !ev.inferred_context) {
                  handleStreamError('Unexpected scout response. Please try again.', 'briefing_invalid')
                  return
                }
                donePayload = {
                  mode: 'briefing',
                  briefing: ev.briefing,
                  country: ev.country,
                  model: ev.model,
                  inferred_context: ev.inferred_context,
                  extracted_context: ev.extracted_context,
                }
              }
            },
          },
        )
        if (!donePayload) throw new Error('Stream ended without briefing')
        await applyDone(donePayload)
      } catch (e) {
        setError(formatByokAwareError(e instanceof Error ? e.message : String(e)))
        setPhase('error')
      }
    },
    [selectedModel, userId, setEmptyDescriptionError],
  )

  const beginBriefing = useCallback(
    async (businessDescription: string, selectedCountry?: string, modelOverride?: AIModelId) => {
      flowModelRef.current = modelOverride ?? null
      const desc = businessDescription.trim()
      if (!desc) {
        setEmptyDescriptionError()
        return
      }

      if (!userId) {
        setError('Sign in to use War Room.')
        setPhase('error')
        return
      }

      if (
        wizardLoading ||
        clarifyStep === 'loading' ||
        phase === 'scouting' ||
        phase === 'generating' ||
        generateInFlightRef.current
      ) {
        return
      }

      // Hide stale briefing/deploy UI while clarify + scout run for a new prompt.
      setBriefing(null)
      setInferredContext(null)
      setExtractedContext(null)
      setGeneratedPlaybook(null)
      setPhase('idle')
      briefedForDeployRef.current = false
      refinedBusinessDescriptionRef.current = ''

      const costs = staticWarRoomCosts()
      if (!byok.isActive()) {
        const entryCheck = await assertWarRoomEntryCredits(userId, costs.minEntry)
        if (!entryCheck.ok) {
          setError(entryCheck.message)
          setPhase('error')
          return
        }
      }

      setError(null)
      setInputError(null)
      setWizardLoading(true)
      clarifyOriginalQueryRef.current = desc
      setClarifyQuery(desc)
      clarifyPlaybookIdRef.current = null
      setWizardPreviousAnswers([])
      setClarifyReadyResume(null)

      const promptCountry = countryNameForPrompt(selectedCountry ?? promptCountryRef.current)
      if (promptCountry) {
        promptCountryRef.current = promptCountry
        setClarifyCountry(promptCountry)
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error('Sign in to use War Room.')

        const result = await invokeClarifyWarRoomPrompt(session.access_token, {
          query: desc,
          country: promptCountryRef.current,
          round: 0,
          previous_answers: [],
        })

        setInputError(null)

        if (result.status === 'ready') {
          if (clarifyPlaybookIdRef.current) {
            await saveWarRoomClarifyState(
              clarifyPlaybookIdRef.current,
              clarifyStateFromReady(0, [], result.refined_prompt, result.summary),
            )
          }
          void loadBriefing(result.refined_prompt, { summary: result.summary })
          return
        }

        const state = clarifyStateFromNeedsMore(result.round, [], result.questions)
        const playbookId = await createWarRoomClarifyPlaybook(
          userId,
          desc,
          promptCountryRef.current,
          activeModel(),
          state,
        )
        clarifyPlaybookIdRef.current = playbookId
        setWizardRound(result.round)
        setWizardQuestions(result.questions)
        setWizardPreviousAnswers([])
        setClarifyStep('wizard')
        navigate(WAR_ROOM_CLARIFY_ROUTE)
      } catch (e) {
        if (isClarifyInvalidInputError(e)) {
          setInputError(e.message)
          setPhase('idle')
          setClarifyStep('none')
          return
        }
        setError(formatByokAwareError(e instanceof Error ? e.message : String(e)))
        setPhase('error')
        setClarifyStep('none')
      } finally {
        setWizardLoading(false)
      }
    },
    [activeModel, clarifyStep, loadBriefing, navigate, phase, setEmptyDescriptionError, userId, wizardLoading],
  )

  const resumeClarifySession = useCallback(
    (playbook: UserPlaybook) => {
      const state = playbook.clarify_state ?? parseClarifyState(playbook.clarify_state)
      if (!state) return

      const description = playbook.business_description?.trim() || playbook.business_name?.trim()
      if (!description) return

      clarifyPlaybookIdRef.current = playbook.id
      clarifyOriginalQueryRef.current = description
      setClarifyQuery(description)
      if (playbook.country) {
        const resolved = countryNameForPrompt(playbook.country)
        setCountryState(normalizeWarRoomCountry(playbook.country))
        promptCountryRef.current = resolved || promptCountryRef.current
        setClarifyCountry(promptCountryRef.current)
      }
      setBriefing(null)
      setInferredContext(null)
      briefedForDeployRef.current = false
      refinedBusinessDescriptionRef.current = ''
      setLastBusinessDescription(description)
      setError(null)
      setPhase('idle')
      setWizardPreviousAnswers(state.previous_answers)
      setWizardRound(state.round)
      setWizardLoading(false)

      if (state.status === 'ready' && state.refined_prompt) {
        setClarifyReadyResume({
          refined_prompt: state.refined_prompt,
          summary: state.summary ?? '',
        })
        setWizardQuestions([])
        setClarifyStep('wizard')
        navigate(WAR_ROOM_CLARIFY_ROUTE)
        return
      }

      if (!state.questions.length) return

      setClarifyReadyResume(null)
      setWizardQuestions(state.questions)
      setClarifyStep('wizard')
      navigate(WAR_ROOM_CLARIFY_ROUTE)
    },
    [navigate],
  )

  const completeWizard = useCallback(
    (refinedPrompt: string, _session: unknown, _draftId?: string | null, summary?: string) => {
      void loadBriefing(refinedPrompt, { summary: summary ?? '' })
    },
    [loadBriefing],
  )

  const cancelClarify = useCallback(() => {
    resetClarify()
    setError(null)
    setPhase('idle')
  }, [resetClarify])

  const deploy = useCallback(async (): Promise<{ playbookId: string; playbook: UserPlaybook } | null> => {
    if (phase !== 'briefing' || !briefing || !inferredContext || !briefedForDeployRef.current) {
      setError('Review the battlefield briefing before generating your playbook.')
      return null
    }

    if (clarifyStep !== 'none' || wizardLoading) {
      return null
    }

    if (generateInFlightRef.current) {
      return null
    }

    const businessDescription = refinedBusinessDescriptionRef.current.trim() || lastBusinessDescription.trim()
    if (!businessDescription) {
      setError('Missing clarified business description. Scout the market again.')
      setPhase('error')
      return null
    }

    if (userId) {
      const alreadyGenerating = await hasRecentPendingPlaybook(userId)
      if (alreadyGenerating) {
        setError('A playbook is already generating. Wait for it to finish before starting another.')
        setPhase('generating')
        dispatchBackgroundJobsRefetch()
        return null
      }
    }

    generateInFlightRef.current = true
    setPhase('generating')
    setError(null)
    setElapsed(0)
    setGeneratedPlaybook(null)
    if (userId) void clearWarRoomIntakeDraft(userId)
    dispatchBackgroundJobsRefetch()
    setStreamStatus('Connecting to playbook generator…')
    setStreamText('')
    setStreamPhase(null)
    setLastPingAt(null)
    streamTextByPhase.current = {}
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const model = activeModel()
      const body: Record<string, unknown> = {
        business_description: businessDescription,
        country: promptCountryRef.current,
        model,
        inferred_context: inferredContext,
        extracted_context: extractedContext,
        user_opportunity_id: null,
        stream: true,
      }

      const handleGenerateError = (msg: string, code?: string) => {
        if (code === 'gemini_unavailable' || msg.includes('503') || msg.includes('AI is busy')) {
          throw new Error('AI is busy right now. Please wait a moment and try again.')
        }
        if (code === 'insufficient_credits' || msg.includes('Not enough credits')) {
          throw new Error(formatPlanGateMessage(new Error('insufficient_credits')))
        }
        throw new Error(formatByokAwareError(msg))
      }

      let playbookId: string | null = null
      let donePlaybook: UserPlaybook | null = null
      let navigatedToDetail = false
      await fetchGeneratePlaybookStream(baseUrl, session.access_token, body, {
        onEvent: (ev) => {
          if (ev.type === 'ping') {
            setLastPingAt(ev.ts)
            return
          }
          if (ev.type === 'status') {
            setStreamStatus(ev.message)
            if (ev.phase) setStreamPhase(ev.phase)
            const statusPlaybookId =
              typeof ev.playbook_id === 'string' && ev.playbook_id.trim()
                ? ev.playbook_id.trim()
                : null
            if (statusPlaybookId) {
              playbookId = statusPlaybookId
              if (!navigatedToDetail) {
                navigatedToDetail = true
                navigate(playbookDetailPath(statusPlaybookId), { replace: true })
              }
            }
            return
          }
          if (ev.type === 'delta') {
            const p = ev.phase ?? 'generate'
            const next = (streamTextByPhase.current[p] ?? '') + ev.text
            streamTextByPhase.current[p] = next
            setStreamPhase(p)
            setStreamText(next)
            return
          }
          if (ev.type === 'error') {
            handleGenerateError(ev.message, ev.code)
          }
          if (ev.type === 'done') {
            playbookId = ev.id
            donePlaybook = userPlaybookFromGenerateDone(ev as Record<string, unknown>, {
              business_name: businessDescription || 'War Room Playbook',
              business_description: businessDescription || undefined,
              country,
              model_used: model,
            })
            setGeneratedPlaybook(donePlaybook)
          }
        },
      })

      if (!playbookId || !donePlaybook) throw new Error('Stream ended without playbook id')
      if (userId) void clearWarRoomIntakeDraft(userId)
      setPhase('done')
      return { playbookId, playbook: donePlaybook }
    } catch (e) {
      setError(formatByokAwareError(e instanceof Error ? e.message : String(e)))
      setPhase('error')
      return null
    } finally {
      generateInFlightRef.current = false
      clearInterval(timer)
    }
  }, [
    briefing,
    clarifyStep,
    extractedContext,
    inferredContext,
    lastBusinessDescription,
    country,
    phase,
    selectedModel,
    userId,
    wizardLoading,
    navigate,
  ])

  return {
    phase,
    briefing,
    inferredContext,
    country,
    setCountry,
    scoutModel,
    extractedContext,
    error,
    inputError,
    clearInputError,
    streamStatus,
    streamPhase,
    lastPingAt,
    creditCosts,
    deployCreditsRequired,
    scoutCreditsSpent,
    loadBriefing,
    beginBriefing,
    completeWizard,
    cancelClarify,
    clarifyStep,
    wizardRound,
    wizardQuestions,
    wizardLoading,
    clarifySummary,
    wizardPreviousAnswers,
    clarifyReadyResume,
    clarifyQuery,
    clarifyCountry,
    persistClarifyState,
    resumeClarifySession,
    deploy,
    generatedPlaybook,
    reset,
    attachPendingPlaybook,
    setEmptyDescriptionError,
    resumeFromIntakeDraft,
    lastBusinessDescription,
  }
}

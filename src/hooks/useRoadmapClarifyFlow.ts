import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { countryNameForPrompt } from '@/lib/countries'
import { invokeClarifyRoadmapPrompt } from '@/lib/clarifyRoadmapPrompt'
import { formatByokAwareError } from '@/lib/byok'
import { isClarifyInvalidInputError } from '@/lib/clarifyInvalidInput'
import { ROADMAP_CLARIFY_ROUTE } from '@/lib/discoverHeroRoutes'
import {
  createRoadmapClarifySession,
  saveRoadmapClarifyState,
} from '@/lib/roadmapClarifyPersistence'
import { roadmapCountryFromMetadata } from '@/lib/roadmapPreferences'
import type { ClarifyAnswer, ClarifyQuestion } from '@/types/research'
import {
  clarifyStateFromNeedsMore,
  clarifyStateFromReady,
  parseClarifyState,
} from '@/types/clarifyState'
import type { ClarifyStatePersisted } from '@/types/clarifyState'
import type { Persona } from '@/types/persona'
import type { UserRoadmap } from '@/pages/roadmap/roadmapTypes'

export type RoadmapClarifyStep = 'input' | 'wizard' | 'generating'

type Options = {
  userId?: string | null
  getModel: () => string
  onGenerate: (
    refinedPrompt: string,
    clarifyRoadmapId: string | null,
    persona: Persona | null,
    country: string,
  ) => Promise<void>
}

export function useRoadmapClarifyFlow({ userId, getModel, onGenerate }: Options) {
  const navigate = useNavigate()
  const [step, setStep] = useState<RoadmapClarifyStep>('input')
  const [wizardRound, setWizardRound] = useState(0)
  const [wizardQuestions, setWizardQuestions] = useState<ClarifyQuestion[]>([])
  const [wizardPreviousAnswers, setWizardPreviousAnswers] = useState<ClarifyAnswer[]>([])
  const [detectedPersona, setDetectedPersona] = useState<Persona | null>(null)
  const [clarifyReadyResume, setClarifyReadyResume] = useState<{
    refined_prompt: string
    summary: string
  } | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const [clarifySummary, setClarifySummary] = useState('')
  const [clarifyQuery, setClarifyQuery] = useState('')
  const [clarifyCountry, setClarifyCountry] = useState('India')
  const pendingCountryRef = useRef('India')
  const pendingQueryRef = useRef('')
  const clarifyRoadmapIdRef = useRef<string | null>(null)
  const detectedPersonaRef = useRef<Persona | null>(null)

  const applyDetectedPersona = useCallback((persona: Persona | null) => {
    if (!persona) return
    detectedPersonaRef.current = persona
    setDetectedPersona(persona)
  }, [])

  const reset = useCallback(() => {
    setStep('input')
    setWizardRound(0)
    setWizardQuestions([])
    setWizardPreviousAnswers([])
    setDetectedPersona(null)
    detectedPersonaRef.current = null
    setClarifyReadyResume(null)
    setWizardLoading(false)
    setError(null)
    setInputError(null)
    setClarifySummary('')
    pendingQueryRef.current = ''
    clarifyRoadmapIdRef.current = null
    setClarifyQuery('')
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearInputError = useCallback(() => {
    setInputError(null)
  }, [])

  const persistClarifyState = useCallback(
    async (state: ClarifyStatePersisted) => {
      if (!userId) return
      const query = pendingQueryRef.current.trim()
      if (!query) return

      let id = clarifyRoadmapIdRef.current
      if (!id) {
        id = await createRoadmapClarifySession(userId, query, pendingCountryRef.current, getModel(), state)
        clarifyRoadmapIdRef.current = id
      } else {
        await saveRoadmapClarifyState(id, state)
      }
    },
    [getModel, userId],
  )

  const runGenerate = useCallback(
    async (refinedPrompt: string, summary: string, persona: Persona | null) => {
      setClarifySummary(summary)
      setStep('generating')
      setError(null)
      const roadmapId = clarifyRoadmapIdRef.current
      try {
        await onGenerate(refinedPrompt, roadmapId, persona, pendingCountryRef.current)
        clarifyRoadmapIdRef.current = null
        detectedPersonaRef.current = null
        setStep('input')
        setClarifySummary('')
      } catch (err) {
        setError(
          formatByokAwareError(err instanceof Error ? err.message : 'Generation failed.'),
        )
        setStep('input')
        setClarifySummary('')
      }
    },
    [onGenerate],
  )

  const beginGeneration = useCallback(
    async (query: string, country: string) => {
      const trimmed = query.trim()
      if (trimmed.length < 10) return

      pendingCountryRef.current = countryNameForPrompt(country)
      setClarifyCountry(pendingCountryRef.current)
      pendingQueryRef.current = trimmed
      setClarifyQuery(trimmed)
      clarifyRoadmapIdRef.current = null
      detectedPersonaRef.current = null
      setDetectedPersona(null)
      setWizardPreviousAnswers([])
      setClarifyReadyResume(null)
      setError(null)
      setInputError(null)
      setWizardLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError('Please sign in to generate a roadmap.')
          setStep('input')
          return
        }

        if (!userId) {
          setError('Please sign in to generate a roadmap.')
          setStep('input')
          return
        }

        const result = await invokeClarifyRoadmapPrompt(session.access_token, {
          query: trimmed,
          country: pendingCountryRef.current,
          round: 0,
          previous_answers: [],
          detected_persona: null,
        })

        setInputError(null)

        if (result.detected_persona) {
          applyDetectedPersona(result.detected_persona)
        }

        if (result.status === 'ready') {
          await runGenerate(result.refined_prompt, result.summary, result.detected_persona)
          return
        }

        const state = clarifyStateFromNeedsMore(result.round, [], result.questions)
        const roadmapId = await createRoadmapClarifySession(
          userId,
          trimmed,
          pendingCountryRef.current,
          getModel(),
          state,
        )
        clarifyRoadmapIdRef.current = roadmapId
        setWizardRound(result.round)
        setWizardQuestions(result.questions)
        setStep('wizard')
        navigate(ROADMAP_CLARIFY_ROUTE)
      } catch (err) {
        if (isClarifyInvalidInputError(err)) {
          setInputError(err.message)
          setStep('input')
          return
        }
        setError(
          formatByokAwareError(
            err instanceof Error ? err.message : 'Could not start clarification.',
          ),
        )
        setStep('input')
      } finally {
        setWizardLoading(false)
      }
    },
    [applyDetectedPersona, getModel, navigate, runGenerate, userId],
  )

  const resumeClarifySession = useCallback((roadmap: UserRoadmap) => {
    const state = roadmap.clarify_state ?? parseClarifyState(roadmap.clarify_state)
    if (!state) return

    const query = roadmap.goal_input?.trim()
    if (!query) return

    pendingQueryRef.current = query
    setClarifyQuery(query)
    const resumeCountry = roadmapCountryFromMetadata(roadmap.metadata)
    pendingCountryRef.current = countryNameForPrompt(resumeCountry)
    setClarifyCountry(pendingCountryRef.current)
    clarifyRoadmapIdRef.current = roadmap.id
    setWizardPreviousAnswers(state.previous_answers)
    setWizardRound(state.round)
    setWizardLoading(false)
    setError(null)

    if (roadmap.persona) {
      applyDetectedPersona(roadmap.persona)
    } else {
      detectedPersonaRef.current = null
      setDetectedPersona(null)
    }

    if (state.status === 'ready' && state.refined_prompt) {
      setClarifyReadyResume({
        refined_prompt: state.refined_prompt,
        summary: state.summary ?? '',
      })
      setWizardQuestions([])
      setStep('wizard')
      navigate(ROADMAP_CLARIFY_ROUTE)
      return
    }

    if (!state.questions.length) return

    setClarifyReadyResume(null)
    setWizardQuestions(state.questions)
    setStep('wizard')
    navigate(ROADMAP_CLARIFY_ROUTE)
  }, [applyDetectedPersona, navigate])

  const completeWizard = useCallback(
    (refinedPrompt: string, _session: unknown, _draftId?: string | null, summary?: string) => {
      void runGenerate(refinedPrompt, summary ?? '', detectedPersonaRef.current)
    },
    [runGenerate],
  )

  return {
    step,
    wizardRound,
    wizardQuestions,
    wizardPreviousAnswers,
    detectedPersona,
    onDetectedPersonaChange: applyDetectedPersona,
    clarifyReadyResume,
    wizardLoading,
    error,
    inputError,
    clarifySummary,
    clarifyQuery,
    clarifyCountry,
    beginGeneration,
    completeWizard,
    resumeClarifySession,
    persistClarifyState,
    reset,
    clearError,
    clearInputError,
    isBusy: step !== 'input' || wizardLoading,
  }
}

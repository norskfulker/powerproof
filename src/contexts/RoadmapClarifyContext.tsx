import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import { useRoadmapClarifyFlow } from '@/hooks/useRoadmapClarifyFlow'
import { countryNameForPrompt } from '@/lib/countries'
import { roadmapModelKeyFromAiModelId } from '@/components/ModelSelector'
import { dispatchBackgroundJobsRefetch } from '@/lib/backgroundJobEvents'
import { roadmapDetailPath } from '@/lib/discoverHeroRoutes'
import { generateRoadmap } from '@/lib/roadmapApi'
import type { Persona } from '@/types/persona'

const RoadmapClarifyContext = createContext<ReturnType<typeof useRoadmapClarifyFlow> | null>(null)

export function RoadmapClarifyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { selectedModel } = usePreferredAiModel()
  const sessionModelKeyRef = useRef<string | null>(null)

  const resolveModelKey = useCallback(
    () => sessionModelKeyRef.current ?? roadmapModelKeyFromAiModelId(selectedModel),
    [selectedModel],
  )

  const handleGenerate = useCallback(
    async (
      refinedPrompt: string,
      clarifyRoadmapId: string | null,
      persona: Persona | null,
      country: string,
    ) => {
      const roadmapId = await generateRoadmap(refinedPrompt, {
        model: resolveModelKey(),
        country: countryNameForPrompt(country),
        roadmapId: clarifyRoadmapId ?? undefined,
        persona,
      })
      dispatchBackgroundJobsRefetch()
      navigate(roadmapDetailPath(roadmapId), { replace: true })
    },
    [navigate, resolveModelKey],
  )

  const flow = useRoadmapClarifyFlow({
    userId: user?.id,
    getModel: resolveModelKey,
    onGenerate: handleGenerate,
  })

  const value = useMemo(
    () => ({
      ...flow,
      beginGeneration: async (query: string, country: string, modelKey?: string) => {
        sessionModelKeyRef.current = modelKey ?? null
        return flow.beginGeneration(query, country)
      },
      reset: () => {
        sessionModelKeyRef.current = null
        flow.reset()
      },
    }),
    [flow],
  )

  return (
    <RoadmapClarifyContext.Provider value={value}>{children}</RoadmapClarifyContext.Provider>
  )
}

export function useRoadmapClarifyContext() {
  const ctx = useContext(RoadmapClarifyContext)
  if (!ctx) {
    throw new Error('useRoadmapClarifyContext must be used within RoadmapClarifyProvider')
  }
  return ctx
}

export function useRoadmapClarifyContextOptional() {
  return useContext(RoadmapClarifyContext)
}

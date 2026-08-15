import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  DEFAULT_AI_MODEL_ID,
  getAiCreditCost,
  getAiModelMeta,
  type AIModelId,
} from '@/lib/aiModels'

type PreferredAiModelContextValue = {
  selectedModel: AIModelId
  setSelectedModel: (id: AIModelId) => void
  selectedMeta: ReturnType<typeof getAiModelMeta>
  getCreditCost: (baseCost: number) => number
}

const PreferredAiModelContext = createContext<PreferredAiModelContextValue | undefined>(
  undefined,
)

const fallbackSetSelectedModel = (_id: AIModelId) => {}

function createFallbackPreferredAiModelValue(): PreferredAiModelContextValue {
  return {
    selectedModel: DEFAULT_AI_MODEL_ID,
    setSelectedModel: fallbackSetSelectedModel,
    selectedMeta: getAiModelMeta(DEFAULT_AI_MODEL_ID),
    getCreditCost: (baseCost: number) => getAiCreditCost(baseCost, DEFAULT_AI_MODEL_ID),
  }
}

export function PreferredAiModelProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PreferredAiModelContextValue>(
    () => ({
      selectedModel: DEFAULT_AI_MODEL_ID,
      setSelectedModel: fallbackSetSelectedModel,
      selectedMeta: getAiModelMeta(DEFAULT_AI_MODEL_ID),
      getCreditCost: (baseCost: number) => getAiCreditCost(baseCost, DEFAULT_AI_MODEL_ID),
    }),
    [],
  )

  return (
    <PreferredAiModelContext.Provider value={value}>{children}</PreferredAiModelContext.Provider>
  )
}

export function usePreferredAiModel(): PreferredAiModelContextValue {
  const ctx = useContext(PreferredAiModelContext)
  if (ctx) return ctx

  // In dev (especially with Fast Refresh) consumers can briefly mount against a different
  // module instance than the provider, leaving context undefined.
  const err = new Error('usePreferredAiModel must be used within PreferredAiModelProvider')
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(err)
  }

  return createFallbackPreferredAiModelValue()
}

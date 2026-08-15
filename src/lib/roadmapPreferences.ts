import { useCallback, useState } from 'react'

import type { ModelKey } from '@/components/ModelSelector'
import { DEFAULT_COUNTRY_NAME } from '@/lib/countries'

export const ROADMAP_MODEL_STORAGE_KEY = 'roadmap_model'

export const ROADMAP_COUNTRIES = [DEFAULT_COUNTRY_NAME] as const

const MODEL_KEYS = new Set<ModelKey>(['flash-lite', 'flash', 'pro'])

export function readRoadmapModel(): ModelKey {
  if (typeof window === 'undefined') return 'flash'
  const raw = window.localStorage.getItem(ROADMAP_MODEL_STORAGE_KEY)
  return raw && MODEL_KEYS.has(raw as ModelKey) ? (raw as ModelKey) : 'flash'
}

export function writeRoadmapModel(model: ModelKey): void {
  window.localStorage.setItem(ROADMAP_MODEL_STORAGE_KEY, model)
}

export function readRoadmapCountry(): string {
  return DEFAULT_COUNTRY_NAME
}

export function writeRoadmapCountry(_country: string): void {
  /* India-only market */
}

export function roadmapCountryFromMetadata(_metadata: Record<string, unknown> | undefined): string {
  return DEFAULT_COUNTRY_NAME
}

export function useRoadmapPreferences() {
  const [model, setModelState] = useState<ModelKey>(() => readRoadmapModel())

  const setModel = useCallback((next: ModelKey) => {
    setModelState(next)
    writeRoadmapModel(next)
  }, [])

  const setCountry = useCallback((_next: string) => {
    /* India-only market */
  }, [])

  return { model, country: DEFAULT_COUNTRY_NAME, setModel, setCountry }
}

import { useEffect, useRef, useState } from 'react'

import { ONBOARDING_GENERATE_CHUNKS } from '@/components/onboarding/OnboardingOpportunityGeneratingScreen'

export const ONBOARDING_REVEAL_INTERVAL_MS = 2000
export const ONBOARDING_REVEAL_QUERY = 'reveal'
export const ONBOARDING_REVEAL_STAGE_QUERY = 'stage'
export const ONBOARDING_REVEAL_STAGE_READY = 'ready'
/** Total fake-generate duration before the full detail page appears. */
export const ONBOARDING_GENERATE_DURATION_MS = 9000

export type OnboardingRevealPhase = 'idle' | 'generating' | 'ready'

/**
 * Progressively “generates” then unlocks the full opportunity for onboarding preview.
 * Shows a generating phase with cheap live status chunks, then hands over complete data.
 */
export function useOnboardingOpportunityTypewriterReveal(
  fullOpp: Record<string, unknown> | null | undefined,
  enabled: boolean,
): {
  phase: OnboardingRevealPhase
  revealedOpp: Record<string, unknown> | null
  progressPct: number
  activeChunkLabel: string | null
  recentChunks: string[]
  isRevealing: boolean
  revealComplete: boolean
} {
  const [phase, setPhase] = useState<OnboardingRevealPhase>('idle')
  const [progressPct, setProgressPct] = useState(0)
  const [activeChunkLabel, setActiveChunkLabel] = useState<string | null>(null)
  const [recentChunks, setRecentChunks] = useState<string[]>([])
  const [revealedOpp, setRevealedOpp] = useState<Record<string, unknown> | null>(null)
  const runIdRef = useRef(0)

  const fullKey = fullOpp ? String(fullOpp.id ?? fullOpp.slug ?? '') : ''

  useEffect(() => {
    if (!enabled || !fullKey || !fullOpp) {
      runIdRef.current += 1
      setPhase('idle')
      setProgressPct(0)
      setActiveChunkLabel(null)
      setRecentChunks([])
      setRevealedOpp(null)
      return
    }

    const runId = ++runIdRef.current
    const snapshot = fullOpp
    const startedAt = Date.now()
    const timers: number[] = []

    setPhase('generating')
    setProgressPct(4)
    setRevealedOpp(null)
    setRecentChunks([])
    setActiveChunkLabel(ONBOARDING_GENERATE_CHUNKS[0]?.label ?? 'Generating with AI…')

    const chunkStep = Math.max(
      700,
      Math.floor(ONBOARDING_GENERATE_DURATION_MS / Math.max(1, ONBOARDING_GENERATE_CHUNKS.length)),
    )

    ONBOARDING_GENERATE_CHUNKS.forEach((chunk, index) => {
      timers.push(
        window.setTimeout(() => {
          if (runId !== runIdRef.current) return
          setActiveChunkLabel(chunk.label)
          setRecentChunks((prev) => [...prev.slice(-4), chunk.label])
          const pct = Math.min(
            92,
            Math.round(((index + 1) / ONBOARDING_GENERATE_CHUNKS.length) * 88) + 4,
          )
          setProgressPct(pct)
        }, index * chunkStep),
      )
    })

    const progressTick = window.setInterval(() => {
      if (runId !== runIdRef.current) return
      const elapsed = Date.now() - startedAt
      const smooth = Math.min(94, Math.round((elapsed / ONBOARDING_GENERATE_DURATION_MS) * 94))
      setProgressPct((prev) => Math.max(prev, smooth))
    }, 200)
    timers.push(progressTick)

    timers.push(
      window.setTimeout(() => {
        if (runId !== runIdRef.current) return
        setProgressPct(100)
        setActiveChunkLabel('Ready — opening your opportunity…')
        setRecentChunks((prev) => [...prev.slice(-4), 'Ready — opening your opportunity…'])
        setRevealedOpp(snapshot)
        setPhase('ready')
      }, ONBOARDING_GENERATE_DURATION_MS),
    )

    return () => {
      runIdRef.current += 1
      for (const id of timers) {
        window.clearTimeout(id)
        window.clearInterval(id)
      }
    }
    // Restart only when opportunity identity / enabled changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fullKey])

  return {
    phase: enabled ? phase : 'idle',
    revealedOpp: enabled && phase === 'ready' ? revealedOpp : null,
    progressPct: enabled ? progressPct : 0,
    activeChunkLabel: enabled ? activeChunkLabel : null,
    recentChunks: enabled ? recentChunks : [],
    isRevealing: enabled && phase === 'generating',
    revealComplete: enabled ? phase === 'ready' : true,
  }
}

export function isOnboardingOpportunityRevealRequest(
  searchParams: URLSearchParams,
  locationState: unknown,
): boolean {
  if (searchParams.get(ONBOARDING_REVEAL_QUERY) === '1') return true
  if (
    locationState &&
    typeof locationState === 'object' &&
    (locationState as { onboardingReveal?: unknown }).onboardingReveal === true
  ) {
    return true
  }
  return false
}

/** True while onboarding preview is still on the generating screen (`stage` not ready). */
export function isOnboardingOpportunityGeneratingSearch(search: string): boolean {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    if (params.get(ONBOARDING_REVEAL_QUERY) !== '1') return false
    return params.get(ONBOARDING_REVEAL_STAGE_QUERY) !== ONBOARDING_REVEAL_STAGE_READY
  } catch {
    return false
  }
}

export function isOnboardingOpportunityPreviewSearch(search: string): boolean {
  try {
    return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(
      ONBOARDING_REVEAL_QUERY,
    ) === '1'
  } catch {
    return false
  }
}

export function isOnboardingOpportunityReadySearch(search: string): boolean {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    return (
      params.get(ONBOARDING_REVEAL_QUERY) === '1' &&
      params.get(ONBOARDING_REVEAL_STAGE_QUERY) === ONBOARDING_REVEAL_STAGE_READY
    )
  } catch {
    return false
  }
}

export function opportunityDetailPathWithOnboardingReveal(slug: string): string {
  return `/o/${encodeURIComponent(slug)}?${ONBOARDING_REVEAL_QUERY}=1`
}

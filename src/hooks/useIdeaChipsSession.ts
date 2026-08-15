import { useCallback, useRef, useState } from 'react'

import { toast } from '@/components/ui/sonner'
import { fetchIdeaChipsFromPool } from '@/lib/fetchIdeaChipsPool'
import {
  formatIdeaChipsErrorForDisplay,
  IDEA_CHIPS_GENERIC_ERROR,
  isIdeaChipsRateLimitError,
  parseIdeaChipsInvokeFailure,
  parseIdeaChipsResponseBody,
  type IdeaChipsErrorInfo,
} from '@/lib/ideaChipsErrors'
import { SUPABASE_ANON_KEY, supabase } from '@/lib/supabase'
import { IDEA_CHIPS_COUNT } from '@/lib/ideaChipsConfig'
import { capitalizeIdeaFirstLetter } from '@/lib/ideaText'

export type IdeaChipsContext = 'sourcing' | 'warroom' | 'research' | 'roadmap' | 'market_test'

const MAX_RETRIES = 2

const chipsCache = new Map<IdeaChipsContext, string[]>()
const suggestCountByContext = new Map<IdeaChipsContext, number>()

function notifyIdeaChipsCacheUpdated(context: IdeaChipsContext) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('powerproof:idea-chips-cache-updated', { detail: { context } }),
  )
}

function readCachedChips(context: IdeaChipsContext): string[] | null {
  const cached = chipsCache.get(context)
  return cached?.length ? cached : null
}

function writeCachedChips(context: IdeaChipsContext, chips: string[]) {
  chipsCache.set(context, chips)
  notifyIdeaChipsCacheUpdated(context)
}

/** Session cache read — no network. */
export function readIdeaChipsCache(context: IdeaChipsContext): string[] | null {
  return readCachedChips(context)
}

/** Session cache write — notifies `powerproof:idea-chips-cache-updated`. */
export function writeIdeaChipsCache(context: IdeaChipsContext, chips: string[]) {
  writeCachedChips(context, chips)
}

async function callGenerateIdeaChips(context: IdeaChipsContext): Promise<string[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (sessionError || !token) {
    throw { message: 'Sign in to load idea suggestions.' } satisfies IdeaChipsErrorInfo
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-idea-chips`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ context, mode: 'generate' }),
  })

  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  const apiError = parseIdeaChipsResponseBody(payload, res.status)
  if (!res.ok || apiError) {
    throw apiError ?? parseIdeaChipsInvokeFailure(null, payload)
  }

  const limit = IDEA_CHIPS_COUNT[context]
  const record = payload as { chips?: unknown } | null
  const newChips = Array.isArray(record?.chips)
    ? record.chips
        .map((chip) => capitalizeIdeaFirstLetter(String(chip).trim()))
        .filter(Boolean)
        .slice(0, limit)
    : []
  if (!newChips.length) throw { message: IDEA_CHIPS_GENERIC_ERROR } satisfies IdeaChipsErrorInfo
  return newChips
}

/** Idea chips — pool on first Suggest click per session; Gemini generate on later clicks. */
export function useIdeaChipsSession(context: IdeaChipsContext) {
  const [chips, setChips] = useState<string[]>([])
  const [loadingPool, setLoadingPool] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<IdeaChipsErrorInfo | null>(null)
  const inFlightRef = useRef(false)

  const syncFromCache = useCallback(() => {
    const cached = readCachedChips(context)
    if (cached?.length) {
      setChips(cached)
      setError(null)
    }
  }, [context])

  const generateChips = useCallback(async () => {
    if (inFlightRef.current) return

    inFlightRef.current = true
    setGenerating(true)
    setError(null)
    setChips([])

    let attempt = 0
    let lastError: IdeaChipsErrorInfo | null = null

    while (attempt <= MAX_RETRIES) {
      try {
        const newChips = await callGenerateIdeaChips(context)
        setChips(newChips)
        writeCachedChips(context, newChips)
        setGenerating(false)
        inFlightRef.current = false
        return
      } catch (err) {
        const info: IdeaChipsErrorInfo =
          err && typeof err === 'object' && 'message' in err
            ? (err as IdeaChipsErrorInfo)
            : parseIdeaChipsInvokeFailure(err, null)
        lastError = info
        if (isIdeaChipsRateLimitError(info)) break
        attempt += 1
      }
    }

    const resolvedError = lastError ?? { message: IDEA_CHIPS_GENERIC_ERROR }
    setError(resolvedError)
    toast.error(formatIdeaChipsErrorForDisplay(resolvedError))
    setGenerating(false)
    inFlightRef.current = false
    if (import.meta.env.DEV) {
      console.warn('[idea-chips] generate', context, resolvedError)
    }
  }, [context])

  const suggestChips = useCallback(async () => {
    if (inFlightRef.current) return

    const count = suggestCountByContext.get(context) ?? 0
    suggestCountByContext.set(context, count + 1)

    if (count === 0) {
      inFlightRef.current = true
      setLoadingPool(true)
      setError(null)
      setChips([])

      try {
        const poolChips = await fetchIdeaChipsFromPool(context)
        setChips(poolChips)
        if (poolChips.length) {
          writeCachedChips(context, poolChips)
        } else {
          setError({ message: IDEA_CHIPS_GENERIC_ERROR })
        }
      } catch (err) {
        const info: IdeaChipsErrorInfo =
          err && typeof err === 'object' && 'message' in err
            ? (err as IdeaChipsErrorInfo)
            : parseIdeaChipsInvokeFailure(err, null)
        setError(info)
        toast.error(formatIdeaChipsErrorForDisplay(info))
        if (import.meta.env.DEV) {
          console.warn('[idea-chips] pool', context, info)
        }
      } finally {
        setLoadingPool(false)
        inFlightRef.current = false
      }
      return
    }

    await generateChips()
  }, [context, generateChips])

  return {
    chips,
    loadingPool,
    generating,
    error,
    generateChips,
    suggestChips,
    syncFromCache,
    hasChips: chips.length > 0,
  }
}

export type IdeaChipsSession = ReturnType<typeof useIdeaChipsSession>

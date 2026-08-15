import { useCallback, useEffect, useRef, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { supabase } from '@/lib/supabase'
import { extractProductKeyword } from '@/lib/sourcingKeywordExtract'
import {
  buildSourcingResponse,
  createIdleSourceResults,
  createLoadingSourceResults,
  normalizeSourcingCard,
  SOURCE_ORDER,
  type SourcingCard,
  type SourcingResponse,
  type SourcingSourceKey,
  type SourcingSourceResultsMap,
} from '@/lib/sourcingTypes'

export type SourcingStep = 'idle' | 'loading' | 'done' | 'error'

function isValidSourcingKeyword(keyword: string): { valid: boolean; reason?: string } {
  const trimmed = keyword.trim()
  if (trimmed.length < 3) {
    return { valid: false, reason: 'Please enter a more specific product keyword.' }
  }
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, reason: 'Please enter a product name, not just a number.' }
  }
  if (!/[a-zA-Z]{3,}/.test(trimmed)) {
    return { valid: false, reason: 'Please enter a valid product keyword.' }
  }
  const letters = trimmed.toLowerCase().replace(/[^a-z]/g, '')
  if (letters.length >= 4) {
    const freq: Record<string, number> = {}
    for (const c of letters) freq[c] = (freq[c] ?? 0) + 1
    const maxFreq = Math.max(...Object.values(freq))
    if (maxFreq / letters.length > 0.6) {
      return { valid: false, reason: 'Please enter a valid product keyword.' }
    }
  }
  return { valid: true }
}

function normalizeSourceCards(raw: unknown, source: SourcingSourceKey): SourcingCard[] {
  if (!Array.isArray(raw)) return []
  return raw.map((card) =>
    normalizeSourcingCard({
      ...(card as Record<string, unknown>),
      source: ((card as { source?: SourcingSourceKey }).source ?? source) as SourcingSourceKey,
    }),
  )
}

export interface UseSourcingReturn {
  step: SourcingStep
  data: SourcingResponse | null
  sourceResults: SourcingSourceResultsMap
  error: string | null
  validationError: string | null
  isBusy: boolean
  totalResults: number
  loadingSourceCount: number
  streamStatus: string
  streamText: string
  search: (keyword: string, budgetMax: number | null, forceRefresh?: boolean) => Promise<void>
  reset: () => void
  clearValidationError: () => void
}

export function useSourcing(): UseSourcingReturn {
  const { toUSD, currency } = useCurrency()
  const [step, setStep] = useState<SourcingStep>('idle')
  const [data, setData] = useState<SourcingResponse | null>(null)
  const [sourceResults, setSourceResults] = useState<SourcingSourceResultsMap>(createIdleSourceResults)
  const [searchMeta, setSearchMeta] = useState<{
    keyword: string
    budget_max: number | null
    search_id: string
    from_cache: boolean
    credits_charged: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [streamStatus, setStreamStatus] = useState('')
  const [streamText, setStreamText] = useState('')
  const searchGenerationRef = useRef(0)

  useEffect(() => {
    if (!searchMeta) {
      setData(null)
      return
    }
    setData(buildSourcingResponse(searchMeta, sourceResults))
  }, [searchMeta, sourceResults])

  const totalResults = SOURCE_ORDER.reduce((n, key) => n + sourceResults[key].results.length, 0)
  const loadingSourceCount = SOURCE_ORDER.filter((key) => sourceResults[key].loading).length
  const isBusy = step === 'loading' || loadingSourceCount > 0

  const clearValidationError = useCallback(() => {
    setValidationError(null)
  }, [])

  const fetchOneSource = useCallback(
    async (
      generation: number,
      token: string,
      params: {
        keyword: string
        source: SourcingSourceKey
        search_id: string
        budget_max: number | null
        force_refresh: boolean
      },
    ) => {
      const base = import.meta.env.VITE_SUPABASE_URL
      try {
        setStreamStatus(`Scanning ${params.source.replaceAll('_', ' ')}…`)
        setStreamText((prev) => `${prev}${prev ? '\n' : ''}→ ${params.source}: fetching supplier data`)
        if (params.source === '1688') {
          setStreamText((prev) => `${prev}\n→ 1688: AI translating titles + normalization`)
        }
        const res = await fetch(`${base}/functions/v1/b2b-sourcing-source`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        })
        const json = (await res.json()) as {
          results?: unknown[]
          error?: string | null
          from_cache?: boolean
        }
        if (generation !== searchGenerationRef.current) return

        if (!res.ok) {
          setSourceResults((prev) => ({
            ...prev,
            [params.source]: {
              results: [],
              loading: false,
              error: json.error ?? `Request failed (${res.status})`,
              from_cache: false,
            },
          }))
          return
        }

        setSourceResults((prev) => ({
          ...prev,
          [params.source]: {
            results: normalizeSourceCards(json.results, params.source),
            loading: false,
            error: json.error ?? null,
            from_cache: Boolean(json.from_cache),
          },
        }))
        const resultCount = normalizeSourceCards(json.results, params.source).length
        setStreamText((prev) => `${prev}\n✓ ${params.source}: ${resultCount} results ready`)
      } catch (e) {
        if (generation !== searchGenerationRef.current) return
        setSourceResults((prev) => ({
          ...prev,
          [params.source]: {
            results: [],
            loading: false,
            error: e instanceof Error ? e.message : String(e),
            from_cache: false,
          },
        }))
        setStreamText((prev) => `${prev}\n✕ ${params.source}: ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [],
  )

  const search = useCallback(
    async (keyword: string, budgetMax: number | null, forceRefresh = false) => {
      const productKeyword = extractProductKeyword(keyword)

      const validation = isValidSourcingKeyword(productKeyword)
      if (!validation.valid) {
        setValidationError(validation.reason ?? 'Invalid keyword.')
        return
      }

      const generation = ++searchGenerationRef.current

      setValidationError(null)
      setStep('loading')
      setError(null)
      setSearchMeta(null)
      setData(null)
      setSourceResults(createLoadingSourceResults())
      setStreamStatus('Connecting to sourcing engine…')
      setStreamText('')

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error('Not logged in')

        const budgetInUSD =
          budgetMax !== null && budgetMax !== undefined && !Number.isNaN(budgetMax) && budgetMax > 0
            ? toUSD(budgetMax, currency)
            : null

        const base = import.meta.env.VITE_SUPABASE_URL
        const initRes = await fetch(`${base}/functions/v1/b2b-sourcing-init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            keyword: productKeyword,
            budget_max: budgetInUSD,
            force_refresh: forceRefresh,
          }),
        })

        if (generation !== searchGenerationRef.current) return

        const initJson = (await initRes.json()) as {
          search_id?: string
          from_cache?: boolean
          credits_charged?: number
          error?: string
        }

        if (!initRes.ok) {
          throw new Error(initJson.error ?? `Init failed (${initRes.status})`)
        }
        setStreamStatus('Sourcing engine connected. Launching source crawlers…')
        setStreamText((prev) => `${prev}${prev ? '\n' : ''}→ init: fan-out across IndiaMart, Alibaba, Made in China, 1688`)

        const meta = {
          keyword: productKeyword,
          budget_max: budgetInUSD,
          search_id: String(initJson.search_id ?? ''),
          from_cache: Boolean(initJson.from_cache),
          credits_charged: Number(initJson.credits_charged ?? 0),
        }

        setSearchMeta(meta)
        setStep('done')

        const token = session.access_token
        for (const source of SOURCE_ORDER) {
          void fetchOneSource(generation, token, {
            keyword: productKeyword,
            source,
            search_id: meta.search_id,
            budget_max: budgetInUSD,
            force_refresh: forceRefresh,
          })
        }
      } catch (e) {
        if (generation !== searchGenerationRef.current) return
        setError(e instanceof Error ? e.message : String(e))
        setStep('error')
        setSourceResults(createIdleSourceResults())
        setSearchMeta(null)
        setStreamStatus('Sourcing failed')
      }
    },
    [currency, fetchOneSource, toUSD],
  )

  const reset = useCallback(() => {
    searchGenerationRef.current += 1
    setStep('idle')
    setData(null)
    setSearchMeta(null)
    setSourceResults(createIdleSourceResults())
    setError(null)
    setValidationError(null)
    setStreamStatus('')
    setStreamText('')
  }, [])

  return {
    step,
    data,
    sourceResults,
    error,
    validationError,
    isBusy,
    totalResults,
    loadingSourceCount,
    streamStatus,
    streamText,
    search,
    reset,
    clearValidationError,
  }
}

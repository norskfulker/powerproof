import { byokRequestHeaders, formatByokAwareError } from '@/lib/byok'
import {
  MARKET_TEST_COUNTRY,
  MARKET_TEST_DEFAULT_MODEL,
  marketTestCreditCostForModel,
  MarketTestGenerationFailedError,
  MarketTestInsufficientCreditsError,
  MarketTestRateLimitError,
  normalizeMarketTestResult,
  type MarketTestResult,
  type MarketTestStreamEvent,
} from '@/lib/marketTestTypes'
import type { AIModelId } from '@/lib/aiModels'
import { resolveAiModelId } from '@/lib/aiModels'
import { parseSseBlocks } from '@/lib/supabaseFunctionStream'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabase'

export { MARKET_TEST_COUNTRY }

export type RunMarketTestParams = {
  query: string
  userOpportunityId: string | null
  model?: AIModelId
  onEvent: (event: MarketTestStreamEvent) => void
}

export async function fetchCompleteMarketTest(
  userId: string,
  userOpportunityId: string,
): Promise<MarketTestResult | null> {
  const { data, error } = await supabase
    .from('market_tests')
    .select('*')
    .eq('user_opportunity_id', userOpportunityId)
    .eq('user_id', userId)
    .eq('generation_status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return normalizeMarketTestResult(data as Record<string, unknown>)
}

export async function fetchCompleteMarketTestByQuery(
  userId: string,
  query: string,
): Promise<MarketTestResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const { data, error } = await supabase
    .from('market_tests')
    .select('*')
    .eq('user_id', userId)
    .ilike('query', `%${trimmed}%`)
    .eq('generation_status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return normalizeMarketTestResult(data as Record<string, unknown>)
}

export async function fetchExistingMarketTest({
  userId,
  userOpportunityId,
  query,
}: {
  userId: string
  userOpportunityId?: string | null
  query: string
}): Promise<MarketTestResult | null> {
  if (userOpportunityId) {
    return fetchCompleteMarketTest(userId, userOpportunityId)
  }
  return fetchCompleteMarketTestByQuery(userId, query)
}

export async function fetchMarketTestIdForOpportunity(
  userId: string,
  userOpportunityId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('market_tests')
    .select('id')
    .eq('user_opportunity_id', userOpportunityId)
    .eq('user_id', userId)
    .eq('generation_status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) return null
  return String(data.id)
}

export async function fetchMarketTestById(
  testId: string,
  userId?: string,
): Promise<MarketTestResult | null> {
  let query = supabase.from('market_tests').select('*').eq('id', testId)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return normalizeMarketTestResult(data as Record<string, unknown>)
}

export type MarketTestListRow = {
  id: string
  query: string | null
  verdict: string | null
  verdict_label: string | null
  market_reality_score: number | null
  generation_status: string | null
  country: string | null
  model_used: string | null
  created_at: string | null
  user_opportunity_id: string | null
}

export async function fetchRecentPendingMarketTest(
  userId: string,
): Promise<{ id: string; query: string | null } | null> {
  const { data, error } = await supabase
    .from('market_tests')
    .select('id, query')
    .eq('user_id', userId)
    .eq('generation_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) return null
  return { id: String(data.id), query: data.query ? String(data.query) : null }
}

const marketTestsListInflight = new Map<string, Promise<MarketTestListRow[]>>()

/** Bust in-flight dedupe after creating or deleting a market test. */
export function invalidateUserMarketTestsList(userId: string) {
  marketTestsListInflight.delete(userId)
}

export async function fetchUserMarketTests(userId: string): Promise<MarketTestListRow[]> {
  const inflight = marketTestsListInflight.get(userId)
  if (inflight) return inflight

  const run = (async () => {
    const { data, error } = await supabase
      .from('market_tests')
      .select(
        'id, query, verdict, verdict_label, market_reality_score, generation_status, country, model_used, created_at, user_opportunity_id',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) return []
    return data as MarketTestListRow[]
  })()

  marketTestsListInflight.set(userId, run)
  try {
    return await run
  } finally {
    if (marketTestsListInflight.get(userId) === run) {
      marketTestsListInflight.delete(userId)
    }
  }
}

function throwForHttpStatus(
  res: Response,
  json: Record<string, unknown>,
  requiredCredits = 20,
): never {
  if (res.status === 402) {
    throw new MarketTestInsufficientCreditsError(
      String(json.error ?? 'You need more credits to run this.'),
      typeof json.current_credits === 'number' ? json.current_credits : 0,
      typeof json.required_credits === 'number' ? json.required_credits : requiredCredits,
    )
  }
  if (res.status === 429) {
    throw new MarketTestRateLimitError(
      String(json.error ?? "You've run too many tests today. Try again later."),
    )
  }
  if (res.status >= 500) {
    throw new MarketTestGenerationFailedError(
      String(json.error ?? "Something went wrong. Your credits weren't charged."),
    )
  }
  const message = String(json.error ?? `Market test failed (${res.status})`)
  throw new Error(formatByokAwareError(message))
}

export async function runMarketTestStream({
  query,
  userOpportunityId,
  model = MARKET_TEST_DEFAULT_MODEL,
  onEvent,
}: RunMarketTestParams): Promise<MarketTestResult> {
  const resolvedModel = resolveAiModelId(model)
  const creditCost = marketTestCreditCostForModel(resolvedModel)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Please sign in to run a market test.')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/test-the-market`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      Accept: 'text/event-stream',
      ...byokRequestHeaders(),
    },
    body: JSON.stringify({
      query,
      country: MARKET_TEST_COUNTRY,
      user_opportunity_id: userOpportunityId,
      model: resolvedModel,
      stream: true,
    }),
  })

  if (res.status === 402 || res.status === 429 || res.status >= 500) {
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throwForHttpStatus(res, json, creditCost)
  }

  const contentType = res.headers.get('Content-Type') ?? ''

  if (!contentType.includes('text/event-stream')) {
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throwForHttpStatus(res, json, creditCost)
    }
    const normalized = normalizeMarketTestResult(json)
    if (!normalized) throw new Error('Invalid market test response.')
    onEvent({ type: 'done', ...normalized })
    return normalized
  }

  if (!res.ok || !res.body) {
    const text = await res.text()
    let message = "Something went wrong. Your credits weren't charged."
    try {
      const j = JSON.parse(text) as Record<string, unknown>
      if (res.status === 429) {
        throw new MarketTestRateLimitError(String(j.error ?? message))
      }
      if (res.status >= 500) {
        throw new MarketTestGenerationFailedError(String(j.error ?? message))
      }
      message = String(j.error ?? message)
    } catch (err) {
      if (
        err instanceof MarketTestRateLimitError ||
        err instanceof MarketTestGenerationFailedError
      ) {
        throw err
      }
      if (text) message = text.slice(0, 200)
    }
    onEvent({ type: 'error', message })
    throw new Error(formatByokAwareError(message))
  }

  let done: MarketTestResult | null = null
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleEvent = (ev: MarketTestStreamEvent) => {
    if (ev.type === 'ping') return
    onEvent(ev)
    if (ev.type === 'error') {
      if (ev.code === 'insufficient_credits') {
        throw new MarketTestInsufficientCreditsError(ev.message, 0, creditCost)
      }
      if (ev.code === 'rate_limit') {
        throw new MarketTestRateLimitError(ev.message)
      }
      if (ev.code === 'generation_failed') {
        throw new MarketTestGenerationFailedError(ev.message)
      }
      throw new Error(formatByokAwareError(ev.message))
    }
    if (ev.type === 'done') {
      const normalized = normalizeMarketTestResult(ev as Record<string, unknown>)
      if (normalized) done = normalized
    }
  }

  while (true) {
    const { done: streamDone, value } = await reader.read()
    if (streamDone) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseBlocks<MarketTestStreamEvent>(buffer)
    buffer = rest
    for (const ev of events) {
      handleEvent(ev)
    }
  }

  const { events } = parseSseBlocks<MarketTestStreamEvent>(buffer + '\n\n')
  for (const ev of events) {
    handleEvent(ev)
  }

  if (!done) throw new MarketTestGenerationFailedError()
  return done
}

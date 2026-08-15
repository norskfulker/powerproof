import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'
import { MarketTestAskAI } from '@/components/market-test/MarketTestAskAI'
import { MarketTestHeroFluid } from '@/components/market-test/MarketTestHeroFluid'
import { MarketTestDetailBanner } from '@/components/market-test/MarketTestDetailBanner'
import { MarketTestFailedState } from '@/components/market-test/MarketTestFailedState'
import {
  MarketTestDetailSection,
  MarketTestPageShell,
} from '@/components/market-test/MarketTestPageShell'
import { marketTestAskAiPageShellClassName } from '@/lib/marketTestDetailLayout'
import { MarketTestPendingState } from '@/components/market-test/MarketTestPendingState'
import { MarketTestResults } from '@/components/opportunity/detail/MarketTestResults'
import { OpportunityLoadingState } from '@/components/opportunity/detail/OpportunityLoadingState'
import { OpportunityNotFound } from '@/components/opportunity/detail/OpportunityNotFound'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { fetchMarketTestById } from '@/lib/marketTestApi'
import { MARKET_TEST_ROUTES } from '@/lib/marketTestRoutes'
import type { MarketTestResult } from '@/lib/marketTestTypes'
import { marketTestAnalysisHeading, normalizeMarketTestResult } from '@/lib/marketTestTypes'
import type { EditChatCompleteResponse } from '@/lib/marketTestEditChat'
import { supabase } from '@/lib/supabase'

const POLL_INTERVAL_MS = 3000

export function MarketTestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [result, setResult] = useState<MarketTestResult | null>(null)
  const [linkedResearchSlug, setLinkedResearchSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const loadLinkedResearch = useCallback(
    async (userOpportunityId: string | null | undefined) => {
      if (!userOpportunityId || !user?.id) {
        setLinkedResearchSlug(null)
        return
      }
      const { data } = await supabase
        .from('user_opportunities')
        .select('slug')
        .eq('id', userOpportunityId)
        .eq('user_id', user.id)
        .maybeSingle()
      setLinkedResearchSlug(data?.slug ? String(data.slug) : null)
    },
    [user?.id],
  )

  const load = useCallback(async () => {
    if (!id || !user?.id) return null
    const test = await fetchMarketTestById(id, user.id)
    if (!test) {
      setResult(null)
      setNotFound(true)
      return null
    }
    setResult(test)
    setNotFound(false)
    await loadLinkedResearch(test.user_opportunity_id)
    return test
  }, [id, loadLinkedResearch, user?.id])

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    if (!user?.id) {
      navigate(landingSignInTo(MARKET_TEST_ROUTES.detail(id)), { replace: true })
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      await load()
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [id, load, navigate, user?.id])

  useEffect(() => {
    if (!id || !user?.id || !result) return
    const status = String(result.generation_status ?? '').toLowerCase()
    if (status === 'complete' || status === 'failed') return

    const interval = window.setInterval(() => {
      void (async () => {
        const test = await fetchMarketTestById(id, user.id)
        if (!test) return
        setResult(test)
        if (String(test.generation_status ?? '').toLowerCase() === 'complete') {
          await loadLinkedResearch(test.user_opportunity_id)
        }
      })()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [id, loadLinkedResearch, result, user?.id])

  const handleRunAnother = () => {
    if (!result) return
    navigate(MARKET_TEST_ROUTES.new, {
      state: {
        query: result.query ?? '',
        user_opportunity_id: result.user_opportunity_id ?? null,
      },
    })
  }

  const handleEditComplete = useCallback((payload: EditChatCompleteResponse) => {
    setResult((prev) => {
      if (!prev) return prev
      const merged = normalizeMarketTestResult({
        id: prev.id,
        query: prev.query,
        user_opportunity_id: prev.user_opportunity_id,
        generation_status: prev.generation_status ?? 'complete',
        verdict: prev.verdict,
        verdict_label: prev.verdict_label,
        market_reality_score: prev.market_reality_score,
        honest_verdict: prev.honest_verdict,
        demand_signals: prev.demand_signals,
        red_flags: prev.red_flags,
        past_failures: prev.past_failures,
        past_successes: prev.past_successes,
        pros: prev.pros,
        cons: prev.cons,
        country: prev.country,
        model_used: prev.model_used,
        model_label: prev.model_label,
        created_at: prev.created_at,
        ...payload.updated_data,
      })
      return merged ?? prev
    })
  }, [])

  if (loading) return <OpportunityLoadingState />
  if (notFound || !result) return <OpportunityNotFound />

  const status = String(result.generation_status ?? 'complete').toLowerCase()

  if (status === 'pending') {
    return (
      <MarketTestPendingState
        query={result.query}
        modelLabel={marketTestAnalysisHeading(result.model_used, result.model_label)}
        modelUsed={result.model_used}
        startedAt={result.created_at}
      />
    )
  }

  if (status === 'failed') {
    return <MarketTestFailedState />
  }

  return (
    <MarketTestAskAI marketTestId={result.id} onEditComplete={handleEditComplete}>
      <AskAiChatPageShell className={marketTestAskAiPageShellClassName}>
        <MarketTestPageShell>
          <MarketTestDetailSection>
            <MarketTestHeroFluid
              query={result.query ?? 'Market reality check'}
              resetKey={result.id}
            />
          </MarketTestDetailSection>
          <MarketTestDetailSection>
            <MarketTestDetailBanner
              createdAt={result.created_at}
              verdict={result.verdict}
              modelUsed={result.model_used}
              modelLabel={result.model_label}
              linkedResearchSlug={linkedResearchSlug}
              onRunAnother={handleRunAnother}
            />
          </MarketTestDetailSection>
          <MarketTestDetailSection>
            <MarketTestResults result={result} />
          </MarketTestDetailSection>
        </MarketTestPageShell>
      </AskAiChatPageShell>
    </MarketTestAskAI>
  )
}

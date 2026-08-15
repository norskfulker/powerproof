import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MarketTestDeepLoadingPage } from '@/components/market-test/MarketTestDeepLoadingPage'
import { MarketTestFailedState } from '@/components/market-test/MarketTestFailedState'
import { MarketTestPageShell } from '@/components/market-test/MarketTestPageShell'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { DEFAULT_AI_MODEL_ID, type AIModelId } from '@/lib/aiModels'
import { fetchRecentPendingMarketTest, runMarketTestStream } from '@/lib/marketTestApi'
import {
  MARKET_TEST_ROUTES,
  MY_MARKET_TEST_PATH,
  type MarketTestNewLocationState,
} from '@/lib/marketTestRoutes'
import {
  MARKET_TEST_AI_MODEL_LABELS,
  MarketTestGenerationFailedError,
  MarketTestInsufficientCreditsError,
  MarketTestRateLimitError,
  type MarketTestStreamEvent,
} from '@/lib/marketTestTypes'
import { formatPlanGateMessage } from '@/lib/planGate'
import { openSubscriptionPricingDialog } from '@/store/filterStore'
import { cn } from '@/lib/utils'

import {
  opportunityDetailCardClass,
  opportunityDetailCardPaddingClass,
} from '@/lib/opportunityCardClasses'

function readStreamTestId(ev: MarketTestStreamEvent): string | null {
  if (ev.type !== 'status') return null
  const raw = ev.id ?? ev.market_test_id
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function MarketTestNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = (location.state ?? {}) as MarketTestNewLocationState
  const queryFromUrl = searchParams.get('q')?.trim() ?? ''
  const initialQuery = state.query?.trim() || queryFromUrl
  const userOpportunityId = state.user_opportunity_id ?? null
  const selectedModel: AIModelId = DEFAULT_AI_MODEL_ID
  const [queryInput, setQueryInput] = useState(initialQuery)
  const [statusMessage, setStatusMessage] = useState('Scanning for real demand signals…')
  const [runStartedAt] = useState(() => new Date().toISOString())
  const [phase, setPhase] = useState<'prompt' | 'running' | 'error' | 'failed'>(
    initialQuery ? 'running' : 'prompt',
  )
  const [error, setError] = useState<string | null>(null)
  const [planLimitReached, setPlanLimitReached] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const startedRef = useRef(false)
  const navigatedToDetailRef = useRef(false)

  const detailNavState = state.from ? { from: state.from } : undefined

  const runTest = useCallback(
    async (query: string, model: AIModelId) => {
      const trimmed = query.trim()
      if (!trimmed || !user?.id) return
      setPhase('running')
      setError(null)
      setPlanLimitReached(false)
      setRateLimited(false)
      setStatusMessage('Scanning for real demand signals…')
      navigatedToDetailRef.current = false
      navigate(
        `${MARKET_TEST_ROUTES.new}?q=${encodeURIComponent(trimmed)}`,
        {
          replace: true,
          state: {
            query: trimmed,
            user_opportunity_id: userOpportunityId,
            model,
            ...(state.from ? { from: state.from } : {}),
          },
        },
      )

      try {
        const result = await runMarketTestStream({
          query: trimmed,
          userOpportunityId,
          model,
          onEvent: (ev) => {
            if (ev.type === 'status' && ev.message) setStatusMessage(ev.message)
            const testId = readStreamTestId(ev)
            if (testId && !navigatedToDetailRef.current) {
              navigatedToDetailRef.current = true
              navigate(MARKET_TEST_ROUTES.detail(testId), { replace: true, state: detailNavState })
            }
          },
        })
        if (!navigatedToDetailRef.current) {
          navigate(MARKET_TEST_ROUTES.detail(result.id), { replace: true, state: detailNavState })
        }
      } catch (err) {
        if (err instanceof MarketTestInsufficientCreditsError) {
          setPlanLimitReached(true)
          setError(formatPlanGateMessage(new Error('limit_exceeded')))
          setPhase('prompt')
        } else if (err instanceof MarketTestRateLimitError) {
          setRateLimited(true)
          setError(err.message)
          setPhase('error')
        } else if (err instanceof MarketTestGenerationFailedError) {
          setError(err.message)
          setPhase('failed')
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong. Please try again.',
          )
          setPhase('failed')
        }
      }
    },
    [detailNavState, navigate, state.from, user?.id, userOpportunityId],
  )

  useEffect(() => {
    if (!user?.id) {
      navigate(landingSignInTo(MARKET_TEST_ROUTES.new), { replace: true })
      return
    }

    let cancelled = false
    void (async () => {
      const pending = await fetchRecentPendingMarketTest(user.id)
      if (cancelled) return
      if (pending) {
        navigate(MARKET_TEST_ROUTES.detail(pending.id), { replace: true, state: detailNavState })
        return
      }
      if (!initialQuery || startedRef.current) return
      startedRef.current = true
      void runTest(initialQuery, selectedModel)
    })()

    return () => {
      cancelled = true
    }
  }, [detailNavState, initialQuery, navigate, runTest, selectedModel, user?.id])

  const handleBack = () => navigate(MY_MARKET_TEST_PATH)

  if (phase === 'running') {
    return (
      <MarketTestDeepLoadingPage
        query={queryInput || initialQuery}
        modelLabel={MARKET_TEST_AI_MODEL_LABELS[selectedModel]}
        modelUsed={selectedModel}
        statusMessage={statusMessage}
        startedAt={runStartedAt}
      />
    )
  }

  if (phase === 'failed') {
    return <MarketTestFailedState />
  }

  return (
    <MarketTestPageShell>
      <div className={cn(opportunityDetailCardClass, opportunityDetailCardPaddingClass, 'min-w-0 w-full')}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleBack}
            className="h-8 shrink-0 rounded-xl border border-border-subtle bg-bg-surface text-[12px] font-bold tracking-tight shadow-sm"
          >
            Back
          </Button>
        </div>
      </div>

      {phase === 'error' ? (
        <div className={cn(opportunityDetailCardClass, 
            opportunityDetailCardPaddingClass,
            'flex flex-col items-center gap-4 py-12 text-center',
          )}>
          <p className="text-sm font-semibold text-foreground">
            {rateLimited ? 'Rate limit reached' : 'Market test failed'}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          {!rateLimited ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => void runTest(queryInput, selectedModel)}
              disabled={!queryInput.trim()}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === 'prompt' ? (
        <div className={cn(opportunityDetailCardClass, 
            opportunityDetailCardPaddingClass,
            'flex flex-col gap-6 border-2 py-8-sm:py-10',
          )}>
          <div className="max-w-lg space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground-sm:text-2xl">
              Is this real, or are you hallucinating demand?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We&apos;ll scan for real demand signals, dig up companies that tried this — what
              killed them and what worked — and give you a brutal honest verdict.
            </p>
          </div>

          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={3}
            placeholder="Describe the business idea you want to reality-check…"
            className="w-full max-w-lg resize-none rounded-xl border border-border-subtle bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none ring-primary/20 focus:ring-2"
          />

          {planLimitReached ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">{error}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openSubscriptionPricingDialog}
                >
                  View plans
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!queryInput.trim()}
                onClick={() => void runTest(queryInput, selectedModel)}
              >
                Run Market Reality Check
              </Button>
            </>
          )}
        </div>
      ) : null}
    </MarketTestPageShell>
  )
}

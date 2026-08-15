import { MarketTestDeepLoadingPage } from '@/components/market-test/MarketTestDeepLoadingPage'

export interface MarketTestPendingStateProps {
  query?: string | null
  modelLabel?: string | null
  modelUsed?: string | null
  startedAt?: string | null
}

export function MarketTestPendingState({
  query,
  modelLabel,
  modelUsed,
  startedAt,
}: MarketTestPendingStateProps) {
  return (
    <MarketTestDeepLoadingPage
      query={query}
      modelLabel={modelLabel}
      modelUsed={modelUsed}
      startedAt={startedAt}
    />
  )
}

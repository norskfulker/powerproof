export const MY_MARKET_TEST_PATH = '/my-market-test'

export const MARKET_TEST_ROUTES = {
  new: '/market-test/new',
  detail: (id: string) => `/market-test/${encodeURIComponent(id)}`,
  hub: MY_MARKET_TEST_PATH,
} as const

export type MarketTestNewLocationState = {
  query?: string
  user_opportunity_id?: string | null
  model?: import('@/lib/aiModels').AIModelId
  from?: string
}

export function truncateMarketTestQuery(query: string, max = 80): string {
  const trimmed = query.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

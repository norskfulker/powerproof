import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import type { SourcingCard, SourcingSourceKey } from '@/lib/sourcingTypes'

export const SOURCING_SEARCH_RESULTS_PATH = '/sourcing/search/:searchId'
export const SOURCING_PRODUCT_PATH = '/sourcing/search/:searchId/product'

export function sourcingSearchResultsPath(searchId: string): string {
  return `/sourcing/search/${encodeURIComponent(searchId)}`
}

export function sourcingProductPath(
  searchId: string,
  card: Pick<SourcingCard, 'source' | 'product_url'>,
): string {
  const sp = new URLSearchParams()
  sp.set('source', card.source)
  sp.set('url', card.product_url)
  return `${sourcingSearchResultsPath(searchId)}/product?${sp.toString()}`
}

export function parseSourcingProductParams(search: string): {
  source: SourcingSourceKey | null
  productUrl: string | null
} {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const sourceRaw = sp.get('source')
  const productUrl = sp.get('url')
  const allowed: SourcingSourceKey[] = ['indiamart', 'alibaba', 'made_in_china', '1688']
  const source =
    sourceRaw && (allowed as string[]).includes(sourceRaw)
      ? (sourceRaw as SourcingSourceKey)
      : null
  return {
    source,
    productUrl: productUrl?.trim() || null,
  }
}

export function sourcingRoomPath(): string {
  return roomPathForMode('sourcing')
}

export function isSourcingSearchResultsPath(pathname: string): boolean {
  return /^\/sourcing\/search\/[^/]+\/?$/.test(pathname)
}

export function isSourcingProductPath(pathname: string): boolean {
  return /^\/sourcing\/search\/[^/]+\/product\/?$/.test(pathname)
}

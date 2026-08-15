/** Market test detail — anchor id to accordion value for sidebar / pill navigation. */

export const MARKET_TEST_SECTION_FOCUS_EVENT = 'powerproof:market-test-section-focus'

export type MarketTestSectionFocusDetail = {
  accordionValue: string
  scrollId: string
}

export const MARKET_TEST_ANCHOR_ACCORDION: Record<string, string> = {
  'mt-honest-take': 'honest-take',
  'mt-demand-signals': 'demand-signals',
  'mt-red-flags': 'red-flags',
  'mt-past-failures': 'past-failures',
  'mt-past-successes': 'past-successes',
  'mt-pros-cons': 'pros-cons',
}

export function focusMarketTestSection(scrollId: string): void {
  const accordionValue = MARKET_TEST_ANCHOR_ACCORDION[scrollId]
  if (!accordionValue) return
  window.dispatchEvent(
    new CustomEvent<MarketTestSectionFocusDetail>(MARKET_TEST_SECTION_FOCUS_EVENT, {
      detail: { accordionValue, scrollId },
    }),
  )
}

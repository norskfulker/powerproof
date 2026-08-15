import { getAppScrollRoot } from '@/lib/appScrollRoot'

const SCROLL_OFFSET_FALLBACK_PX = 108
const HIGHLIGHT_MS = 1400

/** Maps market-test edit section keys to DOM ids in MarketTestResults. */
const MARKET_TEST_SECTION_SCROLL_IDS: Record<string, string> = {
  honest_verdict: 'mt-honest-take',
  demand_signals: 'mt-demand-signals',
  red_flags: 'mt-red-flags',
  past_failures: 'mt-past-failures',
  past_successes: 'mt-past-successes',
  pros: 'mt-pros-cons',
  cons: 'mt-pros-cons',
}

function getStickyChromeOffsetPx(): number {
  const header = document.querySelector<HTMLElement>('[data-app-chrome-header]')
  if (header) return Math.ceil(header.getBoundingClientRect().height) + 8
  return SCROLL_OFFSET_FALLBACK_PX
}

function scrollToId(scrollId: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(scrollId)
  if (!el) return

  const offset = getStickyChromeOffsetPx()
  const root = getAppScrollRoot()
  if (root) {
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const top = root.scrollTop + (elRect.top - rootRect.top) - offset
    root.scrollTo({ top: Math.max(0, top), behavior })
  } else {
    el.scrollIntoView({ behavior, block: 'start' })
  }

  el.classList.remove('opportunity-nav-anchor-highlight')
  void el.offsetWidth
  el.classList.add('opportunity-nav-anchor-highlight')
  window.setTimeout(() => el.classList.remove('opportunity-nav-anchor-highlight'), HIGHLIGHT_MS)
}

export function focusMarketTestEditSection(sectionKey: string): void {
  if (!sectionKey) return
  const scrollId =
    MARKET_TEST_SECTION_SCROLL_IDS[sectionKey] ?? `mt-${sectionKey.replace(/_/g, '-')}`
  window.setTimeout(() => scrollToId(scrollId), 120)
}

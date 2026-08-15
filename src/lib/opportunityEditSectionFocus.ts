import { getAppScrollRoot } from '@/lib/appScrollRoot'

export const OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT = 'powerproof:opportunity-edit-section-focus'

export const OPPORTUNITY_NAV_ANCHOR_HIGHLIGHT_MS = 1400

const SCROLL_OFFSET_FALLBACK_PX = 108
const ACCORDION_SCROLL_REFINE_MS = 320

function getStickyChromeOffsetPx(): number {
  const header = document.querySelector<HTMLElement>('[data-app-chrome-header]')
  if (header) return Math.ceil(header.getBoundingClientRect().height) + 8
  return SCROLL_OFFSET_FALLBACK_PX
}

export type OpportunityEditSectionFocusDetail = {
  sectionKey: string
  /** When false, skip ring / outline highlight on the target section. */
  highlight?: boolean
}

export type EditSectionFocusTarget = {
  scrollId: string
  accordionValue?: string
}

export type OpportunitySectionScrollOptions = {
  behavior?: ScrollBehavior
  /** Re-scroll after accordions open (sidebar nav). */
  refineAfterAccordion?: boolean
  /** When false, skip ring / outline highlight. Default true. */
  highlight?: boolean
}

/** Maps edit-chat section keys to scroll targets and accordion item values. */
export const EDIT_SECTION_FOCUS_TARGETS: Record<string, EditSectionFocusTarget> = {
  market_demographics: { scrollId: 'market', accordionValue: 'demographic-profiling' },
  competitors: { scrollId: 'od-competitors', accordionValue: 'competitive-landscape' },
  demand_trend: { scrollId: 'od-key-market-trends', accordionValue: 'key-market-trends' },
  market_intelligence: { scrollId: 'od-key-market-trends', accordionValue: 'key-market-trends' },
  marketing_strategy: { scrollId: 'od-marketing', accordionValue: 'marketing-strategy' },
  marketing_channels: { scrollId: 'od-marketing', accordionValue: 'marketing-channels' },
  style_analysis: { scrollId: 'od-analysis' },
  revenue_streams: { scrollId: 'od-revenue-streams', accordionValue: 'revenue-streams' },
  govt_schemes: { scrollId: 'od-schemes', accordionValue: 'government-schemes' },
  licenses_required: { scrollId: 'od-licenses', accordionValue: 'licenses' },
  space_location: { scrollId: 'od-space-location' },
  financial_projections: { scrollId: 'od-scenarios', accordionValue: 'revenue-estimator' },
  faqs: { scrollId: 'od-faq', accordionValue: 'faq-section' },
  headcount: { scrollId: 'od-headcount', accordionValue: 'team-required' },
  machinery_list: { scrollId: 'od-machinery', accordionValue: 'machinery-equipment' },
  raw_materials: { scrollId: 'od-raw', accordionValue: 'raw-materials' },
  risk_matrix: { scrollId: 'od-risks', accordionValue: 'risk-matrix' },
  funding_options: { scrollId: 'od-funding', accordionValue: 'funding-options' },
  unit_economics_deep: { scrollId: 'od-unit-economics', accordionValue: 'unit-economics' },
  business_overview: { scrollId: 'od-ai', accordionValue: 'business-overview' },
  tools_and_stack: { scrollId: 'od-tools', accordionValue: 'tools-stack' },
  pain_points: { scrollId: 'od-pain-points', accordionValue: 'pain-points' },
  market_verdict: { scrollId: 'od-market-verdict', accordionValue: 'market-verdict' },
  future_outlook: { scrollId: 'od-future-outlook', accordionValue: 'future-outlook' },
  saturation_level: { scrollId: 'od-saturation', accordionValue: 'saturation' },
  expert_tips_structured: { scrollId: 'od-tips', accordionValue: 'operator-insights' },
}

export function resolveEditSectionFocusTarget(sectionKey: string): EditSectionFocusTarget {
  return (
    EDIT_SECTION_FOCUS_TARGETS[sectionKey] ?? {
      scrollId: `od-${sectionKey.replace(/_/g, '-')}`,
    }
  )
}

export function scrollToOpportunityAnchor(
  scrollId: string,
  options: Pick<OpportunitySectionScrollOptions, 'behavior'> = {},
) {
  const el = document.getElementById(scrollId)
  if (!el) return

  const behavior = options.behavior ?? 'smooth'
  const offset = getStickyChromeOffsetPx()
  const root = getAppScrollRoot()
  if (root) {
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const top = root.scrollTop + (elRect.top - rootRect.top) - offset
    root.scrollTo({ top: Math.max(0, top), behavior })
    return
  }
  el.scrollIntoView({ behavior, block: 'start' })
}

/** Brief ring pulse on sections without accordion highlight wiring. */
export function pulseOpportunityNavAnchor(scrollId: string) {
  const el = document.getElementById(scrollId)
  if (!el) return

  el.classList.remove('opportunity-nav-anchor-highlight')
  void el.offsetWidth
  el.classList.add('opportunity-nav-anchor-highlight')
  window.setTimeout(
    () => el.classList.remove('opportunity-nav-anchor-highlight'),
    OPPORTUNITY_NAV_ANCHOR_HIGHLIGHT_MS,
  )
}

export function focusOpportunityEditSection(
  sectionKey: string,
  options: OpportunitySectionScrollOptions = {},
): void {
  if (!sectionKey) return
  window.dispatchEvent(
    new CustomEvent<OpportunityEditSectionFocusDetail>(OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT, {
      detail: { sectionKey, highlight: options.highlight },
    }),
  )

  const target = resolveEditSectionFocusTarget(sectionKey)
  const behavior = options.behavior ?? 'smooth'
  const refineAfterAccordion = options.refineAfterAccordion ?? false
  const scroll = () => scrollToOpportunityAnchor(target.scrollId, { behavior })

  if (refineAfterAccordion && target.accordionValue) {
    scroll()
    window.setTimeout(scroll, ACCORDION_SCROLL_REFINE_MS)
    return
  }

  const delay = behavior === 'instant' ? 0 : 120
  window.setTimeout(scroll, delay)
}

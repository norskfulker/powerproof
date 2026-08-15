import type { ElementType } from 'react'
import {
  AlertCircle,
  BarChart3,
  Boxes,
  Building2,
  CircleHelp,
  FileText,
  Layers,
  Lightbulb,
  Megaphone,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from '@/lib/icons'
import type { OpportunityDetailSectionId } from '@/hooks/useOpportunitySectionVisibility'
import {
  EDIT_SECTION_FOCUS_TARGETS,
  focusOpportunityEditSection,
  pulseOpportunityNavAnchor,
  scrollToOpportunityAnchor,
} from '@/lib/opportunityEditSectionFocus'
import {
  focusMarketTestSection,
  MARKET_TEST_ANCHOR_ACCORDION,
} from '@/lib/marketTestSectionNav'

export const OPPORTUNITY_SECTION_ICONS: Record<OpportunityDetailSectionId | string, ElementType> = {
  'od-hero': Target,
  'od-metrics': BarChart3,
  'od-fit': BarChart3,
  'od-ai': FileText,
  'od-research-insights': Sparkles,
  'od-key-market-trends': TrendingUp,
  market: Users,
  'od-scenarios': Layers,
  'od-revenue-streams': Wallet,
  'od-marketing': Megaphone,
  'od-competitors': ShieldAlert,
  'od-demand-trend': TrendingUp,
  'od-space-location': Building2,
  'od-machinery': Wrench,
  'od-headcount': Users,
  'od-raw': Boxes,
  'od-licenses': ShieldAlert,
  'od-schemes': Building2,
  'od-unit-economics': BarChart3,
  'od-tools': Boxes,
  'od-funding': Wallet,
  'od-risks': AlertCircle,
  'od-faq': CircleHelp,
  'od-tips': Lightbulb,
}

/** Anchor id → edit-chat section key (opens matching accordion when present). */
const ANCHOR_SECTION_KEY_OVERRIDES: Record<string, string> = {
  'od-research-insights': 'pain_points',
  'od-pain-points': 'pain_points',
  'od-market-verdict': 'market_verdict',
  'od-future-outlook': 'future_outlook',
  'od-saturation': 'saturation_level',
  'od-tips': 'expert_tips_structured',
  'od-key-market-trends': 'demand_trend',
  'od-demand-trend': 'demand_trend',
  'od-marketing-channels': 'marketing_channels',
  'od-analysis': 'style_analysis',
}

function buildAnchorToSectionKey(): Record<string, string> {
  const map: Record<string, string> = { ...ANCHOR_SECTION_KEY_OVERRIDES }
  for (const [sectionKey, target] of Object.entries(EDIT_SECTION_FOCUS_TARGETS)) {
    if (!map[target.scrollId]) {
      map[target.scrollId] = sectionKey
    }
  }
  return map
}

const ANCHOR_TO_SECTION_KEY = buildAnchorToSectionKey()

const NAV_SCROLL_OPTIONS = {
  behavior: 'instant' as const,
  refineAfterAccordion: true,
}

/** Scroll to a section anchor and open its accordion when wired. */
export function focusOpportunityNavAnchor(
  anchorId: string,
  options?: { highlight?: boolean },
): void {
  const highlight = options?.highlight !== false
  const sectionKey = ANCHOR_TO_SECTION_KEY[anchorId]
  if (sectionKey) {
    focusOpportunityEditSection(sectionKey, { ...NAV_SCROLL_OPTIONS, highlight })
    return
  }
  if (MARKET_TEST_ANCHOR_ACCORDION[anchorId]) {
    focusMarketTestSection(anchorId)
    scrollToOpportunityAnchor(anchorId, { behavior: 'instant' })
    window.setTimeout(
      () => scrollToOpportunityAnchor(anchorId, { behavior: 'instant' }),
      320,
    )
    if (highlight) pulseOpportunityNavAnchor(anchorId)
    return
  }
  scrollToOpportunityAnchor(anchorId, { behavior: 'instant' })
  if (highlight) pulseOpportunityNavAnchor(anchorId)
}

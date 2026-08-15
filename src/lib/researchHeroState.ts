/** Navigation state for discover hero research / re-research. */
export type HeroResearchNavigationState = {
  query?: string
  country?: string
  badge?: string
  badge_label?: string
  /** When true, discover hero runs research immediately after hydrating the form. */
  autoRunResearch?: boolean
}

export function buildHeroResearchFromOpportunity(
  opp: Record<string, unknown>,
  opts?: { autoRunResearch?: boolean },
): HeroResearchNavigationState {
  return {
    query: opp.research_query ? String(opp.research_query) : undefined,
    country: opp.country ? String(opp.country) : undefined,
    badge: opp.badge ? String(opp.badge) : undefined,
    badge_label: opp.badge_label ? String(opp.badge_label) : undefined,
    autoRunResearch: opts?.autoRunResearch,
  }
}

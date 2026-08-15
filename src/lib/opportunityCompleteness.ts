/**
 * Client-side completeness scoring for admin workflows (no DB column).
 */
export type CompletenessOpp = Record<string, unknown>

export function getCompletenessScore(opp: CompletenessOpp | null | undefined): { score: number; missing: string[] } {
  if (!opp) return { score: 0, missing: [] }

  const faqs = opp.faqs
  const faqsOk = Array.isArray(faqs) ? faqs.length > 0 : Boolean(faqs)

  const pros = opp.pros
  const cons = opp.cons
  const prosConsOk =
    Array.isArray(pros) && pros.length > 0 && Array.isArray(cons) && cons.length > 0

  const checks: [string, boolean][] = [
    ['Revenue & Profit', !!(opp.monthly_rev_min && opp.monthly_profit_min)],
    ['Score Breakdown', !!opp.score_breakdown],
    ['Financial Projections', !!opp.financial_projections],
    ['Full Description', !!opp.full_desc],
    ['FAQs', faqsOk],
    ['Pros & Cons', prosConsOk],

    ['Headcount', !!opp.headcount],
    ['Govt Scheme Details', !!opp.govt_scheme_details],
    ['Setup Cost Breakdown', !!opp.setup_cost_breakdown],
    ['Licenses Required', !!opp.licenses_required],
    ['Hero Image', !!opp.hero_image_url],

    ['Logo', !!opp.logo_url],
    ['State Tags', !!(opp.state_tags as unknown[] | undefined)?.length],
    ['Similar Opps', !!(opp.similar_slugs as unknown[] | undefined)?.length],
    ['Target Customer Pills', !!(opp.target_customer_pills as unknown[] | undefined)?.length],
    ['Machinery List', !!opp.machinery_list],
  ]

  const weights = [10, 10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2]
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  let score = 0
  const missing: string[] = []
  checks.forEach(([label, filled], i) => {
    if (filled) score += weights[i]!
    else missing.push(label)
  })

  return { score: Math.round((score / totalWeight) * 100), missing }
}

/** Map completeness pill label → editor tab + DOM id for scroll/highlight */
export const COMPLETENESS_SCROLL_TARGETS: Record<string, { tab: string; anchorId: string }> = {
  'Revenue & Profit': { tab: 'financials', anchorId: 'sec-revenue' },
  'Score Breakdown': { tab: 'financials', anchorId: 'sec-fit-score' },
  'Financial Projections': { tab: 'financials', anchorId: 'sec-financial-projections' },
  'Full Description': { tab: 'content', anchorId: 'sec-full-desc' },
  FAQs: { tab: 'content', anchorId: 'sec-faqs' },
  'Pros & Cons': { tab: 'content', anchorId: 'sec-pros-cons' },
  Headcount: { tab: 'team', anchorId: 'sec-headcount' },
  'Govt Scheme Details': { tab: 'compliance', anchorId: 'sec-govt-schemes' },
  'Setup Cost Breakdown': { tab: 'financials', anchorId: 'sec-investment' },
  'Licenses Required': { tab: 'compliance', anchorId: 'sec-licenses' },
  'Hero Image': { tab: 'core', anchorId: 'sec-hero-image' },
  Logo: { tab: 'core', anchorId: 'sec-logo' },
  'State Tags': { tab: 'location', anchorId: 'sec-state-tags' },
  'Similar Opps': { tab: 'location', anchorId: 'sec-similar-slugs' },
  'Target Customer Pills': { tab: 'location', anchorId: 'sec-target-pills' },
  'Machinery List': { tab: 'setup-cost-breakdown', anchorId: 'sec-machinery' },
}

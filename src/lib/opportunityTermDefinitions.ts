/** Glossary keys for labels and section titles on the opportunity detail page. */
export type OpportunityTermKey =
  | 'setup_cost'
  | 'monthly_profit'
  | 'effort_level'
  | 'gross_margin'
  | 'demand_trend'
  | 'fit_score'
  | 'score_breakdown'
  | 'deployment_suitability'
  | 'target_demographics'
  | 'geographic_coordinates'
  | 'business_overview'
  | 'key_market_trends'
  | 'market_volume_capacity'
  | 'market_intelligence'
  | 'growth_rate_and_trend'
  | 'demand_velocity_trend'
  | 'demographic_profiling'
  | 'revenue_estimator'
  | 'revenue_streams'
  | 'marketing_strategy'
  | 'direct_competitors'
  | 'indirect_threats'
  | 'your_advantages'
  | 'strategic_action_plan'
  | 'space_location'
  | 'team_required'
  | 'machinery_equipment'
  | 'raw_materials'
  | 'licences_registrations'
  | 'government_schemes'
  | 'expert_tips'
  | 'faq'
  | 'research_saturation'
  | 'profitability'
  | 'ease_of_execution'
  | 'govt_support'
  | 'market_momentum'

export const OPPORTUNITY_TERM_DEFINITIONS: Record<OpportunityTermKey, string> = {
  setup_cost:
    'The sum of all upfront assets, build-out expenses, and day-one cash reserves needed to open the doors.',
  monthly_profit:
    'The projected baseline earnings of the business once fully operational, calculated after subtracting all core recurring expenses from modeled revenue.',
  effort_level:
    'composite rating of the day-to-day managerial burden, measuring the specialized skills, active hours, and coordination complexity required to keep the business running smoothly.',
  gross_margin:
    'Share of revenue left after direct costs (materials, packaging, delivery, etc.) before rent, salaries, and overhead.',
  demand_trend:
    'Direction of customer demand for this category — rising, stable, or softening — based on market signals in our dataset.',
  fit_score:
    'Overall suitability score (0–100) summarizing how well this opportunity matches typical success factors in our model.',
  score_breakdown:
    'How the fit score splits across profitability, ease, government support, and market momentum.',
  deployment_suitability:
    'Where this model works best — city tier, format (kiosk vs store), and location types that fit the playbook.',
  target_demographics:
    'Primary customer segments most likely to buy — age, income, behavior, and use cases.',
  geographic_coordinates:
    'States or regions where demand, regulation, or economics make this opportunity especially viable.',
  business_overview:
    'Plain-language summary of what the business does, who it serves, and why the opportunity exists.',
  key_market_trends:
    'Macro and category-level shifts — growth, regulation, technology, and consumer behavior affecting this space.',
  market_volume_capacity:
    'How large the addressable market is and how much revenue the category can absorb in your target geography.',
  market_intelligence:
    'Curated signals — pricing bands, seasonality, whitespace, and risks — distilled from research on this category.',
  growth_rate_and_trend:
    'How fast the category is growing (CAGR), how saturated it is, and seasonal or structural demand patterns.',
  demand_velocity_trend:
    'How fast demand is changing over time — acceleration, plateau, or slowdown in search, spend, or footfall proxies.',
  demographic_profiling:
    'Structured view of who buys, how often, and what motivates them — used to shape offer and marketing.',
  revenue_estimator:
    'Conservative, realistic, and optimistic monthly revenue and profit projections based on modeled unit economics.',
  revenue_streams:
    'Distinct ways this business earns money — products, services, subscriptions, add-ons, or B2B contracts.',
  marketing_strategy:
    'Recommended channels, messaging, launch sequence, and budget milestones to acquire customers.',
  direct_competitors:
    'Businesses offering the same core product or service to the same customers in your market.',
  indirect_threats:
    'Substitutes and adjacent players that can capture spend without being a direct copy of your model.',
  your_advantages:
    'Differentiators you can lean on — cost, speed, niche, brand, or operational edge versus incumbents.',
  strategic_action_plan:
    'Prioritized moves to validate, launch, and defend the business in the first 90 days.',
  space_location:
    'Physical footprint needs — area, rent bands, footfall, zoning, and city-level rent benchmarks.',
  team_required:
    'Roles and headcount typically needed to operate at the modeled scale — owners, staff, and specialists.',
  machinery_equipment:
    'Machines, tools, and fixed assets required to produce or deliver the offer, with indicative costs.',
  raw_materials:
    'Inputs and consumables needed per unit or per month, with sourcing notes and cost drivers.',
  licences_registrations:
    'Registrations, permits, and compliance steps required to operate legally in India (or listed markets).',
  government_schemes:
    'Subsidies, credit guarantees, tax benefits, and programs you may qualify for as a new venture.',
  expert_tips:
    'Practical advice from operators and analysts — pitfalls, shortcuts, and validation steps.',
  faq:
    'Common questions founders ask about this opportunity, with concise answers.',
  research_saturation:
    'How crowded research or positioning is for this idea — higher saturation means more similar plays in market.',
  profitability:
    'Sub-score for margins, unit economics, and payback — higher means stronger modeled returns.',
  ease_of_execution:
    'Sub-score for operational complexity, sourcing difficulty, and skill barriers.',
  govt_support:
    'Sub-score for schemes, subsidies, and clarity of licensing for this category.',
  market_momentum:
    'Sub-score for demand growth, competitive intensity, and timing tailwinds.',
}

export function opportunityTermDefinition(key: OpportunityTermKey): string {
  return OPPORTUNITY_TERM_DEFINITIONS[key]
}

/** Maps visible section titles to glossary keys when they differ from the key name. */
export const OPPORTUNITY_SECTION_TITLE_TERMS: Record<string, OpportunityTermKey> = {
  'Key Market Trends': 'key_market_trends',
  'Demographic Profiling Matrix': 'demographic_profiling',
  'Revenue Estimator': 'revenue_estimator',
  'Revenue streams': 'revenue_streams',
  'Marketing strategy': 'marketing_strategy',
  'Space & Location': 'space_location',
  'Team required': 'team_required',
  'Raw materials': 'raw_materials',
  'Licences & Registrations': 'licences_registrations',
  'Government Schemes & Support': 'government_schemes',
  'Expert tips': 'expert_tips',
  'Frequently Asked Questions': 'faq',
  'Machinery & Equipment': 'machinery_equipment',
  'Business Overview': 'business_overview',
  'Score Breakdown': 'score_breakdown',
  'Deployment Suitability': 'deployment_suitability',
  'Target Demographics': 'target_demographics',
  'Geographic Coordinates': 'geographic_coordinates',
  'Market Volume Capacity': 'market_volume_capacity',
  'Market Intelligence': 'market_intelligence',
  'GROWTH RATE AND TREND': 'growth_rate_and_trend',
  'Growth Rate and Trend': 'growth_rate_and_trend',
  'Demand Velocity Trend': 'demand_velocity_trend',
  'Direct Competitors': 'direct_competitors',
  'Indirect Threats': 'indirect_threats',
  'Your Advantages': 'your_advantages',
  'Strategic Action Plan': 'strategic_action_plan',
}

export function opportunityTermKeyForTitle(title: string): OpportunityTermKey | undefined {
  return OPPORTUNITY_SECTION_TITLE_TERMS[title]
}

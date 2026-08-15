import type { ResearchStyle } from '@/lib/researchStyles'

export type ReResearchSectionKey =
  | 'market_demographics'
  | 'market_intelligence'
  | 'demand_trend'
  | 'competitors'
  | 'pain_points'
  | 'saturation_level'
  | 'market_verdict'
  | 'future_outlook'
  | 'score_breakdown'
  | 'machinery_list'
  | 'raw_materials'
  | 'headcount'
  | 'setup_cost_breakdown'
  | 'space_location'
  | 'licenses_required'
  | 'govt_schemes'
  | 'financial_projections'
  | 'revenue_streams'
  | 'unit_economics_deep'
  | 'funding_options'
  | 'risk_matrix'
  | 'marketing_strategy'
  | 'tools_and_stack'
  | 'expert_tips_structured'
  | 'pros'
  | 'cons'
  | 'faqs'
  | 'strategic_frameworks'
  | 'porters_five_forces'
  | 'transformation_roadmap'
  | 'valuation_model'
  | 'investor_memo'
  | 'capital_efficiency_metrics'
  | 'risk_register'
  | 'compliance_checklist'
  | 'internal_controls_framework'

export type ReResearchSectionDef = {
  key: ReResearchSectionKey
  label: string
}

export type ReResearchSectionGroup = {
  id: string
  label: string
  sections: ReResearchSectionDef[]
}

export const RE_RESEARCH_STANDARD_GROUPS: ReResearchSectionGroup[] = [
  {
    id: 'market_growth',
    label: 'Market & Growth',
    sections: [
      { key: 'market_demographics', label: 'Market Demographics' },
      { key: 'market_intelligence', label: 'Market Intelligence / TAM SAM SOM' },
      { key: 'demand_trend', label: 'Demand Trend' },
      { key: 'competitors', label: 'Competitor Analysis' },
      { key: 'pain_points', label: 'Pain Points' },
      { key: 'saturation_level', label: 'Market Saturation' },
      { key: 'market_verdict', label: 'Market Verdict' },
      { key: 'future_outlook', label: 'Future Outlook' },
      { key: 'score_breakdown', label: 'Score Breakdown' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    sections: [
      { key: 'machinery_list', label: 'Machinery & Equipment' },
      { key: 'raw_materials', label: 'Raw Materials' },
      { key: 'headcount', label: 'Team & Headcount' },
      { key: 'setup_cost_breakdown', label: 'Setup Cost Breakdown' },
      { key: 'space_location', label: 'Space & Location' },
      { key: 'licenses_required', label: 'Licenses & Permits' },
      { key: 'govt_schemes', label: 'Government Schemes' },
    ],
  },
  {
    id: 'financials',
    label: 'Financials',
    sections: [
      { key: 'financial_projections', label: 'Financial Projections' },
      { key: 'revenue_streams', label: 'Revenue Streams' },
      { key: 'unit_economics_deep', label: 'Unit Economics' },
      { key: 'funding_options', label: 'Funding Options' },
      { key: 'risk_matrix', label: 'Risk Matrix' },
    ],
  },
  {
    id: 'strategy_marketing',
    label: 'Strategy & Marketing',
    sections: [
      { key: 'marketing_strategy', label: 'Marketing Strategy' },
      { key: 'tools_and_stack', label: 'Tools & Tech Stack' },
      { key: 'expert_tips_structured', label: 'Expert Tips' },
      { key: 'pros', label: 'Pros (Advantages)' },
      { key: 'cons', label: 'Cons (Risks)' },
      { key: 'faqs', label: 'FAQs' },
    ],
  },
]

const ADVISORY_ADDON_SECTIONS: ReResearchSectionDef[] = [
  { key: 'strategic_frameworks', label: 'Strategic Frameworks (MECE + 3 Horizons)' },
  { key: 'porters_five_forces', label: "Porter's Five Forces" },
  { key: 'transformation_roadmap', label: 'Transformation Roadmap' },
]

const BANKING_ADDON_SECTIONS: ReResearchSectionDef[] = [
  { key: 'valuation_model', label: 'Valuation Model (DCF + Comparables)' },
  { key: 'investor_memo', label: 'Investor Memo' },
  { key: 'capital_efficiency_metrics', label: 'Capital Efficiency Metrics' },
]

const KPMG_ADDON_SECTIONS: ReResearchSectionDef[] = [
  { key: 'risk_register', label: 'Risk Register' },
  { key: 'compliance_checklist', label: 'Compliance Checklist' },
  { key: 'internal_controls_framework', label: 'Internal Controls Framework' },
]

const STYLE_ADDON_KEYS: Record<ResearchStyle, ReResearchSectionKey[]> = {
  standard: [],
  mckinsey: ADVISORY_ADDON_SECTIONS.map((s) => s.key),
  bcg: ADVISORY_ADDON_SECTIONS.map((s) => s.key),
  bain: ADVISORY_ADDON_SECTIONS.map((s) => s.key),
  goldman_sachs: BANKING_ADDON_SECTIONS.map((s) => s.key),
  jp_morgan: BANKING_ADDON_SECTIONS.map((s) => s.key),
  kpmg: KPMG_ADDON_SECTIONS.map((s) => s.key),
}

export function getStyleAddonSections(style: ResearchStyle): ReResearchSectionDef[] {
  switch (style) {
    case 'mckinsey':
    case 'bcg':
    case 'bain':
      return ADVISORY_ADDON_SECTIONS
    case 'goldman_sachs':
    case 'jp_morgan':
      return BANKING_ADDON_SECTIONS
    case 'kpmg':
      return KPMG_ADDON_SECTIONS
    default:
      return []
  }
}

export function getReResearchSectionGroups(style: ResearchStyle): ReResearchSectionGroup[] {
  const addons = getStyleAddonSections(style)
  if (addons.length === 0) return RE_RESEARCH_STANDARD_GROUPS
  return [
    ...RE_RESEARCH_STANDARD_GROUPS,
    { id: 'style_addons', label: 'Style-Specific Sections', sections: addons },
  ]
}

export function getAllReResearchSections(style: ResearchStyle): ReResearchSectionDef[] {
  return getReResearchSectionGroups(style).flatMap((g) => g.sections)
}

export function getStyleAddonSectionKeys(style: ResearchStyle): Set<ReResearchSectionKey> {
  return new Set(STYLE_ADDON_KEYS[style] ?? [])
}

export function isValidReResearchSectionForStyle(
  key: ReResearchSectionKey,
  style: ResearchStyle,
): boolean {
  return getAllReResearchSections(style).some((s) => s.key === key)
}

const ALL_KNOWN_SECTIONS: ReResearchSectionDef[] = [
  ...RE_RESEARCH_STANDARD_GROUPS.flatMap((g) => g.sections),
  ...ADVISORY_ADDON_SECTIONS,
  ...BANKING_ADDON_SECTIONS,
  ...KPMG_ADDON_SECTIONS,
]

/** Flat list of standard sections (excludes style addons). */
export const RE_RESEARCH_SECTIONS = RE_RESEARCH_STANDARD_GROUPS.flatMap((g) => g.sections)

export function getReResearchSectionLabel(key: string): string {
  return (
    ALL_KNOWN_SECTIONS.find((s) => s.key === key)?.label ??
    key.replace(/_/g, ' ')
  )
}

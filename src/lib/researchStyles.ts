export type ResearchStyle =
  | 'standard'
  | 'mckinsey'
  | 'bcg'
  | 'bain'
  | 'goldman_sachs'
  | 'jp_morgan'
  | 'kpmg'

export interface ResearchStyleOption {
  value: ResearchStyle
  label: string
  firm: string
  tier: 'standard' | 'advisory' | 'banking' | 'audit'
  description: string
}

export const RESEARCH_STYLE_OPTIONS: ResearchStyleOption[] = [
  {
    value: 'standard',
    label: 'Standard',
    firm: 'Standard Research',
    tier: 'standard',
    description: 'Comprehensive business intelligence report',
  },
  {
    value: 'mckinsey',
    label: 'McKinsey',
    firm: 'McKinsey & Company',
    tier: 'advisory',
    description: 'MECE strategy, 3-horizon model, transformation roadmap',
  },
  {
    value: 'bcg',
    label: 'BCG',
    firm: 'Boston Consulting Group',
    tier: 'advisory',
    description: 'Growth-share matrix, hypothesis-driven competitive analysis',
  },
  {
    value: 'bain',
    label: 'Bain',
    firm: 'Bain & Company',
    tier: 'advisory',
    description: 'Loyalty economics, NPS growth, implementable playbook',
  },
  {
    value: 'goldman_sachs',
    label: 'Goldman',
    firm: 'Goldman Sachs',
    tier: 'banking',
    description: 'DCF valuation, multiples, investor memo, bull/base/bear',
  },
  {
    value: 'jp_morgan',
    label: 'JP Morgan',
    firm: 'JP Morgan',
    tier: 'banking',
    description: 'Macro-anchored, credit risk, capital allocation scenarios',
  },
  {
    value: 'kpmg',
    label: 'KPMG',
    firm: 'KPMG Advisory',
    tier: 'audit',
    description: 'Risk register, compliance checklist, internal controls',
  },
]

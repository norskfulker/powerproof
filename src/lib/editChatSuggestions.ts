import type { ComponentType } from 'react'
import {
  BarChart2,
  Coins,
  Factory,
  FileText,
  Megaphone,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from '@/lib/icons'
import type { EditChatSuggestion } from '@/lib/opportunityEditChat'

const SECTION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  market_demographics: Users,
  market_intelligence: BarChart2,
  demand_trend: TrendingUp,
  competitors: Shield,
  score_breakdown: BarChart2,
  machinery_list: Factory,
  raw_materials: Factory,
  headcount: Users,
  setup_cost_breakdown: Coins,
  space_location: Settings,
  licenses_required: FileText,
  govt_schemes: FileText,
  financial_projections: TrendingUp,
  revenue_streams: Coins,
  unit_economics_deep: TrendingUp,
  funding_options: Coins,
  risk_matrix: Shield,
  marketing_strategy: Megaphone,
  tools_and_stack: Settings,
  expert_tips_structured: Sparkles,
  pros: Sparkles,
  cons: Shield,
  faqs: FileText,
  strategic_frameworks: BarChart2,
  porters_five_forces: Shield,
  transformation_roadmap: TrendingUp,
  valuation_model: TrendingUp,
  investor_memo: FileText,
  capital_efficiency_metrics: Coins,
  risk_register: Shield,
  compliance_checklist: FileText,
  internal_controls_framework: Settings,
  // Market Test
  demand_signals: TrendingUp,
  red_flags: Shield,
  past_failures: Shield,
  past_successes: Sparkles,
  honest_verdict: FileText,
  // War Room
  founder_honest_take: Sparkles,
  thirty_day_sprint: TrendingUp,
  steps: Settings,
}

export function getSuggestionIcon(section: string): ComponentType<{ className?: string }> {
  return SECTION_ICONS[section] ?? Sparkles
}

export function suggestionChipLabel(suggestion: EditChatSuggestion): string {
  return suggestion.has_data ? suggestion.label : `+ Generate ${suggestion.label}`
}

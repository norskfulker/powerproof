import type { RemixIcon } from '@/lib/icons'
import {
  BarChart3,
  Briefcase,
  Calculator,
  FileText,
  Globe2,
  Landmark,
  LineChart,
  Map,
  MessageSquare,
  Microscope,
  Package,
  Shield,
  Sparkles,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Truck,
  Unlock,
  Waypoints,
} from '@/lib/icons'

export type PreviewUnlockChip = {
  label: string
  icon: RemixIcon
}

export const PREVIEW_RESEARCH_UNLOCK_CHIPS: PreviewUnlockChip[] = [
  { label: 'Full market & competitor analysis', icon: Microscope },
  { label: 'TAM / SAM / SOM sizing', icon: Map },
  { label: 'P&L, margins & payback ranges', icon: Calculator },
  { label: 'Unit economics deep-dive', icon: LineChart },
  { label: 'Biggest risk & mitigation playbook', icon: Shield },
  { label: 'Revenue scenario modeling', icon: TrendingUp },
  { label: 'Saturation score breakdown', icon: Target },
  { label: 'Competitor deep-dive profiles', icon: Swords },
  { label: 'Govt schemes & subsidies', icon: Landmark },
  { label: 'License & compliance checklist', icon: FileText },
  { label: 'Machinery & capex breakdown', icon: Package },
  { label: 'Expert tips & founder insights', icon: Sparkles },
  { label: 'Marketing strategy channels', icon: BarChart3 },
  { label: 'Funding options & debt stack', icon: Briefcase },
  { label: 'Market trends & momentum signals', icon: Globe2 },
  { label: 'Lender-ready FAQ answers', icon: MessageSquare },
  { label: 'Ask AI anything about the idea', icon: MessageSquare },
  { label: 'Export-ready lender deck', icon: FileText },
  { label: 'War Room competitor playbooks', icon: Swords },
  { label: 'Supplier sourcing leads', icon: Truck },
  { label: 'Location & rent benchmarks', icon: Map },
  { label: 'Revenue stream breakdown', icon: TrendingUp },
  { label: 'Risk matrix heatmap', icon: Shield },
  { label: 'Opportunity Fit Index', icon: Target },
  { label: 'Save, share & revisit anytime', icon: Unlock },
]

export const PREVIEW_ROADMAP_UNLOCK_CHIPS: PreviewUnlockChip[] = [
  { label: 'Complete phased execution plan', icon: Waypoints },
  { label: 'Every milestone, task & deadline', icon: Timer },
  { label: 'Decision gates & branching paths', icon: Target },
  { label: 'Weekly timeline & Gantt views', icon: BarChart3 },
  { label: 'Resource links & vendor leads', icon: Truck },
  { label: 'Flowchart & swimlane views', icon: Map },
  { label: 'Phase-by-phase budget bands', icon: Calculator },
  { label: 'Critical path & dependencies', icon: LineChart },
  { label: 'Hiring & team build milestones', icon: Briefcase },
  { label: 'Launch checklist & go-live gates', icon: Sparkles },
  { label: 'Compliance milestones by week', icon: Shield },
  { label: 'Marketing launch sequence', icon: TrendingUp },
  { label: 'Supplier onboarding timeline', icon: Package },
  { label: 'Fundraising milestone map', icon: Landmark },
  { label: 'Pivot & contingency branches', icon: Swords },
  { label: 'Export roadmap to PDF', icon: FileText },
  { label: 'Sync roadmap to your project', icon: Unlock },
  { label: 'Ask AI to refine any phase', icon: MessageSquare },
]

export function previewUnlockChipsFor(focus: 'research' | 'roadmap'): PreviewUnlockChip[] {
  return focus === 'roadmap' ? PREVIEW_ROADMAP_UNLOCK_CHIPS : PREVIEW_RESEARCH_UNLOCK_CHIPS
}

export function previewUnlockTitleFor(focus: 'research' | 'roadmap'): string {
  return focus === 'roadmap' ? 'Sign up to unlock full roadmap' : 'Sign up to unlock full research'
}

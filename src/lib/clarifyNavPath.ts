import {
  CLARIFY_FLOW_HOME,
  RESEARCH_CLARIFY_ROUTE,
  ROADMAP_CLARIFY_ROUTE,
  WAR_ROOM_CLARIFY_ROUTE,
  type ClarifyFlowKind,
} from '@/lib/discoverHeroRoutes'

const CLARIFY_ROUTES = new Set([
  RESEARCH_CLARIFY_ROUTE,
  WAR_ROOM_CLARIFY_ROUTE,
  ROADMAP_CLARIFY_ROUTE,
])

const CLARIFY_BACK_LABELS: Record<ClarifyFlowKind, string> = {
  research: 'Back to Research',
  'war-room': 'Back to War Room',
  roadmap: 'Back to Roadmaps',
}

export function isClarifyPath(pathname: string): boolean {
  return CLARIFY_ROUTES.has(pathname)
}

export function getClarifyFlowKind(pathname: string): ClarifyFlowKind | null {
  if (pathname === RESEARCH_CLARIFY_ROUTE) return 'research'
  if (pathname === WAR_ROOM_CLARIFY_ROUTE) return 'war-room'
  if (pathname === ROADMAP_CLARIFY_ROUTE) return 'roadmap'
  return null
}

export function getClarifyPageBackHref(pathname: string): string {
  const kind = getClarifyFlowKind(pathname)
  return kind ? CLARIFY_FLOW_HOME[kind] : CLARIFY_FLOW_HOME.research
}

export function getClarifyPageBackLabel(pathname: string): string {
  const kind = getClarifyFlowKind(pathname)
  return kind ? CLARIFY_BACK_LABELS[kind] : 'Back'
}

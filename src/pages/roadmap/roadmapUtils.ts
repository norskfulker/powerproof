import type { RoadmapNode, RoadmapNodeWithChildren } from './roadmapTypes'

function normalizeResource(raw: unknown): RoadmapNode['resources'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const entry = raw as Record<string, unknown>
  const label = typeof entry.label === 'string' ? entry.label.trim() : ''
  const url = typeof entry.url === 'string' ? entry.url.trim() : ''
  const type = typeof entry.type === 'string' && entry.type.trim() ? entry.type.trim() : 'website'
  if (!label && !url) return null
  return { label: label || url, url, type }
}

export function normalizeNode(raw: Record<string, unknown>): RoadmapNode {
  const metadata: Record<string, unknown> = {
    ...((raw.metadata as Record<string, unknown>) ?? {}),
  }

  if (Array.isArray(raw.tasks) && !Array.isArray(metadata.tasks)) {
    metadata.tasks = raw.tasks
  }
  if (typeof raw.temp_id === 'string' && raw.temp_id.trim() && !metadata.temp_id) {
    metadata.temp_id = raw.temp_id.trim()
  }
  if (
    typeof raw.parent_temp_id === 'string' &&
    raw.parent_temp_id.trim() &&
    !metadata.parent_temp_id
  ) {
    metadata.parent_temp_id = raw.parent_temp_id.trim()
  }

  for (const key of [
    'exact_time_allocation',
    'specific_tool_platform',
    'measurable_output',
    'trigger_to_move_on',
  ] as const) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim() && metadata[key] == null) {
      metadata[key] = value.trim()
    }
  }

  return {
    ...(raw as RoadmapNode),
    action_items: Array.isArray(raw.action_items) ? (raw.action_items as string[]) : [],
    resources: Array.isArray(raw.resources)
      ? (raw.resources as unknown[])
          .map(normalizeResource)
          .filter((r): r is RoadmapNode['resources'][number] => r !== null)
      : [],
    decision_branches: Array.isArray(raw.decision_branches)
      ? (raw.decision_branches as RoadmapNode['decision_branches'])
      : [],
    metadata,
  }
}

export function buildTree(nodes: RoadmapNode[]): RoadmapNodeWithChildren[] {
  const map = new Map<string, RoadmapNodeWithChildren>()
  const roots: RoadmapNodeWithChildren[] = []

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] })
  }

  for (const node of nodes) {
    const n = map.get(node.id)!
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(n)
    } else {
      roots.push(n)
    }
  }

  function sortChildren(node: RoadmapNodeWithChildren) {
    node.children.sort((a, b) => a.sort_order - b.sort_order)
    node.children.forEach(sortChildren)
  }
  roots.sort((a, b) => a.sort_order - b.sort_order)
  roots.forEach(sortChildren)

  return roots
}

export function flattenTree(nodes: RoadmapNodeWithChildren[]): RoadmapNodeWithChildren[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)])
}

export function sortPhases(nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes
    .filter((n) => n.node_type === 'phase')
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function phasesFromTree(tree: RoadmapNodeWithChildren[]): RoadmapNode[] {
  return tree.filter((n) => n.node_type === 'phase')
}

export function phaseTasks(phaseId: string, nodes: RoadmapNode[]): RoadmapNode[] {
  const milestoneIds = new Set(
    nodes
      .filter((n) => n.parent_id === phaseId && n.node_type === 'milestone')
      .map((n) => n.id),
  )

  return nodes.filter((n) => {
    if (n.node_type !== 'task') return false
    if (n.parent_id === phaseId) return true
    if (n.parent_id && milestoneIds.has(n.parent_id)) return true
    return false
  })
}

/** Leaf completable steps: tasks, or milestones without child tasks. */
export function journeySteps(nodes: RoadmapNode[]): RoadmapNode[] {
  const tasks = nodes.filter((n) => n.node_type === 'task')
  const milestoneIdsWithTasks = new Set(
    tasks.map((t) => t.parent_id).filter((id): id is string => Boolean(id)),
  )

  const milestoneSteps = nodes.filter(
    (n) => n.node_type === 'milestone' && !milestoneIdsWithTasks.has(n.id),
  )

  return [...milestoneSteps, ...tasks]
}

function nodeBelongsToPhase(node: RoadmapNode, phaseId: string, nodes: RoadmapNode[]): boolean {
  if (node.parent_id === phaseId) return true
  if (!node.parent_id) return false
  const parent = nodes.find((n) => n.id === node.parent_id)
  if (!parent) return false
  return parent.parent_id === phaseId
}

export function phaseJourneySteps(phaseId: string, nodes: RoadmapNode[]): RoadmapNode[] {
  return journeySteps(nodes).filter((step) => nodeBelongsToPhase(step, phaseId, nodes))
}

export function phaseProgress(
  phaseId: string,
  nodes: RoadmapNode[],
): { completed: number; total: number; percent: number } {
  const steps = phaseJourneySteps(phaseId, nodes)
  const completed = steps.filter((s) => s.is_completed).length
  const total = steps.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, percent }
}

export function roadmapOverallProgress(nodes: RoadmapNode[]): {
  completed: number
  total: number
  percent: number
} {
  const steps = journeySteps(nodes)
  const completed = steps.filter((s) => s.is_completed).length
  const total = steps.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, percent }
}

export function phaseChildren(phaseId: string, nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes
    .filter((n) => n.parent_id === phaseId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

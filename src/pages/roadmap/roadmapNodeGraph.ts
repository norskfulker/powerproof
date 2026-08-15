import { normalizeNode } from './roadmapUtils'
import type { RoadmapNode } from './roadmapTypes'

const TASK_DETAIL_FIELDS = [
  ['exact_time_allocation', 'Time'],
  ['specific_tool_platform', 'Tool / platform'],
  ['measurable_output', 'Output'],
  ['trigger_to_move_on', 'Move on when'],
] as const

export function isSyntheticRoadmapTaskId(id: string): boolean {
  return id.startsWith('roadmap-task:') || id.startsWith('roadmap-gen:')
}

export function buildTaskDescription(raw: Record<string, unknown>): string | null {
  const base = typeof raw.description === 'string' ? raw.description.trim() : ''
  const meta =
    raw.metadata && typeof raw.metadata === 'object'
      ? (raw.metadata as Record<string, unknown>)
      : {}
  const lines: string[] = []
  if (base) lines.push(base)

  for (const [key, label] of TASK_DETAIL_FIELDS) {
    const value = raw[key] ?? meta[key]
    if (typeof value === 'string' && value.trim()) {
      lines.push(`${label}: ${value.trim()}`)
    }
  }

  return lines.length > 0 ? lines.join('\n\n') : null
}

function readTempId(raw: Record<string, unknown>): string | null {
  const meta =
    raw.metadata && typeof raw.metadata === 'object'
      ? (raw.metadata as Record<string, unknown>)
      : {}
  const fromMeta = meta.temp_id
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim()
  const direct = raw.temp_id
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  return null
}

function readNestedTasksRaw(node: RoadmapNode): Record<string, unknown>[] {
  const raw = node as unknown as Record<string, unknown>
  const candidates = [node.metadata?.tasks, raw.tasks]
  for (const entry of candidates) {
    if (!Array.isArray(entry)) continue
    return entry.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  }
  return []
}

function enrichTaskNode(node: RoadmapNode): RoadmapNode {
  if (node.node_type !== 'task') return node
  const raw = node as unknown as Record<string, unknown>
  const description = buildTaskDescription(raw)
  const duration =
    node.duration_label ??
    (typeof raw.exact_time_allocation === 'string' ? raw.exact_time_allocation : null) ??
    (typeof node.metadata?.exact_time_allocation === 'string'
      ? node.metadata.exact_time_allocation
      : null)

  if (!description && !duration) return node

  return {
    ...node,
    description: description ?? node.description,
    duration_label: duration,
  }
}

function createTaskNodeFromRaw(
  raw: Record<string, unknown>,
  parent: RoadmapNode,
  sortOrder: number,
): RoadmapNode {
  const tempId = readTempId(raw)
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : tempId
        ? `roadmap-task:${parent.id}:${tempId}`
        : `roadmap-task:${parent.id}:${sortOrder}`

  const metadata: Record<string, unknown> = {
    ...((raw.metadata as Record<string, unknown>) ?? {}),
  }
  if (tempId) metadata.temp_id = tempId
  metadata.synthetic = typeof raw.id !== 'string'

  return enrichTaskNode(
    normalizeNode({
      ...raw,
      id,
      roadmap_id: parent.roadmap_id,
      parent_id: parent.id,
      node_type: 'task',
      title: typeof raw.title === 'string' ? raw.title : `Task ${sortOrder + 1}`,
      description: buildTaskDescription(raw),
      sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : sortOrder,
      position_x: typeof raw.position_x === 'number' ? raw.position_x : 0,
      position_y: typeof raw.position_y === 'number' ? raw.position_y : 0,
      is_critical_path: false,
      is_optional: Boolean(raw.is_optional),
      is_completed: Boolean(raw.is_completed),
      completed_at: null,
      created_at: parent.created_at,
      action_items: [],
      resources: [],
      emotional_tag: null,
      emotional_note: null,
      timeline_week_start: null,
      timeline_week_end: null,
      duration_label:
        typeof raw.exact_time_allocation === 'string' ? raw.exact_time_allocation : null,
      decision_branches: [],
      metadata,
    }),
  )
}

/** Resolve temp_id parent links, enrich tasks, and expand nested milestone tasks for display. */
export function prepareRoadmapNodes(rawNodes: RoadmapNode[]): RoadmapNode[] {
  const normalized = rawNodes.map((node) => normalizeNode(node as unknown as Record<string, unknown>))

  const tempIdToId = new Map<string, string>()
  for (const node of normalized) {
    const tempId = readTempId(node as unknown as Record<string, unknown>)
    if (tempId) tempIdToId.set(tempId, node.id)
  }

  const resolved = normalized.map((node) => {
    if (!node.parent_id) return node
    const mappedParentId = tempIdToId.get(node.parent_id)
    return mappedParentId ? { ...node, parent_id: mappedParentId } : node
  })

  const enriched = resolved.map(enrichTaskNode)

  const existingTaskKeys = new Set(
    enriched
      .filter((node) => node.node_type === 'task' && node.parent_id)
      .map((node) => `${node.parent_id}:${node.title.trim().toLowerCase()}`),
  )

  const expanded: RoadmapNode[] = [...enriched]

  for (const node of enriched) {
    if (node.node_type !== 'milestone') continue

    const nestedTasks = readNestedTasksRaw(node)
    if (nestedTasks.length === 0) continue

    const hasLinkedTasks = enriched.some(
      (candidate) => candidate.node_type === 'task' && candidate.parent_id === node.id,
    )
    if (hasLinkedTasks) continue

    nestedTasks.forEach((taskRaw, index) => {
      const title = typeof taskRaw.title === 'string' ? taskRaw.title.trim() : ''
      const dedupeKey = `${node.id}:${title.toLowerCase()}`
      if (title && existingTaskKeys.has(dedupeKey)) return

      const taskNode = createTaskNodeFromRaw(taskRaw, node, index)
      expanded.push(taskNode)
      if (title) existingTaskKeys.add(dedupeKey)
    })
  }

  return expanded
}

export function milestoneTasks(milestoneId: string, nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes
    .filter((node) => node.parent_id === milestoneId && node.node_type === 'task')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

function nodesFromGeneratedGraph(roadmapId: string, generated: unknown[]): RoadmapNode[] {
  return prepareRoadmapNodes(
    generated
      .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
      .map((raw, index) =>
        normalizeNode({
          ...raw,
          id:
            typeof raw.temp_id === 'string'
              ? `roadmap-gen:${raw.temp_id}`
              : `roadmap-gen:${index}`,
          roadmap_id: roadmapId,
          parent_id:
            typeof raw.parent_temp_id === 'string' ? raw.parent_temp_id : null,
          is_completed: false,
          completed_at: null,
          created_at: new Date().toISOString(),
        }),
      ),
  )
}

/** Prefer DB nodes; fall back to metadata.generated_nodes when milestones/tasks were not persisted. */
export function resolveRoadmapDisplayNodes(
  dbNodes: RoadmapNode[],
  roadmapId: string,
  metadata?: Record<string, unknown>,
): RoadmapNode[] {
  const prepared = prepareRoadmapNodes(dbNodes)
  const dbMilestoneCount = prepared.filter((node) => node.node_type === 'milestone').length
  const dbTaskCount = prepared.filter((node) => node.node_type === 'task').length

  const generated = metadata?.generated_nodes
  if (!Array.isArray(generated) || generated.length === 0) {
    return prepared
  }

  const genPrepared = nodesFromGeneratedGraph(roadmapId, generated)
  const genMilestoneCount = genPrepared.filter((node) => node.node_type === 'milestone').length
  const genTaskCount = genPrepared.filter((node) => node.node_type === 'task').length

  if (dbMilestoneCount >= genMilestoneCount && dbTaskCount >= genTaskCount) {
    return prepared
  }

  const completedByTempId = new Map<string, boolean>()
  for (const node of prepared) {
    const tempId = readTempId(node as unknown as Record<string, unknown>)
    if (tempId && node.is_completed) completedByTempId.set(tempId, true)
  }

  return genPrepared.map((node) => {
    const tempId = readTempId(node as unknown as Record<string, unknown>)
    if (!tempId || !completedByTempId.get(tempId)) return node
    return { ...node, is_completed: true }
  })
}

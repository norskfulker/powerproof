import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { isPersona } from '@/types/persona'
import { normalizeNode } from '@/pages/roadmap/roadmapUtils'
import { resolveRoadmapDisplayNodes } from '@/pages/roadmap/roadmapNodeGraph'
import type { RoadmapNode, UserRoadmap } from '@/pages/roadmap/roadmapTypes'

const ROADMAP_META_SELECT =
  'id, user_id, goal_input, title, subtitle, domain, context_summary, total_phases, total_milestones, total_tasks, total_weeks, difficulty, opening_message, closing_message, success_vision, tags, generation_status, persona, credits_used, metadata, created_at, updated_at'

const ROADMAP_NODES_SELECT =
  'id, parent_id, node_type, title, description, action_items, resources, emotional_tag, emotional_note, timeline_week_start, timeline_week_end, duration_label, position_x, position_y, sort_order, is_critical_path, is_optional, is_completed, completed_at, decision_branches, metadata, roadmap_id, created_at'

function mapRoadmapRow(row: Record<string, unknown>): UserRoadmap {
  return {
    ...(row as UserRoadmap),
    persona: isPersona(row.persona) ? row.persona : null,
  }
}

export function useRoadmap(roadmapId: string | undefined) {
  const [roadmap, setRoadmap] = useState<UserRoadmap | null>(null)
  const [nodes, setNodes] = useState<RoadmapNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoadmap = useCallback(async () => {
    if (!roadmapId) return

    const [roadmapRes, nodesRes] = await Promise.all([
      supabase
        .from('user_roadmaps')
        .select(ROADMAP_META_SELECT)
        .eq('id', roadmapId)
        .single(),

      supabase
        .from('roadmap_nodes')
        .select(ROADMAP_NODES_SELECT)
        .eq('roadmap_id', roadmapId)
        .order('sort_order', { ascending: true }),
    ])

    if (roadmapRes.error) throw roadmapRes.error

    const row = roadmapRes.data as Record<string, unknown>
    const metadata =
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : undefined

    setRoadmap(mapRoadmapRow(row))

    if (nodesRes.error) throw nodesRes.error

    if (row.generation_status === 'complete') {
      setNodes(
        resolveRoadmapDisplayNodes(
          (nodesRes.data ?? []).map((n) => normalizeNode(n as Record<string, unknown>)),
          roadmapId,
          metadata,
        ),
      )
    } else {
      setNodes([])
    }

    return row.generation_status as string | undefined
  }, [roadmapId])

  useEffect(() => {
    if (!roadmapId) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const status = await fetchRoadmap()
        if (cancelled) return

        if (status === 'processing' || status === 'pending') {
          pollTimer = setInterval(async () => {
            try {
              const latestStatus = await fetchRoadmap()
              if (
                latestStatus === 'complete' ||
                latestStatus === 'failed'
              ) {
                if (pollTimer) clearInterval(pollTimer)
                setLoading(false)
              }
            } catch {
              /* keep polling */
            }
          }, 3000)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load roadmap')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [roadmapId, fetchRoadmap])

  const resetNodes = useCallback(() => {
    setNodes([])
  }, [])

  return {
    roadmap,
    nodes,
    loading,
    error,
    fetchRoadmap,
    resetNodes,
    setNodes,
    setRoadmap,
  }
}

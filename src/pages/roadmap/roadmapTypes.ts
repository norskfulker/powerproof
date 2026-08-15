export type NodeType = 'phase' | 'milestone' | 'task' | 'decision' | 'emotional'

import type { Persona } from '@/types/persona'

export type RoadmapDomain = 'academic' | 'professional' | 'product_build' | 'personal' | 'general'

export type RoadmapDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/** Display-focused roadmap metadata (subset of `UserRoadmap`). */
export type RoadmapMeta = {
  id: string
  title: string
  subtitle: string | null
  domain: RoadmapDomain
  context_summary: string | null
  total_weeks: number
  difficulty: RoadmapDifficulty | null
  opening_message: string | null
  closing_message: string | null
  success_vision: string | null
  tags: string[]
  generation_status: UserRoadmap['generation_status']
  persona: Persona | null
  credits_used: number
  created_at: string
}

export interface RoadmapNodeWithChildren extends RoadmapNode {
  children: RoadmapNodeWithChildren[]
}

export type RoadmapNode = {
  id: string
  roadmap_id: string
  parent_id: string | null
  node_type: NodeType
  title: string
  description: string | null
  action_items: string[]
  resources: { label: string; url: string; type: string }[]
  emotional_tag: string | null
  emotional_note: string | null
  timeline_week_start: number | null
  timeline_week_end: number | null
  duration_label: string | null
  position_x: number
  position_y: number
  sort_order: number
  is_critical_path: boolean
  is_optional: boolean
  is_completed: boolean
  completed_at: string | null
  decision_branches: { label: string; condition: string; outcome: string }[]
  metadata: Record<string, unknown>
  created_at: string
}

export type UserRoadmap = {
  id: string
  user_id: string
  goal_input: string
  title: string
  subtitle: string | null
  domain: RoadmapDomain
  context_summary: string | null
  total_phases: number
  total_milestones: number
  total_tasks: number
  total_weeks: number
  difficulty: RoadmapDifficulty | null
  opening_message: string | null
  closing_message: string | null
  success_vision: string | null
  generation_status: 'pending' | 'processing' | 'complete' | 'failed' | 'clarifying'
  persona?: Persona | null
  credits_used: number
  tags: string[]
  metadata?: Record<string, unknown>
  clarify_state?: import('@/types/clarifyState').ClarifyStatePersisted | null
  created_at: string
  updated_at: string
}

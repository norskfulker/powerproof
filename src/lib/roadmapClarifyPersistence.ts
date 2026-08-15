import { supabase } from '@/lib/supabase'
import { dispatchClarifyHistoryRefetch } from '@/lib/clarifyStateEvents'
import type { ClarifyStatePersisted } from '@/types/clarifyState'

function roadmapTitleFromQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return 'Roadmap goal'
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

export async function createRoadmapClarifySession(
  userId: string,
  query: string,
  country: string,
  model: string,
  clarifyState: ClarifyStatePersisted,
): Promise<string> {
  const trimmed = query.trim()
  const { data, error } = await supabase
    .from('user_roadmaps')
    .insert({
      user_id: userId,
      goal_input: trimmed,
      title: roadmapTitleFromQuery(trimmed),
      subtitle: null,
      domain: 'general',
      context_summary: null,
      total_phases: 0,
      total_milestones: 0,
      total_tasks: 0,
      total_weeks: 0,
      difficulty: null,
      opening_message: null,
      closing_message: null,
      success_vision: null,
      generation_status: 'clarifying',
      credits_used: 0,
      tags: [],
      metadata: { country, model },
      clarify_state: clarifyState,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Could not save roadmap clarification session.')
  }

  dispatchClarifyHistoryRefetch()
  return String(data.id)
}

export async function saveRoadmapClarifyState(
  roadmapId: string,
  clarifyState: ClarifyStatePersisted,
): Promise<void> {
  const { error } = await supabase
    .from('user_roadmaps')
    .update({
      clarify_state: clarifyState,
      generation_status: 'clarifying',
      updated_at: new Date().toISOString(),
    })
    .eq('id', roadmapId)

  if (error) throw new Error(error.message)
  dispatchClarifyHistoryRefetch()
}

import { supabase } from '@/lib/supabase'
import { dispatchClarifyHistoryRefetch } from '@/lib/clarifyStateEvents'
import type { ClarifyStatePersisted } from '@/types/clarifyState'
import type { AIModelId } from '@/lib/aiModels'

function playbookTitleFromQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return 'War Room session'
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed
}

export async function createWarRoomClarifyPlaybook(
  userId: string,
  query: string,
  country: string,
  model: AIModelId,
  clarifyState: ClarifyStatePersisted,
): Promise<string> {
  const trimmed = query.trim()
  const { data, error } = await supabase
    .from('user_playbooks')
    .insert({
      user_id: userId,
      project_id: null,
      business_name: playbookTitleFromQuery(trimmed),
      business_description: trimmed,
      country,
      model_used: model,
      context_answers: {},
      steps: [],
      steps_checked: 0,
      credits_used: 0,
      generation_status: 'clarifying',
      clarify_state: clarifyState,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Could not save War Room clarification session.')
  }

  dispatchClarifyHistoryRefetch()
  return String(data.id)
}

export async function saveWarRoomClarifyState(
  playbookId: string,
  clarifyState: ClarifyStatePersisted,
): Promise<void> {
  const { error } = await supabase
    .from('user_playbooks')
    .update({
      clarify_state: clarifyState,
      generation_status: 'clarifying',
      updated_at: new Date().toISOString(),
    })
    .eq('id', playbookId)

  if (error) throw new Error(error.message)
  dispatchClarifyHistoryRefetch()
}

/** Remove clarify-only placeholder row after scout briefing succeeds (real playbook is created on deploy). */
export async function discardWarRoomClarifyPlaybook(playbookId: string): Promise<void> {
  const { error } = await supabase.from('user_playbooks').delete().eq('id', playbookId)

  if (error) throw new Error(error.message)
  dispatchClarifyHistoryRefetch()
}

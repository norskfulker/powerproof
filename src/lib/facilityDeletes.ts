import { supabase } from '@/lib/supabase'

/** Delete linked playbooks first (FK SET NULL), then the research row (tasks CASCADE). */
export async function deleteResearch(opportunityId: string, userId: string) {
  const { error: playbooksError } = await supabase
    .from('user_playbooks')
    .delete()
    .eq('user_opportunity_id', opportunityId)
    .eq('user_id', userId)

  if (playbooksError) throw playbooksError

  const { error } = await supabase
    .from('user_opportunities')
    .delete()
    .eq('id', opportunityId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deletePlaybook(playbookId: string, userId: string) {
  const { error } = await supabase
    .from('user_playbooks')
    .delete()
    .eq('id', playbookId)
    .eq('user_id', userId)

  if (error) throw error
}

/** Saved sourcing search (hero history card). */
export async function deleteSourcingSearch(searchId: string, userId: string) {
  const { error } = await supabase
    .from('sourcing_results')
    .delete()
    .eq('search_id', searchId)
    .eq('user_id', userId)

  if (error) throw error
}

/** Market reality check history card. */
export async function deleteMarketTest(marketTestId: string, userId: string) {
  const { error } = await supabase
    .from('market_tests')
    .delete()
    .eq('id', marketTestId)
    .eq('user_id', userId)

  if (error) throw error
}

/** Roadmap history card — nodes first, then parent row. */
export async function deleteRoadmap(roadmapId: string, userId: string) {
  const { error: nodesError } = await supabase
    .from('roadmap_nodes')
    .delete()
    .eq('roadmap_id', roadmapId)

  if (nodesError) throw nodesError

  const { error } = await supabase
    .from('user_roadmaps')
    .delete()
    .eq('id', roadmapId)
    .eq('user_id', userId)

  if (error) throw error
}

/** Ponder / research task row (when listed as a card). */
export async function deleteResearchTask(taskId: string, userId: string) {
  const { error } = await supabase
    .from('research_tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw error
}

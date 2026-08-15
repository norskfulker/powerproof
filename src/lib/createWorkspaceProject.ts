import type { SupabaseClient } from '@supabase/supabase-js'

import type { Project } from '@/types/database'

export const DEFAULT_WORKSPACE_NAME = 'My workspace'

export type CreatedWorkspaceRow = {
  id: string
  name: string | null
}

/**
 * Creates a workspace (project) as a name-only container for user data.
 * Slug is assigned by `projects_slug_trigger` on insert.
 */
export async function createWorkspaceProject(
  supabase: SupabaseClient,
  params: { userId: string; name: string },
): Promise<{ project: CreatedWorkspaceRow | null; error: Error | null }> {
  const trimmedName = String(params.name ?? '').trim()
  if (!trimmedName) {
    return { project: null, error: new Error('Workspace name is required') }
  }

  const row: Record<string, unknown> = {
    user_id: params.userId,
    name: trimmedName,
  }

  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert(row)
    .select('id, name')
    .single()

  if (insertError) return { project: null, error: insertError as Error }
  if (!project?.id) return { project: null, error: new Error('Workspace insert returned no id') }

  return { project: project as CreatedWorkspaceRow, error: null }
}

/** Ensures the user has at least one workspace (background container for research / playbooks). */
export async function ensureDefaultWorkspaceProject(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ project: Project | null; error: Error | null }> {
  const { data: existing, error: loadError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)

  if (loadError) return { project: null, error: loadError as Error }
  const first = (existing as Project[] | null)?.[0]
  if (first) return { project: first, error: null }

  const { project: created, error: createError } = await createWorkspaceProject(supabase, {
    userId,
    name: DEFAULT_WORKSPACE_NAME,
  })
  if (createError || !created?.id) {
    return { project: null, error: createError ?? new Error('Could not create default workspace') }
  }

  const { data: full, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', created.id)
    .single()

  if (fetchError || !full) {
    return { project: null, error: (fetchError as Error) ?? new Error('Workspace fetch failed') }
  }

  return { project: full as Project, error: null }
}

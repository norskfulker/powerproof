import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeUserPlaybook } from '@/lib/normalizePlaybookSteps'
import type { UserPlaybook } from '@/lib/playbookTypes'
import { USER_PLAYBOOKS_LIST_SELECT } from '@/lib/userPlaybooksSelect'

export function useUserPlaybooks(userId: string | undefined, projectId: string | null) {
  const [playbooks, setPlaybooks] = useState<UserPlaybook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setPlaybooks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let query = supabase
      .from('user_playbooks')
      .select(USER_PLAYBOOKS_LIST_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      setError(fetchError.message)
      setPlaybooks([])
    } else {
      setPlaybooks(
        (data ?? []).map((row) => normalizeUserPlaybook(row as Record<string, unknown>)),
      )
    }
    setLoading(false)
  }, [userId, projectId])

  useEffect(() => {
    void load()
  }, [load])

  return { playbooks, loading, error, reload: load }
}

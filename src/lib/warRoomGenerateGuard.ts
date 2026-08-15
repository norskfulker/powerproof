import { supabase } from '@/lib/supabase'

const PENDING_LOOKBACK_MS = 2 * 60 * 1000

/** True when this user already has a playbook row generating in the last 2 minutes. */
export async function hasRecentPendingPlaybook(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - PENDING_LOOKBACK_MS).toISOString()
  const { data, error } = await supabase
    .from('user_playbooks')
    .select('id')
    .eq('user_id', userId)
    .eq('generation_status', 'pending')
    .gte('created_at', since)
    .limit(1)

  if (error) {
    console.warn('[warRoom] pending playbook guard query failed:', error.message)
    return false
  }

  return (data?.length ?? 0) > 0
}

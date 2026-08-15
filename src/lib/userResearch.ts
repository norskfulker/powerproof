import type { SupabaseClient } from '@supabase/supabase-js'

/** `user_opportunities.research_status` when the edge function finished successfully. */
export const RESEARCH_STATUS_COMPLETE = 'complete' as const
export const RESEARCH_STATUS_PENDING = 'pending' as const
export const RESEARCH_STATUS_INITIAL = 'initial' as const
export const RESEARCH_STATUS_FAILED = 'failed' as const
export const RESEARCH_STATUS_CANCELLED = 'cancelled' as const
/** Abandoned or errored runs — never show in My Research. */
export const RESEARCH_STATUS_INCOMPLETE = ['pending', 'failed', 'cancelled'] as const
/** Pending rows older than this are treated as abandoned (tab closed mid-request). */
export const STALE_PENDING_MS = 30 * 60 * 1000
export function isCompleteUserResearch(row: { research_status?: string | null } | null | undefined): boolean {
  return row?.research_status === RESEARCH_STATUS_COMPLETE
}
export function isActiveUserResearch(row: { research_status?: string | null } | null | undefined): boolean {
  return row?.research_status === RESEARCH_STATUS_PENDING
}

/**
 * Remove failed research and stale pending rows (never reached Gemini or client disconnected).
 * In-flight pending (< STALE_PENDING_MS) is kept so an active request can still complete.
 */
export async function cancelAbandonedUserResearch(supabase: SupabaseClient, userId: string) {
  await supabase.from('user_opportunities').delete().eq('user_id', userId).eq('research_status', 'failed')

  const cutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString()
  await supabase
    .from('user_opportunities')
    .delete()
    .eq('user_id', userId)
    .eq('research_status', 'pending')
    .lt('created_at', cutoff)
}

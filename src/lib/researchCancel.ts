import { supabase } from '@/lib/supabase'

export type CancelResearchResult =
  | { success: true }
  | { success?: false; error: string; code?: string }

export async function invokeCancelResearch(
  opportunityId: string,
  accessToken: string,
): Promise<CancelResearchResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    return { error: 'Missing VITE_SUPABASE_URL.' }
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/cancel-research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ opportunity_id: opportunityId }),
  })

  const result = (await res.json().catch(() => ({}))) as CancelResearchResult & {
    success?: boolean
  }
  if (result.success) return result
  return {
    error: result.error ?? 'Could not cancel research',
    code: result.code,
  }
}

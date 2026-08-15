import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { clearPreviewSession } from '@/lib/previewResearch'
import type { ClaimPreviewSessionResult } from '@/types/previewResearch'

export async function claimPreviewSession(userId: string): Promise<ClaimPreviewSessionResult | null> {
  if (typeof window === 'undefined') return null
  const sessionToken = localStorage.getItem('powerproof_preview_session')
  if (!sessionToken) return null

  const { data, error } = await supabase.rpc('claim_preview_session', {
    p_session_token: sessionToken,
    p_user_id: userId,
  })

  clearPreviewSession()

  if (error) {
    console.warn('[claimPreviewSession]', error.message)
    return null
  }

  return (data ?? null) as ClaimPreviewSessionResult | null
}

/**
 * Claim a landing preview after sign-up. Returns true when navigation was handled.
 */
export async function tryClaimPreviewAndNavigate(
  userId: string,
  navigate: NavigateFunction,
): Promise<boolean> {
  const result = await claimPreviewSession(userId)
  if (!result?.opportunity_id) return false

  const slug = result.slug
  if (slug) {
    toast.success('Your preview is saved!', {
      description: "Click 'Unlock Full Research' to generate the complete report.",
    })
    navigate(`/my-research/${encodeURIComponent(slug)}`, { replace: true })
    return true
  }

  return false
}

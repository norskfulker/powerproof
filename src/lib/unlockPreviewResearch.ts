import { toast } from 'sonner'
import { resolveActiveProjectId } from '@/hooks/useActiveWorkspace'
import { supabase } from '@/lib/supabase'
import { dispatchBackgroundJobsRefetch } from '@/lib/backgroundJobEvents'
import {
  streamResearchOpportunity,
  type ResearchStreamStarted,
} from '@/lib/researchOpportunityStream'

export async function unlockPreviewResearch(opts: {
  opportunityId: string
  query: string
  country: string
  projectId?: string | null
  onStarted?: (data: ResearchStreamStarted) => void
  signal?: AbortSignal
}): Promise<{ ok: true; slug: string } | { ok: false; message: string; creditsRefunded?: boolean }> {
  const projectId = resolveActiveProjectId(opts.projectId ?? null)
  if (!projectId) {
    return { ok: false, message: 'Select a workspace before unlocking full research.' }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    return { ok: false, message: 'Missing VITE_SUPABASE_URL.' }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, message: 'Please sign in to unlock research.' }
  }

  dispatchBackgroundJobsRefetch()

  const result = await streamResearchOpportunity(
    supabaseUrl,
    session.access_token,
    {
      query: opts.query.trim(),
      country: opts.country || 'India',
      currency: 'USD',
      project_id: projectId,
      skip_weak_check: true,
      resume_opportunity_id: opts.opportunityId,
    },
    {
      onStarted: (data) => {
        opts.onStarted?.(data)
        toast.success('Full research started', {
          description: 'Your complete report will be ready in a few minutes.',
        })
      },
    },
    opts.signal,
  )

  if (result.outcome === 'aborted') {
    return { ok: false, message: 'Research was cancelled.' }
  }

  if (result.outcome === 'error') {
    const msg = result.data.message
    toast.error(msg)
    return { ok: false, message: msg, creditsRefunded: result.data.refunded === true }
  }

  const slug = result.data.slug?.trim()
  if (!slug) {
    return { ok: false, message: 'Research completed but slug was missing.' }
  }

  return { ok: true, slug }
}

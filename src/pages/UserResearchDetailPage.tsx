import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { shapeUserResearchOpportunityRow } from '@/hooks/useOpportunityDetail'
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace'
import { isReResearchJob } from '@/lib/backgroundJobs'
import { BACKGROUND_JOB_COMPLETE_EVENT } from '@/lib/backgroundJobEvents'
import { resolveResearchPageState, type ResearchPageState } from '@/lib/researchPageState'
import { unlockPreviewResearch } from '@/lib/unlockPreviewResearch'
import { RESEARCH_STATUS_CANCELLED, RESEARCH_STATUS_PENDING } from '@/lib/userResearch'
import OpportunityDetailPage from './OpportunityDetailPage'
import { OpportunityLoadingState } from '@/components/opportunity/detail/OpportunityLoadingState'
import { OpportunityNotFound } from '@/components/opportunity/detail/OpportunityNotFound'
import { ResearchFailedState } from '@/components/research/ResearchFailedState'
import { ResearchPendingState } from '@/components/research/ResearchPendingState'
import { PreviewResearchInitialView } from '@/components/research/PreviewResearchInitialView'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import { invokeCancelResearch } from '@/lib/researchCancel'

const POLL_INTERVAL_MS = 3000

/** User research detail — loads the row and polls while `research_status` is pending. */
export function UserResearchDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeProject } = useActiveWorkspace()
  const backgroundJobs = useBackgroundJobsOptional()
  const [row, setRow] = useState<Record<string, unknown> | null>(null)
  const [pageState, setPageState] = useState<ResearchPageState>('loading')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const loadOpportunity = useCallback(async () => {
    if (!slug || !user?.id) return null

    const { data, error: qErr } = await supabase
      .from('user_opportunities')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .maybeSingle()

    if (qErr || !data) {
      setError('Research not found')
      setRow(null)
      setPageState('loading')
      return null
    }

    const status = String(data.research_status ?? '').toLowerCase()
    if (status === RESEARCH_STATUS_CANCELLED) {
      setError('Research not found')
      setRow(null)
      setPageState('loading')
      return null
    }

    const shaped = shapeUserResearchOpportunityRow(data) as Record<string, unknown>
    setRow(shaped)
    setPageState(resolveResearchPageState(status))
    setError(null)
    return shaped
  }, [slug, user?.id])

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('Research not found')
      return
    }
    if (!user?.id) {
      navigate(landingSignInTo(`/my-research/${slug}`), { replace: true })
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      await loadOpportunity()
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [slug, user?.id, navigate, loadOpportunity])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string; slug?: string }>).detail
      if (detail?.kind !== 'research') return
      if (detail.slug && detail.slug !== slug) return
      void loadOpportunity()
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [loadOpportunity, slug])

  useEffect(() => {
    if (!row?.id || pageState !== 'loading') return
    if (String(row.research_status ?? '').toLowerCase() !== RESEARCH_STATUS_PENDING) return

    const opportunityId = String(row.id)
    const interval = window.setInterval(() => {
      void (async () => {
        const { data } = await supabase
          .from('user_opportunities')
          .select('research_status')
          .eq('id', opportunityId)
          .maybeSingle()

        const status = String(data?.research_status ?? '').toLowerCase()
        if (status === 'complete') {
          void loadOpportunity()
          void backgroundJobs?.refetch({ includeResearches: true })
        } else if (status === 'failed') {
          setPageState('failed')
        }
      })()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [row?.id, row?.research_status, pageState, loadOpportunity, backgroundJobs])

  const pendingReResearch = backgroundJobs?.activeResearches.find(
    (r) => r.slug === slug && isReResearchJob(r),
  )

  const handleCancelResearch = useCallback(async () => {
    if (!row?.id || isCancelling) return
    setIsCancelling(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Please sign in to cancel research.')
        return
      }
      const result = await invokeCancelResearch(String(row.id), session.access_token)
      if (result.success) {
        toast.success('Research cancelled')
        navigate('/my-research', { replace: true })
        return
      }
      if (result.code === 'not_cancellable') {
        toast.error('Research already finished — refresh to see your report.')
        void loadOpportunity()
      } else {
        toast.error(result.error ?? 'Could not cancel research')
      }
    } finally {
      setIsCancelling(false)
    }
  }, [isCancelling, loadOpportunity, navigate, row?.id])

  if (loading) {
    return <OpportunityLoadingState />
  }

  if (error || !row) {
    return <OpportunityNotFound />
  }

  if (pageState === 'loading') {
    return (
      <ResearchPendingState
        query={
          (row.research_query as string | null | undefined) ??
          (row.title as string | null | undefined)
        }
        startedAt={row.created_at as string | null | undefined}
        researchStyle={row.research_style as string | null | undefined}
        onCancel={() => void handleCancelResearch()}
        cancelDisabled={isCancelling}
      />
    )
  }

  if (pageState === 'failed') {
    return <ResearchFailedState />
  }

  if (pageState === 'initial' && row) {
    const researchQuery = String(row.research_query ?? row.title ?? '')
    const country = String(row.country ?? 'India')

    const handleUnlock = async () => {
      if (!row.id) return
      setUnlocking(true)
      try {
        const result = await unlockPreviewResearch({
          opportunityId: String(row.id),
          query: researchQuery,
          country,
          projectId: activeProject?.id ?? null,
          onStarted: (data) => {
            navigate(`/my-research/${encodeURIComponent(data.slug)}`, { replace: true })
          },
        })
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        void loadOpportunity()
      } finally {
        setUnlocking(false)
      }
    }

    return (
      <div className="min-h-screen bg-background grain-texture">
        <PreviewResearchInitialView
          opportunity={row}
          researchQuery={researchQuery}
          onUnlockFullResearch={() => void handleUnlock()}
          unlocking={unlocking}
        />
      </div>
    )
  }

  const showReResearchPending =
    Boolean(pendingReResearch) ||
    (String(row.research_status ?? '').toLowerCase() === RESEARCH_STATUS_PENDING && isReResearchJob(row))

  return (
    <OpportunityDetailPage
      opportunityOverride={row}
      isUserResearch
      onOpportunityRefresh={() => void loadOpportunity()}
      reResearchPending={showReResearchPending}
      reResearchPendingSections={
        (pendingReResearch?.re_research_sections as string[] | null | undefined) ??
        (row.re_research_sections as string[] | null | undefined)
      }
      reResearchPendingCreatedAt={
        pendingReResearch?.created_at ?? (row.created_at as string | null | undefined)
      }
    />
  )
}

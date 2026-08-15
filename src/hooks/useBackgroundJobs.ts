import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  BACKGROUND_JOBS_REFETCH_EVENT,
  dispatchBackgroundJobComplete,
} from '@/lib/backgroundJobEvents'
import {
  ACTIVE_SOURCING_TASK_STATUSES,
  backgroundJobKindsForLocation,
  filterActiveResearchesForPath,
  isReResearchJob,
  shouldPollBackgroundJobs,
  userResearchDetailSlug,
} from '@/lib/backgroundJobs'

export interface ActiveResearch {
  id: string
  slug: string | null
  title: string | null
  research_status: 'pending'
  research_query: string | null
  re_research_sections?: string[] | null
  country: string | null
  project_id: string | null
  created_at: string
}

export interface ActivePlaybook {
  id: string
  business_name: string | null
  generation_status: 'pending'
  project_id: string | null
  created_at: string
}

export interface ActiveRoadmap {
  id: string
  title: string | null
  goal_input: string | null
  generation_status: 'processing' | 'pending'
  created_at: string
}

export interface ActiveSourcingTask {
  id: string
  task_label: string | null
  status: string
  user_opportunity_id: string
  created_at: string
}

export interface BackgroundJobs {
  activeResearches: ActiveResearch[]
  activePlaybooks: ActivePlaybook[]
  activeRoadmaps: ActiveRoadmap[]
  activeSourcingTasks: ActiveSourcingTask[]
  isLoading: boolean
  refetch: (opts?: { includeResearches?: boolean }) => Promise<void>
}

const POLL_INTERVAL_MS = 3000

type FetchPendingOptions = {
  mode: 'full' | 'incremental'
  /** Force a pending-research query (e.g. detail page detected completion). */
  includeResearches?: boolean
}

type JobSnapshot = {
  researches: ActiveResearch[]
  playbooks: ActivePlaybook[]
  roadmaps: ActiveRoadmap[]
  sourcing: ActiveSourcingTask[]
}

function pendingIdSet(snapshot: JobSnapshot): Set<string> {
  return new Set([
    ...snapshot.researches.map((r) => r.id),
    ...snapshot.playbooks.map((p) => p.id),
    ...snapshot.roadmaps.map((r) => r.id),
    ...snapshot.sourcing.map((s) => s.id),
  ])
}

export function useBackgroundJobs(): BackgroundJobs {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeResearches, setActiveResearches] = useState<ActiveResearch[]>([])
  const [activePlaybooks, setActivePlaybooks] = useState<ActivePlaybook[]>([])
  const [activeRoadmaps, setActiveRoadmaps] = useState<ActiveRoadmap[]>([])
  const [activeSourcingTasks, setActiveSourcingTasks] = useState<ActiveSourcingTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const snapshotRef = useRef<JobSnapshot>({ researches: [], playbooks: [], roadmaps: [], sourcing: [] })
  const hasInitialized = useRef(false)
  const checkInFlightRef = useRef<Promise<void> | null>(null)
  const checkJobsRef = useRef<(opts?: Pick<FetchPendingOptions, 'includeResearches'>) => Promise<void>>(
    async () => {},
  )

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  const notifyResearchFinished = useCallback(
    async (id: string, prev: ActiveResearch) => {
      const { data } = await supabase
        .from('user_opportunities')
        .select('slug, title, research_status, re_research_sections')
        .eq('id', id)
        .maybeSingle()

      const status = data?.research_status
      const title = String(data?.title ?? prev.title ?? 'Research').trim() || 'Research'
      const slug = data?.slug ?? prev.slug
      const isReResearch = isReResearchJob(data ?? prev)

      if (status === 'complete') {
        const msg = isReResearch
          ? `Re-research for "${title}" is ready`
          : `Research for "${title}" is ready`
        toast.success(msg, {
          action: slug
            ? {
                label: 'View',
                onClick: () => navigate(`/my-research/${encodeURIComponent(slug)}`),
              }
            : undefined,
        })
        dispatchBackgroundJobComplete({
          kind: 'research',
          id,
          slug: slug ?? undefined,
        })
      } else if (status === 'failed') {
        toast.error(isReResearch ? `Re-research for "${title}" failed` : `Research for "${title}" failed`)
      } else if (status === 'cancelled') {
        toast.message(isReResearch ? 'Re-research cancelled' : 'Research cancelled')
      }
    },
    [navigate],
  )

  const notifyPlaybookFinished = useCallback(
    async (id: string, prev: ActivePlaybook) => {
      const { data } = await supabase
        .from('user_playbooks')
        .select('business_name, generation_status')
        .eq('id', id)
        .maybeSingle()

      const name = String(data?.business_name ?? prev.business_name ?? 'War Room').trim() || 'War Room'
      const status = data?.generation_status

      if (status === 'complete') {
        toast.success(`War Room for "${name}" is ready`, {
          action: {
            label: 'View',
            onClick: () => navigate(`/playbook/${id}`),
          },
        })
        dispatchBackgroundJobComplete({ kind: 'playbook', id })
      } else if (status === 'failed') {
        toast.error(`War Room for "${name}" failed`)
      }
    },
    [navigate],
  )

  const notifyRoadmapFinished = useCallback(
    async (id: string, prev: ActiveRoadmap) => {
      const { data } = await supabase
        .from('user_roadmaps')
        .select('title, goal_input, generation_status')
        .eq('id', id)
        .maybeSingle()

      const title =
        String(data?.title ?? data?.goal_input ?? prev.title ?? prev.goal_input ?? 'Roadmap').trim() ||
        'Roadmap'
      const status = data?.generation_status

      if (status === 'complete') {
        toast.success(`Roadmap "${title}" is ready`, {
          action: {
            label: 'View',
            onClick: () => navigate(`/roadmap/${id}`),
          },
        })
        dispatchBackgroundJobComplete({ kind: 'roadmap', id })
      } else if (status === 'failed') {
        toast.error(`Roadmap "${title}" failed`)
      }
    },
    [navigate],
  )

  const notifySourcingTaskFinished = useCallback(
    async (id: string, prev: ActiveSourcingTask) => {
      const { data } = await supabase
        .from('research_tasks')
        .select('task_label, status, user_opportunity_id')
        .eq('id', id)
        .maybeSingle()

      const label = String(data?.task_label ?? prev.task_label ?? 'Task').trim() || 'Task'
      const status = data?.status
      const opportunityId = data?.user_opportunity_id ?? prev.user_opportunity_id

      if (status === 'complete') {
        toast.success(`"${label}" is complete`)
        dispatchBackgroundJobComplete({
          kind: 'sourcing',
          id,
          opportunityId,
        })
      } else if (status === 'failed') {
        toast.error(`"${label}" failed`)
      }
    },
    [],
  )

  const handleCompletions = useCallback(
    async (prev: JobSnapshot, next: JobSnapshot) => {
      const prevIds = pendingIdSet(prev)
      const nextIds = pendingIdSet(next)

      for (const id of prevIds) {
        if (nextIds.has(id)) continue

        const research = prev.researches.find((r) => r.id === id)
        if (research) {
          await notifyResearchFinished(id, research)
          continue
        }
        const playbook = prev.playbooks.find((p) => p.id === id)
        if (playbook) {
          await notifyPlaybookFinished(id, playbook)
          continue
        }
        const roadmap = prev.roadmaps.find((r) => r.id === id)
        if (roadmap) {
          await notifyRoadmapFinished(id, roadmap)
          continue
        }
        const sourcing = prev.sourcing.find((s) => s.id === id)
        if (sourcing) {
          await notifySourcingTaskFinished(id, sourcing)
        }
      }
    },
    [notifyPlaybookFinished, notifyResearchFinished, notifyRoadmapFinished, notifySourcingTaskFinished],
  )

  const applySnapshot = useCallback(
    async (next: JobSnapshot, opts?: { detectCompletions?: boolean }) => {
      if (opts?.detectCompletions && hasInitialized.current) {
        await handleCompletions(snapshotRef.current, next)
      }
      snapshotRef.current = next
      setActiveResearches(next.researches)
      setActivePlaybooks(next.playbooks)
      setActiveRoadmaps(next.roadmaps)
      setActiveSourcingTasks(next.sourcing)
      hasInitialized.current = true
      setIsLoading(false)

      const total =
        next.researches.length +
        next.playbooks.length +
        next.roadmaps.length +
        next.sourcing.length
      if (total === 0) stopPolling()
    },
    [handleCompletions, stopPolling],
  )

  const fetchPending = useCallback(
    async (opts: FetchPendingOptions): Promise<JobSnapshot> => {
      if (!user?.id) {
        return { researches: [], playbooks: [], roadmaps: [], sourcing: [] }
      }

      const userId = user.id
      const prev = snapshotRef.current
      const viewingResearchSlug = userResearchDetailSlug(location.pathname)
      const onResearchDetail = viewingResearchSlug != null
      const kinds = backgroundJobKindsForLocation(location.pathname, location.search)

      const queryResearches =
        kinds.has('research') &&
        (opts.includeResearches === true ||
          (!onResearchDetail &&
            (opts.mode === 'full' || prev.researches.length > 0)))
      const queryPlaybooks =
        kinds.has('playbook') && (opts.mode === 'full' || prev.playbooks.length > 0)
      const queryRoadmaps =
        kinds.has('roadmap') && (opts.mode === 'full' || prev.roadmaps.length > 0)
      const querySourcing =
        kinds.has('sourcing') && (opts.mode === 'full' || prev.sourcing.length > 0)

      const [researchRes, playbookRes, roadmapRes, sourcingRes] = await Promise.all([
        queryResearches
          ? supabase
              .from('user_opportunities')
              .select(
                'id, slug, title, research_status, research_query, re_research_sections, country, project_id, created_at',
              )
              .eq('user_id', userId)
              .in('research_status', ['pending'])
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: prev.researches, error: null }),

        queryPlaybooks
          ? supabase
              .from('user_playbooks')
              .select('id, business_name, generation_status, project_id, created_at')
              .eq('user_id', userId)
              .eq('generation_status', 'pending')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: prev.playbooks, error: null }),

        queryRoadmaps
          ? supabase
              .from('user_roadmaps')
              .select('id, title, goal_input, generation_status, created_at')
              .eq('user_id', userId)
              .in('generation_status', ['processing', 'pending'])
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: prev.roadmaps, error: null }),

        querySourcing
          ? supabase
              .from('research_tasks')
              .select('id, task_label, status, user_opportunity_id, created_at')
              .eq('user_id', userId)
              .in('status', [...ACTIVE_SOURCING_TASK_STATUSES])
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: prev.sourcing, error: null }),
      ])

      return {
        researches: queryResearches
          ? (filterActiveResearchesForPath(
              (researchRes.data as ActiveResearch[]) ?? [],
              location.pathname,
            ) as ActiveResearch[])
          : [],
        playbooks: queryPlaybooks ? ((playbookRes.data as ActivePlaybook[]) ?? []) : [],
        roadmaps: queryRoadmaps ? ((roadmapRes.data as ActiveRoadmap[]) ?? []) : [],
        sourcing: querySourcing ? ((sourcingRes.data as ActiveSourcingTask[]) ?? []) : [],
      }
    },
    [location.pathname, location.search, user?.id],
  )

  const ensurePolling = useCallback(() => {
    if (pollTimer.current) return
    pollTimer.current = setInterval(() => {
      void (async () => {
        const next = await fetchPending({ mode: 'incremental' })
        await applySnapshot(next, { detectCompletions: true })
      })()
    }, POLL_INTERVAL_MS)
  }, [applySnapshot, fetchPending])

  const checkJobs = useCallback(
    async (opts?: Pick<FetchPendingOptions, 'includeResearches'>) => {
      if (!user?.id) {
        await applySnapshot({ researches: [], playbooks: [], roadmaps: [], sourcing: [] })
        stopPolling()
        return
      }

      if (checkInFlightRef.current) {
        await checkInFlightRef.current
        return
      }

      const run = (async () => {
        const next = await fetchPending({ mode: 'full', ...opts })
        await applySnapshot(next, { detectCompletions: hasInitialized.current })

        const total =
          next.researches.length + next.playbooks.length + next.roadmaps.length + next.sourcing.length
        if (total > 0) ensurePolling()
      })()

      checkInFlightRef.current = run
      try {
        await run
      } finally {
        if (checkInFlightRef.current === run) checkInFlightRef.current = null
      }
    },
    [applySnapshot, ensurePolling, fetchPending, stopPolling, user?.id],
  )

  checkJobsRef.current = checkJobs

  useEffect(() => {
    const pollEnabled = shouldPollBackgroundJobs(location.pathname, location.search)

    if (!user?.id || !pollEnabled) {
      hasInitialized.current = false
      snapshotRef.current = { researches: [], playbooks: [], roadmaps: [], sourcing: [] }
      setActiveResearches([])
      setActivePlaybooks([])
      setActiveRoadmaps([])
      setActiveSourcingTasks([])
      setIsLoading(false)
      stopPolling()
      return
    }

    setIsLoading(true)
    void checkJobsRef.current()

    const onRefetch = () => {
      if (!shouldPollBackgroundJobs(location.pathname, location.search)) return
      void checkJobsRef.current()
    }
    window.addEventListener(BACKGROUND_JOBS_REFETCH_EVENT, onRefetch)

    return () => {
      stopPolling()
      window.removeEventListener(BACKGROUND_JOBS_REFETCH_EVENT, onRefetch)
    }
  }, [user?.id, location.pathname, location.search, stopPolling])

  return {
    activeResearches,
    activePlaybooks,
    activeRoadmaps,
    activeSourcingTasks,
    isLoading,
    refetch: checkJobs,
  }
}

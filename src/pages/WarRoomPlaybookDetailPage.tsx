import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Swords } from '@/lib/icons'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'
import { PlaybookAskAI } from '@/components/warroom/PlaybookAskAI'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import { isBackgroundJobStale } from '@/lib/backgroundJobs'
import { BACKGROUND_JOB_COMPLETE_EVENT } from '@/lib/backgroundJobEvents'
import { supabase } from '@/lib/supabase'
import { PlaybookDisplay } from '@/components/playbook/PlaybookDisplay'
import { PlaybookBriefDetails } from '@/components/playbook/PlaybookBriefDetails'
import { Button } from '@/components/ui/button'
import { Seo } from '@/components/Seo'
import { NotFoundState } from '@/components/NotFoundState'
import { DiscoverWide } from '@/components/page-shells'
import {
  detailHeroCardClassName,
  opportunityDetailFluidDarkGlassSurfaceClassName,
} from '@/components/detail/DetailHeroPanel'
import { opportunityDetailPageGridClass } from '@/pages/OpportunityDetailPage'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { useIsMobile } from '@/hooks/useBreakpoint'
import type { UserPlaybook } from '@/lib/playbookTypes'
import { normalizePlaybookSteps, normalizeUserPlaybook } from '@/lib/normalizePlaybookSteps'
import { PlaybookMetaBadges } from '@/components/playbook/PlaybookMetaBadges'
import { playbookTitle } from '@/lib/playbookDisplay'
import { USER_PLAYBOOKS_DETAIL_SELECT } from '@/lib/userPlaybooksSelect'
import type { WarroomEditCompleteResponse } from '@/lib/warroomEditChat'
import { cn } from '@/lib/utils'

function PlaybookLoadingState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="w-full">
      <DiscoverWide className="py-3 layout-sm:py-5 layout-lg:py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center layout-sm:py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="font-sans text-[15px] font-semibold text-foreground">{message}</p>
          <p className="max-w-md font-sans text-sm text-muted-foreground">{sub}</p>
        </div>
      </DiscoverWide>
    </div>
  )
}

export function WarRoomPlaybookDetailPage() {
  const { playbookId } = useParams<{ playbookId: string }>()
  const navigate = useNavigate()
  const { setTrail } = useNavbarTrail()
  const backgroundJobs = useBackgroundJobsOptional()
  const isMobile = useIsMobile()
  const [playbook, setPlaybook] = useState<UserPlaybook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPlaybook = useCallback(() => {
    if (!playbookId) return
    setLoading(true)
    setError(null)
    void supabase
      .from('user_playbooks')
      .select(USER_PLAYBOOKS_DETAIL_SELECT)
      .eq('id', playbookId)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) {
          setError(e.message)
          setPlaybook(null)
        } else if (!data) {
          setError('Playbook not found')
          setPlaybook(null)
        } else {
          setPlaybook(normalizeUserPlaybook(data as Record<string, unknown>))
        }
        setLoading(false)
      })
  }, [playbookId])

  useEffect(() => {
    loadPlaybook()
  }, [loadPlaybook])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string; id?: string }>).detail
      if (detail?.kind !== 'playbook' || detail.id !== playbookId) return
      loadPlaybook()
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [loadPlaybook, playbookId])

  const pendingPlaybook = backgroundJobs?.activePlaybooks.find((p) => p.id === playbookId)

  const title = playbook ? playbookTitle(playbook) : 'War Room Playbook'

  useEffect(() => {
    setTrail(title)
    return () => setTrail(null)
  }, [title, setTrail])

  const toggleStep = useCallback(
    async (stepOrder: number, checked: boolean) => {
      if (!playbook) return
      setPlaybook((prev) => {
        if (!prev) return prev
        const steps = prev.steps.map((s) =>
          s.step_order === stepOrder ? { ...s, is_checked: checked } : s,
        )
        return {
          ...prev,
          steps,
          steps_checked: steps.filter((s) => s.is_checked).length,
        }
      })
      await supabase.rpc('toggle_playbook_step', {
        p_playbook_id: playbook.id,
        p_step_order: stepOrder,
        p_checked: checked,
      })
    },
    [playbook],
  )

  const handleEditComplete = useCallback((payload: WarroomEditCompleteResponse) => {
    setPlaybook((prev) => {
      if (!prev) return prev
      const patch = payload.updated_data ?? {}
      let nextSteps = prev.steps
      if (Array.isArray(patch.steps)) {
        const prevByOrder = new Map(prev.steps.map((s) => [s.step_order, s]))
        nextSteps = normalizePlaybookSteps(patch.steps).map((s) => ({
          ...s,
          is_checked: prevByOrder.get(s.step_order)?.is_checked ?? s.is_checked,
        }))
      }
      return normalizeUserPlaybook({
        id: prev.id,
        project_id: prev.project_id,
        business_name: prev.business_name,
        business_description: prev.business_description,
        business_type: prev.business_type,
        country: prev.country,
        city: prev.city,
        industry: prev.industry,
        context_answers: prev.context_answers,
        generation_status: prev.generation_status,
        credits_used: prev.credits_used,
        model_used: prev.model_used,
        steps_checked: nextSteps.filter((s) => s.is_checked).length,
        created_at: prev.created_at,
        edge_declaration: prev.edge_declaration,
        founder_honest_take: prev.founder_honest_take,
        thirty_day_sprint: prev.thirty_day_sprint,
        red_flags: prev.red_flags,
        step_count: nextSteps.length,
        clarify_state: prev.clarify_state,
        ...patch,
        steps: nextSteps,
      })
    })
  }, [])

  if (loading) {
    return (
      <PlaybookLoadingState
        message="Loading playbook…"
        sub="Fetching your battle plan."
      />
    )
  }

  if ((playbook?.generation_status === 'pending' || pendingPlaybook) && !error) {
    const name =
      pendingPlaybook?.business_name?.trim() ||
      playbook?.business_name?.trim() ||
      'your business'
    const stale = isBackgroundJobStale(
      pendingPlaybook?.created_at ?? playbook?.created_at ?? new Date().toISOString(),
    )
    return (
      <PlaybookLoadingState
        message={`Building War Room for ${name}…`}
        sub={
          stale
            ? 'Taking longer than expected. You can leave and return when the playbook is ready.'
            : 'Generation is still running. Leave this page — we will keep working in the background.'
        }
      />
    )
  }

  if (error || !playbook) {
    return (
      <div className="w-full">
        <DiscoverWide className="py-3 layout-sm:py-5 layout-lg:py-6">
          <div className="py-16 layout-sm:py-24">
            <NotFoundState size="md" message="This playbook may have been removed or you do not have access.">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </NotFoundState>
          </div>
        </DiscoverWide>
      </div>
    )
  }

  const totalSteps = playbook.steps.length || playbook.step_count || 12
  const progress = Math.round((playbook.steps_checked / totalSteps) * 100)

  return (
    <PlaybookAskAI
      playbookId={playbook.id}
      playbookTitle={title}
      onEditComplete={handleEditComplete}
    >
      <AskAiChatPageShell>
    <main className="hide-scrollbar w-full">
      <DiscoverWide className="py-3 layout-sm:py-5 layout-lg:py-6">
        <Seo
          title={`${title} — War Room | PowerProof`}
          description="Competitive war room playbook on PowerProof."
          canonicalPath={`/playbook/${playbook.id}`}
          noIndex
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={opportunityDetailPageGridClass(isMobile)}
        >
          <div
            className={cn(detailHeroCardClassName, 'w-full overflow-hidden p-4 layout-sm:p-5')}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                      opportunityDetailFluidDarkGlassSurfaceClassName,
                    )}
                  >
                    <Swords className="h-5 w-5 text-primary" strokeWidth={2.5} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      War Room
                    </p>
                    <h1 className="mt-1 font-display text-[clamp(1.25rem,3.5vw,1.75rem)] font-black leading-snug tracking-tight text-foreground">
                      {title}
                    </h1>
                    <PlaybookMetaBadges
                      className="mt-2"
                      playbook={playbook}
                      dateIso={playbook.created_at}
                      variant="war-room"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="font-sans text-2xl font-black tabular-nums text-foreground">{progress}%</span>
                    <span className="font-sans text-[11px] font-medium text-muted-foreground">
                      {playbook.steps_checked} of {totalSteps} moves executed
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Battle progress
                  </span>
                  <span className="font-sans text-[11px] font-bold tabular-nums text-foreground">{progress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <PlaybookBriefDetails playbook={playbook} isMobile={isMobile} />

          <PlaybookDisplay playbook={playbook} onToggleStep={toggleStep} isMobile={isMobile} />
        </motion.div>
      </DiscoverWide>
    </main>
      </AskAiChatPageShell>
    </PlaybookAskAI>
  )
}

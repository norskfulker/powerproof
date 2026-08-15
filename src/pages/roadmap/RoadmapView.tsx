import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NotFoundState } from '@/components/NotFoundState'
import { Loader2, Map } from '@/lib/icons'

import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { usePlanUpsell } from '@/hooks/usePlanUpsell'
import { useRoadmap } from '@/hooks/useRoadmap'
import type { ModelKey } from '@/components/ModelSelector'
import { generateRoadmap } from '@/lib/roadmapApi'
import { roadmapCountryFromMetadata } from '@/lib/roadmapPreferences'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import type { OpportunitySectionNavItem } from '@/components/opportunity/detail/OpportunitySectionNav'
import { OpportunityDetailSectionTabs } from '@/components/opportunity/detail/OpportunityDetailSectionTabs'
import { opportunityDetailCardClass } from '@/lib/opportunityCardClasses'

import { NodeDetailPanel } from './components/NodeDetailPanel'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'
import { RoadmapAskAI } from '@/components/roadmap/RoadmapAskAI'
import { DiscoverWide } from '@/components/page-shells'
import { opportunityDetailPageGridClass } from '@/pages/OpportunityDetailPage'
import { cn } from '@/lib/utils'
import {
  REGENERATE_ROADMAP_CONFIRM,
  regenerateRoadmapConfirmDescription,
} from '@/lib/rerunConfirm'
import { RoadmapHero } from './components/RoadmapHero'
import { ROADMAP_DOMAIN_LABELS, RoadmapHeroPanel } from './RoadmapHeroPanel'
import { roadmapPhaseSectionId } from './RoadmapJourneyBlocks'
import { buildTree, phasesFromTree, roadmapOverallProgress } from './roadmapUtils'
import { isSyntheticRoadmapTaskId, milestoneTasks } from './roadmapNodeGraph'
import type { RoadmapNode } from './roadmapTypes'
import { JourneyView } from './views/JourneyView'

export function RoadmapView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showPlanUpsell = usePlanUpsell()
  const bp = useBreakpoint()

  const {
    roadmap,
    nodes,
    loading,
    error,
    fetchRoadmap,
    resetNodes,
    setNodes,
  } = useRoadmap(id)

  const tree = useMemo(() => buildTree(nodes), [nodes])
  const phases = useMemo(() => phasesFromTree(tree), [tree])

  const [regenerating, setRegenerating] = useState(false)
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
  const [retryRegenerateConfirmOpen, setRetryRegenerateConfirmOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>('roadmap-overview')

  useEffect(() => {
    resetNodes()
    setSelectedNode(null)
    setActiveSectionId('roadmap-overview')
  }, [id, resetNodes])

  const toggleNodeComplete = async (node: RoadmapNode) => {
    const newVal = !node.is_completed
    const completedAt = newVal ? new Date().toISOString() : null

    const childTasks =
      node.node_type === 'milestone' ? milestoneTasks(node.id, nodes) : []

    const affectedNodes = [node, ...childTasks]
    const affectedIds = new Set(affectedNodes.map((n) => n.id))
    const previousById = new Map(
      affectedNodes.map((n) => [
        n.id,
        { is_completed: n.is_completed, completed_at: n.completed_at },
      ]),
    )

    const applyLocal = (completed: boolean, at: string | null) => {
      setNodes((prev) =>
        prev.map((n) =>
          affectedIds.has(n.id) ? { ...n, is_completed: completed, completed_at: at } : n,
        ),
      )
      if (selectedNode && affectedIds.has(selectedNode.id)) {
        setSelectedNode((prev) =>
          prev ? { ...prev, is_completed: completed, completed_at: at } : null,
        )
      }
    }

    const restorePrevious = () => {
      setNodes((prev) =>
        prev.map((n) => {
          const previous = previousById.get(n.id)
          if (!previous) return n
          return {
            ...n,
            is_completed: previous.is_completed,
            completed_at: previous.completed_at,
          }
        }),
      )
      if (selectedNode) {
        const previous = previousById.get(selectedNode.id)
        if (previous) {
          setSelectedNode((prev) =>
            prev
              ? {
                  ...prev,
                  is_completed: previous.is_completed,
                  completed_at: previous.completed_at,
                }
              : null,
          )
        }
      }
    }

    applyLocal(newVal, completedAt)

    const persistTargets = affectedNodes.filter(
      (n) => !isSyntheticRoadmapTaskId(n.id) && n.metadata?.synthetic !== true,
    )

    if (persistTargets.length === 0) {
      return
    }

    const results = await Promise.all(
      persistTargets.map((target) =>
        supabase
          .from('roadmap_nodes')
          .update({
            is_completed: newVal,
            completed_at: completedAt,
          })
          .eq('id', target.id),
      ),
    )

    const updateErr = results.find((result) => result.error)?.error
    if (updateErr) {
      restorePrevious()
      toast.error('Could not update task status')
    }
  }

  const handleRegenerate = useCallback(async () => {
    if (!roadmap) return

    setRegenerating(true)

    try {
      const regenModel = (roadmap.metadata?.model as ModelKey | undefined) ?? 'flash'
      await generateRoadmap(roadmap.goal_input, {
        roadmapId: roadmap.id,
        model: regenModel,
        country: roadmapCountryFromMetadata(roadmap.metadata),
        persona: roadmap.persona ?? null,
      })
      setSelectedNode(null)
      await fetchRoadmap()
      toast.success('Roadmap regenerated')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Regeneration failed'
      if (
        msg === 'insufficient_credits' ||
        msg === 'no_active_subscription' ||
        msg === 'feature_locked' ||
        msg === 'limit_exceeded'
      ) {
        showPlanUpsell(e)
      } else {
        toast.error('Regeneration failed. Please try again.')
      }
    } finally {
      setRegenerating(false)
    }
  }, [fetchRoadmap, roadmap, showPlanUpsell])

  const openRegenerateConfirm = useCallback(() => {
    setRegenerateConfirmOpen(true)
  }, [])

  const handleNodeSelect = useCallback((node: RoadmapNode) => {
    setSelectedNode(node)
  }, [])

  const isCompact = bp === 'mobile' || bp === 'tablet'
  const isProcessing =
    roadmap?.generation_status === 'processing' || roadmap?.generation_status === 'pending'
  const isFailed = roadmap?.generation_status === 'failed'
  const isComplete = roadmap?.generation_status === 'complete'

  const hasOverview = useMemo(() => {
    if (!roadmap) return false
    const { total } = roadmapOverallProgress(nodes)
    return (
      Boolean(roadmap.opening_message?.trim()) ||
      Boolean(roadmap.success_vision?.trim()) ||
      total > 0
    )
  }, [roadmap, nodes])

  const sectionTabs = useMemo((): OpportunitySectionNavItem[] => {
    if (!roadmap || isProcessing || isFailed) return []
    const items: OpportunitySectionNavItem[] = []
    if (hasOverview) {
      items.push({ id: 'roadmap-overview', label: 'Overview' })
    }
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]!
      items.push({
        id: roadmapPhaseSectionId(phase.id),
        label: `Phase ${i + 1}`,
      })
    }
    if (roadmap.closing_message?.trim()) {
      items.push({ id: 'roadmap-closing', label: 'Closing' })
    }
    return items
  }, [roadmap, isProcessing, isFailed, hasOverview, phases])

  // Keep active tab valid when sections change (e.g. after load / regenerate).
  useEffect(() => {
    if (sectionTabs.length === 0) return
    if (!sectionTabs.some((t) => t.id === activeSectionId)) {
      setActiveSectionId(sectionTabs[0]!.id)
    }
  }, [sectionTabs, activeSectionId])

  const activePhase = useMemo(() => {
    if (!activeSectionId.startsWith('roadmap-phase-')) return null
    const phaseId = activeSectionId.slice('roadmap-phase-'.length)
    const index = phases.findIndex((p) => p.id === phaseId)
    if (index < 0) return null
    return { phase: phases[index]!, index }
  }, [activeSectionId, phases])

  const chromeTabs = useMemo(
    () =>
      sectionTabs.length >= 2 ? (
        <OpportunityDetailSectionTabs
          mode="panel"
          sections={sectionTabs}
          activeId={activeSectionId}
          onActiveIdChange={setActiveSectionId}
        />
      ) : null,
    [sectionTabs, activeSectionId],
  )

  const country = roadmap ? roadmapCountryFromMetadata(roadmap.metadata) : null
  const chromePrimaryBadge = roadmap ? ROADMAP_DOMAIN_LABELS[roadmap.domain] : null
  const chromeGhostBadge = country

  useRegisterAppChromeHeader({
    title: roadmap?.title ?? 'Roadmap',
    icon: <Map className="h-full w-full" aria-hidden />,
    badges:
      roadmap && !isProcessing
        ? {
            primary: chromePrimaryBadge,
            ghost: chromeGhostBadge,
          }
        : null,
    tabs: isComplete ? chromeTabs : null,
    regenerate: isComplete
      ? {
          onClick: openRegenerateConfirm,
          disabled: regenerating || Boolean(isProcessing),
          loading: regenerating,
        }
      : null,
  })

  if (loading && !roadmap) {
    return (
      <div className="w-full">
        <DiscoverWide>
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[1.1rem] font-semibold text-foreground">Loading roadmap...</p>
          </div>
        </DiscoverWide>
      </div>
    )
  }

  if (error && !roadmap) {
    return (
      <div className="w-full">
        <DiscoverWide>
          <div className="py-16">
            <NotFoundState size="md" message={error}>
              <Button variant="primary" size="sm" onClick={() => navigate('/room?mode=roadmap')}>
                Back to Roadmaps
              </Button>
            </NotFoundState>
          </div>
        </DiscoverWide>
      </div>
    )
  }

  const twScroll = { startWhenInView: true as const, inViewResetKey: roadmap?.id ?? id ?? '' }

  const pageBody = (
    <div className="w-full">
      <DiscoverWide>
        <div className={cn(opportunityDetailPageGridClass(isCompact), 'pb-8 font-sans max-[389px]:pb-6')}>
      <Seo
        title={`${roadmap?.title ?? 'Roadmap'} | PowerProof`}
        canonicalPath={`/roadmap/${id}`}
        noIndex
      />

      {roadmap && (
        <RoadmapHeroPanel
          roadmap={roadmap}
          nodes={nodes}
          phaseCount={phases.length}
          bp={bp}
          twScroll={twScroll}
        />
      )}

      {isProcessing && (
        <div
          className={cn(
            opportunityDetailCardClass,
            'flex items-center gap-3 border-b border-border-subtle border-primary/20 bg-primary/5 px-4 py-3.5',
          )}
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Building your roadmap…</p>
            <p className="text-xs text-muted-foreground">This can take 20–30 seconds</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div
          className={cn(
            opportunityDetailCardClass,
            'border-b border-destructive/30 bg-destructive/[0.06] px-4 py-3.5 text-sm text-foreground',
          )}
          role="alert"
        >
          <p>
            Generation failed. Your credits may have been charged — contact support if this
            persists.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-2"
            onClick={() => setRetryRegenerateConfirmOpen(true)}
            disabled={regenerating}
          >
            Retry generation
          </Button>
        </div>
      )}

      {!isProcessing && !isFailed && roadmap && (
        <div className="flex w-full min-w-0 flex-col gap-0">
          {activeSectionId === 'roadmap-overview' ||
          (sectionTabs.length < 2 && hasOverview) ? (
            <RoadmapHero roadmap={roadmap} nodes={nodes} />
          ) : null}

          {activePhase ? (
            <JourneyView
              phases={[activePhase.phase]}
              phaseIndexBase={activePhase.index}
              nodes={nodes}
              onNodeComplete={toggleNodeComplete}
              onNodeSelect={handleNodeSelect}
              roadmapDifficulty={roadmap.difficulty}
            />
          ) : sectionTabs.length < 2 && phases.length > 0 ? (
            <JourneyView
              phases={phases}
              nodes={nodes}
              onNodeComplete={toggleNodeComplete}
              onNodeSelect={handleNodeSelect}
              roadmapDifficulty={roadmap.difficulty}
            />
          ) : null}

          {(activeSectionId === 'roadmap-closing' ||
            (sectionTabs.length < 2 && roadmap.closing_message)) &&
          roadmap.closing_message ? (
            <section
              id="roadmap-closing"
              role="tabpanel"
              className={cn(
                opportunityDetailCardClass,
                'border-b border-border-subtle px-0 py-5 sm:py-6',
              )}
            >
              <p className="m-0 font-sans text-[15px] leading-relaxed text-foreground sm:text-base">
                {roadmap.closing_message}
              </p>
            </section>
          ) : null}
        </div>
      )}

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedNode(null)
          }}
          onComplete={toggleNodeComplete}
        />
      )}

      <ConfirmDialog
        open={regenerateConfirmOpen}
        title={REGENERATE_ROADMAP_CONFIRM.title}
        description={regenerateRoadmapConfirmDescription(roadmap?.title ?? roadmap?.goal_input)}
        confirmLabel={REGENERATE_ROADMAP_CONFIRM.confirmLabel}
        onConfirm={() => {
          setRegenerateConfirmOpen(false)
          void handleRegenerate()
        }}
        onCancel={() => setRegenerateConfirmOpen(false)}
      />

      <ConfirmDialog
        open={retryRegenerateConfirmOpen}
        title={REGENERATE_ROADMAP_CONFIRM.title}
        description={regenerateRoadmapConfirmDescription(roadmap?.title ?? roadmap?.goal_input)}
        confirmLabel={REGENERATE_ROADMAP_CONFIRM.confirmLabel}
        onConfirm={() => {
          setRetryRegenerateConfirmOpen(false)
          void handleRegenerate()
        }}
        onCancel={() => setRetryRegenerateConfirmOpen(false)}
      />
        </div>
      </DiscoverWide>
    </div>
  )

  if (isComplete && roadmap) {
    return (
      <RoadmapAskAI roadmapId={roadmap.id} roadmapTitle={roadmap.title}>
        <AskAiChatPageShell>{pageBody}</AskAiChatPageShell>
      </RoadmapAskAI>
    )
  }

  return pageBody
}

export default RoadmapView

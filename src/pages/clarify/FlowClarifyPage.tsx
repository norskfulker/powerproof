import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useResearchOpportunityContext } from '@/contexts/ResearchOpportunityContext'
import { useRoadmapClarifyContext } from '@/contexts/RoadmapClarifyContext'
import { useWarRoomContext } from '@/contexts/WarRoomContext'
import { useClarifyRouteExitCleanup } from '@/hooks/useClarifyRouteExitCleanup'
import { Seo } from '@/components/Seo'
import {
  ClarificationReviewingState,
  ClarificationWizard,
  type ClarifyStagedProgressStep,
} from '@/components/research/ClarificationWizard'
import { ClarificationFlowLayout } from '@/components/research/ClarificationFlowLayout'
import { buildWelcomeClarifyNavModel } from '@/lib/clarifyNav'
import { invokeClarifyRoadmapPrompt } from '@/lib/clarifyRoadmapPrompt'
import { invokeClarifyWarRoomPrompt } from '@/lib/clarifyWarRoomPrompt'
import {
  CLARIFY_FLOW_HOME,
  type ClarifyFlowKind,
  ROADMAP_CLARIFY_ROUTE,
  RESEARCH_CLARIFY_ROUTE,
  WAR_ROOM_CLARIFY_ROUTE,
} from '@/lib/discoverHeroRoutes'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FLOW_META: Record<
  ClarifyFlowKind,
  {
    route: string
    seoTitle: string
    contextLabel: string
    reviewingTitle: string
    reviewingSubtitle: string
    readyTitle: string
    refinedPromptLabel: string
    runButtonLoadingLabel: string
    stagedProgress: readonly ClarifyStagedProgressStep[]
  }
> = {
  research: {
    route: RESEARCH_CLARIFY_ROUTE,
    seoTitle: 'Research clarification | PowerProof',
    contextLabel: 'Research clarification ~ takes 2-3 minutes',
    reviewingTitle: 'Reviewing your idea',
    reviewingSubtitle: 'Checking whether we need a few quick questions before running research.',
    readyTitle: 'Ready to research',
    refinedPromptLabel: 'This is what we will research',
    runButtonLoadingLabel: 'Starting research…',
    stagedProgress: [
      { headline: 'Scanning your input…', subtext: 'Pulling out what matters.' },
      { headline: 'Sharpening the angle…', subtext: 'Refining your research angle.' },
      { headline: 'Locking it in…', subtext: 'Almost got your brief ready.' },
    ],
  },
  'war-room': {
    route: WAR_ROOM_CLARIFY_ROUTE,
    seoTitle: 'War Room clarification | PowerProof',
    contextLabel: 'War Room clarification',
    reviewingTitle: 'Reviewing your prompt',
    reviewingSubtitle: 'Checking whether we need a few quick questions before scouting the market.',
    readyTitle: 'Ready to scout',
    refinedPromptLabel: "This is what we'll scout",
    runButtonLoadingLabel: 'Scouting the market…',
    stagedProgress: [
      { headline: 'Reading the play…', subtext: 'Pulling out what matters.' },
      { headline: 'Sizing up the competition…', subtext: 'Refining your competitive angle.' },
      { headline: 'Locking it in…', subtext: 'Almost got your brief ready.' },
    ],
  },
  roadmap: {
    route: ROADMAP_CLARIFY_ROUTE,
    seoTitle: 'Roadmap clarification | PowerProof',
    contextLabel: 'Roadmap clarification',
    reviewingTitle: 'Reviewing your goal',
    reviewingSubtitle: 'Checking whether we need a few quick questions before building your roadmap.',
    readyTitle: 'Ready to generate',
    refinedPromptLabel: "This is what we'll build",
    runButtonLoadingLabel: 'Generating roadmap…',
    stagedProgress: [
      { headline: 'Reading your goal…', subtext: 'Pulling out what matters.' },
      { headline: 'Mapping the next move…', subtext: 'Refining your next steps.' },
      { headline: 'Locking it in…', subtext: 'Almost got your brief ready.' },
    ],
  },
}

function ResearchClarifyContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const research = useResearchOpportunityContext()
  const meta = FLOW_META.research

  useClarifyRouteExitCleanup(
    () => research.step === 'wizard' || research.wizardLoading,
    () => research.resetResearch(),
  )

  useEffect(() => {
    if (research.step === 'researching' || research.step === 'warning') {
      navigate(CLARIFY_FLOW_HOME.research, { replace: true })
    }
    if (research.step === 'input' && !research.wizardLoading && !research.error) {
      navigate(CLARIFY_FLOW_HOME.research, { replace: true })
    }
  }, [navigate, research.error, research.step, research.wizardLoading])

  const welcomeNav = useMemo(
    () => buildWelcomeClarifyNavModel(research.clarifyQuery),
    [research.clarifyQuery],
  )

  if (!user) return null

  return (
    <ClarifyFlowShell meta={meta} query={research.clarifyQuery}>
      {research.wizardLoading ? (
        <ClarificationFlowLayout navModel={welcomeNav} onSelectNavItem={() => {}}>
          <ClarificationReviewingState
            query={research.clarifyQuery}
            contextLabel={meta.contextLabel}
            title={meta.reviewingTitle}
            subtitle={meta.reviewingSubtitle}
          />
        </ClarificationFlowLayout>
      ) : null}

      {research.step === 'wizard' && !research.wizardLoading ? (
        <ClarificationWizard
          userId={user.id}
          originalQuery={research.clarifyQuery}
          country={research.clarifyCountry}
          initialRound={research.wizardRound}
          initialQuestions={research.wizardQuestions}
          resumeDraftId={research.resumeDraftId}
          onComplete={research.completeWizard}
          onCancel={() => {
            research.resetResearch()
            navigate(CLARIFY_FLOW_HOME.research, { replace: true })
          }}
          contextLabel={meta.contextLabel}
          reviewingTitle={meta.reviewingTitle}
          reviewingSubtitle={meta.reviewingSubtitle}
          readyTitle={meta.readyTitle}
          refinedPromptLabel={meta.refinedPromptLabel}
          runButtonLabel="Run Research"
          runButtonLoadingLabel={meta.runButtonLoadingLabel}
          stagedProgress={meta.stagedProgress}
        />
      ) : null}
    </ClarifyFlowShell>
  )
}

function WarRoomClarifyContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const warRoom = useWarRoomContext()
  const meta = FLOW_META['war-room']

  useClarifyRouteExitCleanup(
    () =>
      warRoom.clarifyStep === 'loading' ||
      warRoom.clarifyStep === 'wizard' ||
      warRoom.wizardLoading,
    () => warRoom.cancelClarify(),
  )

  useEffect(() => {
    const inClarify =
      warRoom.clarifyStep === 'loading' ||
      warRoom.clarifyStep === 'wizard' ||
      warRoom.wizardLoading
    if (!inClarify) {
      navigate(CLARIFY_FLOW_HOME['war-room'], { replace: true })
    }
  }, [navigate, warRoom.clarifyStep, warRoom.wizardLoading])

  const welcomeNav = useMemo(
    () => buildWelcomeClarifyNavModel(warRoom.clarifyQuery),
    [warRoom.clarifyQuery],
  )

  if (!user) return null

  return (
    <ClarifyFlowShell meta={meta} query={warRoom.clarifyQuery}>
      {warRoom.wizardLoading ? (
        <ClarificationFlowLayout navModel={welcomeNav} onSelectNavItem={() => {}}>
          <ClarificationReviewingState
            query={warRoom.clarifyQuery}
            contextLabel={meta.contextLabel}
            title={meta.reviewingTitle}
            subtitle={meta.reviewingSubtitle}
          />
        </ClarificationFlowLayout>
      ) : null}

      {warRoom.clarifyStep === 'wizard' && !warRoom.wizardLoading ? (
        <ClarificationWizard
          userId={user.id}
          originalQuery={warRoom.clarifyQuery}
          country={warRoom.clarifyCountry}
          initialRound={warRoom.wizardRound}
          initialQuestions={warRoom.wizardQuestions}
          initialPreviousAnswers={warRoom.wizardPreviousAnswers}
          initialReady={warRoom.clarifyReadyResume}
          onPersistClarifyState={warRoom.persistClarifyState}
          onComplete={warRoom.completeWizard}
          onCancel={() => {
            warRoom.cancelClarify()
            navigate(CLARIFY_FLOW_HOME['war-room'], { replace: true })
          }}
          invokeClarify={invokeClarifyWarRoomPrompt}
          contextLabel={meta.contextLabel}
          reviewingTitle={meta.reviewingTitle}
          reviewingSubtitle={meta.reviewingSubtitle}
          persistDrafts={false}
          readyTitle={meta.readyTitle}
          refinedPromptLabel={meta.refinedPromptLabel}
          runButtonLabel="Scout the market"
          runButtonLoadingLabel={meta.runButtonLoadingLabel}
          stagedProgress={meta.stagedProgress}
        />
      ) : null}

      {warRoom.phase === 'error' && warRoom.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.08] p-4 text-sm text-foreground">
          {warRoom.error}
        </div>
      ) : null}
    </ClarifyFlowShell>
  )
}

function RoadmapClarifyContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const roadmapFlow = useRoadmapClarifyContext()
  const meta = FLOW_META.roadmap

  useClarifyRouteExitCleanup(
    () => roadmapFlow.step === 'wizard' || roadmapFlow.wizardLoading,
    () => roadmapFlow.reset(),
  )

  useEffect(() => {
    if (roadmapFlow.step === 'input' && !roadmapFlow.wizardLoading && !roadmapFlow.error) {
      navigate(CLARIFY_FLOW_HOME.roadmap, { replace: true })
    }
  }, [navigate, roadmapFlow.error, roadmapFlow.step, roadmapFlow.wizardLoading])

  const welcomeNav = useMemo(
    () => buildWelcomeClarifyNavModel(roadmapFlow.clarifyQuery),
    [roadmapFlow.clarifyQuery],
  )

  if (!user) return null

  return (
    <ClarifyFlowShell meta={meta} query={roadmapFlow.clarifyQuery}>
      {roadmapFlow.wizardLoading ? (
        <ClarificationFlowLayout navModel={welcomeNav} onSelectNavItem={() => {}}>
          <ClarificationReviewingState
            query={roadmapFlow.clarifyQuery}
            contextLabel={meta.contextLabel}
            title={meta.reviewingTitle}
            subtitle={meta.reviewingSubtitle}
          />
        </ClarificationFlowLayout>
      ) : null}

      {roadmapFlow.step === 'wizard' && !roadmapFlow.wizardLoading ? (
        <ClarificationWizard
          userId={user.id}
          originalQuery={roadmapFlow.clarifyQuery}
          country={roadmapFlow.clarifyCountry}
          initialRound={roadmapFlow.wizardRound}
          initialQuestions={roadmapFlow.wizardQuestions}
          initialPreviousAnswers={roadmapFlow.wizardPreviousAnswers}
          initialReady={roadmapFlow.clarifyReadyResume}
          initialDetectedPersona={roadmapFlow.detectedPersona}
          onDetectedPersonaChange={roadmapFlow.onDetectedPersonaChange}
          onPersistClarifyState={roadmapFlow.persistClarifyState}
          onComplete={roadmapFlow.completeWizard}
          onCancel={() => {
            roadmapFlow.reset()
            navigate(CLARIFY_FLOW_HOME.roadmap, { replace: true })
          }}
          invokeClarify={invokeClarifyRoadmapPrompt}
          contextLabel={meta.contextLabel}
          persistDrafts={false}
          readyTitle={meta.readyTitle}
          refinedPromptLabel={meta.refinedPromptLabel}
          runButtonLabel="Generate Roadmap"
          runButtonLoadingLabel={meta.runButtonLoadingLabel}
          stagedProgress={meta.stagedProgress}
        />
      ) : null}

      {roadmapFlow.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.08] p-4 text-sm text-foreground">
          {roadmapFlow.error}
        </div>
      ) : null}
    </ClarifyFlowShell>
  )
}

function ClarifyFlowShell({
  meta,
  query,
  children,
}: {
  meta: (typeof FLOW_META)[ClarifyFlowKind]
  query: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--app-top-offset,0px)-4rem)] w-full max-w-3xl flex-col px-4 py-6 layout-sm:px-6 layout-sm:py-8">
      <header className="mb-6 space-y-2 layout-sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.contextLabel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          {query.trim() || 'Clarifying your request'}
        </h1>
      </header>
      <div className={cn('flex flex-1 flex-col')}>{children}</div>
    </div>
  )
}

export function ResearchClarifyPage() {
  const meta = FLOW_META.research
  return (
    <>
      <Seo title={meta.seoTitle} description={meta.reviewingSubtitle} noIndex />
      <ResearchClarifyContent />
    </>
  )
}

export function WarRoomClarifyPage() {
  const meta = FLOW_META['war-room']
  return (
    <>
      <Seo title={meta.seoTitle} description={meta.reviewingSubtitle} noIndex />
      <WarRoomClarifyContent />
    </>
  )
}

export function RoadmapClarifyPage() {
  const meta = FLOW_META.roadmap
  return (
    <>
      <Seo title={meta.seoTitle} description={meta.reviewingSubtitle} noIndex />
      <RoadmapClarifyContent />
    </>
  )
}

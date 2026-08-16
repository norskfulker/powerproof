import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookMarked,
  BookOpen,
  Compass,
  Crosshair,
  Globe,
  Lock,
  Map,
  PackageSearch,
  SearchAiLine,
  SeoLine,
  Store2Line,
  Swords,
  Waypoints,
} from '@/lib/icons'

import { DEFAULT_COUNTRY_NAME } from '@/lib/countries'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import type { ResearchStyle } from '@/lib/researchStyles'
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace'
import type { HeroResearchNavigationState } from '@/lib/researchHeroState'
import { toast } from '@/components/ui/sonner'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useAppChromeHeaderOptional } from '@/contexts/AppChromeHeaderContext'
import { useDiscoverInvestorsBrowse } from '@/hooks/useDiscoverInvestorsBrowse'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { landingSignInTo } from '@/lib/authLanding'
import {
  isWorkspaceToolUnlocked,
  PAID_UNLOCK_NAV_IDS,
  type SidebarWorkspaceNavId,
} from '@/lib/sidebarWorkspaceNav'
import { hasSubscriptionFeature } from '@/lib/subscriptionStatus'
import { openSubscriptionPricingDialog } from '@/store/filterStore'
import { useResearchOpportunityContext } from '@/contexts/ResearchOpportunityContext'
import type { ResearchVisibility } from '@/lib/researchOpportunityStream'
import { ResearchHeroExpansion } from '@/components/research/ResearchHeroExpansion'
import { ResearchHeroChips, type ResearchHeroChipsHandle } from '@/components/research/ResearchHeroChips'
import type { ResearchHeroHistoryRow } from '@/components/research/ResearchHeroHistoryPanel'
import type { ClarificationDraft } from '@/types/research'
import { useBackgroundJobsOptional } from '@/contexts/BackgroundJobsContext'
import { isReResearchJob } from '@/lib/backgroundJobs'
import { BACKGROUND_JOB_COMPLETE_EVENT } from '@/lib/backgroundJobEvents'
import {
  toastComposerMaxLengthReached,
} from '@/lib/composerSelectionToast'
import { type AIModelId } from '@/lib/aiModels'
import { capitalizeIdeaFirstLetter } from '@/lib/ideaText'
import {
  isResearchFlowBusy,
  isSourcingFlowBusy,
  isWarRoomFlowBusy,
} from '@/lib/discoverHeroFlowBusy'
import { recordComposerSearchFromHeroTab } from '@/lib/composerSearchRecents'
import { writeHeroComposerTarget } from '@/lib/heroComposerTarget'
import {
  discoverHeroModeFromLocation,
  isDiscoverHeroTabPath,
  roomPathForMode,
  type DiscoverBrowseView,
  type DiscoverHeroTab,
} from '@/lib/discoverHeroRoutes'
import { getValidatedActiveProjectId } from '@/lib/activeProjectId'
import { useSourcing } from '@/hooks/useSourcing'
import { SourcingBudgetMidSlot } from '@/components/sourcing/SourcingBudgetMidSlot'
import { SourcingHeroExpansion } from '@/components/sourcing/SourcingHeroExpansion'
import { SourcingHeroChips, type SourcingHeroChipsHandle } from '@/components/sourcing/SourcingHeroChips'
import type { SourcingSortKey } from '@/lib/sourcingMerge'
import type { SourcingCard, SourcingHistoryRow } from '@/lib/sourcingTypes'
import type { UserPlaybook } from '@/lib/playbookTypes'
import type { UserRoadmap } from '@/pages/roadmap/roadmapTypes'
import { DiscoverHeroInvestorsWorkspace } from '@/components/discover/DiscoverHeroInvestorsWorkspace'
import {
  DiscoverHeroRoomInputShell,
  mobileRoomHeroContentClassName,
  mobileRoomHeroViewportClassName,
  mobileRoomLayoutClassName,
  mobileRoomResultsClassName,
  mobileRoomResultsScrollClassName,
  roomChromeTitleFromLocation,
  useRoomDiscoverChrome,
} from '@/components/discover/DiscoverHeroRoomShell'
import {
  DiscoverHeroBox,
  DiscoverHeroBoxStack,
  DiscoverHeroWorkspaceBox,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroBoxPublic, DiscoverHeroPrivateThenPublicStack } from '@/components/discover/DiscoverHeroBoxPublic'
import { DiscoverHeroWorkspaceSectionTitle } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import { HeroInput } from '@/components/discover/HeroInput'
import {
  DISCOVER_HERO_EXPANSION_MIN_H,
  discoverHeroComposerFooterBelowClassName,
  discoverHeroContentMaxWidthClass,
  discoverHeroModeWorkspaceBoxBodyClassName,
  discoverHeroFluidToWorkspaceStackClassName,
  clampDiscoverHeroComposerQuery,
  DISCOVER_HERO_COMPOSER_MAX_LENGTH,
  discoverHeroStackClassName,
  discoverHeroWorkspaceCardsBodyClassName,
} from '@/components/discover/discoverHeroTokens'
import { HeroInlineSelect, type HeroInlineSelectItem } from '@/components/discover/HeroInlineSelect'
import { SuggestIdeasButton } from '@/components/ideas/SuggestIdeasButton'
import {
  MarketTestHeroChips,
  type MarketTestHeroChipsHandle,
} from '@/components/market-test/MarketTestHeroChips'
import { MARKET_TEST_ROUTES } from '@/lib/marketTestRoutes'
import { WarRoomHeroChips, type WarRoomHeroChipsHandle } from '@/components/warroom/WarRoomHeroChips'
import { WarRoomHeroExpansion } from '@/components/warroom/WarRoomHeroExpansion'
import { useWarRoomContext } from '@/contexts/WarRoomContext'
import { useRoadmapClarifyContext } from '@/contexts/RoadmapClarifyContext'
import { RoadmapHeroExpansion } from '@/components/roadmap/RoadmapHeroExpansion'
import {
  roadmapModelKeyFromAiModelId,
} from '@/components/ModelSelector'
import {
  RoadmapHeroChips,
  type RoadmapHeroChipsHandle,
} from '@/components/roadmap/RoadmapHeroChips'
import {
  getGeneratingMessage,
} from '@/lib/roadmapApi'
import {
  RESEARCH_CLARIFY_ROUTE,
  ROADMAP_CLARIFY_ROUTE,
  WAR_ROOM_CLARIFY_ROUTE,
  playbookDetailPath,
  roadmapDetailPath,
} from '@/lib/discoverHeroRoutes'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { useTypewriterFill } from '@/hooks/useTypewriterFill'
import { moderateDiscoverHeroInput } from '@/lib/textModeration'

/** Lets TabsList indicator + TabsContent exit animation finish before route change remounts the hero. */
const TAB_ROUTE_NAV_DELAY_MS = 280

/** Full discover hero (live directory search + research mode toggle). */
export type DiscoverHeroRouteContext = 'opportunities' | 'my-research' | 'war-room'

export type { DiscoverHeroTab } from '@/lib/discoverHeroRoutes'

export type DiscoverHeroLiveSearchHeroProps = {
  /** Seed hero search (e.g. navigation state from AI redirect). */
  initialSearch?: string
  onApplyDiscoverSearch?: (query: string) => void
  className?: string
  inputId?: string
  /** Which page hosts the hero — drives default toggle + cross-route navigation. */
  routeContext?: DiscoverHeroRouteContext
  /** Reserve expansion height so toggling routes does not shift layout. */
  stableLayout?: boolean
}

export type DiscoverHeroLiveSearchProps = DiscoverHeroLiveSearchHeroProps

function AdminResearchVisibilitySelect({
  value,
  onChange,
  disabled = false,
}: {
  value: ResearchVisibility
  onChange: (visibility: ResearchVisibility) => void
  disabled?: boolean
}) {
  const label = value === 'catalog' ? 'Public Catalog' : 'Private'

  const items: HeroInlineSelectItem[] = [
    {
      value: 'private',
      label: 'Private (my research)',
      icon: <Lock className="h-3.5 w-3.5" />,
    },
    {
      value: 'catalog',
      label: 'Public Catalog',
      icon: <Globe className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <HeroInlineSelect
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== 'private' && next !== 'catalog') return
        onChange(next)
        toast.success(
          next === 'catalog' ? 'Public Catalog selected' : 'Private research selected',
          {
            description:
              next === 'catalog'
                ? 'This completed research will be published to the public catalog.'
                : 'This research will stay in your workspace.',
          },
        )
      }}
      tone={value === 'catalog' ? 'accent' : 'default'}
      leadingIcon={
        value === 'catalog' ? (
          <Globe className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )
      }
      prefix="Destination"
      valueLabel={label}
      aria-label={`Research visibility: ${label}`}
      contentMinWidthClass="min-w-[12rem]"
      items={items}
    />
  )
}

function DiscoverHeroWorkspaceBody({
  resultsFirst,
  reserveExpansion,
  chips,
  results,
  history,
}: {
  resultsFirst: boolean
  reserveExpansion?: boolean
  chips: ReactNode
  results: ReactNode
  /** Saved history cards — rendered below active flow results when chips are split out. */
  history?: ReactNode
}) {
  const resultsBlock = history ? (
    <div className="flex flex-col gap-3">
      {results}
      {history}
    </div>
  ) : (
    results
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        resultsFirst && reserveExpansion && 'min-h-0 flex-1',
        !resultsFirst && reserveExpansion && 'min-h-0 flex-1',
      )}
    >
      {resultsFirst ? resultsBlock : null}
      {chips ? <div className={cn(resultsFirst && 'mt-auto')}>{chips}</div> : null}
      {!resultsFirst && resultsBlock ? <div className="w-full min-w-0">{resultsBlock}</div> : null}
    </div>
  )
}

function DiscoverHeroGeneratedChipsCard({
  chips,
  chipsVisible,
}: {
  chips: ReactNode
  chipsVisible: boolean
}) {
  if (!chips) return null

  // Keep chip generators mounted while hidden so composer "Generate Ideas" can call suggest().
  if (!chipsVisible) {
    return (
      <div className="hidden" aria-hidden>
        {chips}
      </div>
    )
  }

  return (
    <DiscoverHeroBox ariaLabel="Suggested ideas">
      {chips}
    </DiscoverHeroBox>
  )
}

function DiscoverHeroWorkspaceChipsLayout({
  fluidComposer,
  chips,
  chipsVisible,
  chipsAboveComposer = false,
  workspace,
  workspaceVisible = true,
  workspaceStackClassName,
  toolsAboveComposer,
  title,
}: {
  fluidComposer: ReactNode
  chips: ReactNode
  chipsVisible: boolean
  chipsAboveComposer?: boolean
  workspace: ReactNode
  workspaceVisible?: boolean
  workspaceStackClassName?: string
  toolsAboveComposer?: ReactNode
  title?: string | null
}) {
  const location = useLocation()
  const resolvedTitle =
    title ?? roomChromeTitleFromLocation(location.pathname, location.search)
  const chipsCard = (
    <DiscoverHeroGeneratedChipsCard chips={chips} chipsVisible={chipsVisible} />
  )

  if (chipsAboveComposer) {
    return (
      <DiscoverHeroRoomInputShell
        composer={fluidComposer}
        workspace={workspace}
        chipsSlot={chipsCard}
        chipsVisible={chipsVisible}
        workspaceVisible={workspaceVisible}
        workspaceStackClassName={workspaceStackClassName}
        toolsAboveComposer={toolsAboveComposer}
        title={resolvedTitle}
      />
    )
  }

  return (
    <DiscoverHeroBoxStack className={workspaceStackClassName}>
      {chipsCard}
      {workspace}
    </DiscoverHeroBoxStack>
  )
}

export function DiscoverHeroLiveSearch(props: DiscoverHeroLiveSearchProps) {
  const {
    initialSearch,
    onApplyDiscoverSearch,
    className,
    inputId,
    routeContext: routeContextProp,
    stableLayout = false,
  } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pathHeroTab = discoverHeroModeFromLocation(location.pathname, location.search)
  const routeContext: DiscoverHeroRouteContext =
    routeContextProp ??
    (pathHeroTab === 'war-room'
      ? 'war-room'
      : pathHeroTab === 'research'
        ? 'my-research'
        : 'opportunities')
  const { user, isAdmin } = useAuth()
  const chrome = useAppChromeHeaderOptional()
  const previewRoomVariant = chrome?.previewRoomVariant ?? 'off'
  const previewFresh = previewRoomVariant === 'free'
  const previewNil = previewRoomVariant === 'nil'
  const hidePersonalHistory = previewFresh || previewNil
  const roomChromeTitle = useRoomDiscoverChrome()
  const [q, setQ] = useState('')
  const composerQueryRef = useRef(q)
  composerQueryRef.current = q
  const [researchBadgeOpts, setResearchBadgeOpts] = useState<{ badge?: string; badge_label?: string }>({})
  const [researchStyle, setResearchStyle] = useState<ResearchStyle>('standard')
  const [researchVisibility, setResearchVisibility] = useState<ResearchVisibility>('private')
  const [heroTab, setHeroTab] = useState<DiscoverHeroTab>(() => pathHeroTab)
  const [budgetMax, setBudgetMax] = useState('')
  const [sourcingSort, setSourcingSort] = useState<SourcingSortKey>('price_desc')
  const [sourcingDrawerCard, setSourcingDrawerCard] = useState<SourcingCard | null>(null)
  const { data: subscriptionStatus } = useSubscriptionStatus()
  const { activeProject, projects } = useActiveWorkspace()
  const validatedProjectId = useMemo(
    () => getValidatedActiveProjectId(activeProject, projects),
    [activeProject, projects],
  )
  const [warRoomOpen, setWarRoomOpen] = useState(false)
  const warRoom = useWarRoomContext()
  const [roadmapMessageIndex, setRoadmapMessageIndex] = useState(0)
  const [roadmapRefreshKey, setRoadmapRefreshKey] = useState(0)
  const research = useResearchOpportunityContext()
  const backgroundJobs = useBackgroundJobsOptional()
  const attachedPendingResearchIdRef = useRef<string | null>(null)
  const attachedPendingPlaybookIdRef = useRef<string | null>(null)
  const attachedPendingRoadmapIdRef = useRef<string | null>(null)
  const { fill: typewriterFill } = useTypewriterFill('fast')
  /** AI model auto-pick is permanently enabled — the model picker chip is no
   *  longer rendered in the discover hero composer, so this is a constant. */
  const aiAutoEnabled = true
  const { selectedModel, setSelectedModel } = usePreferredAiModel()
  const roadmapFlow = useRoadmapClarifyContext()
  const roadmapGenerating = roadmapFlow.step === 'generating'
  const sourcing = useSourcing()
  const pendingAutoRunRef = useRef(false)
  const pendingTabNavRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workspaceSuggestRef = useRef<
    | ResearchHeroChipsHandle
    | SourcingHeroChipsHandle
    | WarRoomHeroChipsHandle
    | RoadmapHeroChipsHandle
    | MarketTestHeroChipsHandle
    | null
  >(null)
  const [suggestIdeasLoading, setSuggestIdeasLoading] = useState(false)
  /** Composer text is remembered per hero tab so idea chips do not leak across modes. */
  const composerDraftByTabRef = useRef<Partial<Record<DiscoverHeroTab, string>>>({})
  const isResearchMode = heroTab === 'research'
  const isSearchMode = heroTab === 'search'
  const browseView: DiscoverBrowseView = isSearchMode ? 'investors' : 'opportunities'
  const isInvestorsBrowseMode = isSearchMode
  const isDiscoverBrowseMode = isSearchMode
  const investorsBrowse = useDiscoverInvestorsBrowse(isInvestorsBrowseMode)
  const isMarketTestMode = heroTab === 'market-test'
  const isSourcingMode = heroTab === 'sourcing'
  const isRoadmapMode = heroTab === 'roadmap'
  const isPlaybookMode = heroTab === 'war-room'
  const isRoomComposerMode =
    isResearchMode || isRoadmapMode || isPlaybookMode || isMarketTestMode || isSourcingMode

  const effectiveAiModel: AIModelId = selectedModel
  const effectiveResearchStyle = researchStyle

  useEffect(() => {
    if (!roadmapGenerating) return
    const timer = window.setInterval(() => setRoadmapMessageIndex((i) => i + 1), 2500)
    return () => window.clearInterval(timer)
  }, [roadmapGenerating])
  const isIdeaComposerMode = isResearchMode || isPlaybookMode

  useEffect(() => {
    if (!isResearchMode) return
    if (location.pathname === RESEARCH_CLARIFY_ROUTE) return
    if (research.step === 'wizard' || research.wizardLoading) {
      navigate(RESEARCH_CLARIFY_ROUTE, { replace: true })
    }
  }, [isResearchMode, location.pathname, navigate, research.step, research.wizardLoading])

  useEffect(() => {
    if (!isPlaybookMode) return
    if (location.pathname === WAR_ROOM_CLARIFY_ROUTE) return
    if (
      warRoom.clarifyStep === 'loading' ||
      warRoom.clarifyStep === 'wizard' ||
      warRoom.wizardLoading
    ) {
      navigate(WAR_ROOM_CLARIFY_ROUTE, { replace: true })
    }
  }, [
    isPlaybookMode,
    location.pathname,
    navigate,
    warRoom.clarifyStep,
    warRoom.wizardLoading,
  ])

  useEffect(() => {
    if (!isRoadmapMode) return
    if (location.pathname === ROADMAP_CLARIFY_ROUTE) return
    if (roadmapFlow.step === 'wizard' || roadmapFlow.wizardLoading) {
      navigate(ROADMAP_CLARIFY_ROUTE, { replace: true })
    }
  }, [isRoadmapMode, location.pathname, navigate, roadmapFlow.step, roadmapFlow.wizardLoading])

  const composerDraftKey = heroTab

  const syncComposerToTab = useCallback(
    (fromKey: DiscoverHeroTab, toKey: DiscoverHeroTab, currentQ: string) => {
      const trimmed = currentQ.trim()
      if (trimmed) composerDraftByTabRef.current[fromKey] = currentQ
      else delete composerDraftByTabRef.current[fromKey]
      setQ(clampDiscoverHeroComposerQuery(composerDraftByTabRef.current[toKey] ?? ''))
    },
    [],
  )

  const applyComposerQuery = useCallback(
    (value: string) => {
      const raw = isIdeaComposerMode ? capitalizeIdeaFirstLetter(value) : value
      const next = clampDiscoverHeroComposerQuery(raw)
      if (
        next.length === DISCOVER_HERO_COMPOSER_MAX_LENGTH &&
        q.length < DISCOVER_HERO_COMPOSER_MAX_LENGTH
      ) {
        toastComposerMaxLengthReached(DISCOVER_HERO_COMPOSER_MAX_LENGTH)
      }
      setQ(next)
      if (next.trim()) composerDraftByTabRef.current[composerDraftKey] = next
      else delete composerDraftByTabRef.current[composerDraftKey]
    },
    [composerDraftKey, isIdeaComposerMode, q.length],
  )
  /** War Room page: project-only submit OK. Discover/opportunities tab: must type a description. */

  const notifyComposerAtMaxLength = useCallback(() => {
    toastComposerMaxLengthReached(DISCOVER_HERO_COMPOSER_MAX_LENGTH)
  }, [])

  const warRoomFlowActive =
    isPlaybookMode &&
    warRoomOpen &&
    (warRoom.phase !== 'idle' || warRoom.clarifyStep !== 'none' || warRoom.wizardLoading)

  const researchRunOpts = useMemo(
    () => ({
      ...researchBadgeOpts,
      project_id: validatedProjectId ?? undefined,
      research_style: effectiveResearchStyle,
      model: effectiveAiModel,
      ...(isAdmin ? { visibility: researchVisibility } : {}),
    }),
    [
      researchBadgeOpts,
      validatedProjectId,
      effectiveResearchStyle,
      effectiveAiModel,
      isAdmin,
      researchVisibility,
    ],
  )

  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPlaybookMode) {
      setWarRoomOpen(false)
      warRoom.reset()
    }
  }, [heroTab, warRoom.reset])

  const closeWarRoomFlow = useCallback(() => {
    setWarRoomOpen(false)
    warRoom.reset()
  }, [warRoom.reset])

  const handleResumeWarRoomIntakeDraft = useCallback(() => {
    if (warRoomFlowActive) return
    void warRoom.resumeFromIntakeDraft().then((r) => {
      if (!r.restored || !r.description) return
      applyComposerQuery(r.description)
      setWarRoomOpen(true)
      if (!r.resumeBriefing) {
        void warRoom.beginBriefing(r.description, DEFAULT_COUNTRY_NAME)
      }
    })
  }, [applyComposerQuery, warRoom, warRoomFlowActive])

  const handleDiscardWarRoomIntakeDraft = useCallback(() => {
    closeWarRoomFlow()
  }, [closeWarRoomFlow])

  useEffect(() => {
    if (!isResearchMode || !backgroundJobs || !user?.id) return

    const eligiblePending = backgroundJobs.activeResearches.filter((r) => !isReResearchJob(r))

    // Multiple in-flight runs: keep the list visible in My research — don't hijack the hero.
    if (eligiblePending.length !== 1) {
      if (eligiblePending.length === 0) {
        attachedPendingResearchIdRef.current = null
      }
      return
    }

    const pending = eligiblePending[0]!
    if (!pending) {
      attachedPendingResearchIdRef.current = null
      return
    }
    if (attachedPendingResearchIdRef.current === pending.id) return
    if (research.step !== 'input' && research.step !== 'researching') return

    attachedPendingResearchIdRef.current = pending.id
    const query = pending.research_query?.trim() || pending.title?.trim() || ''
    if (query) applyComposerQuery(query)
    research.attachPendingResearch(pending.id, pending.created_at, query, pending.slug)
  }, [
    applyComposerQuery,
    backgroundJobs?.activeResearches,
    isResearchMode,
    research,
    user?.id,
  ])

  useEffect(() => {
    if (!isPlaybookMode || !backgroundJobs) return

    const pending = backgroundJobs.activePlaybooks[0]
    if (!pending) {
      attachedPendingPlaybookIdRef.current = null
      return
    }
    if (attachedPendingPlaybookIdRef.current === pending.id) return
    if (location.pathname.startsWith('/playbook/')) return
    if (warRoom.phase !== 'idle' && warRoom.phase !== 'generating') return

    attachedPendingPlaybookIdRef.current = pending.id
    navigate(playbookDetailPath(pending.id), {
      replace: true,
      state: discoverHeroNavState(location.pathname, location.search),
    })
  }, [
    backgroundJobs?.activePlaybooks,
    isPlaybookMode,
    location.pathname,
    location.search,
    navigate,
    warRoom.phase,
  ])

  useEffect(() => {
    if (!isRoadmapMode || !backgroundJobs || !user?.id) return
    if (location.pathname.startsWith('/roadmap/')) return

    const pending = backgroundJobs.activeRoadmaps[0]
    if (!pending) {
      attachedPendingRoadmapIdRef.current = null
      return
    }
    if (attachedPendingRoadmapIdRef.current === pending.id) return
    if (roadmapFlow.step !== 'input' && roadmapFlow.step !== 'generating') return

    attachedPendingRoadmapIdRef.current = pending.id
    navigate(roadmapDetailPath(pending.id), {
      replace: true,
      state: discoverHeroNavState(location.pathname, location.search),
    })
  }, [
    backgroundJobs?.activeRoadmaps,
    isRoadmapMode,
    location.pathname,
    location.search,
    navigate,
    roadmapFlow.step,
    user?.id,
  ])

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: string }>).detail
      if (detail?.kind === 'research') {
        setReResearchRefreshTick((t) => t + 1)
        attachedPendingResearchIdRef.current = null
      }
      if (detail?.kind === 'playbook') {
        attachedPendingPlaybookIdRef.current = null
      }
      if (detail?.kind === 'roadmap') {
        attachedPendingRoadmapIdRef.current = null
      }
    }
    window.addEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
    return () => window.removeEventListener(BACKGROUND_JOB_COMPLETE_EVENT, onComplete)
  }, [])

  const handleHistoryReResearch = useCallback(
    (row: ResearchHeroHistoryRow) => {
      if (!row.id) return
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      const slug = String(row.slug ?? '').trim()
      if (!slug) return
      navigate(`/my-research/${encodeURIComponent(slug)}`, {
        state: {
          ...discoverHeroNavState(location.pathname, location.search),
          openEditReResearch: true,
        },
      })
    },
    [location.pathname, location.search, navigate, user],
  )

  const handleResumeClarificationDraft = useCallback(
    (draft: ClarificationDraft) => {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      if (!activeProject?.id) {
        toast.error('Your workspace is still loading. Try again in a moment.')
        return
      }
      if (research.step === 'wizard' || research.step === 'researching' || research.wizardLoading) {
        return
      }
      const query = draft.original_query?.trim()
      if (!query) return
      setQ(clampDiscoverHeroComposerQuery(query))
      research.resumeClarificationDraft({
        id: draft.id,
        original_query: draft.original_query,
        country: draft.country,
        current_round: draft.current_round,
        pending_questions: draft.pending_questions,
      })
    },
    [
      activeProject?.id,
      location.pathname,
      location.search,
      navigate,
      research,
      user,
    ],
  )

  const handleHistoryReRunPlaybook = useCallback(
    (playbook: UserPlaybook) => {
      const term = String(playbook.business_description ?? playbook.business_name ?? '').trim()
      if (!term) return
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      applyComposerQuery(term)
      setWarRoomOpen(true)
      void warRoom.beginBriefing(term, DEFAULT_COUNTRY_NAME)
    },
    [
      applyComposerQuery,
      location.pathname,
      location.search,
      navigate,
      user,
      warRoom.beginBriefing,
    ],
  )

  const handleHistoryReRunMarketTest = useCallback(
    (row: { query?: string | null }) => {
      const term = String(row.query ?? '').trim()
      if (!term) return
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      navigate(`${MARKET_TEST_ROUTES.new}?q=${encodeURIComponent(term)}`, {
        state: {
          ...discoverHeroNavState(location.pathname, location.search),
          query: term,
          model: effectiveAiModel,
        },
      })
    },
    [
      effectiveAiModel,
      location.pathname,
      location.search,
      navigate,
      user,
    ],
  )

  const handleResumeClarifyPlaybook = useCallback(
    (playbook: UserPlaybook) => {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      const term = String(playbook.business_description ?? playbook.business_name ?? '').trim()
      if (!term) return
      applyComposerQuery(term)
      setWarRoomOpen(true)
      warRoom.resumeClarifySession(playbook)
    },
    [
      applyComposerQuery,
      location.pathname,
      location.search,
      navigate,
      user,
      warRoom,
    ],
  )

  const handleResumeClarifyRoadmap = useCallback(
    (roadmap: UserRoadmap) => {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      const term = roadmap.goal_input?.trim()
      if (!term) return
      applyComposerQuery(term)
      roadmapFlow.resumeClarifySession(roadmap)
    },
    [
      applyComposerQuery,
      location.pathname,
      location.search,
      navigate,
      roadmapFlow,
      user,
    ],
  )

  const handleHistoryReSearch = useCallback(
    (row: SourcingHistoryRow) => {
      const keyword = row.keyword.trim()
      if (!keyword) return
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      applyComposerQuery(keyword)
      setBudgetMax(row.budget_max != null ? String(row.budget_max) : '')
      void sourcing.search(keyword, row.budget_max != null ? Number(row.budget_max) : null)
    },
    [
      applyComposerQuery,
      location.pathname,
      location.search,
      navigate,
      sourcing,
      user,
    ],
  )

  useEffect(() => {
    if (isSourcingMode) return
    sourcing.reset()
    setBudgetMax('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSourcingMode])

  const prevComposerScopeRef = useRef<DiscoverHeroTab>(pathHeroTab)

  useEffect(() => {
    const tab = discoverHeroModeFromLocation(location.pathname, location.search)
    const nextScope = tab

    if (pendingTabNavRef.current) {
      clearTimeout(pendingTabNavRef.current)
      pendingTabNavRef.current = null
    }

    if (nextScope !== prevComposerScopeRef.current) {
      syncComposerToTab(prevComposerScopeRef.current, nextScope, composerQueryRef.current)
      prevComposerScopeRef.current = nextScope
    }

    setHeroTab(tab)
    if (tab === 'research') writeHeroComposerTarget('research')
    else if (tab === 'search') writeHeroComposerTarget('discover')
  }, [location.pathname, location.search, syncComposerToTab])

  useEffect(() => {
    return () => {
      if (pendingTabNavRef.current) clearTimeout(pendingTabNavRef.current)
    }
  }, [])

  useEffect(() => {
    const seed = initialSearch?.trim()
    if (!seed) return
    const clamped = clampDiscoverHeroComposerQuery(seed)
    composerDraftByTabRef.current[heroTab] = clamped
    setQ(clamped)
  }, [initialSearch, heroTab])

  useEffect(() => {
    const state = location.state as { heroSourcingMode?: boolean; sourcingKeyword?: string } | null
    if (!state?.heroSourcingMode) return
    setHeroTab('sourcing')
    if (state.sourcingKeyword) setQ(clampDiscoverHeroComposerQuery(state.sourcingKeyword))
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    const state = location.state as { heroResearch?: HeroResearchNavigationState } | null
    const heroResearch = state?.heroResearch
    if (!heroResearch) return
    setHeroTab('research')
    writeHeroComposerTarget('research')
    const query = heroResearch.query?.trim() ?? ''
    if (query) {
      typewriterFill(query, setQ, {
        inputId,
        onComplete: () => {
          if (heroResearch.autoRunResearch) pendingAutoRunRef.current = true
        },
      })
    }
    if (heroResearch.badge || heroResearch.badge_label) {
      setResearchBadgeOpts({
        badge: heroResearch.badge ?? '',
        badge_label: heroResearch.badge_label ?? '',
      })
    }
    if (heroResearch.autoRunResearch && !query) {
      pendingAutoRunRef.current = true
    }
    navigate(roomPathForMode('research', searchParams), { replace: true, state: {} })
  }, [location.pathname, location.search, location.state, navigate, searchParams, typewriterFill, inputId])

  useEffect(() => {
    if (!pendingAutoRunRef.current) return
    if (!user?.id || !isResearchMode || research.isBusy) return
    const term = q.trim()
    if (!term) return

    pendingAutoRunRef.current = false
    if (!activeProject?.id) {
      toast.error('Your workspace is still loading. Try again in a moment.')
      return
    }
    void research.runResearch(term, DEFAULT_COUNTRY_NAME, false, researchRunOpts)
  }, [
    user?.id,
    isResearchMode,
    research.isBusy,
    research.runResearch,
    q,
    researchRunOpts,
    activeProject?.id,
  ])

  const onHeroTabChange = useCallback(
    (tab: string) => {
      const next = tab as DiscoverHeroTab
      if (next !== heroTab) syncComposerToTab(composerDraftKey, next, q)
      setHeroTab(next)
      if (next === 'search' || next === 'research') {
        writeHeroComposerTarget(next === 'research' ? 'research' : 'discover')
      }
      if (next !== 'research' && !isResearchFlowBusy(research)) {
        research.resetResearch()
        setResearchStyle('standard')
        setResearchVisibility('private')
      }
      if (next !== 'war-room' && !isWarRoomFlowBusy(warRoomOpen, warRoom)) {
        warRoom.reset()
        setWarRoomOpen(false)
      }
      if (next !== 'sourcing' && !isSourcingFlowBusy(sourcing)) {
        sourcing.reset()
        setBudgetMax('')
      }

      const needsAuth =
        next === 'research' ||
        next === 'war-room' ||
        next === 'sourcing' ||
        next === 'roadmap' ||
        next === 'market-test'
      const targetPath = roomPathForMode(next, searchParams)

      if (needsAuth && !user) {
        navigate(landingSignInTo(targetPath))
        return
      }

      if (
        PAID_UNLOCK_NAV_IDS.has(next as SidebarWorkspaceNavId) &&
        !isWorkspaceToolUnlocked(next as SidebarWorkspaceNavId, {
          roadmapUnlocked: hasSubscriptionFeature(subscriptionStatus, 'roadmap_unlocked'),
          warroomUnlocked: hasSubscriptionFeature(subscriptionStatus, 'warroom_unlocked'),
          isAdmin,
        })
      ) {
        const label = next === 'roadmap' ? 'Roadmap' : 'War Room'
        toast.message(`${label} requires an active Unlimited plan.`, {
          action: {
            label: 'View Unlimited',
            onClick: openSubscriptionPricingDialog,
          },
        })
        return
      }

      if (!isDiscoverHeroTabPath(location.pathname, location.search, next)) {
        if (pendingTabNavRef.current) clearTimeout(pendingTabNavRef.current)
        pendingTabNavRef.current = setTimeout(() => {
          pendingTabNavRef.current = null
          navigate(targetPath)
        }, TAB_ROUTE_NAV_DELAY_MS)
      }
    },
    [
      composerDraftKey,
      heroTab,
      isAdmin,
      q,
      syncComposerToTab,
      research,
      sourcing,
      warRoom,
      warRoomOpen,
      navigate,
      location.pathname,
      location.search,
      searchParams,
      subscriptionStatus,
      user,
    ],
  )

  const runSubmit = useCallback(async () => {
    const term = q.trim()

    const recordRecent = () => {
      if (term) recordComposerSearchFromHeroTab(heroTab, term)
    }

    const composerUsesModeration =
      isResearchMode ||
      isPlaybookMode ||
      isRoadmapMode ||
      isMarketTestMode ||
      isSourcingMode

    if (term && composerUsesModeration && !moderateDiscoverHeroInput(term).ok) {
      return
    }

    if (isPlaybookMode) {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      if (!term) {
        toast.error('Describe your business to start War Room.')
        return
      }
      if (
        warRoom.phase === 'scouting' ||
        warRoom.phase === 'generating' ||
        warRoom.clarifyStep !== 'none' ||
        warRoom.wizardLoading
      ) {
        return
      }
      setWarRoomOpen(true)
      await warRoom.beginBriefing(
        term,
        DEFAULT_COUNTRY_NAME,
        aiAutoEnabled ? effectiveAiModel : undefined,
      )
      recordRecent()
      return
    }
    if (!term) return
    if (isSearchMode) {
      recordRecent()
      onApplyDiscoverSearch?.(term)
      return
    }
    if (isResearchMode) {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      if (!activeProject?.id) {
        toast.error('Your workspace is still loading. Try again in a moment.')
        return
      }
      if (research.step !== 'input' || research.wizardLoading) return
      await research.beginResearch(term, DEFAULT_COUNTRY_NAME, researchRunOpts)
      recordRecent()
      return
    }
    if (isSourcingMode) {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      await sourcing.search(term, budgetMax ? Number(budgetMax) : null)
      recordRecent()
      return
    }
    if (isRoadmapMode) {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      if (term.length < 10) {
        toast.error('Please describe your goal in more detail')
        return
      }
      if (roadmapFlow.step !== 'input' || roadmapFlow.wizardLoading) return
      await roadmapFlow.beginGeneration(
        term,
        DEFAULT_COUNTRY_NAME,
        aiAutoEnabled ? roadmapModelKeyFromAiModelId(effectiveAiModel) : undefined,
      )
      recordRecent()
      return
    }
    if (isMarketTestMode) {
      if (!user) {
        navigate(landingSignInTo(`${location.pathname}${location.search}`))
        return
      }
      if (!term) {
        toast.error('Enter a business idea to test the market.')
        return
      }
      navigate(`${MARKET_TEST_ROUTES.new}?q=${encodeURIComponent(term)}`, {
        state: {
          ...discoverHeroNavState(location.pathname, location.search),
          query: term,
          model: effectiveAiModel,
        },
      })
      recordRecent()
    }
  }, [
    q,
    heroTab,
    isPlaybookMode,
    isResearchMode,
    isSourcingMode,
    isSearchMode,
    warRoom.beginBriefing,
    roadmapFlow,
    research,
    researchRunOpts,
    activeProject?.id,
    user,
    navigate,
    location.pathname,
    location.search,
    sourcing,
    budgetMax,
    isRoadmapMode,
    isMarketTestMode,
    aiAutoEnabled,
    effectiveAiModel,
    onApplyDiscoverSearch,
  ])

  const onHeroInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const isPrintableKey =
      e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent.isComposing
    if (isPrintableKey && q.length >= DISCOVER_HERO_COMPOSER_MAX_LENGTH) {
      notifyComposerAtMaxLength()
    }
    if (e.key !== 'Escape') return
    if (isResearchMode && research.step === 'wizard') {
      e.preventDefault()
      research.resetResearch()
      return
    }
    if (isPlaybookMode && warRoom.clarifyStep === 'wizard') {
      e.preventDefault()
      warRoom.cancelClarify()
      closeWarRoomFlow()
      return
    }
    if (isRoadmapMode && roadmapFlow.step === 'wizard') {
      e.preventDefault()
      roadmapFlow.reset()
    }
  }

  const composerLeadingIcon = isResearchMode ? (
    <SeoLine className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : isPlaybookMode ? (
    <Crosshair className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : isRoadmapMode ? (
    <Waypoints className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : isSourcingMode ? (
    <SearchAiLine className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : isMarketTestMode ? (
    <Store2Line className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : isInvestorsBrowseMode ? (
    <BookOpen className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  ) : (
    <Compass className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
  )

  const researchFlowLocked = research.step !== 'input' || research.wizardLoading
  const researchWorkspaceDisabled = researchFlowLocked
  const hideChipsDuringWizard = research.wizardLoading || research.step === 'wizard'
  const warRoomFlowLocked = isPlaybookMode && warRoomFlowActive
  const warRoomWorkspaceDisabled = warRoomFlowLocked
  const warRoomComposerLocked = isPlaybookMode && warRoomFlowActive
  const roadmapFlowLocked = isRoadmapMode && (roadmapFlow.step !== 'input' || roadmapFlow.wizardLoading)
  const roadmapFlowActive = isRoadmapMode && roadmapFlow.isBusy
  const composerModeration = useMemo(() => moderateDiscoverHeroInput(q), [q])
  const moderationInputError = composerModeration.ok ? null : composerModeration.message
  const composerUsesModeration =
    isResearchMode ||
    isPlaybookMode ||
    isRoadmapMode ||
    isMarketTestMode ||
    isSourcingMode
  const composerInputError =
    (isResearchMode ? research.inputError : null) ??
    (isPlaybookMode ? warRoom.inputError : null) ??
    (isRoadmapMode ? roadmapFlow.inputError : null) ??
    (composerUsesModeration ? moderationInputError : null)
  const hideRoadmapChipsDuringWizard =
    roadmapFlow.wizardLoading || roadmapFlow.step === 'wizard'
  const submitDisabled =
    warRoomComposerLocked ||
    (isPlaybookMode && !q.trim()) ||
    (!isPlaybookMode && !q.trim()) ||
    (isResearchMode && researchWorkspaceDisabled) ||
    (isSourcingMode && sourcing.isBusy) ||
    (isRoadmapMode && roadmapFlowLocked) ||
    (composerUsesModeration && Boolean(moderationInputError))
  const submitLoading =
    (isPlaybookMode && (warRoom.phase === 'scouting' || warRoom.wizardLoading)) ||
    (isResearchMode && (research.step === 'researching' || research.wizardLoading)) ||
    (isSourcingMode && sourcing.isBusy) ||
    (isRoadmapMode && (roadmapGenerating || roadmapFlow.wizardLoading))

  // Global search prompt across feature categories (tabs above).
  const composerPlaceholder = 'What are we searching today?'

  const reserveTabExpansion =
    stableLayout && (isResearchMode || isPlaybookMode || isSourcingMode || isRoadmapMode)

  const researchFlowActive = isResearchMode && research.step !== 'input'
  const playbookFlowActive = isPlaybookMode && warRoomFlowActive
  const sourcingFlowActive = isSourcingMode && sourcing.step !== 'idle'
  const heroWorkspaceCompact =
    researchFlowActive ||
    playbookFlowActive ||
    sourcingFlowActive ||
    roadmapFlowActive
  const roomInputPhase =
    stableLayout && (isRoomComposerMode || isSearchMode) && !heroWorkspaceCompact

  const showComposerSuggestIdeas =
    (isResearchMode && research.step === 'input') ||
    isMarketTestMode ||
    (isPlaybookMode && !warRoomFlowActive) ||
    (isRoadmapMode && !roadmapFlowActive) ||
    (isSourcingMode && sourcing.step === 'idle')

  const suggestIdeasDisabled =
    (isResearchMode && researchWorkspaceDisabled) ||
    (isPlaybookMode && (submitLoading || warRoomFlowActive)) ||
    (isRoadmapMode && roadmapFlowLocked) ||
    (isSourcingMode && sourcing.isBusy)

  const composerSuggestIdeasSlot = showComposerSuggestIdeas ? (
    <SuggestIdeasButton
        variant="composerFooter"
        dataTour={
          isResearchMode || isMarketTestMode
            ? 'suggest-ideas'
            : isPlaybookMode
              ? 'suggest-playbook'
              : isSourcingMode
                ? 'suggest-products'
                : undefined
        }
        label={
          isResearchMode
            ? 'Generate Ideas'
            : isMarketTestMode
              ? 'Generate Ideas'
              : isSourcingMode
                ? 'Generate Products'
                : isRoadmapMode
                  ? 'Generate Goals'
                  : 'Generate Playbook'
        }
        accent={isPlaybookMode ? 'warRoom' : 'primary'}
        loading={suggestIdeasLoading}
        disabled={suggestIdeasDisabled}
        onClick={() => workspaceSuggestRef.current?.suggest()}
    />
  ) : null

  useEffect(() => {
    setSuggestIdeasLoading(false)
  }, [heroTab, research.step, sourcing.step, warRoomFlowActive, roadmapFlowActive])

  const workspaceCardsBodyClassName = cn(
    'flex flex-col gap-3',
    reserveTabExpansion &&
      !heroWorkspaceCompact &&
      (isSourcingMode || playbookFlowActive || researchFlowActive) &&
      DISCOVER_HERO_EXPANSION_MIN_H,
    reserveTabExpansion &&
      !heroWorkspaceCompact &&
      (isSourcingMode || playbookFlowActive || researchFlowActive) &&
      'min-h-0 flex-1',
    heroWorkspaceCompact && 'gap-2',
  )

  const discoverModeWorkspaceBoxBody = cn(
    discoverHeroModeWorkspaceBoxBodyClassName,
    workspaceCardsBodyClassName,
  )

  const sourcingExpansion = (
    <SourcingHeroExpansion
      keyword={q}
      budgetMax={budgetMax}
      sourcing={sourcing}
      inputId={inputId ?? 'discover-hero-search-input'}
      sort={sourcingSort}
      onSortChange={setSourcingSort}
      drawerCard={sourcingDrawerCard}
      onDrawerCardChange={setSourcingDrawerCard}
      compact={heroWorkspaceCompact}
      onKeywordSelect={(kw) => {
        applyComposerQuery(kw)
        if (sourcing.validationError) sourcing.clearValidationError()
      }}
    />
  )

  const warRoomExpansion = (
    <WarRoomHeroExpansion
      businessDescription={q}
      warRoom={warRoom}
      onReset={closeWarRoomFlow}
      compact={heroWorkspaceCompact}
    />
  )

  const roadmapExpansion = (
    <RoadmapHeroExpansion
      query={q}
      roadmapFlow={roadmapFlow}
      generatingMessageIndex={roadmapMessageIndex}
      onCancel={() => roadmapFlow.reset()}
      compact={heroWorkspaceCompact}
    />
  )

  const researchExpansion = (
    <>
      <ResearchHeroExpansion
        query={q}
        country={DEFAULT_COUNTRY_NAME}
        research={research}
        researchStyle={researchStyle}
        inputId={inputId ?? 'discover-hero-search-input'}
        refreshKey={`${research.step}-${activeProject?.id ?? ''}`}
        onIdeaSelect={applyComposerQuery}
        onRunSubmit={runSubmit}
        compact={heroWorkspaceCompact}
      />
    </>
  )

  const workspaceStackClassName = cn(
    stableLayout && 'min-h-0 flex-1 flex-col',
  )

  const renderWorkspaceSections = () => {
    if (isRoadmapMode) {
      return (
        <RoadmapHeroChips
          ref={workspaceSuggestRef}
          onIdeaSelect={applyComposerQuery}
          disabled={roadmapFlowLocked}
          inputId={inputId ?? 'room-discover-search-input'}
          refreshKey={roadmapRefreshKey}
          generating={roadmapGenerating}
          generatingMessage={
            roadmapFlow.clarifySummary.trim()
              ? `Building your roadmap: ${roadmapFlow.clarifySummary.trim()}`
              : getGeneratingMessage(roadmapMessageIndex)
          }
          onResumeClarifyRoadmap={handleResumeClarifyRoadmap}
          onSuggestLoadingChange={setSuggestIdeasLoading}
          hideChipsDuringWizard={hideRoadmapChipsDuringWizard}
        >
          {({ chips, chipsVisible, history }) => {
            const showWorkspace =
              !hidePersonalHistory ||
              Boolean(roadmapExpansion) ||
              roadmapGenerating
            return (
            <DiscoverHeroWorkspaceChipsLayout
              toolsAboveComposer={null}
              fluidComposer={composerStack}
              chipsAboveComposer={roomInputPhase}
              chips={chips}
              chipsVisible={previewNil ? false : chipsVisible}
              workspaceVisible={showWorkspace}
              workspaceStackClassName={workspaceStackClassName}
              workspace={
                <DiscoverHeroWorkspaceBox
                  visible={showWorkspace}
                  ariaLabel="Roadmaps"
                  className={cn(
                    stableLayout && reserveTabExpansion && roadmapFlowActive && 'min-h-0 flex-1 flex-col',
                  )}
                  bodyClassName={cn(
                    discoverHeroWorkspaceCardsBodyClassName,
                    workspaceCardsBodyClassName,
                    stableLayout && reserveTabExpansion && roadmapFlowActive && 'min-h-0 flex-1',
                  )}
                >
                  <DiscoverHeroWorkspaceSectionTitle
                    label="All Roadmaps"
                    icon={Map}
                    accent="primary"
                    className="mb-3"
                  />
                  <DiscoverHeroWorkspaceBody
                    resultsFirst={false}
                    reserveExpansion={stableLayout && reserveTabExpansion}
                    chips={null}
                    history={hidePersonalHistory ? null : history}
                    results={roadmapExpansion}
                  />
                </DiscoverHeroWorkspaceBox>
              }
            />
            )
          }}
        </RoadmapHeroChips>
      )
    }

    if (isSearchMode) {
      return (
        <DiscoverHeroWorkspaceChipsLayout
          toolsAboveComposer={null}
          fluidComposer={composerStack}
          chips={null}
          chipsVisible={false}
          chipsAboveComposer={roomInputPhase}
          workspaceStackClassName={workspaceStackClassName}
          workspace={
            isInvestorsBrowseMode ? (
              <DiscoverHeroInvestorsWorkspace
                bodyClassName={discoverModeWorkspaceBoxBody}
                search={investorsBrowse.search}
                onSearchChange={investorsBrowse.setSearch}
                firmType={investorsBrowse.firmType}
                sector={investorsBrowse.sector}
                portfolioCompany={investorsBrowse.portfolioCompany}
                firmTypes={investorsBrowse.firmTypes}
                sectors={investorsBrowse.sectors}
                portfolioNames={investorsBrowse.portfolioNames}
                onFirmTypeChange={investorsBrowse.setFirmType}
                onSectorChange={investorsBrowse.setSector}
                onPortfolioCompanyChange={investorsBrowse.setPortfolioCompany}
                onResetFilters={investorsBrowse.resetFilters}
                filtered={investorsBrowse.filtered}
                showLockedList={investorsBrowse.showLockedList}
                isUnlocked={investorsBrowse.isUnlocked}
                accessLoading={investorsBrowse.accessLoading}
                checkoutLoading={investorsBrowse.checkoutLoading}
                investorCount={investorsBrowse.investorCount}
                loading={investorsBrowse.loading}
                error={investorsBrowse.error}
                onUnlock={() => void investorsBrowse.handleUnlock()}
              />
            ) : previewNil ? null : (
              <DiscoverHeroBoxPublic
                compact={false}
                bodyClassName={discoverModeWorkspaceBoxBody}
              />
            )
          }
        />
      )
    }

    if (isSourcingMode) {
      return (
        <SourcingHeroChips
          ref={workspaceSuggestRef}
          onSuggestLoadingChange={setSuggestIdeasLoading}
          onKeywordSelect={(kw) => {
            applyComposerQuery(kw)
            if (sourcing.validationError) sourcing.clearValidationError()
          }}
          onReSearch={handleHistoryReSearch}
          disabled={sourcing.isBusy}
          inputId={inputId ?? 'discover-hero-search-input'}
          refreshKey={sourcing.step === 'done' ? sourcing.data?.keyword : sourcing.step}
        >
          {({ chips, chipsVisible, history }) => {
            const showWorkspace =
              !hidePersonalHistory ||
              Boolean(sourcingExpansion) ||
              sourcingFlowActive
            return (
            <DiscoverHeroWorkspaceChipsLayout
              toolsAboveComposer={null}
              fluidComposer={composerStack}
              chipsAboveComposer={roomInputPhase}
              chips={chips}
              chipsVisible={previewNil ? false : chipsVisible}
              workspaceVisible={showWorkspace}
              workspaceStackClassName={workspaceStackClassName}
              workspace={
                <DiscoverHeroWorkspaceBox
                  visible={showWorkspace}
                  ariaLabel="Source products"
                  className={cn(
                    stableLayout && reserveTabExpansion && 'min-h-0 flex-1 flex-col',
                  )}
                   bodyClassName={cn(
                     discoverModeWorkspaceBoxBody,
                     stableLayout && reserveTabExpansion && 'min-h-0 flex-1',
                   )}
                 >
                   <DiscoverHeroWorkspaceSectionTitle
                     label="All Sourcing"
                     icon={PackageSearch}
                     accent="primary"
                     className="mb-3"
                   />
                   <DiscoverHeroWorkspaceBody
                     resultsFirst={false}
                    reserveExpansion={stableLayout && reserveTabExpansion}
                    chips={null}
                    history={hidePersonalHistory ? null : history}
                    results={
                      <>
                        {sourcing.validationError ? (
                          <p className="text-[12px] text-destructive">{sourcing.validationError}</p>
                        ) : null}
                        {sourcingExpansion}
                      </>
                    }
                  />
                </DiscoverHeroWorkspaceBox>
              }
            />
            )
          }}
        </SourcingHeroChips>
      )
    }

    if (isResearchMode) {
      return (
        <ResearchHeroChips
          ref={workspaceSuggestRef}
          onSuggestLoadingChange={setSuggestIdeasLoading}
          onIdeaSelect={applyComposerQuery}
          onReResearch={handleHistoryReResearch}
          onResumeDraft={handleResumeClarificationDraft}
          disabled={researchFlowLocked}
          workspaceDisabled={researchWorkspaceDisabled}
          hideChipsDuringWizard={hideChipsDuringWizard}
          inputId={inputId ?? 'discover-hero-search-input'}
          refreshKey={`${research.step}-${activeProject?.id ?? ''}`}
        >
          {({ chips, chipsVisible, history }) => {
            const showMyResearch =
              !hidePersonalHistory ||
              Boolean(researchExpansion) ||
              researchFlowActive
            const showPublicCatalog = !previewNil
            const showWorkspace = showMyResearch || showPublicCatalog
            return (
            <DiscoverHeroWorkspaceChipsLayout
              toolsAboveComposer={null}
              fluidComposer={composerStack}
              chipsAboveComposer={roomInputPhase}
              chips={chips}
              chipsVisible={previewNil ? false : chipsVisible}
              workspaceVisible={showWorkspace}
              workspaceStackClassName={workspaceStackClassName}
              workspace={
                <DiscoverHeroPrivateThenPublicStack
                  privateWorkspace={
                    showMyResearch ? (
                    <DiscoverHeroWorkspaceBox
                      visible={showMyResearch}
                      ariaLabel="My research"
                      className={cn(
                        stableLayout && reserveTabExpansion && researchFlowActive && 'min-h-0 flex-1 flex-col',
                      )}
                       bodyClassName={cn(
                         discoverModeWorkspaceBoxBody,
                         stableLayout && reserveTabExpansion && researchFlowActive && 'min-h-0 flex-1',
                       )}
                     >
                       <DiscoverHeroWorkspaceSectionTitle
                         label="All Research"
                         icon={BookMarked}
                         accent="primary"
                         className="mb-3"
                       />
                       <DiscoverHeroWorkspaceBody
                         resultsFirst={false}
                        reserveExpansion={stableLayout && reserveTabExpansion}
                        chips={null}
                        history={hidePersonalHistory ? null : history}
                        results={researchExpansion}
                      />
                    </DiscoverHeroWorkspaceBox>
                    ) : null
                  }
                  publicBox={
                    showPublicCatalog ? (
                      <DiscoverHeroBoxPublic
                        label="Trending Opportunities Right Now"
                        showHeader
                        compact={false}
                        bodyClassName={discoverModeWorkspaceBoxBody}
                      />
                    ) : null
                  }
                />
              }
            />
            )
          }}
        </ResearchHeroChips>
      )
    }

    if (isMarketTestMode) {
      return (
        <MarketTestHeroChips
          ref={workspaceSuggestRef}
          onSuggestLoadingChange={setSuggestIdeasLoading}
          onIdeaSelect={applyComposerQuery}
          onReRunMarketTest={handleHistoryReRunMarketTest}
          inputId={inputId ?? 'discover-hero-search-input'}
          refreshKey={`market-test-${user?.id ?? ''}`}
        >
          {({ chips, chipsVisible, history }) => {
            const showWorkspace = !hidePersonalHistory
            return (
            <DiscoverHeroWorkspaceChipsLayout
              toolsAboveComposer={null}
              fluidComposer={composerStack}
              chipsAboveComposer={roomInputPhase}
              chips={chips}
              chipsVisible={previewNil ? false : chipsVisible}
              workspaceVisible={showWorkspace}
              workspaceStackClassName={workspaceStackClassName}
              workspace={
                <DiscoverHeroWorkspaceBox
                  visible={showWorkspace}
                  ariaLabel="Market Test workspace"
                  className={cn(stableLayout && 'min-h-0 w-full min-w-0 flex-1 flex-col')}
                  bodyClassName={cn(discoverModeWorkspaceBoxBody, stableLayout && 'min-h-0 w-full min-w-0 flex-1')}
                >
                  <DiscoverHeroWorkspaceSectionTitle
                    label="All Market Tests"
                    icon={Store2Line}
                    accent="primary"
                    className="mb-3"
                  />
                  <DiscoverHeroWorkspaceBody
                    resultsFirst={false}
                    reserveExpansion={stableLayout}
                    chips={null}
                    history={hidePersonalHistory ? null : history}
                    results={null}
                  />
                </DiscoverHeroWorkspaceBox>
              }
            />
            )
          }}
        </MarketTestHeroChips>
      )
    }

    if (isPlaybookMode) {
      return (
        <WarRoomHeroChips
          ref={workspaceSuggestRef}
          onSuggestLoadingChange={setSuggestIdeasLoading}
          inputId={inputId ?? 'discover-hero-search-input'}
          onIdeaSelect={applyComposerQuery}
          onReRunPlaybook={handleHistoryReRunPlaybook}
          onResumeClarifyPlaybook={handleResumeClarifyPlaybook}
          onResumeIntakeDraft={handleResumeWarRoomIntakeDraft}
          onDiscardIntakeDraft={handleDiscardWarRoomIntakeDraft}
          warRoomPhase={warRoom.phase}
          disabled={warRoomFlowLocked}
          workspaceDisabled={warRoomWorkspaceDisabled}
          refreshKey={`${warRoom.phase}-${user?.id ?? ''}`}
        >
          {({ chips, chipsVisible, history }) => {
            const showWorkspace =
              !hidePersonalHistory ||
              Boolean(warRoomExpansion) ||
              playbookFlowActive
            return (
            <DiscoverHeroWorkspaceChipsLayout
              toolsAboveComposer={null}
              fluidComposer={composerStack}
              chipsAboveComposer={roomInputPhase}
              chips={chips}
              chipsVisible={previewNil ? false : chipsVisible}
              workspaceVisible={showWorkspace}
              workspaceStackClassName={workspaceStackClassName}
              workspace={
                <DiscoverHeroWorkspaceBox
                  visible={showWorkspace}
                  ariaLabel="War Room workspace"
                  className={cn(
                    stableLayout && reserveTabExpansion && playbookFlowActive && 'min-h-0 flex-1 flex-col',
                  )}
                   bodyClassName={cn(
                     discoverModeWorkspaceBoxBody,
                     stableLayout && reserveTabExpansion && playbookFlowActive && 'min-h-0 flex-1',
                   )}
                 >
                   <DiscoverHeroWorkspaceSectionTitle
                     label="All War Room Playbooks"
                     icon={Swords}
                     accent="warRoom"
                     className="mb-3"
                   />
                   <DiscoverHeroWorkspaceBody
                     resultsFirst={false}
                    reserveExpansion={stableLayout && reserveTabExpansion}
                    chips={null}
                    history={hidePersonalHistory ? null : history}
                    results={warRoomExpansion}
                  />
                </DiscoverHeroWorkspaceBox>
              }
            />
            )
          }}
        </WarRoomHeroChips>
      )
    }

    return null
  }

  const renderHeroComposerPanel = () => {
    const submitAriaLabel = isResearchMode
      ? 'Research this idea'
      : isMarketTestMode
        ? 'Run market reality check'
        : isSourcingMode
          ? 'Search suppliers'
          : isRoadmapMode
            ? 'Generate roadmap'
            : isPlaybookMode
              ? 'War Room playbook'
              : 'Search'
    const submitTitle = isResearchMode
      ? 'Research this idea'
      : isMarketTestMode
        ? 'Run market reality check'
        : isSourcingMode
          ? 'Search suppliers across IndiaMart, Alibaba & Made in China'
          : isRoadmapMode
            ? 'Generate roadmap'
            : isPlaybookMode
              ? 'Scout battlefield'
              : 'Search'

    if (isRoomComposerMode) {
      const roomInputDisabled =
        warRoomComposerLocked ||
        (isResearchMode && researchWorkspaceDisabled) ||
        (isSourcingMode && sourcing.isBusy) ||
        (isRoadmapMode && roadmapFlowLocked)

      return (
        <>
          <HeroInput
            value={q}
            onChange={(next) => {
              applyComposerQuery(next)
              if (isResearchMode && research.inputError) research.clearInputError()
              if (isPlaybookMode && warRoom.inputError) warRoom.clearInputError()
              if (isRoadmapMode && roadmapFlow.inputError) roadmapFlow.clearInputError()
              if (isSourcingMode && sourcing.validationError) sourcing.clearValidationError()
            }}
            onSubmit={runSubmit}
            disabled={roomInputDisabled}
            submitDisabled={submitDisabled}
            loading={submitLoading}
            inputError={
              (isResearchMode ? research.inputError : null) ??
              (isPlaybookMode ? warRoom.inputError : null) ??
              (isRoadmapMode ? roadmapFlow.inputError : null)
            }
            moderationError={composerUsesModeration ? moderationInputError : null}
            maxLength={DISCOVER_HERO_COMPOSER_MAX_LENGTH}
            placeholder={composerPlaceholder}
            inputAriaLabel={
              isResearchMode
                ? 'Business idea to research'
                : isSourcingMode
                  ? 'Product keyword for supplier search'
                  : isPlaybookMode
                    ? 'Describe your business for War Room'
                    : isRoadmapMode
                      ? 'Goal to decompose into a roadmap'
                      : isMarketTestMode
                        ? 'Business idea to reality-check'
                        : 'Search'
            }
            submitAriaLabel={submitAriaLabel}
            submitTitle={submitTitle}
            submitAccent={isPlaybookMode ? 'war-room' : 'default'}
            leadingSlot={composerLeadingIcon}
            inputId={inputId}
            data-tour={
              isSourcingMode
                ? 'source-search'
                : isRoadmapMode
                  ? 'roadmap-input'
                  : isPlaybookMode
                    ? 'war-room-input'
                    : undefined
            }
            onKeyDown={onHeroInputKeyDown}
            detailsSlot={
              composerSuggestIdeasSlot || isSourcingMode ? (
                <div className="mr-auto flex min-w-0 items-center gap-2">
                  {composerSuggestIdeasSlot}
                  {isSourcingMode ? (
                    <SourcingBudgetMidSlot
                      value={budgetMax}
                      onChange={setBudgetMax}
                      disabled={sourcing.isBusy}
                      variant="heroFooter"
                    />
                  ) : null}
                </div>
              ) : undefined
            }
          />
          {isAdmin && isResearchMode && research.step === 'input' ? (
            <div
              className={cn(
                discoverHeroComposerFooterBelowClassName,
                'items-center justify-end pt-1.5',
              )}
            >
              <AdminResearchVisibilitySelect
                value={researchVisibility}
                onChange={setResearchVisibility}
                disabled={researchWorkspaceDisabled}
              />
            </div>
          ) : null}
        </>
      )
    }

    return (
      <div key={`browse-${browseView}`} className="flex w-full min-w-0 flex-col gap-2">
        <HeroInput
          value={investorsBrowse.search}
          onChange={(next) => {
            investorsBrowse.setSearch(next)
          }}
          onSubmit={() => {}}
          submitDisabled
          loading={submitLoading}
          inputError={composerInputError}
          maxLength={DISCOVER_HERO_COMPOSER_MAX_LENGTH}
          placeholder="Search by name, sector, stage, country, or portfolio…"
          inputAriaLabel="Search investors"
          submitAriaLabel={submitAriaLabel}
          submitTitle={submitTitle}
          hideSubmitButton={isDiscoverBrowseMode}
          leadingSlot={composerLeadingIcon}
          data-tour="discover-investors-search"
        />
      </div>
    )
  }

  const composerStack = (
    <DiscoverHeroBoxStack
      className={cn(
        'overflow-visible w-full',
        roomInputPhase
          ? 'shrink-0'
          : stableLayout && 'md:min-h-0 md:flex-1 md:flex-col',
      )}
    >
      {renderHeroComposerPanel()}
    </DiscoverHeroBoxStack>
  )

  const workspaceSections = renderWorkspaceSections()

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative min-w-0 w-full',
        discoverHeroStackClassName,
        discoverHeroContentMaxWidthClass,
        'mx-auto',
        stableLayout && 'min-h-0 w-full flex-col items-stretch gap-4 md:gap-5 lg:gap-6',
        className,
      )}
    >
      <div
        className={cn(
          discoverHeroFluidToWorkspaceStackClassName,
          'min-w-0 w-full items-stretch',
          'max-md:min-h-0 max-md:flex-1 max-md:flex-col',
          'p-4 md:p-6',
        )}
      >
        {roomInputPhase ? (
          workspaceSections
        ) : (
          <>
            <div className={mobileRoomLayoutClassName}>
              <div className={mobileRoomHeroViewportClassName}>
                <div className={mobileRoomHeroContentClassName}>
                  <h2 className="w-full min-w-0 text-center font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
                    {roomChromeTitle}
                  </h2>
                  {composerStack}
                </div>
              </div>
              <div className={mobileRoomResultsScrollClassName}>
                <div className={mobileRoomResultsClassName}>
                  {workspaceSections}
                </div>
              </div>
            </div>
            <div
              className={cn(
                'max-md:hidden',
                discoverHeroFluidToWorkspaceStackClassName,
                'w-full items-center',
              )}
            >
              <div className="mx-auto flex w-full max-w-[min(100%,36rem)] flex-col items-center gap-3 pt-6 text-center md:pt-8">
                <h2 className="w-full min-w-0 text-center font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
                  {roomChromeTitle}
                </h2>
                {composerStack}
              </div>
              {workspaceSections}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

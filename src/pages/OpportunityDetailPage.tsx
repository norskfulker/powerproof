import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Target } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { RevenueScenarioCards } from '@/components/opportunity/RevenueScenarioCards'
import HeadcountSection from '@/components/HeadcountSection'
import { useOpportunityActions } from '@/hooks/useOpportunityActions'
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail'
import type { MarketingStrategy } from '@/types/database'
import { useOpportunitySectionVisibility } from '@/hooks/useOpportunitySectionVisibility'
import {
  isOnboardingOpportunityRevealRequest,
  ONBOARDING_REVEAL_QUERY,
  ONBOARDING_REVEAL_STAGE_QUERY,
  ONBOARDING_REVEAL_STAGE_READY,
  useOnboardingOpportunityTypewriterReveal,
} from '@/hooks/useOnboardingOpportunityTypewriterReveal'
import { OnboardingOpportunityGeneratingScreen } from '@/components/onboarding/OnboardingOpportunityGeneratingScreen'
import { OnboardingOpportunityAskAI } from '@/components/onboarding/OnboardingOpportunityAskAI'
import { OnboardingOpportunitySpotlight } from '@/components/onboarding/OnboardingOpportunitySpotlight'
import { OnboardingRevealFinishSetup } from '@/components/onboarding/OnboardingRevealFinishSetup'
import { CatalogOpportunityAskAI } from '@/components/opportunity/CatalogOpportunityAskAI'
import { OnboardingOpportunityPreviewProvider } from '@/contexts/OnboardingOpportunityPreviewContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { landingSignInTo } from '@/lib/authLanding'
import { savePendingOnboardingRevealPath } from '@/lib/onboardingResearchDemo'
import { calculateBreakeven } from '@/lib/breakeven'
import { useCurrency } from '@/hooks/useCurrency'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { useRegisterAppChromeHeader, useAppChromeHeaderOptional } from '@/contexts/AppChromeHeaderContext'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { deriveInterestedCount } from '@/lib/interestCount'
import { formatCategoryBadge, resolveOpportunityStatusChip } from '@/lib/opportunityLabels'
import { renderCategoryIcon } from '@/lib/categoryIcons'
import { trendKindFromDemandDirection, trendKindFromVelocity } from '@/lib/opportunityTrendChart'
import { useSeoSettings } from '@/hooks/useSeoSettings'
import {
  buildOpportunityOgTitle,
  buildOpportunitySeoDescription,
  buildOpportunitySeoTitle,
} from '@/lib/seo/opportunityMeta'
import { DiscoverWide } from '@/components/page-shells'
import { TabsContent } from '@/components/ui/tabs'
import {
  InternalPageDataTabs,
  internalPageTabPanelClass,
} from '@/components/shared/InternalPageDataTabs'
import { isFitScoreDisplayValid } from '@/lib/fitScore'
import { landingFluidThemeForOpportunityDetail } from '@/lib/landingFluidThemes'
import { getSessionId } from '@/lib/analyticsSession'
import { formatConvertedValue, safeJsonArray, toAbsolute, deriveMarginPct } from '@/lib/opportunityDetailUtils'
import { researchModelDisplayLabel } from '@/lib/aiModels'
import { fetchMarketTestIdForOpportunity } from '@/lib/marketTestApi'
import { MARKET_TEST_ROUTES } from '@/lib/marketTestRoutes'
import type {
  EffortScorecard,
  MachineryItem,
  ProfitDerivation,
  RawMaterialItem,
  SetupCostDerivation,
} from '@/types/database'
import { FitScoreSidebar } from '@/components/opportunity/detail/FitScoreSidebar'
import { OpportunityHeroPanel } from '@/components/opportunity/detail/OpportunityHeroPanel'
import { OpportunityMetricsBar } from '@/components/opportunity/detail/OpportunityMetricsBar'
import { MarketTrendsSection } from '@/components/opportunity/detail/MarketTrendsSection'
import { DemographicsSection } from '@/components/opportunity/detail/DemographicsSection'
import { MachinerySection } from '@/components/opportunity/detail/MachinerySection'
import { RawMaterialsSection } from '@/components/opportunity/detail/RawMaterialsSection'
import { LicensesSection } from '@/components/opportunity/detail/LicensesSection'
import { cn } from '@/lib/utils'

/** Single-column page grid — generous Stripe-like section breathing room. */
export function opportunityDetailPageGridClass(_isCompact?: boolean) {
  return cn(
    'grid w-full min-w-0 grid-cols-1 auto-rows-min gap-0',
    'sm:gap-0 lg:gap-0',
  )
}

function opportunitySectionHeadingClass(opts?: { flushBottom?: boolean }) {
  return cn(
    'font-display font-bold text-foreground text-[22px] sm:text-[26px] lg:text-[36px]',
    opts?.flushBottom && 'mb-0',
  )
}

function opportunitySectionHeaderRowClass() {
  return cn('mb-3 flex items-center justify-between sm:mb-4')
}

function opportunitySectionHeaderRowLooseClass() {
  return cn('mb-3 flex items-center justify-between sm:mb-5')
}

import { OpportunitySeoHead } from '@/components/opportunity/detail/OpportunitySeoHead'
import { OpportunityLoadingState } from '@/components/opportunity/detail/OpportunityLoadingState'
import { OpportunityNotFound } from '@/components/opportunity/detail/OpportunityNotFound'
import { SchemesSection } from '@/components/opportunity/detail/SchemesSection'
import { FundingOptionsSection } from '@/components/opportunity/detail/FundingOptionsSection'
import { RiskMatrixSection } from '@/components/opportunity/detail/RiskMatrixSection'
import { ResearchInsightSections } from '@/components/opportunity/detail/ResearchInsightSections'
import { UnitEconomicsDeepSection } from '@/components/opportunity/detail/UnitEconomicsDeepSection'
import { ToolsAndStackSection } from '@/components/opportunity/detail/ToolsAndStackSection'
import { FaqSection } from '@/components/opportunity/detail/FaqSection'
import { OpportunityPageFooter } from '@/components/opportunity/detail/OpportunityPageFooter'
import { RevenueStreamsSection } from '@/components/opportunity/RevenueStreamsSection'
import { MarketingStrategySection } from '@/components/opportunity/MarketingStrategySection'
import { CompetitorsSection } from '@/components/opportunity/CompetitorsSection'
import { SpaceLocationSection, isSpaceLocationPresent } from '@/components/opportunity/SpaceLocationSection'
import { ReResearchPendingBanner } from '@/components/opportunity/detail/ReResearchPendingBanner'
import { ResearchAskAI } from '@/components/research/ResearchAskAI'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'
import { StyleAddonsSection } from '@/components/research/StyleAddonsSection'
import { useOpportunityEditChatRegistration } from '@/components/opportunity/OpportunityEditChat'
import { requestAskAiOpen } from '@/lib/askAiPanelEvents'

import {
  opportunityDetailCardClass,
  opportunityDetailCardPaddingClass,
  opportunityDetailCardRadiusClass,
} from '@/lib/opportunityCardClasses'

export type OpportunityDetailPageProps = {
  opportunityOverride?: Record<string, unknown> | null
  isUserResearch?: boolean
  onOpportunityRefresh?: () => void
  /** Re-research running — keep content visible with updating banner. */
  reResearchPending?: boolean
  reResearchPendingSections?: string[] | null
  reResearchPendingCreatedAt?: string | null
}

const OpportunityDetailPage = (props: OpportunityDetailPageProps = {}) => {
  const {
    opportunityOverride = null,
    isUserResearch: isUserResearchProp,
    onOpportunityRefresh,
    reResearchPending = false,
    reResearchPendingSections = null,
    reResearchPendingCreatedAt = null,
  } = props
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const skipRemoteFetch = Boolean(opportunityOverride)
  const isUserResearch = isUserResearchProp ?? location.pathname.startsWith('/my-research/')

  useLayoutEffect(() => {
    if (!slug) return
    const root = document.getElementById('app-main-scroll')
    if (root) root.scrollTop = 0
    window.scrollTo(0, 0)
  }, [slug])
  const { user, profile, profileLoading, isAdmin } = useAuth()
  const chromeHeader = useAppChromeHeaderOptional()
  const { data: subscriptionStatus } = useSubscriptionStatus()
  /** PRO-gated sections require Unlimited; admins can force locked preview via chrome toggle. */
  const isProLocked = chromeHeader?.previewProLocked
    ? true
    : !isAdmin && !(subscriptionStatus?.success && subscriptionStatus.plan.slug === 'pro')
  const urlRevealRequested = isOnboardingOpportunityRevealRequest(
    searchParams,
    location.state,
  )
  const completedOnboardingThisSessionRef = useRef(false)
  const onboardingRevealRequested = urlRevealRequested

  useEffect(() => {
    if (profileLoading) return
    if (isAdmin) return
    if (!urlRevealRequested || !profile?.onboarding) return
    if (completedOnboardingThisSessionRef.current) return
    const next = new URLSearchParams(searchParams)
    next.delete(ONBOARDING_REVEAL_QUERY)
    next.delete(ONBOARDING_REVEAL_STAGE_QUERY)
    const search = next.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    )
  }, [
    isAdmin,
    location.pathname,
    navigate,
    profile?.onboarding,
    profileLoading,
    searchParams,
    urlRevealRequested,
  ])
  const {
    data: remoteOppData,
    isLoading: remoteLoading,
    error: remoteError,
  } = useOpportunityDetail(skipRemoteFetch ? undefined : slug, {
    dataSource: 'catalog',
    enabled: !skipRemoteFetch,
    skipViewTracking: onboardingRevealRequested,
  })
  const oppData = (opportunityOverride as typeof remoteOppData) ?? remoteOppData
  const isLoading = skipRemoteFetch ? false : remoteLoading
  const error = skipRemoteFetch ? null : remoteError
  const [editChatPatch, setEditChatPatch] = useState<Record<string, unknown>>({})

  const {
    phase: onboardingRevealPhase,
    revealedOpp,
    progressPct: onboardingProgressPct,
    activeChunkLabel: onboardingChunkLabel,
    recentChunks: onboardingRecentChunks,
  } = useOnboardingOpportunityTypewriterReveal(
    onboardingRevealRequested && oppData
      ? (oppData as Record<string, unknown>)
      : null,
    onboardingRevealRequested && Boolean(oppData),
  )

  /** Keep stage=ready out of the URL while the generating screen is active (hides app chrome). */
  useEffect(() => {
    if (!onboardingRevealRequested) return
    if (onboardingRevealPhase !== 'generating') return
    if (searchParams.get(ONBOARDING_REVEAL_STAGE_QUERY) !== ONBOARDING_REVEAL_STAGE_READY) return
    const next = new URLSearchParams(searchParams)
    next.delete(ONBOARDING_REVEAL_STAGE_QUERY)
    const search = next.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true, state: location.state },
    )
  }, [
    location.pathname,
    location.state,
    navigate,
    onboardingRevealPhase,
    onboardingRevealRequested,
    searchParams,
  ])

  useEffect(() => {
    if (!onboardingRevealRequested) return
    if (onboardingRevealPhase !== 'ready') return
    if (searchParams.get(ONBOARDING_REVEAL_STAGE_QUERY) === ONBOARDING_REVEAL_STAGE_READY) {
      const revealPath = `${location.pathname}?${searchParams.toString()}`
      savePendingOnboardingRevealPath(revealPath)
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set(ONBOARDING_REVEAL_STAGE_QUERY, ONBOARDING_REVEAL_STAGE_READY)
    const search = `?${next.toString()}`
    savePendingOnboardingRevealPath(`${location.pathname}${search}`)
    navigate(
      { pathname: location.pathname, search },
      { replace: true, state: location.state },
    )
  }, [
    location.pathname,
    location.state,
    navigate,
    onboardingRevealPhase,
    onboardingRevealRequested,
    searchParams,
  ])

  // Onboarding completion (`profile.onboarding`) is set only after free credits are claimed.
  const fullDetail = true
  const bp = useBreakpoint()
  const isCompact = bp === 'mobile' || bp === 'tablet'
  const isDesktop = bp === 'desktop' || bp === 'wide'
  const { setTrail } = useNavbarTrail()
  const { formatMoney, formatSetupCost, currency: preferredCurrency, convertFromUSD, ratesUSD } = useCurrency()
  const inrPerUsd = ratesUSD.INR ?? 83
  const { resolveOpportunitySeo } = useSeoSettings({ oppSlug: slug ?? null })
  const [showShareDrawer, setShowShareDrawer] = useState(false)
  const [previewDraft, setPreviewDraft] = useState<any | null>(null)
  const locationPillsRef = useRef<HTMLDivElement | null>(null)
  const customerPillsRef = useRef<HTMLDivElement | null>(null)
  const statePillsRef = useRef<HTMLDivElement | null>(null)
  const startTime = useRef(Date.now())
  const sessionIdRef = useRef<string>(getSessionId())
  const previewDraftKey = searchParams.get('previewDraft')
  const previewFocus = searchParams.get('focus')

  useEffect(() => {
    if (!previewDraftKey) {
      setPreviewDraft(null)
      return
    }
    const loadDraft = () => {
      try {
        const raw = localStorage.getItem(previewDraftKey)
        setPreviewDraft(raw ? JSON.parse(raw) : null)
      } catch {
        setPreviewDraft(null)
      }
    }
    loadDraft()
    const onStorage = (e: StorageEvent) => {
      if (e.key === previewDraftKey) loadDraft()
    }
    window.addEventListener('storage', onStorage)
    const timer = window.setInterval(loadDraft, 500)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(timer)
    }
  }, [previewDraftKey])

  const opp = useMemo(() => {
    const source =
      onboardingRevealRequested && revealedOpp
        ? revealedOpp
        : onboardingRevealRequested
          ? null
          : oppData
    if (!source) return null
    let merged = source as NonNullable<typeof oppData>
    if (previewDraft && typeof previewDraft === 'object') {
      merged = { ...merged, ...previewDraft }
    }
    if (Object.keys(editChatPatch).length > 0) {
      merged = { ...merged, ...editChatPatch }
    }
    return merged
  }, [editChatPatch, onboardingRevealRequested, oppData, previewDraft, revealedOpp])

  useEffect(() => {
    setEditChatPatch({})
  }, [oppData])

  const opportunityId = opp?.id ? String(opp.id) : ''
  const researchAskAiComplete =
    isUserResearch &&
    Boolean(opportunityId) &&
    String(opp?.research_status ?? '').toLowerCase() === 'complete'

  const editChatRegistration = useMemo(
    () =>
      isUserResearch && opportunityId
        ? {
            userOpportunityId: opportunityId,
            pageLabel: String(opp?.title ?? 'Research'),
            researchStyle:
              typeof (opp as { research_style?: unknown })?.research_style === 'string'
                ? (opp as { research_style: string }).research_style
                : 'standard',
            onRefresh: onOpportunityRefresh,
            onEditComplete: (res: { updated_data: Record<string, unknown> }) => {
              setEditChatPatch((prev) => ({ ...prev, ...res.updated_data }))
              onOpportunityRefresh?.()
            },
            unifiedAskAi: researchAskAiComplete,
          }
        : null,
    [isUserResearch, opportunityId, opp, onOpportunityRefresh, researchAskAiComplete],
  )
  useOpportunityEditChatRegistration(editChatRegistration)

  useEffect(() => {
    const state = location.state as { openEditReResearch?: boolean } | null
    if (!researchAskAiComplete || !state?.openEditReResearch) return
    requestAskAiOpen({ editMode: true })
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [
    researchAskAiComplete,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ])

  const opportunityHeroImageSrc = useMemo(() => {
    if (!opp) return null
    return (
      [String((opp as any)?.hero_image_url ?? '').trim(), String((opp as any)?.seo_image_url ?? '').trim()].find(Boolean) ||
      null
    )
  }, [opp])

  const { handleStartBusiness, handleShare, handleExport } = useOpportunityActions(
    opp,
    user,
    isCompact,
    navigate,
    location,
    fullDetail,
    setShowShareDrawer,
  )

  useEffect(() => {
    if (!previewFocus) return
    const focusToId: Record<string, string> = {
      core: 'od-hero',
      financials: 'od-metrics',
      competition: 'market',
      location: 'market',
      machinery: 'od-machinery',
      materials: 'od-raw',
      team: 'od-headcount',
      compliance: 'od-licenses',
      content: 'od-faq',
    }
    const id = focusToId[previewFocus]
    if (!id) return
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const prevOutline = (el as HTMLElement).style.outline
      const prevOffset = (el as HTMLElement).style.outlineOffset
      ;(el as HTMLElement).style.outline = '2px solid hsl(var(--primary))'
      ;(el as HTMLElement).style.outlineOffset = '6px'
      window.setTimeout(() => {
        ;(el as HTMLElement).style.outline = prevOutline
        ;(el as HTMLElement).style.outlineOffset = prevOffset
      }, 1400)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [previewFocus, opp?.id])

  useEffect(() => {
    if (!opp) return
    if (isUserResearch && !user) {
      navigate(landingSignInTo(`/my-research/${opp.slug}`), { replace: true })
    }
  }, [opp, user, navigate, isUserResearch])

  const twScroll = { startWhenInView: true as const, inViewResetKey: slug ?? '' }

  const machineryList = useMemo(
    () => safeJsonArray<MachineryItem>((opp as any)?.machinery_list),
    [opp],
  )
  const rawMaterialsList = useMemo(
    () => safeJsonArray<RawMaterialItem>((opp as any)?.raw_materials),
    [opp],
  )
  const licensesList = useMemo(() => safeJsonArray<any>((opp as any)?.licenses_required), [opp])

  useEffect(() => {
    if (opp?.title) setTrail(opp.title)
    else setTrail(null)
    return () => setTrail(null)
  }, [opp?.title, setTrail])

  const categoryLabel = formatCategoryBadge(opp?.category_slug)
  const statusChip = resolveOpportunityStatusChip((opp as any)?.badge, (opp as any)?.badge_label)
  const researchDateLabel = useMemo(() => {
    if (!opp?.created_at) return null
    const d = new Date(String(opp.created_at))
    if (Number.isNaN(d.getTime())) return null
    return format(d, 'MMM d, yyyy')
  }, [opp?.created_at])
  const modelLabel = useMemo(
    () => researchModelDisplayLabel(typeof (opp as any)?.model_used === 'string' ? (opp as any).model_used : null),
    [opp],
  )

  const heroCategoryLabel = isUserResearch
    ? modelLabel
    : categoryLabel || null
  const heroMetaText = isUserResearch
    ? researchDateLabel
    : statusChip?.label ?? null

  const handleChromeTestMarket = useCallback(async () => {
    if (!opp) return
    const opportunityId = String(opp.id ?? '')
    if (!user?.id || !opportunityId) {
      navigate(landingSignInTo(`/my-research/${String(opp.slug ?? '')}`))
      return
    }
    const query =
      (typeof opp.research_query === 'string' && opp.research_query.trim()) ||
      String(opp.title ?? '').trim()
    const existingId = await fetchMarketTestIdForOpportunity(user.id, opportunityId)
    if (existingId) {
      navigate(MARKET_TEST_ROUTES.detail(existingId))
      return
    }
    navigate(MARKET_TEST_ROUTES.new, {
      state: {
        query,
        user_opportunity_id: opportunityId,
      },
    })
  }, [navigate, opp, user?.id])

  const chromeEndActions = useMemo((): ReactNode => {
    if (!opp) return null
    const opportunityId = String(opp.id ?? '')
    const showMarket = isUserResearch && Boolean(opportunityId)

    if (!showMarket) return null

    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 shrink-0 rounded-md text-[12px] font-semibold"
        onClick={() => void handleChromeTestMarket()}
      >
        <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Test the Market</span>
        <span className="sm:hidden">Market</span>
      </Button>
    )
  }, [handleChromeTestMarket, isUserResearch, opp])

  const { sectionItems } = useOpportunitySectionVisibility(
    opp,
    fullDetail,
    machineryList,
    rawMaterialsList,
    licensesList,
    isUserResearch,
  )

  const researchDataTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = sectionItems
      .filter(
        (s) =>
          s.show &&
          s.id !== 'od-hero' &&
          s.id !== 'od-metrics' &&
          s.id !== 'od-ai' &&
          s.id !== 'od-demand-trend' &&
          s.id !== 'od-pros-cons',
      )
      .map((s) => ({ id: s.id, label: s.label }))
    const hasStyleAddons = Boolean(
      opp &&
        (opp as { style_addons?: unknown }).style_addons &&
        (opp as { research_style?: unknown }).research_style &&
        String((opp as { research_style?: unknown }).research_style) !== 'standard',
    )
    if (!hasStyleAddons) return tabs
    const analysisTab = { id: 'od-analysis', label: 'Analysis' }
    const insightsIdx = tabs.findIndex((t) => t.id === 'od-research-insights')
    if (insightsIdx >= 0) {
      return [...tabs.slice(0, insightsIdx + 1), analysisTab, ...tabs.slice(insightsIdx + 1)]
    }
    return [analysisTab, ...tabs]
  }, [opp, sectionItems])

  useRegisterAppChromeHeader({
    title:
      onboardingRevealRequested && onboardingRevealPhase !== 'ready'
        ? ''
        : opp?.title
          ? String(opp.title)
          : isUserResearch
            ? 'Research'
            : 'Opportunity',
    icon:
      onboardingRevealRequested && onboardingRevealPhase !== 'ready'
        ? null
        : opp
          ? renderCategoryIcon(
              String(opp.category_slug ?? ''),
              typeof (opp as { category_icon?: string | null }).category_icon === 'string'
                ? (opp as { category_icon?: string | null }).category_icon
                : null,
              'h-full w-full',
            )
          : null,
    badges: null,
    endActions:
      onboardingRevealRequested && onboardingRevealPhase !== 'ready' ? null : chromeEndActions,
    tabs: null,
  })

  const targetCustomerPills: string[] = useMemo(() => Array.isArray((opp as any)?.target_customer_pills)
    ? (opp as any).target_customer_pills
        .map((p: any) => (typeof p === 'string' ? p : (p?.label ?? p?.name ?? '')))
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    : [], [opp])

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://powerproof.live'
  const publicSeoFallback = opp
    ? {
        title: buildOpportunitySeoTitle(opp),
        description: buildOpportunitySeoDescription(opp),
        ogTitle: buildOpportunityOgTitle(opp),
      }
    : null
  const seo = resolveOpportunitySeo(
    'opportunity_detail',
    opp
      ? {
          seo_title: (opp as any).seo_title,
          seo_description: (opp as any).seo_description,
          seo_canonical_path: (opp as any).seo_canonical_path,
          seo_image_url: (opp as any).seo_image_url,
          seo_noindex: isUserResearch ? true : (opp as any).seo_noindex,
        }
      : undefined,
    {
      title: isUserResearch
        ? `${opp?.title ?? 'Opportunity'} — PowerProof`
        : publicSeoFallback?.title ?? 'Opportunity — PowerProof',
      description: isUserResearch
        ? opp?.tagline ?? ''
        : publicSeoFallback?.description ?? '',
      ogTitle: isUserResearch ? undefined : publicSeoFallback?.ogTitle,
      canonicalPath: isUserResearch ? `/my-research/${opp?.slug ?? ''}` : `/o/${opp?.slug ?? ''}`,
    },
    opp?.slug ?? null,
  )
  const canonicalPath = seo.canonicalPath ?? `/o/${opp?.slug ?? ''}`
  const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : `${siteOrigin}${canonicalPath}`

  // Fit / tab state must run unconditionally (before any early returns) to keep hook order stable.
  const rawBreakdown = (opp as any)?.score_breakdown as Record<string, unknown> | undefined
  const rawScore = isUserResearch
    ? ((opp as any)?.fit_index ?? opp?.score ?? null)
    : (opp?.score ?? null)
  const fitScoreValid = isFitScoreDisplayValid(rawScore, rawBreakdown)
  const fitScoreUnavailable =
    isUserResearch &&
    !fitScoreValid &&
    Boolean(String(opp?.title ?? '').trim())
  const hasProsCons =
    fullDetail &&
    ((Array.isArray((opp as any)?.pros) && (opp as any).pros.length > 0) ||
      (Array.isArray((opp as any)?.cons) && (opp as any).cons.length > 0))
  const showFitScoreColumn = isUserResearch
    ? fitScoreValid || fitScoreUnavailable || hasProsCons
    : fitScoreValid ||
      rawBreakdown != null ||
      (rawScore != null && rawScore !== '') ||
      hasProsCons
  const hasGuidelinesChips =
    Boolean(fullDetail) &&
    (targetCustomerPills.length > 0 ||
      (Array.isArray((opp as any)?.state_tags) && (opp as any).state_tags.length > 0))
  const showFitAndChipsColumn = showFitScoreColumn || hasGuidelinesChips

  const researchTabs = useMemo(() => {
    if (!showFitAndChipsColumn) {
      return researchDataTabs.filter((tab) => tab.id !== 'od-fit')
    }
    if (researchDataTabs.some((tab) => tab.id === 'od-fit')) return researchDataTabs
    return [{ id: 'od-fit', label: 'Fit' }, ...researchDataTabs]
  }, [researchDataTabs, showFitAndChipsColumn])
  const [researchDataTab, setResearchDataTab] = useState('')
  const defaultResearchDataTab =
    researchTabs.find((tab) => tab.id !== 'od-fit')?.id ?? researchTabs[0]?.id
  useEffect(() => {
    if (researchTabs.length === 0) return
    if (!researchTabs.some((tab) => tab.id === researchDataTab)) {
      setResearchDataTab(defaultResearchDataTab ?? '')
    }
  }, [researchTabs, researchDataTab, defaultResearchDataTab])

  if (isLoading && oppData?.slug !== slug) {
    return <OpportunityLoadingState />
  }

  if (error || !oppData) {
    return <OpportunityNotFound />
  }

  if (onboardingRevealRequested && onboardingRevealPhase !== 'ready') {
    return (
      <OnboardingOpportunityGeneratingScreen
        title={String((oppData as { title?: unknown })?.title ?? '')}
        progressPct={onboardingProgressPct}
        activeChunkLabel={onboardingChunkLabel}
        recentChunks={onboardingRecentChunks}
      />
    )
  }

  if (!opp) {
    return <OpportunityNotFound />
  }

  const isAdminUser = ['admin', 'super_admin'].includes(String(profile?.role ?? ''))
  const openAdminEditor = (focus?: string) => {
    if (isUserResearch || !isAdminUser || !opp?.id) return
    navigate(`/admin/opportunities/${opp.id}${focus ? `?focus=${encodeURIComponent(focus)}` : ''}`)
  }
  const interestedHero = deriveInterestedCount({
    interested_count: (opp as any)?.interested_count,
    save_count: (opp as any)?.save_count,
    view_count: (opp as any)?.view_count,
    score: opp?.score ?? null,
  })
  const effortLabel = opp?.ease ? String(opp.ease) : ''
  const demandTrendKind = isUserResearch
    ? trendKindFromDemandDirection((opp as any)?.demand_trend?.trend_direction)
    : trendKindFromVelocity(opp?.trend_velocity ?? 0)
  const isLocked = false

  const shareUrl = isUserResearch
    ? `${window.location.origin}/my-research/${opp?.slug}`
    : `${window.location.origin}/o/${opp?.slug}?ref=share`

  const breakeven = calculateBreakeven(opp)
  const fp = opp?.financial_projections
  const fpMonthly = opp?.financial_projections?.monthly
  const hasRevenueRange = Boolean(
    (fpMonthly?.revenue_low != null && fpMonthly?.revenue_high != null) ||
      (opp?.monthly_rev_min != null && opp?.monthly_rev_max != null),
  )
  const hasRevenueScenarios = opp?.monthly_rev_min != null || opp?.monthly_rev_max != null

  const setupMinAbs = toAbsolute(opp?.setup_min)
  const setupMaxAbs = toAbsolute(opp?.setup_max)
  const profitMinAbs = toAbsolute(opp?.monthly_profit_min)
  const profitMaxAbs = toAbsolute(opp?.monthly_profit_max)

  const marginPct = deriveMarginPct(opp)

  if (opp && isUserResearch && !user) return null

  const canEditHero = Boolean(isUserResearch && user && opportunityId)

  const saveHeroFields = async (patch: {
    title?: string
    tagline?: string
  }) => {
    if (!opp?.id) throw new Error('Opportunity not found')
    if (!isUserResearch) {
      throw new Error('Title and description can only be edited on your research')
    }
    const { error } = await supabase
      .from('user_opportunities')
      .update(patch)
      .eq('id', opportunityId)
    if (error) throw error
    setEditChatPatch((prev) => ({ ...prev, ...patch }))
    if (patch.title) setTrail(patch.title)
    onOpportunityRefresh?.()
  }

  const handleTitleSave = async (title: string) => {
    await saveHeroFields({ title })
    toast.success('Title updated')
  }

  const handleDescriptionSave = async (description: string) => {
    await saveHeroFields({ tagline: description })
    toast.success('Description updated')
  }

  return (
    <OnboardingOpportunityPreviewProvider active={onboardingRevealRequested}>
      <OpportunitySeoHead seo={seo} opp={opp} canonicalUrl={canonicalUrl} />

      {researchAskAiComplete ? (
        <ResearchAskAI
          userOpportunityId={opportunityId}
          researchTitle={String(opp?.title ?? opp?.research_query ?? 'this research')}
        >
          <AskAiChatPageShell>
            {renderPageBody()}
          </AskAiChatPageShell>
        </ResearchAskAI>
      ) : onboardingRevealRequested && opportunityId ? (
        <OnboardingOpportunityAskAI
          opportunityId={opportunityId}
          title={String(opp?.title ?? 'Opportunity')}
        >
          {renderPageBody()}
        </OnboardingOpportunityAskAI>
      ) : !isUserResearch && opportunityId && user ? (
        <CatalogOpportunityAskAI
          opportunityId={opportunityId}
          title={String(opp?.title ?? 'Opportunity')}
        >
          {renderPageBody()}
        </CatalogOpportunityAskAI>
      ) : (
        renderPageBody()
      )}
    </OnboardingOpportunityPreviewProvider>
  )

  function renderPageBody() {
    return (
      <div className="w-full">
        <DiscoverWide>
         <div className={opportunityDetailPageGridClass()}>


          {onboardingRevealRequested ? (
            <>
              <div className="relative z-10 w-full overflow-visible">
                <OnboardingRevealFinishSetup className="w-full" />
              </div>
              {opportunityId && onboardingRevealPhase === 'ready' ? (
                <OnboardingOpportunitySpotlight
                  opportunityId={opportunityId}
                  ready
                />
              ) : null}
            </>
          ) : null}
          {reResearchPending && opp ? (
            <ReResearchPendingBanner
              title={String(opp.title ?? 'Research')}
              sections={reResearchPendingSections}
              createdAt={reResearchPendingCreatedAt}
            />
          ) : null}
          {opportunityHeroImageSrc ? (
            <div className={cn('relative z-0 w-full min-w-0 overflow-hidden border-0 bg-bg-sunken', opportunityDetailCardRadiusClass)}>
              <img
                src={opportunityHeroImageSrc}
                alt={opp?.title ? `Illustration for ${String(opp.title)}` : 'Opportunity illustration'}
                className="max-h-[min(22vh,160px)] w-full object-cover object-center sm:max-h-[min(28vh,220px)] lg:max-h-[min(32vh,280px)]"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          ) : null}
            <OpportunityHeroPanel
              opp={opp}
              fullDetail={fullDetail}
              user={user}
              isMobile={isCompact}
              categoryLabel={heroCategoryLabel}
              metaText={heroMetaText}
              statusChip={statusChip}
              interestedHero={interestedHero}
              bp={bp}
              twScroll={twScroll}
              handleExport={handleExport}
              handleShare={handleShare}
              handleStartBusiness={handleStartBusiness}
              locationPathSearch={`${location.pathname}${location.search}`}
              showHeroQuickActions={false}
              showInterestCount={!isUserResearch && !onboardingRevealRequested}
              showPreviewBadge={onboardingRevealRequested}
              showOverview={false}
              fluidTheme={landingFluidThemeForOpportunityDetail(isUserResearch)}
              demandTrendKind={isUserResearch ? demandTrendKind : undefined}
              onTitleSave={canEditHero ? handleTitleSave : undefined}
              onDescriptionSave={canEditHero ? handleDescriptionSave : undefined}
              metrics={
                <OpportunityMetricsBar
                  setupMinAbs={setupMinAbs}
                  setupMaxAbs={setupMaxAbs}
                  profitMinAbs={profitMinAbs}
                  profitMaxAbs={profitMaxAbs}
                  effortLabel={effortLabel}
                  marginPct={marginPct}
                  demandTrendKind={demandTrendKind}
                  oppSetupMin={opp?.setup_min}
                  oppSetupMax={opp?.setup_max}
                  formatSetupCost={formatSetupCost}
                  formatMoney={formatMoney}
                  setupCostDerivation={
                    ((opp as { setup_cost_derivation?: SetupCostDerivation | null })
                      ?.setup_cost_derivation ?? null) as SetupCostDerivation | null
                  }
                  setupCostBreakdown={(opp as { setup_cost_breakdown?: unknown })?.setup_cost_breakdown}
                  profitDerivation={
                    ((opp as { profit_derivation?: ProfitDerivation | null })?.profit_derivation ??
                      null) as ProfitDerivation | null
                  }
                  effortScorecard={
                    ((opp as { effort_scorecard?: EffortScorecard | null })?.effort_scorecard ??
                      null) as EffortScorecard | null
                  }
                  easeScore={(opp as { ease_score?: number | null })?.ease_score ?? null}
                  hideDemandTrend={isUserResearch}
                />
              }
            />
            {researchTabs.length > 0 ? (
            <InternalPageDataTabs
              tabs={researchTabs}
              value={researchDataTab || defaultResearchDataTab || undefined}
              onValueChange={setResearchDataTab}
              flush
            >
            <TabsContent value="od-fit" className={internalPageTabPanelClass}>
            {showFitAndChipsColumn ? (
                <FitScoreSidebar
                  rawBreakdown={rawBreakdown}
                  rawScore={rawScore}
                  fitScorePending={false}
                  fitScoreUnavailable={fitScoreUnavailable}
                  opp={opp}
                  locationPillsRef={locationPillsRef}
                  customerPillsRef={customerPillsRef}
                  statePillsRef={statePillsRef}
                  showFitScoreColumn={showFitScoreColumn}
                  hasGuidelinesChips={hasGuidelinesChips}
                />
            ) : null}
            </TabsContent>
            <TabsContent value="od-research-insights" className={internalPageTabPanelClass}>
            {isUserResearch ? (
              <ResearchInsightSections
                opp={opp as Record<string, unknown>}
                isMobile={isCompact}
                twScroll={twScroll}
                isProLocked={isProLocked}
              />
            ) : null}
            </TabsContent>

            <TabsContent value="od-analysis" className={internalPageTabPanelClass}>
            {opp &&
            ((opp as any)?.style_addons &&
                (opp as any)?.research_style &&
                String((opp as any).research_style) !== 'standard') ? (
              <div className={cn(opportunityDetailCardClass, opportunityDetailCardPaddingClass, 'flex min-w-0 w-full flex-col gap-6 scroll-mt-[7.5rem]')} id="od-analysis">
                {(opp as any)?.style_addons &&
                (opp as any)?.research_style &&
                String((opp as any).research_style) !== 'standard' ? (
                  <StyleAddonsSection
                    addons={(opp as any).style_addons as Record<string, unknown>}
                    style={String((opp as any).research_style)}
                  />
                ) : null}
              </div>
            ) : null}
            </TabsContent>

            <TabsContent value="od-key-market-trends" className={internalPageTabPanelClass}>
            <MarketTrendsSection
              opp={opp}
              isMobile={isCompact}
              fullDetail={fullDetail}
              preferredCurrency={preferredCurrency}
              convertFromUSD={convertFromUSD}
              inrPerUsd={inrPerUsd}
              twScroll={twScroll}
              isProLocked={isProLocked}
            />
            </TabsContent>

            <TabsContent value="market" className={internalPageTabPanelClass}>
            <DemographicsSection
              opp={opp}
              isMobile={isCompact}
              fullDetail={fullDetail}
              twScroll={twScroll}
              isProLocked={isProLocked}
            />
            </TabsContent>

            <TabsContent value="od-scenarios" className={internalPageTabPanelClass}>
            {hasRevenueScenarios && fullDetail && (
              <RevenueScenarioCards
                opportunity={opp}
                isMobile={isCompact}
              />
            )}
            </TabsContent>

            <TabsContent value="od-revenue-streams" className={internalPageTabPanelClass}>
            {Boolean(sectionItems.find((s) => s.id === 'od-revenue-streams')?.show) && (
              <RevenueStreamsSection
                streams={(opp as any).revenue_streams}
                isMobile={isCompact}
                isProLocked={isProLocked}
              />
            )}
            </TabsContent>

            <TabsContent value="od-marketing" className={internalPageTabPanelClass}>
            {Boolean(sectionItems.find((s) => s.id === 'od-marketing')?.show) && (opp as any)?.marketing_strategy ? (
              <MarketingStrategySection
                isMobile={isCompact}
                strategy={(opp as any).marketing_strategy as MarketingStrategy}
                isProLocked={isProLocked}
              />
            ) : null}
            </TabsContent>

            <TabsContent value="od-unit-economics" className={internalPageTabPanelClass}>
            {fullDetail && isUserResearch ? (
                <UnitEconomicsDeepSection
                  opp={opp as Record<string, unknown>}
                  isMobile={isCompact}
                  twScroll={twScroll}
                />
            ) : null}
            </TabsContent>

            <TabsContent value="od-tools" className={internalPageTabPanelClass}>
            {fullDetail && isUserResearch ? (
                <ToolsAndStackSection
                  opp={opp as Record<string, unknown>}
                  isMobile={isCompact}
                  twScroll={twScroll}
                />
            ) : null}
            </TabsContent>

            <TabsContent value="od-competitors" className={internalPageTabPanelClass}>
            {isUserResearch &&
            (opp as any)?.competitors?.king_of_market?.name ? (
              <CompetitorsSection
                competitors={(opp as any).competitors}
                isMobile={isCompact}
                isProLocked={isProLocked}
              />
            ) : null}
            </TabsContent>

            <TabsContent value="od-space-location" className={internalPageTabPanelClass}>
            {isUserResearch && isSpaceLocationPresent((opp as any).space_location) ? (
              <section className="min-w-0 w-full scroll-mt-[7.5rem]">
                <SpaceLocationSection
                  space={(opp as any).space_location}
                />
              </section>
            ) : null}
            </TabsContent>

            <TabsContent value="od-machinery" className={internalPageTabPanelClass}>
            {machineryList.length > 0 && fullDetail && (
              <MachinerySection
                machineryList={machineryList}
                isMobile={isCompact}
                isLocked={isLocked}
                formatMoney={formatMoney}
                formatConvertedValue={formatConvertedValue}
                navigate={navigate}
                locationPathSearch={`${location.pathname}${location.search}`}
                twScroll={twScroll}
              />
            )}
            </TabsContent>

            <TabsContent value="od-headcount" className={internalPageTabPanelClass}>
            {opp.headcount && fullDetail ? (
              <HeadcountSection headcount={opp.headcount} isMobile={isCompact} />
            ) : null}
            </TabsContent>

            <TabsContent value="od-raw" className={internalPageTabPanelClass}>
            {rawMaterialsList.length > 0 && fullDetail && (
              <RawMaterialsSection
                rawMaterialsList={rawMaterialsList}
                isMobile={isCompact}
                isLocked={isLocked}
                formatMoney={formatMoney}
                formatConvertedValue={formatConvertedValue}
                twScroll={twScroll}
              />
            )}
            </TabsContent>

            <TabsContent value="od-licenses" className={internalPageTabPanelClass}>
            {licensesList.length > 0 && fullDetail && (
              <LicensesSection
                licensesList={licensesList}
                opp={opp}
                isMobile={isCompact}
                isLocked={isLocked}
                formatMoney={formatMoney}
                formatSetupCost={formatSetupCost}
                twScroll={twScroll}
              />
            )}
            </TabsContent>

            <TabsContent value="od-schemes" className={internalPageTabPanelClass}>
            {fullDetail && (
              <SchemesSection
                opp={opp}
                isMobile={isCompact}
                twScroll={twScroll}
              />
            )}
            </TabsContent>

            <TabsContent value="od-funding" className={internalPageTabPanelClass}>
            {fullDetail && isUserResearch ? (
                <FundingOptionsSection
                  opp={opp as Record<string, unknown>}
                  isMobile={isCompact}
                  twScroll={twScroll}
                  isProLocked={isProLocked}
                />
            ) : null}
            </TabsContent>

            <TabsContent value="od-risks" className={internalPageTabPanelClass}>
            {fullDetail && isUserResearch ? (
                <RiskMatrixSection
                  opp={opp as Record<string, unknown>}
                  isMobile={isCompact}
                  twScroll={twScroll}
                  isProLocked={isProLocked}
                />
            ) : null}
            </TabsContent>

            <TabsContent value="od-faq" className={internalPageTabPanelClass}>
            <FaqSection
              opp={opp}
              isMobile={isCompact}
              twScroll={twScroll}
            />
            </TabsContent>
            </InternalPageDataTabs>
            ) : null}
        </div>
        </DiscoverWide>

      <OpportunityPageFooter
        isMobile={isCompact}
        user={user}
        handleShare={handleShare}
        showShareDrawer={showShareDrawer}
        setShowShareDrawer={setShowShareDrawer}
        opp={opp}
        shareUrl={shareUrl}
        isDesktop={isDesktop}
        showMobileShare={!isUserResearch && !(opportunityId && user) && !onboardingRevealRequested}
      />

      </div>
    )
  }
}

export default OpportunityDetailPage

import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { DiscoverHeroLiveSearch } from '@/components/discover/DiscoverHeroLiveSearch'
import { WebsiteScannerPage } from '@/pages/WebsiteScannerPage'
import { DiscoverHeroSection } from '@/components/discover/DiscoverHeroSection'
import { discoverHeroSectionSlotScrollChainClassName } from '@/components/discover/discoverHeroTokens'
import { DiscoverHeroViewportShell } from '@/components/discover/DiscoverHeroViewportShell'
import { DiscoverHeroAskAiShell } from '@/components/discover/DiscoverHeroAskAiShell'
import { DiscoverHeroRoomPageSkeleton } from '@/components/discover/DiscoverHeroBox'
import { Seo } from '@/components/Seo'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useAppChromeHeaderOptional } from '@/contexts/AppChromeHeaderContext'
import { useShopifyConnectedCallback } from '@/hooks/useShopifyConnection'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { landingSignInTo } from '@/lib/authLanding'
import {
  discoverHeroModeFromLocation,
  browseViewFromSearch,
  legacyRoomDashboardRedirect,
  roomPathForMode,
  type DiscoverHeroTab,
} from '@/lib/discoverHeroRoutes'
import {
  PAID_UNLOCK_NAV_IDS,
  isWorkspaceToolUnlocked,
  type SidebarWorkspaceNavId,
} from '@/lib/sidebarWorkspaceNav'
import { hasSubscriptionFeature } from '@/lib/subscriptionStatus'
import { openSubscriptionPricingDialog } from '@/store/filterStore'

const INVESTORS_BROWSE_SEO = {
  title: 'Investors | PowerProof',
  description:
    'Browse VCs, accelerators, angels, and funding programmes with thesis, check size, stages, and portfolio context.',
  canonicalPath: '/room?mode=search&browse=investors',
  noIndex: true as const,
}

const MODE_SEO: Record<
  DiscoverHeroTab,
  { title: string; description: string; canonicalPath: string; noIndex?: boolean }
> = {
  search: {
    title: 'Opportunities in India | PowerProof',
    description:
      'Discover trending MSME and startup opportunities, business ideas, setup costs, margins, and step-by-step guidance.',
    canonicalPath: '/room?mode=search',
  },
  research: {
    title: 'Research | PowerProof',
    description: 'Turn a rough idea into market mapping, schemes, capex models, and compliance checklists.',
    canonicalPath: '/room?mode=research',
    noIndex: true,
  },
  'war-room': {
    title: 'War Room | PowerProof',
    description: 'Competitive playbook and war room for your business.',
    canonicalPath: '/room?mode=war-room',
    noIndex: true,
  },
  sourcing: {
    title: 'Source Products | PowerProof',
    description: 'Search suppliers across IndiaMart, Alibaba, and more.',
    canonicalPath: '/room?mode=sourcing',
    noIndex: true,
  },
  roadmap: {
    title: 'Roadmap | PowerProof',
    description: 'Decompose any goal into a nested roadmap with flowchart and timeline views.',
    canonicalPath: '/room?mode=roadmap',
    noIndex: true,
  },
  'market-test': {
    title: 'Test the Market | PowerProof',
    description:
      'Reality-check your business idea with demand signals, named company evidence, and an honest verdict.',
    canonicalPath: '/room?mode=market-test',
    noIndex: true,
  },
  scanner: {
    title: 'Scanner | PowerProof',
    description: 'Audit any website for SEO, business, competitor, and roadmap signals.',
    canonicalPath: '/room?mode=scanner',
    noIndex: true,
  },
}

const AUTH_MODES = new Set<DiscoverHeroTab>([
  'research',
  'war-room',
  'sourcing',
  'roadmap',
  'market-test',
  'scanner',
])

export default function RoomPage() {
  const { user, profile, isAdmin, isLoading: authLoading } = useAuth()
  const chrome = useAppChromeHeaderOptional()
  const previewRoomVariant = chrome?.previewRoomVariant ?? 'off'
  const {
    data: subscriptionStatus,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
  } = useSubscriptionStatus()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = discoverHeroModeFromLocation(location.pathname, location.search)
  const browseView = browseViewFromSearch(location.search)
  const seo =
    mode === 'search' && browseView === 'investors' ? INVESTORS_BROWSE_SEO : MODE_SEO[mode]
  const { setTrail } = useNavbarTrail()

  useShopifyConnectedCallback()

  useEffect(() => {
    if (mode === 'research') {
      setTrail('Research')
      return () => setTrail(null)
    }
    if (mode === 'war-room') {
      setTrail('War Room')
      return () => setTrail(null)
    }
    if (mode === 'sourcing') {
      setTrail('Source Products')
      return () => setTrail(null)
    }
    if (mode === 'roadmap') {
      setTrail('Roadmap')
      return () => setTrail(null)
    }
    setTrail(null)
  }, [mode, setTrail])

  useEffect(() => {
    const target = legacyRoomDashboardRedirect(location.pathname, location.search)
    if (!target) return
    const current = `${location.pathname}${location.search}`
    if (target !== current) {
      navigate(target, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!AUTH_MODES.has(mode) || user?.id) return
    navigate(landingSignInTo(roomPathForMode(mode, searchParams)), { replace: true })
  }, [mode, user?.id, navigate, searchParams])

  useEffect(() => {
    if (!user?.id) return
    if (!PAID_UNLOCK_NAV_IDS.has(mode as SidebarWorkspaceNavId)) return
    if (isAdmin) return
    // Fail closed while the caller's plan is unknown; do not briefly expose gated tools.
    if (subscriptionLoading) return

    const featureAccess = {
      roadmapUnlocked: hasSubscriptionFeature(subscriptionStatus, 'roadmap_unlocked'),
      warroomUnlocked: hasSubscriptionFeature(subscriptionStatus, 'warroom_unlocked'),
      isAdmin: false,
    }
    if (isWorkspaceToolUnlocked(mode as SidebarWorkspaceNavId, featureAccess)) return

    navigate(roomPathForMode('research'), { replace: true })
    if (subscriptionError) {
      toast.error('Could not verify your plan. Please try again.')
      return
    }
    const label = mode === 'roadmap' ? 'Roadmap' : 'War Room'
    toast.message(`${label} requires an active Unlimited plan.`, {
      action: {
        label: 'View Unlimited',
        onClick: openSubscriptionPricingDialog,
      },
    })
  }, [
    isAdmin,
    mode,
    navigate,
    subscriptionError,
    subscriptionLoading,
    subscriptionStatus,
    user?.id,
  ])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const aiMsg = params.get('msg')
    const isAI = params.get('ai')
    if (isAI && aiMsg && profile && mode === 'search') {
      const msg = decodeURIComponent(aiMsg)
      navigate(roomPathForMode('search'), {
        replace: true,
        state: { discoverSearch: msg },
      })
    }
  }, [profile, navigate, mode])

  const discoverSearchFromNav = (
    location.state as { discoverSearch?: string } | null
  )?.discoverSearch?.trim()

  useEffect(() => {
    if (!discoverSearchFromNav) return
    navigate(roomPathForMode('search'), { replace: true, state: {} })
  }, [discoverSearchFromNav, navigate])

  if (AUTH_MODES.has(mode) && authLoading) {
    return (
      <DiscoverHeroAskAiShell mode={mode}>
        <DiscoverHeroViewportShell>
          <DiscoverHeroRoomPageSkeleton />
        </DiscoverHeroViewportShell>
      </DiscoverHeroAskAiShell>
    )
  }

  if (AUTH_MODES.has(mode) && !user) return null

  if (mode === 'scanner') {
    return (
      <DiscoverHeroAskAiShell mode="scanner">
        <WebsiteScannerPage />
      </DiscoverHeroAskAiShell>
    )
  }

  const sectionSlotClassName = discoverHeroSectionSlotScrollChainClassName
  const showFreePlanBadge =
    previewRoomVariant === 'free' ||
    (Boolean(user) && !subscriptionLoading && !subscriptionStatus?.success && previewRoomVariant !== 'nil')

  return (
    <DiscoverHeroAskAiShell mode={mode}>
      <>
        <Seo
          title={seo.title}
          description={seo.description}
          canonicalPath={seo.canonicalPath}
          noIndex={seo.noIndex}
        />
        <DiscoverHeroViewportShell>
          {showFreePlanBadge ? (
            <div className="flex shrink-0 justify-center px-3 pt-3 layout-sm:pt-4">
              <button
                type="button"
                onClick={openSubscriptionPricingDialog}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-bg-hover focus-visible:outline-none"
                aria-label="You're on the Free plan. Choose a plan."
              >
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
                Free plan
              </button>
            </div>
          ) : null}
          <DiscoverHeroSection
            id="room-discover-search"
            ariaLabel="PowerProof workspace"
            centered={false}
            align="left"
            className={sectionSlotClassName}
          >
            <DiscoverHeroLiveSearch
              inputId="room-discover-search-input"
              stableLayout
              initialSearch={discoverSearchFromNav}
            />
          </DiscoverHeroSection>
        </DiscoverHeroViewportShell>
      </>
    </DiscoverHeroAskAiShell>
  )
}

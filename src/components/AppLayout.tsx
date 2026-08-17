import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { useAuth } from '@/contexts/AuthContext';
import { BackgroundJobsProvider } from '@/contexts/BackgroundJobsContext';
import { ResearchOpportunityProvider } from '@/contexts/ResearchOpportunityContext'
import { RoadmapClarifyProvider } from '@/contexts/RoadmapClarifyContext'
import { WarRoomProvider } from '@/contexts/WarRoomContext'
import { AppChromeHeaderProvider } from '@/contexts/AppChromeHeaderContext'
import { AppChromeHeader, shouldShowAppChromeHeader } from '@/components/layout/AppChromeHeader'
import { AppMobileMenuButton } from '@/components/layout/AppMobileMenuButton'
import { AppSidebar, writeSidebarCollapsedPreference } from '@/components/layout/AppSidebar'
import {
  APP_CLOSE_SIDEBAR_EVENT,
  APP_EXPAND_DESKTOP_SIDEBAR_EVENT,
  APP_OPEN_SIDEBAR_EVENT,
} from '@/lib/appSidebarEvents'
import {
  OpportunityEditChatProvider,
  useOpportunityEditChat,
} from '@/contexts/OpportunityEditChatContext'
import { OpportunityDetailNavProvider } from '@/contexts/OpportunityDetailNavContext'
import { AskAiPanelLayoutProvider } from '@/contexts/AskAiPanelLayoutContext'
import { ClarificationSidebarRail } from '@/components/research/ClarificationSidebarRail'
import { ClarificationNavProvider } from '@/contexts/ClarificationNavContext'
import { AppFloatingShell, appFloatingPageRootClass } from '@/components/layout/AppFloatingShell'
import { appShellContentClass, appRoomShellClass, appShellPadClass, appWorkspaceEmbedCanvasClass, APP_SIDEBAR_EXPANDED_WIDTH_PX } from '@/lib/platformLayout'
import { isOpportunityDetailPath, isMarketTestPath } from '@/lib/appPageBack'
import { isScannerDetailPath } from '@/lib/sidebarWorkspaceNav'
import {
  readClarifySectionNavRailCollapsedPreference,
  writeClarifySectionNavRailCollapsedPreference,
} from '@/lib/clarifySectionNavRail'
import { isClarifyPath } from '@/lib/clarifyNavPath'
import {
  isFirstRegistrationOnboardingActive,
  resolveIncompleteOnboardingPath,
} from '@/lib/onboardingResearchDemo'
import {
  isOnboardingOpportunityGeneratingSearch,
  isOnboardingOpportunityPreviewSearch,
} from '@/hooks/useOnboardingOpportunityTypewriterReveal'
import { AUTH_CALLBACK_PATH } from '@/lib/authLanding'
import { ASK_AI_UI_ENABLED } from '@/lib/askAiPanelEvents'
import { cn } from '@/lib/utils'

const opportunityDetailPageBackgroundClass = 'bg-background'
const opportunityDetailPageShellClassName = cn('mx-auto w-full min-w-0 max-w-platform overflow-x-visible', appShellPadClass)

const OpportunityEditChatPanel = lazy(() =>
  import('@/components/opportunity/OpportunityEditChat').then((m) => ({
    default: m.OpportunityEditChatPanel,
  })),
)

function OpportunityEditChatPanelSlot() {
  const { activePageOpportunityId } = useOpportunityEditChat()
  if (!ASK_AI_UI_ENABLED || !activePageOpportunityId) return null
  return (
    <Suspense fallback={null}>
      <OpportunityEditChatPanel />
    </Suspense>
  )
}

function AppMainScrollBody({
  children,
  pageContentShellClass,
  withProviders,
  fillViewport,
}: {
  children: React.ReactNode
  pageContentShellClass: string
  withProviders: boolean
  fillViewport?: boolean
}) {
  const body = (
    <div className={cn(pageContentShellClass, fillViewport && 'flex min-h-0 flex-1 flex-col')}>
      {children}
    </div>
  )
  if (!withProviders) return body
  return (
    <BackgroundJobsProvider>
      <ResearchOpportunityProvider>
        <WarRoomProvider>
          <RoadmapClarifyProvider>{body}</RoadmapClarifyProvider>
        </WarRoomProvider>
      </ResearchOpportunityProvider>
    </BackgroundJobsProvider>
  )
}

/** Keep first-time registrants on the reveal flow until free credits are claimed (same session only). */
function OnboardingClaimGate() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, profileLoading, isAdmin } = useAuth()

  useEffect(() => {
    if (!user?.id || profileLoading || isAdmin) return
    if (profile?.onboarding) return
    // Returning logins skip the gate — onboarding is signup-only.
    if (!isFirstRegistrationOnboardingActive()) return

    const path = location.pathname
    const search = location.search
    if (path === AUTH_CALLBACK_PATH) return
    if (path === '/') return
    if (path.startsWith('/admin')) return
    if (
      isOpportunityDetailPath(path) &&
      isOnboardingOpportunityPreviewSearch(search)
    ) {
      return
    }

    const target = resolveIncompleteOnboardingPath()
    const current = `${path}${search}`
    if (target === current) return
    navigate(target, { replace: true })
  }, [
    isAdmin,
    location.pathname,
    location.search,
    navigate,
    profile?.onboarding,
    profileLoading,
    user?.id,
  ])

  return null
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth()

  const showAppChrome = !location.pathname.startsWith('/admin')
    && location.pathname !== '/'
    && location.pathname !== '/sign-in'
    && location.pathname !== '/start'

  const isOppDetail = isOpportunityDetailPath(location.pathname)
  const isScanDetail = isScannerDetailPath(location.pathname)
  /** Opportunity-detail shell (padding, surface bg) — shared with scan reports. */
  const isDetailShell = isOppDetail || isScanDetail
  const isClarifyPage = isClarifyPath(location.pathname)
  const isMarketTestPage = isMarketTestPath(location.pathname)
  const isOnboardingOppPreview =
    isOpportunityDetailPath(location.pathname) &&
    isOnboardingOpportunityPreviewSearch(location.search)
  const isOnboardingOppGenerating =
    isOnboardingOppPreview && isOnboardingOpportunityGeneratingSearch(location.search)
  /** Keep the entire onboarding reveal flow focused and free of app navigation. */
  const hideChromeForOnboarding = isOnboardingOppPreview
  const showAppSidebar = !hideChromeForOnboarding && Boolean(user)

  // Pages that manage their own layout — skip appShellContentClass.
  // Both /room (discover hero) and /dashboard (website scanner home) use the
  // room-style shell so the composer can dock against the scroll region.
  // Scan detail (/scan/:id) uses the opportunity-detail shell + chrome tabs.
  const isRoomPage =
    location.pathname === '/room' ||
    location.pathname.startsWith('/room') ||
    location.pathname === '/dashboard'
  const isRoomDiscoverPage = location.pathname === '/room'
  const isInvestorsPage = /^\/investors\/[^/]+$/.test(location.pathname)

  const [navOpen, setNavOpen] = useState(false)
  // Always start the workspace sidebar collapsed, regardless of the stored
  // preference. The user can still expand/collapse; this just makes the
  // default state predictable.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true)
  const [clarifyNavCollapsed, setClarifyNavCollapsed] = useState(() =>
    readClarifySectionNavRailCollapsedPreference(),
  )
  const [textScale, setTextScale] = useState(1.2)

  const showAppChromeHeader =
    shouldShowAppChromeHeader(location.pathname) &&
    !isOnboardingOppGenerating &&
    !(isRoomDiscoverPage && !user)
  const pageContentShellClass = isDetailShell
    ? cn(
        opportunityDetailPageShellClassName,
        isOnboardingOppPreview && 'overflow-x-visible overflow-y-visible',
      )
    : isRoomPage || isInvestorsPage || hideChromeForOnboarding
      ? appRoomShellClass
      : appShellContentClass

  useEffect(() => {
    const raw = window.localStorage.getItem('powerproof_text_scale')
    const n = raw ? Number(raw) : 1.2
    const next = Number.isFinite(n) ? Math.min(1.44, Math.max(0.9, n)) : 1.2
    setTextScale(next)
  }, [])

  useEffect(() => {
    const mobileDensity = isMobile ? 0.94 : 1
    document.documentElement.style.setProperty('--font-scale', String(textScale * mobileDensity))
  }, [textScale, isMobile])

  useEffect(() => {
    const openSidebar = () => setNavOpen(true)
    const closeSidebar = () => setNavOpen(false)
    const expandDesktopSidebar = () => {
      setSidebarCollapsed(false)
      writeSidebarCollapsedPreference(false)
    }
    window.addEventListener(APP_OPEN_SIDEBAR_EVENT, openSidebar)
    window.addEventListener(APP_CLOSE_SIDEBAR_EVENT, closeSidebar)
    window.addEventListener(APP_EXPAND_DESKTOP_SIDEBAR_EVENT, expandDesktopSidebar)
    return () => {
      window.removeEventListener(APP_OPEN_SIDEBAR_EVENT, openSidebar)
      window.removeEventListener(APP_CLOSE_SIDEBAR_EVENT, closeSidebar)
      window.removeEventListener(APP_EXPAND_DESKTOP_SIDEBAR_EVENT, expandDesktopSidebar)
    }
  }, [])

  // Keep the mobile hamburger/X icon in sync when the sidebar closes for any
  // reason (outside tap, nav link, breakpoint) — not only via the menu button.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(navOpen ? APP_OPEN_SIDEBAR_EVENT : APP_CLOSE_SIDEBAR_EVENT),
    )
  }, [navOpen])

  // Close the mobile drawer when leaving the mobile breakpoint. Keep the
  // desktop rail visible by clearing any leftover off-canvas translate in
  // AppSidebar (orientation / resize must not leave `x` stuck off-screen).
  useEffect(() => {
    if (!isMobile && navOpen) setNavOpen(false)
  }, [isMobile, navOpen])

  // Crossing into mobile (e.g. landscape → portrait) would otherwise hide the
  // rail that was visible on the wider breakpoint — open the drawer so it stays.
  const wasMobileRef = useRef(isMobile)
  useEffect(() => {
    const wasMobile = wasMobileRef.current
    wasMobileRef.current = isMobile
    if (!wasMobile && isMobile) setNavOpen(true)
  }, [isMobile])

  const mobileWorkspaceOffset = isMobile && navOpen ? APP_SIDEBAR_EXPANDED_WIDTH_PX : 0

  const mainScrollClassName = cn(
    'overflow-x-visible',
    isMarketTestPage &&
      'hide-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    isDetailShell && opportunityDetailPageBackgroundClass,
  )

  const mainScrollBody = (
    <AppFloatingShell
      mainClassName={mainScrollClassName}
      insetClassName={isRoomPage ? 'p-0 md:p-0' : undefined}
      panelClassName={isRoomPage ? 'rounded-none border-0 shadow-none' : undefined}
    >
      <AppMainScrollBody
        pageContentShellClass={pageContentShellClass}
        withProviders={Boolean(user) && showAppChrome}
        fillViewport={isRoomPage}
      >
        {children}
      </AppMainScrollBody>
    </AppFloatingShell>
  )

  const isLandingHome = location.pathname === '/'
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (!showAppChrome && (isLandingHome || isAdminRoute)) {
    return <>{children}</>
  }

  if (!showAppChrome) {
    return (
      <div className={appFloatingPageRootClass}>
        {mainScrollBody}
      </div>
    )
  }

  return (
    <OpportunityEditChatProvider>
      <AppChromeHeaderProvider>
      <OpportunityDetailNavProvider>
      <AskAiPanelLayoutProvider>
      <ClarificationNavProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <OnboardingClaimGate />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {showAppSidebar ? (
            <AppSidebar
              mobileOpen={navOpen}
              onMobileOpenChange={setNavOpen}
              collapsed={sidebarCollapsed}
              navigationLocked={isOnboardingOppPreview}
              onCollapsedChange={(next) => {
                setSidebarCollapsed(next)
                writeSidebarCollapsedPreference(next)
              }}
            />
          ) : null}
          {isClarifyPage && showAppSidebar ? (
            <ClarificationSidebarRail
              collapsed={clarifyNavCollapsed}
              onCollapsedChange={(next) => {
                setClarifyNavCollapsed(next)
                writeClarifySectionNavRailCollapsedPreference(next)
              }}
            />
          ) : null}
          {showAppSidebar && !isClarifyPage && !showAppChromeHeader && !isRoomPage ? (
            <AppMobileMenuButton className={navOpen ? 'z-[500]' : undefined} />
          ) : null}
          <motion.div
            className={cn(
              'relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col',
              appWorkspaceEmbedCanvasClass,
            )}
            initial={false}
            animate={{ x: mobileWorkspaceOffset }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 36,
              mass: 0.85,
            }}
          >
            {isMobile && navOpen ? (
              <button
                type="button"
                aria-label="Close navigation menu"
                className="absolute inset-0 z-[400] cursor-default bg-transparent"
                onClick={() => setNavOpen(false)}
              />
            ) : null}
            {showAppChromeHeader ? (
              <AppChromeHeader mobileOnly={isClarifyPage} />
            ) : null}

            {mainScrollBody}
          </motion.div>
          <OpportunityEditChatPanelSlot />
        </div>
      </div>
      </ClarificationNavProvider>
      </AskAiPanelLayoutProvider>
      </OpportunityDetailNavProvider>
      </AppChromeHeaderProvider>
    </OpportunityEditChatProvider>
  );
}

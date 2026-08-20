import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";

function LegacyDashboardScanRedirect() {
  const { scanId } = useParams<{ scanId: string }>()
  const loc = useLocation()
  if (!scanId) return <Navigate to={SCANNER_DASHBOARD_PATH} replace />
  return (
    <Navigate
      to={{ pathname: scanDetailPath(scanId), search: loc.search, hash: loc.hash }}
      replace
      state={loc.state}
    />
  )
}

import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PreferredAiModelProvider } from "@/contexts/PreferredAiModelContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { ActiveWorkspaceProvider } from "@/contexts/ActiveWorkspaceContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LegacyDiscoverHeroRedirect } from "@/components/discover/LegacyDiscoverHeroRedirect";
import { AUTH_CALLBACK_PATH, authReturnPath, hasPendingAuthCallback, landingSignInTo, resolvePostLoginPath, signInRedirectTarget } from "@/lib/authLanding";
import { SCANNER_DASHBOARD_PATH, scanDetailPath } from "@/lib/sidebarWorkspaceNav";
import { roomPathForMode } from "@/lib/discoverHeroRoutes";
import { Loader2 } from "@/lib/icons";
import { AppLayout } from "@/components/AppLayout";
import { NavbarTrailProvider } from "@/contexts/NavbarTrailContext";
import { AnalyticsScripts } from "@/components/layout/AnalyticsScripts";
import { InAppBrowserBanner } from "@/components/layout/InAppBrowserBanner";
import { PwaPrompts } from "@/components/pwa/PwaPrompts";
import { WarRoomThemeSync } from "@/components/WarRoomThemeSync";
import { RequireSession } from "@/components/RequireSession";
import { AuthCallbackRedirect } from "@/components/auth/AuthCallbackRedirect";
import { isAuthExemptPath } from "@/lib/authPublicPaths";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { SubscriptionPricingDialog } from "@/components/billing/SubscriptionPricingDialog";
import { ProfileDialog } from "@/components/profile/ProfileDialog";
import { isPublicMarketingPath } from "./lib/publicMarketingPaths";
import { LayoutGroup } from "framer-motion";

const RoomPage = lazy(() => import("./pages/RoomPage"));
const ResearchClarifyPage = lazy(() =>
  import("./pages/clarify/FlowClarifyPage").then((m) => ({ default: m.ResearchClarifyPage })),
);
const WarRoomClarifyPage = lazy(() =>
  import("./pages/clarify/FlowClarifyPage").then((m) => ({ default: m.WarRoomClarifyPage })),
);
const RoadmapClarifyPage = lazy(() =>
  import("./pages/clarify/FlowClarifyPage").then((m) => ({ default: m.RoadmapClarifyPage })),
);
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const OpportunityDetailPage = lazy(() => import("./pages/OpportunityDetailPage"));
const UserOpportunityDetailPage = lazy(() => import("./pages/UserOpportunityDetailPage"));
const UserResearchDetailPage = lazy(() =>
  import("./pages/UserResearchDetailPage").then((m) => ({ default: m.UserResearchDetailPage })),
);
const MarketTestNewPage = lazy(() =>
  import("./pages/MarketTestNewPage").then((m) => ({ default: m.MarketTestNewPage })),
);
const MarketTestDetailPage = lazy(() =>
  import("./pages/MarketTestDetailPage").then((m) => ({ default: m.MarketTestDetailPage })),
);
const SourcingSearchResultsPage = lazy(() => import("./pages/sourcing/SourcingSearchResultsPage"));
const SourcingProductPage = lazy(() => import("./pages/sourcing/SourcingProductPage"));
const WarRoomPlaybookDetailPage = lazy(() =>
  import("./pages/WarRoomPlaybookDetailPage").then((m) => ({ default: m.WarRoomPlaybookDetailPage })),
);
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminOpportunitiesHubPage = lazy(() => import("@/pages/admin/AdminOpportunitiesHubPage"));
const AdminOpportunityEditor = lazy(() => import("@/components/admin/AdminOpportunityEditor"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminWarRoomAnalyticsPage = lazy(() => import("./pages/admin/AdminWarRoomAnalyticsPage"));
const AdminResearchAnalyticsPage = lazy(() => import("./pages/admin/AdminResearchAnalyticsPage"));
const AdminRoadmapAnalyticsPage = lazy(() => import("./pages/admin/AdminRoadmapAnalyticsPage"));
const AdminItchAnalyticsPage = lazy(() => import("./pages/admin/AdminItchAnalyticsPage"));
const AdminSourcingAnalyticsPage = lazy(() => import("./pages/admin/AdminSourcingAnalyticsPage"));
const AdminMarketTestAnalyticsPage = lazy(() => import("./pages/admin/AdminMarketTestAnalyticsPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const AdminPromoPage = lazy(() => import("./pages/admin/AdminPromoPage"));
const WebsiteScannerDetailPage = lazy(() =>
  import("./pages/WebsiteScannerDetailPage").then((m) => ({ default: m.WebsiteScannerDetailPage })),
);
const AnalyticsDashboardPage = lazy(() =>
  import("./pages/AnalyticsDashboardPage").then((m) => ({ default: m.AnalyticsDashboardPage })),
);
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const BlogPost = lazy(() => import("./pages/blog/BlogPost"));
const RoadmapView = lazy(() => import("./pages/roadmap/RoadmapView"));
const SignInPage = lazy(() =>
  import("./pages/SignInPage").then((m) => ({ default: m.SignInPage })),
);
const StartPage = lazy(() => import("./pages/StartPage"));
const PrivacyPolicyPage = lazy(() =>
  import("./pages/legal/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsOfServicePage = lazy(() =>
  import("./pages/legal/TermsOfServicePage").then((m) => ({ default: m.TermsOfServicePage })),
);
const InvestorDetailPage = lazy(() => import("./pages/InvestorDetailPage"));

function AppShell() {
  return (
    <AppLayout>
      <RequireSession>
        <Outlet />
      </RequireSession>
    </AppLayout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/** Retired Playbook & Guides feed — war room lives in Room. */
function LegacyPlaybookFeedRedirect() {
  return <Navigate to="/room?mode=war-room" replace />
}

function OpportunitySlugRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  return <Navigate to={`/o/${encodeURIComponent(slug)}`} replace />
}

function LegacyLoginRedirect() {
  const [searchParams] = useSearchParams()
  const { user, isLoading, profileLoading, isAdmin, profile } = useAuth()
  const next = searchParams.get('next') || searchParams.get('redirect')

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (user) {
    return (
      <Navigate
        to={resolvePostLoginPath(`?${searchParams.toString()}`, next, {
          isAdmin,
          onboarding: profile?.onboarding,
        })}
        replace
      />
    )
  }

  return <Navigate to={landingSignInTo(next)} replace />
}

/** AppLayout scrolls `#app-main-scroll`, not the window; reset both when the route changes unless a hash is present. */
function ScrollAppMainToTopOnNavigate() {
  const { pathname, search, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    const main = document.getElementById('app-main-scroll')
    if (main) main.scrollTop = 0
    window.scrollTo(0, 0)
  }, [pathname, search, hash])
  return null
}

const AppInner = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const isPublicMarketingSurface = isPublicMarketingPath(location.pathname)

  const pendingAuthCallback = hasPendingAuthCallback(location.hash, location.search)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (pendingAuthCallback && location.pathname !== AUTH_CALLBACK_PATH) {
    return (
      <Navigate
        to={{ pathname: AUTH_CALLBACK_PATH, search: location.search, hash: location.hash }}
        replace
      />
    )
  }

  if (!user && !isAuthExemptPath(location.pathname)) {
    const returnPath = authReturnPath(location.pathname, location.search)
    return (
      <Navigate
        to={signInRedirectTarget(returnPath)}
        replace
        state={returnPath !== '/' ? { from: returnPath } : undefined}
      />
    )
  }

  return (
    <>
      <AuthCallbackRedirect />
      <WarRoomThemeSync />
      <ScrollAppMainToTopOnNavigate />
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          </div>
        }
      >
      <Routes>
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<SignInPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route element={<AppShell />}>
            <Route path="/room" element={<RoomPage />} />
            <Route
              path="/room/research/clarify"
              element={
                <ProtectedRoute>
                  <ResearchClarifyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/war-room/clarify"
              element={
                <ProtectedRoute requiredFeature="warroom_unlocked">
                  <WarRoomClarifyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/roadmap/clarify"
              element={
                <ProtectedRoute requiredFeature="roadmap_unlocked">
                  <RoadmapClarifyPage />
                </ProtectedRoute>
              }
            />
            <Route path="/opportunities" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/my-research" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/my-opportunities" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/my-market-test" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/opportunities/:slug" element={<OpportunitySlugRedirect />} />
            <Route path="/o/:slug" element={<OpportunityDetailPage />} />
            <Route path="/my-opportunities/:slug" element={<UserOpportunityDetailPage />} />
            <Route
              path="/my-research/:slug"
              element={
                <ProtectedRoute>
                  <UserResearchDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/market-test/new"
              element={
                <ProtectedRoute>
                  <MarketTestNewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/market-test/:id"
              element={
                <ProtectedRoute>
                  <MarketTestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LegacyLoginRedirect />} />
            <Route path="/sign-up" element={<LegacyLoginRedirect />} />
            <Route path="/research" element={<LegacyDiscoverHeroRedirect />} />
            <Route
              path="/sourcing/search/:searchId/product"
              element={
                <ProtectedRoute>
                  <SourcingProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sourcing/search/:searchId"
              element={
                <ProtectedRoute>
                  <SourcingSearchResultsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/sourcing" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/itchmyback" element={<LegacyDiscoverHeroRedirect />} />
            <Route path="/war-room" element={<LegacyDiscoverHeroRedirect />} />
            <Route
              path="/playbook/:playbookId"
              element={
                <ProtectedRoute requiredFeature="warroom_unlocked">
                  <WarRoomPlaybookDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/playbook" element={<LegacyPlaybookFeedRedirect />} />
            <Route path="/opportunity/:slug" element={<OpportunitySlugRedirect />} />
            <Route path="/website-scanner" element={<Navigate to={roomPathForMode('scanner')} replace />} />
            <Route
              path="/dashboard"
              element={<Navigate to={roomPathForMode('scanner')} replace />}
            />
            <Route
              path="/dashboard/:scanId"
              element={<LegacyDashboardScanRedirect />}
            />
            <Route
              path="/scan/:scanId"
              element={
                <ProtectedRoute>
                  <WebsiteScannerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/analytics" element={
              <ProtectedRoute requireAdmin>
                <AnalyticsDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/referrals" element={
              <ProtectedRoute>
                <ReferralsPage />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/investors" element={<Navigate to="/room?mode=search&browse=investors" replace />} />
            <Route path="/investors/:slug" element={
              <ProtectedRoute>
                <InvestorDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/roadmap" element={<Navigate to="/room?mode=roadmap" replace />} />
            <Route
              path="/roadmap/:id"
              element={
                <ProtectedRoute requiredFeature="roadmap_unlocked">
                  <RoadmapView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/analytics" replace />} />
              <Route path="opportunities" element={<AdminOpportunitiesHubPage />} />
              <Route path="opportunities/new" element={<AdminOpportunityEditor />} />
              <Route path="opportunities/:id" element={<AdminOpportunityEditor />} />
              <Route path="categories" element={<Navigate to="/admin/opportunities?tab=categories" replace />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="credits" element={<Navigate to="/admin/users?tab=credits" replace />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="research" element={<AdminResearchAnalyticsPage />} />
              <Route path="warroom" element={<AdminWarRoomAnalyticsPage />} />
              <Route path="roadmap" element={<AdminRoadmapAnalyticsPage />} />
              <Route path="sourcing" element={<AdminSourcingAnalyticsPage />} />
              <Route path="markettest" element={<AdminMarketTestAnalyticsPage />} />
              <Route path="itch" element={<AdminItchAnalyticsPage />} />
              <Route path="analytics/war-room" element={<Navigate to="/admin/warroom" replace />} />
              <Route path="analytics/research" element={<Navigate to="/admin/research" replace />} />
              <Route path="analytics/roadmap" element={<Navigate to="/admin/roadmap" replace />} />
              <Route path="analytics/itchmyback" element={<Navigate to="/admin/itch" replace />} />
              <Route path="analytics/sourcing" element={<Navigate to="/admin/sourcing" replace />} />
              <Route path="analytics/market-test" element={<Navigate to="/admin/markettest" replace />} />
              <Route path="pricing" element={<Navigate to="/admin/settings" replace />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="promo" element={<AdminPromoPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      {user ? <SubscriptionPricingDialog /> : null}
      {user ? <ProfileDialog /> : null}
    </>
  );
};

const App = () => {
  // Capture ref param from shared URLs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) sessionStorage.setItem('powerproof_ref', ref)
  }, [])

  return (
    <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <TooltipProvider>
            <Sonner />
            <PwaPrompts />
            <BrowserRouter>
              <AnalyticsScripts />
              <InAppBrowserBanner />
              <LayoutGroup id="powerproof-command-composer-group">
                <NavbarTrailProvider>
                  <AuthProvider>
                    <PreferredAiModelProvider>
                      <AppDataProvider>
                        <ActiveWorkspaceProvider>
                          <AppInner />
                        </ActiveWorkspaceProvider>
                      </AppDataProvider>
                    </PreferredAiModelProvider>
                  </AuthProvider>
                </NavbarTrailProvider>
              </LayoutGroup>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
    </AppErrorBoundary>
  )
};

export default App;

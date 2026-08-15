import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, LifeBuoy, MessageSquare, RefreshCw } from '@/lib/icons'
import { AppChromeProfileMenu } from '@/components/layout/AppChromeProfileMenu'
import { AppMobileMenuButton } from '@/components/layout/AppMobileMenuButton'
import { useAppChromeHeaderOptional, type RoomAdminPreviewVariant } from '@/contexts/AppChromeHeaderContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAppPageBackFallback,
  isInvestorDetailPath,
  isOpportunityDetailPath,
  resolveAppPageBackHref,
  shouldShowAppPageBack,
} from '@/lib/appPageBack'
import { isScannerDetailPath } from '@/lib/sidebarWorkspaceNav'
import { getClarifyPageBackHref, getClarifyPageBackLabel, isClarifyPath } from '@/lib/clarifyNavPath'
import {
  getRoomWorkspaceBackFallback,
  getRoomWorkspaceBackLabel,
  resolveRoomWorkspaceBackHref,
  shouldShowRoomWorkspacePageHeader,
} from '@/lib/roomWorkspaceHeader'
import { isOnboardingOpportunityReadySearch } from '@/hooks/useOnboardingOpportunityTypewriterReveal'
import { ASK_AI_UI_ENABLED, requestAskAiOpen } from '@/lib/askAiPanelEvents'
import { landingSignInTo } from '@/lib/authLanding'
import { SIGN_UP_CTA } from '@/lib/copy'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

function isRoomDiscoverPath(pathname: string): boolean {
  return pathname === '/room' || pathname === '/dashboard'
}

const backButtonClass = cn(
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5',
  'font-sans text-[13px] font-semibold text-muted-foreground transition-colors',
  'hover:bg-muted/50 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'max-sm:[&_span]:hidden',
)

const titleClass = cn(
  /* !text overrides #app-main-scroll h1 sizing on mobile */
  'min-w-0 truncate font-display font-medium !text-[12px] !leading-tight tracking-tight text-foreground',
  'sm:!text-[17px] sm:!leading-snug',
)

const primaryBadgeClass = cn(
  'inline-flex shrink-0 items-center rounded-md border border-primary/25 bg-primary/10',
  'px-2 py-0.5 font-sans text-[11px] font-semibold text-primary',
)

const ghostBadgeClass = cn(
  'min-w-0 truncate font-sans text-[12px] font-medium text-muted-foreground',
)

const regenerateButtonClass = cn(
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border-subtle px-2.5',
  'font-sans text-[12px] font-semibold text-muted-foreground transition-colors',
  'hover:border-primary/35 hover:bg-muted/40 hover:text-foreground',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
)

function defaultTitleFromPath(pathname: string): string | null {
  if (pathname === '/room') return 'Discover'
  if (pathname.startsWith('/my-research/')) return 'Research'
  if (pathname.startsWith('/my-opportunities/')) return 'Research'
  if (pathname.startsWith('/market-test/')) return 'Market Test'
  if (/^\/playbook\/[^/]+$/.test(pathname)) return 'War Room'
  if (/^\/roadmap\/[^/]+$/.test(pathname)) return 'Roadmap'
  if (isInvestorDetailPath(pathname)) return 'Investor'
  if (pathname.startsWith('/opportunity/') || /^\/opportunities\/[^/]+$/.test(pathname) || /^\/o\/[^/]+$/.test(pathname)) {
    return 'Opportunity'
  }
  if (pathname.startsWith('/workspace/')) return 'Workspace'
  if (isClarifyPath(pathname)) return 'Clarify'
  if (pathname.startsWith('/profile')) return 'Profile'
  if (pathname === '/referrals') return 'Referrals'
  if (pathname === '/website-scanner' || pathname === '/dashboard') return 'Scanner'
  if (/^\/scan\/[^/]+$/.test(pathname) || /^\/dashboard\/[^/]+$/.test(pathname)) return 'Scan report'
  return null
}

export function isAccountChromePath(pathname: string): boolean {
  return pathname.startsWith('/profile') || pathname === '/referrals'
}

export function shouldShowAppChromeHeader(pathname: string): boolean {
  if (pathname === '/room') return true
  if (pathname === '/dashboard') return true
  if (shouldShowRoomWorkspacePageHeader(pathname)) return true
  if (shouldShowAppPageBack(pathname)) return true
  if (isClarifyPath(pathname)) return true
  if (isOpportunityDetailPath(pathname)) return true
  if (isScannerDetailPath(pathname)) return true
  if (isInvestorDetailPath(pathname)) return true
  if (isAccountChromePath(pathname)) return true
  return false
}

type AppChromeHeaderProps = {
  className?: string
  /** Clarify header is mobile-only (desktop uses section rail). */
  mobileOnly?: boolean
  /** Hide on small screens (rare; prefer mobile menu in the header itself). */
  desktopOnly?: boolean
}

export function AppChromeHeader({ className, mobileOnly, desktopOnly }: AppChromeHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const chrome = useAppChromeHeaderOptional()
  const { isAdmin, user } = useAuth()

  const isClarify = isClarifyPath(location.pathname)
  const isRoomDiscover = isRoomDiscoverPath(location.pathname)
  const isRoomWorkspace = shouldShowRoomWorkspacePageHeader(location.pathname)
  const isAccountPage = isAccountChromePath(location.pathname)
  const isOpportunityDetail =
    /^\/o\/[^/]+$/.test(location.pathname) ||
    location.pathname.startsWith('/opportunity/') ||
    /^\/opportunities\/[^/]+$/.test(location.pathname) ||
    location.pathname.startsWith('/my-research/') ||
    location.pathname.startsWith('/my-opportunities/')
  /** Admin-only: preview how PRO-locked opportunity sections look. Never shown to non-admins. */
  const showLockPreviewToggle = Boolean(isAdmin && isOpportunityDetail && chrome)
  /** Admin-only: preview free / empty room states. */
  const showRoomPreviewToggle = Boolean(isAdmin && isRoomDiscover && chrome)

  const title = chrome?.title ?? defaultTitleFromPath(location.pathname)
  const badges = chrome?.badges ?? null
  const endActions = chrome?.endActions ?? null
  const tabs = chrome?.tabs ?? null
  const regenerate = chrome?.regenerate ?? null
  const previewProLocked = chrome?.previewProLocked ?? false
  const previewRoomVariant = chrome?.previewRoomVariant ?? 'off'

  useEffect(() => {
    if (showLockPreviewToggle) return
    if (!chrome?.previewProLocked) return
    chrome.setPreviewProLocked(false)
  }, [chrome, showLockPreviewToggle])

  useEffect(() => {
    if (showRoomPreviewToggle) return
    if (!chrome || chrome.previewRoomVariant === 'off') return
    chrome.setPreviewRoomVariant('off')
  }, [chrome, showRoomPreviewToggle])

  const cycleRoomPreview = () => {
    const order: RoomAdminPreviewVariant[] = ['off', 'free', 'nil']
    const idx = order.indexOf(previewRoomVariant)
    const next = order[(idx + 1) % order.length] ?? 'off'
    chrome?.setPreviewRoomVariant(next)
  }

  const roomPreviewLabel =
    previewRoomVariant === 'free' ? 'Free' : previewRoomVariant === 'nil' ? 'Nil' : 'Off'

  const backLabel = isClarify
    ? getClarifyPageBackLabel(location.pathname)
    : isRoomWorkspace
      ? getRoomWorkspaceBackLabel(location.pathname)
      : 'Back'

  const hideBack =
    isRoomDiscover ||
    isOnboardingOpportunityReadySearch(location.search) ||
    isAccountPage
  const showBack = !hideBack
  const primaryBadge = badges?.primary?.trim() || null
  const ghostBadge = badges?.ghost?.trim() || null
  const displayTitle = isRoomDiscover ? null : title?.trim() || null
  const hasTitleMeta = Boolean(displayTitle || primaryBadge || ghostBadge)
  const showSeparator = showBack && hasTitleMeta

  const handleBack = () => {
    if (isClarify) {
      navigate(getClarifyPageBackHref(location.pathname))
      return
    }
    if (isRoomWorkspace) {
      navigate(
        resolveRoomWorkspaceBackHref(location.pathname, location.state) ||
          getRoomWorkspaceBackFallback(location.pathname),
      )
      return
    }
    navigate(resolveAppPageBackHref(location.pathname, location.state) || getAppPageBackFallback(location.pathname))
  }

  const renderBadges = () =>
    primaryBadge || ghostBadge ? (
      <>
        {primaryBadge ? <span className={primaryBadgeClass}>{primaryBadge}</span> : null}
        {primaryBadge && ghostBadge ? (
          <span className="shrink-0 text-[12px] text-muted-foreground/60" aria-hidden>
            ·
          </span>
        ) : null}
        {ghostBadge ? <span className={ghostBadgeClass}>{ghostBadge}</span> : null}
      </>
    ) : null

  return (
    <header
      data-app-chrome-header
      className={cn(
        'sticky top-0 z-[126] w-full min-w-0 shrink-0 overflow-x-clip border-b border-border-subtle/60 bg-background',
        mobileOnly && 'sm:hidden',
        desktopOnly && 'hidden layout-sm:block',
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col">
        <div className="flex h-12 w-full min-w-0 items-center gap-2 px-2 layout-sm:px-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {isAccountPage || isRoomDiscover ? (
              <AppMobileMenuButton inline className="layout-sm:hidden" />
            ) : hideBack ? (
              <span className="inline-flex h-8 w-8 shrink-0" aria-hidden />
            ) : (
              <button type="button" onClick={handleBack} className={backButtonClass} aria-label={backLabel}>
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span>{backLabel}</span>
              </button>
            )}
            {showSeparator ? (
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {displayTitle ? (
              <h1 className={titleClass} title={displayTitle} data-app-chrome-title>
                {displayTitle}
              </h1>
            ) : null}
            <div className="hidden min-w-0 items-center gap-2 overflow-hidden sm:flex">
              {renderBadges()}
            </div>
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
            {!user ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-8 shrink-0 rounded-md text-[12px]"
                onClick={() =>
                  navigate(landingSignInTo(`${location.pathname}${location.search}`))
                }
              >
                {SIGN_UP_CTA}
              </Button>
            ) : null}
            {showLockPreviewToggle ? (
              <label
                className="hidden items-center gap-2 sm:inline-flex"
                title="Preview how PRO-locked sections appear"
              >
                <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Locked
                </span>
                <Switch
                  checked={previewProLocked}
                  onCheckedChange={(checked) => chrome?.setPreviewProLocked(Boolean(checked))}
                  aria-label="Preview locked opportunity sections"
                />
              </label>
            ) : null}
            {showRoomPreviewToggle ? (
              <button
                type="button"
                className="hidden items-center gap-2 rounded-md border border-border-subtle px-2.5 py-1 sm:inline-flex"
                title="Cycle room preview: Off → Free (fresh user) → Nil (no data)"
                onClick={cycleRoomPreview}
                aria-label={`Room preview: ${roomPreviewLabel}. Click to cycle.`}
              >
                <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview
                </span>
                <span
                  className={cn(
                    'font-sans text-[11px] font-semibold',
                    previewRoomVariant === 'off'
                      ? 'text-muted-foreground'
                      : previewRoomVariant === 'free'
                        ? 'text-foreground'
                        : 'text-primary',
                  )}
                >
                  {roomPreviewLabel}
                </span>
              </button>
            ) : null}
            {endActions}
            {ASK_AI_UI_ENABLED && user && chrome?.askAiAvailable ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                data-tour="ask-ai-chrome"
                className="h-8 shrink-0 rounded-md border-primary bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                onClick={() => requestAskAiOpen({ presentation: 'sidebar' })}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                Ask AI
              </Button>
            ) : null}
            {user ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 shrink-0 rounded-md text-[12px] font-semibold"
                onClick={() => {
                  window.location.href = 'mailto:support@powerproof.live'
                }}
              >
                <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                Support
              </Button>
            ) : null}
            <AppChromeProfileMenu />
            {regenerate ? (
              <button
                type="button"
                className={regenerateButtonClass}
                onClick={regenerate.onClick}
                disabled={regenerate.disabled || regenerate.loading}
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', regenerate.loading && 'animate-spin')}
                  aria-hidden
                />
                <span className="hidden sm:inline">
                  {regenerate.loading ? 'Regenerating…' : 'Regenerate'}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        {primaryBadge || ghostBadge ? (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden px-2 pb-2 sm:hidden layout-sm:px-3">
            {renderBadges()}
          </div>
        ) : null}
      </div>

      {tabs ? <div className="w-full min-w-0 border-t border-border-subtle/50 bg-white">{tabs}</div> : null}
    </header>
  )
}

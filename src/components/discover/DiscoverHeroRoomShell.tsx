import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { UsageBadge } from '@/components/billing/UsageBadge'
import { DiscoverHeroBoxStack } from '@/components/discover/DiscoverHeroBox'
import { discoverHeroContentWidthShellClassName } from '@/components/discover/discoverHeroTokens'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  browseViewFromSearch,
  discoverHeroModeFromLocation,
  type DiscoverHeroTab,
} from '@/lib/discoverHeroRoutes'
import { BookMarked, Compass } from '@/lib/icons'
import { SIDEBAR_WORKSPACE_NAV } from '@/lib/sidebarWorkspaceNav'
import { cn } from '@/lib/utils'

/* ─── Mobile room layout (< md) ───────────────────────────────────────────
 *
 *  mobileRoomLayoutClassName
 *    └─ mobileRoomHeroViewportClassName   ← full viewport band, input centered
 *         └─ mobileRoomHeroContentClassName ← title + HeroInput
 *    └─ mobileRoomResultsScrollClassName    ← scrollable chips + tables/cards
 *         └─ mobileRoomResultsClassName
 */

/** Mobile-only column — fills the room page below the app header. */
export const mobileRoomLayoutClassName = cn(
  'flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background md:hidden',
)

/**
 * Viewport band for the hero input — at least one screen tall (minus top bar +
 * bottom nav), with title + HeroInput vertically centered.
 */
export const mobileRoomHeroViewportClassName = cn(
  'flex w-full min-w-0 shrink-0 flex-col items-center justify-center',
  'min-h-[calc(100dvh-var(--discover-hero-mobile-inset)-4.5rem-env(safe-area-inset-bottom,0px))]',
  'px-4 py-8',
)

/** Title + HeroInput stack — centered, capped width. */
export const mobileRoomHeroContentClassName = cn(
  'flex w-full min-w-0 max-w-[min(100%,36rem)] flex-col items-center gap-4 text-center',
)

/** Scrollable area below the hero viewport (idea chips, trending table, research list, …). */
export const mobileRoomResultsScrollClassName = cn(
  'relative flex w-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-4',
  '[touch-action:pan-y]',
)

/** Inner wrapper for workspace sections inside the results scroll area. */
export const mobileRoomResultsClassName = 'w-full shrink-0'

/* ─── Desktop room layout (≥ md) ────────────────────────────────────────── */

/** Desktop hero column — title + composer + optional chips, centered. */
const desktopRoomHeroSectionClassName = cn(
  'flex w-full min-w-0 shrink-0 flex-col items-center justify-start',
  discoverHeroContentWidthShellClassName,
  'gap-3 md:gap-3.5 pb-0 pt-6 md:pt-8',
)

/** Max width for the desktop title + HeroInput block. */
const desktopRoomHeroWidthClassName = 'mx-auto w-full max-w-[min(100%,36rem)]'

/* ─── Room chrome title ──────────────────────────────────────────────────── */

export const ROOM_CHROME_TITLE: Record<DiscoverHeroTab, string> = {
  search: 'Discover',
  research: 'Research',
  'war-room': 'War Room',
  sourcing: 'Sourcing',
  roadmap: 'Roadmap',
  'market-test': 'Market Test',
  scanner: 'Scanner',
}

export function roomChromeTitleFromLocation(pathname: string, search: string): string {
  const mode = discoverHeroModeFromLocation(pathname, search)
  if (mode === 'search' && browseViewFromSearch(search) === 'investors') return 'Library'
  return ROOM_CHROME_TITLE[mode] ?? 'Discover'
}

function roomChromeIconFromLocation(pathname: string, search: string): ReactNode {
  const mode = discoverHeroModeFromLocation(pathname, search)
  if (mode === 'search' && browseViewFromSearch(search) === 'investors') {
    return <BookMarked className="h-full w-full" aria-hidden />
  }
  if (mode === 'search') {
    return <Compass className="h-full w-full" aria-hidden />
  }
  const nav = SIDEBAR_WORKSPACE_NAV.find((item) => item.id === mode)
  if (nav) {
    const Icon = nav.icon
    return <Icon className="h-full w-full" aria-hidden />
  }
  return <Compass className="h-full w-full" aria-hidden />
}

/** Registers AppChromeHeader usage for `/room` (title lives above the input). */
export function useRoomDiscoverChrome() {
  const { user } = useAuth()
  const location = useLocation()
  const title = roomChromeTitleFromLocation(location.pathname, location.search)
  const icon = useMemo(
    () => roomChromeIconFromLocation(location.pathname, location.search),
    [location.pathname, location.search],
  )
  const endActions = useMemo(
    () => (user?.id ? <UsageBadge className="w-auto" /> : null),
    [user?.id],
  )
  useRegisterAppChromeHeader({ title: null, icon, endActions })
  return title
}

const roomHeroTitleClassName = cn(
  'w-full min-w-0 text-center font-display font-semibold tracking-tight text-foreground',
  'text-2xl leading-tight md:text-3xl',
)

/* ─── Room input shell ───────────────────────────────────────────────────── */

type DiscoverHeroRoomInputShellProps = {
  composer: ReactNode
  workspace: ReactNode
  chipsSlot?: ReactNode
  chipsVisible?: boolean
  workspaceVisible?: boolean
  workspaceStackClassName?: string
  /** Sidebar-equivalent tools rendered above the composer. */
  toolsAboveComposer?: ReactNode
  /** Centered page title above the composer. Defaults to the room mode title. */
  title?: string | null
}

/**
 * Room hero — title + composer centered, idea chips in their own card, then workspace.
 * Mobile: hero input sits in a viewport-height band (centered); results scroll below.
 */
export function DiscoverHeroRoomInputShell({
  composer,
  workspace,
  chipsSlot,
  chipsVisible = false,
  workspaceVisible = true,
  workspaceStackClassName,
  toolsAboveComposer,
  title,
}: DiscoverHeroRoomInputShellProps) {
  const location = useLocation()
  const resolvedTitle =
    title?.trim() || roomChromeTitleFromLocation(location.pathname, location.search)

  const chipsBlock =
    chipsSlot && chipsVisible ? (
      chipsSlot
    ) : chipsSlot ? (
      <div className="hidden" aria-hidden>
        {chipsSlot}
      </div>
    ) : null

  const workspaceStack = (
    <div className={cn(!workspaceVisible && 'hidden')} aria-hidden={workspaceVisible ? undefined : true}>
      <DiscoverHeroBoxStack className={workspaceStackClassName}>{workspace}</DiscoverHeroBoxStack>
    </div>
  )

  const heading = (
    <h2 className={roomHeroTitleClassName}>{resolvedTitle}</h2>
  )

  const composerCluster = (
    <>
      {heading}
      {toolsAboveComposer}
      {composer}
    </>
  )

  return (
    <>
      {/* Mobile: centered hero viewport, then scrollable results. */}
      <div className={mobileRoomLayoutClassName}>
        <div className={mobileRoomHeroViewportClassName}>
          <div className={mobileRoomHeroContentClassName}>{composerCluster}</div>
        </div>
        <div className={mobileRoomResultsScrollClassName}>
          {chipsBlock}
          <div className={mobileRoomResultsClassName}>{workspaceStack}</div>
        </div>
      </div>
      {/* Desktop: title → tools → composer → idea chips card → workspace. */}
      <div className="max-md:hidden w-full min-w-0">
        <div className={desktopRoomHeroSectionClassName}>
          <div
            className={cn(
              desktopRoomHeroWidthClassName,
              'flex flex-col items-center gap-3 text-center',
            )}
          >
            {composerCluster}
          </div>
          {chipsBlock ? (
            <div className={desktopRoomHeroWidthClassName}>{chipsBlock}</div>
          ) : null}
        </div>
        {workspaceStack}
      </div>
    </>
  )
}

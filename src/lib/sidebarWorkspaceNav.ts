import type { RemixIcon } from '@/lib/icons'
import { BookOpen, Crosshair, Store2Line, SeoLine, Scan2Line, SearchAiLine, Waypoints } from '@/lib/icons'
import type { DiscoverHeroTab } from '@/lib/discoverHeroRoutes'
import {
  browseViewFromSearch,
  discoverHeroModeFromLocation,
  isRoomDashboardPath,
  roomPathForBrowse,
  roomPathForMode,
} from '@/lib/discoverHeroRoutes'

/** Website scanner — Room home / post-login dashboard. */
export const SCANNER_DASHBOARD_PATH = roomPathForMode('scanner')

/** Dedicated scan report detail (same role as `/my-research/:slug`). */
export const SCANNER_DETAIL_BASE_PATH = '/scan'

export function scanDetailPath(scanId: string): string {
  return `${SCANNER_DETAIL_BASE_PATH}/${encodeURIComponent(scanId)}`
}

export function isScannerDetailPath(pathname: string): boolean {
  return (
    /^\/scan\/[^/]+$/.test(pathname) ||
    /^\/dashboard\/[^/]+$/.test(pathname)
  )
}

export type SidebarWorkspaceNavId =
  | 'scanner'
  | 'research'
  | 'market-test'
  | 'war-room'
  | 'sourcing'
  | 'investors'
  | 'roadmap'

export type SidebarWorkspaceNavItem = {
  id: SidebarWorkspaceNavId
  label: string
  /** Canonical path shown on hover, e.g. `/research`. */
  pathExtension: string
  icon: RemixIcon
  href: string
}

/** Room workspace tools nested under the sidebar "Room" group. */
export const SIDEBAR_ROOM_NAV_IDS = [
  'scanner',
  'research',
  'roadmap',
  'market-test',
  'war-room',
  'sourcing',
] as const satisfies readonly SidebarWorkspaceNavId[]

export type RoomComposerMode = (typeof SIDEBAR_ROOM_NAV_IDS)[number]

/** Browse modes kept outside the Room nest (compact hero layout). */
export const SIDEBAR_DISCOVER_NAV_IDS: SidebarWorkspaceNavId[] = ['investors']

/** Hero tabs moved into the app sidebar — hidden from the desktop tab bar. */
export const DISCOVER_HERO_SIDEBAR_TAB_VALUES = new Set<DiscoverHeroTab>([
  'scanner',
  'research',
  'war-room',
  'market-test',
  'sourcing',
  'search',
  'roadmap',
])

/** Primary destinations pinned to the mobile bottom bar. */
export const MOBILE_BOTTOM_NAV_IDS: SidebarWorkspaceNavId[] = ['research', 'market-test', 'sourcing']

/** Nav destinations gated by the caller's subscription feature locks. */
export const PAID_UNLOCK_NAV_IDS = new Set<SidebarWorkspaceNavId>(['roadmap', 'war-room'])

/**
 * Permanently hidden from sidebar + room composer lists.
 * Deep links / in-product flows still work; we just stop promoting these.
 */
export const SIDEBAR_RETIRED_NAV_IDS = new Set<SidebarWorkspaceNavId>(['roadmap', 'war-room'])

/** Temporarily admin-only workspace tools (hidden from non-admin nav). */
export const ADMIN_ONLY_NAV_IDS = new Set<SidebarWorkspaceNavId>()

/** @deprecated Prefer `PAID_UNLOCK_NAV_IDS` — same set. */
export const SIDEBAR_HIDDEN_NAV_IDS = PAID_UNLOCK_NAV_IDS

export const SIDEBAR_WORKSPACE_NAV: SidebarWorkspaceNavItem[] = [
  {
    id: 'scanner',
    label: 'Scan any Site',
    pathExtension: '/room',
    icon: Scan2Line,
    href: SCANNER_DASHBOARD_PATH,
  },
  {
    id: 'research',
    label: 'Research',
    pathExtension: '/research',
    icon: SeoLine,
    href: roomPathForMode('research'),
  },
  {
    id: 'market-test',
    label: 'Test the Market',
    pathExtension: '/my-market-test',
    icon: Store2Line,
    href: roomPathForMode('market-test'),
  },
  {
    id: 'sourcing',
    label: 'Find Products',
    pathExtension: '/sourcing',
    icon: SearchAiLine,
    href: roomPathForMode('sourcing'),
  },
  {
    id: 'investors',
    label: 'Library',
    pathExtension: '/investors',
    icon: BookOpen,
    href: roomPathForBrowse('investors'),
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    pathExtension: '/roadmap',
    icon: Waypoints,
    href: roomPathForMode('roadmap'),
  },
  {
    id: 'war-room',
    label: 'War Room',
    pathExtension: '/war-room',
    icon: Crosshair,
    href: roomPathForMode('war-room'),
  },
]

export type WorkspaceFeatureAccess = {
  roadmapUnlocked?: boolean
  warroomUnlocked?: boolean
  /** Legacy purchase UI compatibility only; no longer grants feature access. */
  lifetimePurchased?: number | null
  isAdmin?: boolean
}

export function hasPaidWorkspaceToolsUnlocked(opts: WorkspaceFeatureAccess): boolean {
  if (opts.isAdmin) return true
  return opts.roadmapUnlocked === true && opts.warroomUnlocked === true
}

export function isWorkspaceToolUnlocked(
  id: SidebarWorkspaceNavId,
  opts: WorkspaceFeatureAccess,
): boolean {
  if (opts.isAdmin) return true
  if (ADMIN_ONLY_NAV_IDS.has(id)) return false
  if (id === 'roadmap') return opts.roadmapUnlocked === true
  if (id === 'war-room') return opts.warroomUnlocked === true
  return true
}

/** Sidebar-visible workspace links filtered by subscription feature access. */
export function sidebarPrimaryNavItems(opts: WorkspaceFeatureAccess): SidebarWorkspaceNavItem[] {
  return SIDEBAR_WORKSPACE_NAV.filter((item) => {
    if (SIDEBAR_RETIRED_NAV_IDS.has(item.id)) return false
    if (ADMIN_ONLY_NAV_IDS.has(item.id)) return opts.isAdmin === true
    if (!PAID_UNLOCK_NAV_IDS.has(item.id)) return true
    return isWorkspaceToolUnlocked(item.id, opts)
  })
}

export const SIDEBAR_ROOM_NAV = SIDEBAR_WORKSPACE_NAV.filter(
  (item) =>
    SIDEBAR_ROOM_NAV_IDS.includes(item.id) && !SIDEBAR_RETIRED_NAV_IDS.has(item.id),
)

/** Room composer modes filtered by subscription feature access. */
export function sidebarRoomNavItems(opts: WorkspaceFeatureAccess): SidebarWorkspaceNavItem[] {
  return SIDEBAR_ROOM_NAV.filter((item) => {
    if (SIDEBAR_RETIRED_NAV_IDS.has(item.id)) return false
    if (ADMIN_ONLY_NAV_IDS.has(item.id)) return opts.isAdmin === true
    if (!PAID_UNLOCK_NAV_IDS.has(item.id)) return true
    return isWorkspaceToolUnlocked(item.id, opts)
  })
}

/** Sidebar-visible workspace links without paid unlocks (static / unpaid filter). */
export const SIDEBAR_PRIMARY_NAV = SIDEBAR_WORKSPACE_NAV.filter(
  (item) => !PAID_UNLOCK_NAV_IDS.has(item.id) && !SIDEBAR_RETIRED_NAV_IDS.has(item.id),
)

export const SIDEBAR_DISCOVER_NAV = SIDEBAR_WORKSPACE_NAV.filter((item) =>
  SIDEBAR_DISCOVER_NAV_IDS.includes(item.id),
)

export const MOBILE_BOTTOM_NAV = SIDEBAR_WORKSPACE_NAV.filter((item) =>
  MOBILE_BOTTOM_NAV_IDS.includes(item.id),
)

/** Room + discover links surfaced in the mobile menu sheet (not in the bottom bar). */
export const MOBILE_MENU_WORKSPACE_NAV = SIDEBAR_WORKSPACE_NAV.filter(
  (item) => !MOBILE_BOTTOM_NAV_IDS.includes(item.id),
)

export const MOBILE_MENU_ROOM_NAV = SIDEBAR_ROOM_NAV.filter(
  (item) => !MOBILE_BOTTOM_NAV_IDS.includes(item.id),
)

export const MOBILE_MENU_DISCOVER_NAV = SIDEBAR_DISCOVER_NAV

export function isSidebarWorkspaceNavActive(
  item: SidebarWorkspaceNavItem,
  pathname: string,
  search: string,
): boolean {
  if (item.id === 'scanner') {
    if (isScannerDetailPath(pathname) || pathname === '/dashboard') return true
    return (
      isRoomDashboardPath(pathname) &&
      discoverHeroModeFromLocation(pathname, search) === 'scanner'
    )
  }

  if (item.id === 'investors') {
    return (
      isRoomDashboardPath(pathname) &&
      discoverHeroModeFromLocation(pathname, search) === 'search' &&
      browseViewFromSearch(search) === 'investors'
    )
  }

  if (!isRoomDashboardPath(pathname)) return false

  const mode = discoverHeroModeFromLocation(pathname, search)

  switch (item.id) {
    case 'research':
      return mode === 'research'
    case 'market-test':
      return mode === 'market-test'
    case 'war-room':
      return mode === 'war-room'
    case 'sourcing':
      return mode === 'sourcing'
    case 'roadmap':
      return mode === 'roadmap'
    default:
      return false
  }
}

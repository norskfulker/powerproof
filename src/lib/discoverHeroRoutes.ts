export type DiscoverHeroTab =
  | 'search'
  | 'research'
  | 'war-room'
  | 'sourcing'
  | 'roadmap'
  | 'market-test'
  | 'scanner'

/** Unified discover dashboard — all hero modes live here. */
export const ROOM_ROUTE = '/room'

export const ROOM_MODE_PARAM = 'mode'

/** Browse sub-view when `mode=search` (opportunities vs investors). */
export const ROOM_BROWSE_PARAM = 'browse'

export type DiscoverBrowseView = 'opportunities' | 'investors'

/** @deprecated Legacy arsenal view param — stripped on canonical URLs. */
export const ARSENAL_VIEW_PARAM = 'view'

const HERO_MODES = new Set<DiscoverHeroTab>([
  'search',
  'research',
  'war-room',
  'sourcing',
  'roadmap',
  'market-test',
  'scanner',
])

/** Canonical URLs for discover hero tabs (query on `/room`). */
export const DISCOVER_HERO_TAB_ROUTES: Record<DiscoverHeroTab, string> = {
  search: `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=search`,
  research: `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=research`,
  'war-room': `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=war-room`,
  sourcing: `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=sourcing`,
  roadmap: `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=roadmap`,
  'market-test': `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=market-test`,
  scanner: `${ROOM_ROUTE}?${ROOM_MODE_PARAM}=scanner`,
}

export const WAR_ROOM_ROUTE = roomPathForMode('war-room')

export const RESEARCH_CLARIFY_ROUTE = `${ROOM_ROUTE}/research/clarify`
export const WAR_ROOM_CLARIFY_ROUTE = `${ROOM_ROUTE}/war-room/clarify`
export const ROADMAP_CLARIFY_ROUTE = `${ROOM_ROUTE}/roadmap/clarify`

export type ClarifyFlowKind = 'research' | 'war-room' | 'roadmap'

export const CLARIFY_FLOW_HOME: Record<ClarifyFlowKind, string> = {
  research: roomPathForMode('research'),
  'war-room': WAR_ROOM_ROUTE,
  roadmap: roomPathForMode('roadmap'),
}

export function roadmapDetailPath(id: string): string {
  return `/roadmap/${encodeURIComponent(id)}`
}

export function playbookDetailPath(id: string): string {
  return `/playbook/${encodeURIComponent(id)}`
}

export function isRoomDashboardPath(pathname: string): boolean {
  return pathname === ROOM_ROUTE || pathname === `${ROOM_ROUTE}/`
}

function parseModeFromSearch(search: string): DiscoverHeroTab | null {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const raw = sp.get(ROOM_MODE_PARAM)

  if (raw === 'arsenal') {
    const view = sp.get(ARSENAL_VIEW_PARAM)
    return view === 'playbook' ? 'war-room' : 'research'
  }
  if (raw === 'playbook') return 'war-room'
  if (raw === 'b2b') return 'search'
  if (raw && HERO_MODES.has(raw as DiscoverHeroTab)) return raw as DiscoverHeroTab
  return null
}

export function isLegacyArsenalModeParam(mode: string | null): mode is 'research' | 'playbook' | 'arsenal' {
  return mode === 'research' || mode === 'playbook' || mode === 'arsenal'
}

/** Legacy path → hero tab (pre-`/room` URLs and redirects). */
export function discoverHeroTabFromLegacyPath(pathname: string): DiscoverHeroTab {
  if (pathname.startsWith('/war-room') || pathname.startsWith('/playbook')) return 'war-room'
  if (pathname === '/research' || pathname.startsWith('/research/') || pathname.startsWith('/my-research')) {
    return 'research'
  }
  if (pathname === '/my-opportunities' || pathname.startsWith('/my-opportunities/')) {
    return 'research'
  }
  if (pathname === '/sourcing' || pathname.startsWith('/sourcing/')) return 'sourcing'
  if (pathname === '/itchmyback' || pathname.startsWith('/itchmyback/')) return 'search'
  if (pathname.startsWith('/b2b/sourcing')) return 'sourcing'
  if (pathname === '/roadmap' || pathname.startsWith('/roadmap/')) return 'roadmap'
  if (pathname.startsWith('/my-market-test')) return 'market-test'
  if (pathname === '/b2b' || pathname.startsWith('/b2b/')) return 'search'
  if (pathname === '/investors' || pathname === '/investors/') return 'search'
  if (pathname === '/dashboard' || pathname === '/website-scanner') return 'scanner'
  return 'search'
}

export function discoverHeroModeFromLocation(pathname: string, search: string): DiscoverHeroTab {
  if (isRoomDashboardPath(pathname)) {
    const parsed = parseModeFromSearch(search)
    if (!parsed) return 'scanner'
    return parsed
  }
  return discoverHeroTabFromLegacyPath(pathname)
}

export function roomPathForMode(mode: DiscoverHeroTab, base?: URLSearchParams): string {
  const sp = new URLSearchParams(base?.toString() ?? '')
  sp.delete(ARSENAL_VIEW_PARAM)
  sp.set(ROOM_MODE_PARAM, mode)
  if (mode !== 'search') sp.delete(ROOM_BROWSE_PARAM)
  return `${ROOM_ROUTE}?${sp.toString()}`
}

export function browseViewFromSearch(search: string): DiscoverBrowseView {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return sp.get(ROOM_BROWSE_PARAM) === 'investors' ? 'investors' : 'opportunities'
}

export function roomPathForBrowse(view: DiscoverBrowseView, base?: URLSearchParams): string {
  const sp = new URLSearchParams(base?.toString() ?? '')
  sp.delete(ARSENAL_VIEW_PARAM)
  sp.set(ROOM_MODE_PARAM, 'search')
  if (view === 'investors') {
    sp.set(ROOM_BROWSE_PARAM, 'investors')
  } else {
    sp.delete(ROOM_BROWSE_PARAM)
  }
  return `${ROOM_ROUTE}?${sp.toString()}`
}

/** Redirect legacy `/room?mode=arsenal&view=…` URLs to canonical mode params. */
export function legacyRoomDashboardRedirect(pathname: string, search: string): string | null {
  if (!isRoomDashboardPath(pathname)) return null

  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawMode = sp.get(ROOM_MODE_PARAM)

  if (rawMode === 'arsenal' || sp.has(ARSENAL_VIEW_PARAM)) {
    const mode = parseModeFromSearch(search) ?? 'scanner'
    return roomPathForMode(mode, sp)
  }
  if (rawMode === 'playbook') {
    return roomPathForMode('war-room', sp)
  }
  if (rawMode === 'b2b' || rawMode === 'itch') {
    return roomPathForMode('search', sp)
  }
  if (!rawMode) {
    return roomPathForMode('scanner', sp)
  }
  return null
}

export function isDiscoverHeroTabPath(pathname: string, search: string, tab: DiscoverHeroTab): boolean {
  if (isRoomDashboardPath(pathname)) {
    return discoverHeroModeFromLocation(pathname, search) === tab
  }
  return discoverHeroTabFromLegacyPath(pathname) === tab
}

export function legacyDiscoverPathToRoom(pathname: string, search: string): string {
  const mode = discoverHeroTabFromLegacyPath(pathname)
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (mode === 'research' || mode === 'war-room') {
    return roomPathForMode(mode, sp)
  }
  sp.set(ROOM_MODE_PARAM, mode)
  return `${ROOM_ROUTE}?${sp.toString()}`
}

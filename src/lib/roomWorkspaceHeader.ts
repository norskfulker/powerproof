import {
  getAppPageBackFallback,
  resolveAppPageBackHref,
} from '@/lib/appPageBack'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import { isScannerDetailPath } from '@/lib/sidebarWorkspaceNav'

export type RoomWorkspaceMode = 'research' | 'war-room' | 'market-test' | 'roadmap' | 'scanner'

const ROOM_WORKSPACE_BACK_LABEL: Record<RoomWorkspaceMode, string> = {
  research: 'Back to Research',
  'war-room': 'Back to War Room',
  'market-test': 'Back to Market Test',
  roadmap: 'Back to Roadmaps',
  scanner: 'Back to Scanner',
}

/** Detail routes opened from discover hero workspace modes (not room/clarify). */
export function roomWorkspaceModeFromPath(pathname: string): RoomWorkspaceMode | null {
  if (pathname.startsWith('/my-research/')) return 'research'
  if (/^\/playbook\/[^/]+$/.test(pathname)) return 'war-room'
  if (pathname.startsWith('/market-test/')) return 'market-test'
  if (/^\/roadmap\/[^/]+$/.test(pathname)) return 'roadmap'
  if (isScannerDetailPath(pathname)) return 'scanner'
  return null
}

export function shouldShowRoomWorkspacePageHeader(pathname: string): boolean {
  return roomWorkspaceModeFromPath(pathname) !== null
}

export function getRoomWorkspaceBackLabel(pathname: string): string {
  const mode = roomWorkspaceModeFromPath(pathname)
  return mode ? ROOM_WORKSPACE_BACK_LABEL[mode] : 'Back'
}

export function resolveRoomWorkspaceBackHref(pathname: string, state: unknown): string {
  return resolveAppPageBackHref(pathname, state)
}

export function getRoomWorkspaceBackFallback(pathname: string): string {
  const mode = roomWorkspaceModeFromPath(pathname)
  if (!mode) return getAppPageBackFallback(pathname)
  if (mode === 'scanner') return roomPathForMode('scanner')
  return roomPathForMode(mode)
}

/** Router state when navigating from the discover hero dashboard. */
export function discoverHeroNavState(pathname: string, search: string) {
  return { from: `${pathname}${search}` }
}

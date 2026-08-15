import type { AskAiStorageNamespace } from '@/lib/askAiStorage'

const SIDEBAR_COLLAPSED_KEY_PREFIX = 'nirm_ask_ai_sidebar_collapsed_'
const SIDEBAR_HALF_SCREEN_KEY_PREFIX = 'nirm_ask_ai_sidebar_half_screen_'

export const ASK_AI_SIDEBAR_WIDTH_PX = 360
export const ASK_AI_SIDEBAR_RAIL_PX = 52
/** Ask AI width when half-screen mode is active (right half of the workspace). */
export const ASK_AI_SIDEBAR_HALF_SCREEN_WIDTH = '50%'

function sidebarCollapsedKey(namespace: AskAiStorageNamespace, resourceId: string): string {
  return `${SIDEBAR_COLLAPSED_KEY_PREFIX}${namespace}_${resourceId}`
}

export function getStoredAskAiSidebarCollapsed(
  namespace: AskAiStorageNamespace,
  resourceId: string,
): boolean {
  try {
    return localStorage.getItem(sidebarCollapsedKey(namespace, resourceId)) === 'true'
  } catch {
    return false
  }
}

function sidebarHalfScreenKey(namespace: AskAiStorageNamespace, resourceId: string): string {
  return `${SIDEBAR_HALF_SCREEN_KEY_PREFIX}${namespace}_${resourceId}`
}

export function getStoredAskAiSidebarHalfScreen(
  namespace: AskAiStorageNamespace,
  resourceId: string,
): boolean {
  try {
    return localStorage.getItem(sidebarHalfScreenKey(namespace, resourceId)) === 'true'
  } catch {
    return false
  }
}

export function setStoredAskAiSidebarHalfScreen(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  halfScreen: boolean,
): void {
  try {
    localStorage.setItem(sidebarHalfScreenKey(namespace, resourceId), halfScreen ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

export function setStoredAskAiSidebarCollapsed(
  namespace: AskAiStorageNamespace,
  resourceId: string,
  collapsed: boolean,
): void {
  try {
    localStorage.setItem(sidebarCollapsedKey(namespace, resourceId), collapsed ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

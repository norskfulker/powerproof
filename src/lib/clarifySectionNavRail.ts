const CLARIFY_SECTION_NAV_RAIL_STORAGE_KEY = 'powerproof_clarify_section_nav_collapsed'

export function readClarifySectionNavRailCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(CLARIFY_SECTION_NAV_RAIL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeClarifySectionNavRailCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(CLARIFY_SECTION_NAV_RAIL_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

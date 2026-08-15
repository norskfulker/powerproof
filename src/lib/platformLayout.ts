/** Max content width for app chrome, page shells, and marketing sections. */
export const PLATFORM_MAX_WIDTH_PX = 1200

/**
 * Canonical horizontal padding — aligns with layout-sm (810) / layout-lg (1400).
 * Pair mobile-only rules with `max-layout-sm:` or `layout-sm:hidden`.
 */
export const appShellPadClass = ''

/** Horizontal inset for banners/tickers — matches `appShellPadClass`. */
export const appShellInsetXClass = appShellPadClass

/** Horizontal padding only — pairs with fixed-height chrome rows. */
export const appShellInsetXOnlyClass = 'px-3 layout-sm:px-3 layout-lg:px-4'

/** Sidebar logo block height: outer `py-2` + inner `h-8` row (= 48px). */
export const appSidebarLogoHeaderHeightClass = 'h-12'

/** Desktop expanded app sidebar width (Room + workspace nav). */
export const APP_SIDEBAR_EXPANDED_WIDTH_PX = 280

/** Desktop collapsed app sidebar rail width. */
export const APP_SIDEBAR_COLLAPSED_WIDTH_PX = 52

/** Mobile sidebar sheet max width. */
export const APP_SIDEBAR_MOBILE_MAX_WIDTH_PX = 300

/** Sticky top chrome row aligned to sidebar logo header height (no extra padding / decoration). */
export const appStickyChromeHeaderClass =
  'sticky top-0 z-[126] flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle/60 bg-background px-2 layout-sm:px-3'

/** Visible only below layout-sm (<810px). */
export const appMobileOnlyClass = 'layout-sm:hidden'

/** Hidden below layout-sm; shown as flex from 810px up. */
export const appDesktopOnlyClass = 'hidden layout-sm:flex'

/** Standard vertical section rhythm for dashboard-style pages. */
export const pageSectionYClass = 'py-5 layout-sm:py-8'

/** Page title typography ladder. */
export const pageTitleClass = 'text-xl layout-sm:text-2xl layout-lg:text-[28px]'

/** Admin stat grid: 2 → 3 → 6 columns at layout tiers. */
export const adminStatGridClass =
  'grid grid-cols-2 gap-3 layout-sm:grid-cols-3 layout-lg:grid-cols-6'

/** App shell: single 1200px column with horizontal padding. */
export const appShellContentClass = `mx-auto w-full min-w-0 max-w-platform overflow-x-visible ${appShellPadClass}`

/** Room workspace — same 1200px column as other app pages. */
export const appRoomShellClass = 'mx-auto w-full min-w-0 max-w-platform overflow-visible'

/**
 * Workspace embed frame (Room + dedicated pages inside AppLayout).
 * Chrome header + sidebar sit outside; only the page body is inset.
 */
export const appWorkspaceEmbedCanvasClass =
  'flex min-h-0 min-w-0 flex-1 flex-col bg-background'

/** Outer margin around the elevated workspace panel. */
export const appWorkspaceEmbedInsetClass =
  'flex min-h-0 min-w-0 flex-1 flex-col'

/** Elevated workspace panel — light border + soft depth shadow. */
export const appWorkspaceEmbedPanelClass = [
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
  'rounded-md border border-border-subtle/70 bg-background',
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.14)]',
].join(' ')

/** Centered column — marketing / admin / routes outside AppLayout. */
export const platformContainerClass = 'mx-auto w-full max-w-platform'

/** @deprecated Prefer `appShellContentClass` on AppLayout; use for marketing/admin only. */
export const platformContainerWithPaddingClass = appShellContentClass

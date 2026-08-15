import { cn } from '@/lib/utils';
import {
  DISABLED_CLASS,
  TRANSITION_COLOR_CLASS,
  ICON_SIZE_SM,
} from '@/lib/designTokens';

/**
 * Sidebar nav row chrome — Stripe-inspired restrained surface.
 *
 * The active state uses the theme `--sidebar-nav-active-bg` token at
 * a ~9% primary tint; hover uses ~4%. All rows share focus / disabled
 * / transition classes from the design token layer.
 */

/** Active/hover tint for sidebar nav items (top-level rows and nested inner controls). */
export function sidebarNavSurfaceClassName(active = false) {
  return active
    ? 'bg-[var(--sidebar-nav-active-bg)] text-foreground'
    : 'text-muted-foreground hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-foreground';
}

/** Row chrome when nav label + help sit side-by-side (surface wraps both). */
export function sidebarNavRowClassName(active = false, touchLayout = false) {
  return cn(
    'group/sidebar-nav flex w-full min-w-0 items-center gap-0.5',
    TRANSITION_COLOR_CLASS,
    touchLayout ? 'gap-2 rounded-xl px-4 py-3' : 'rounded-md px-3 py-1.5',
    sidebarNavSurfaceClassName(active),
  );
}

/** Inner nav control inside a row — no surface; inherits row hover/active. */
export function sidebarNavItemInnerClassName(active = false, touchLayout = false) {
  return cn(
    'sidebar-nav-item flex min-w-0 flex-1 items-center rounded-md text-left font-display font-normal leading-none',
    TRANSITION_COLOR_CLASS,
    'focus-visible:outline-none',
    DISABLED_CLASS,
    touchLayout ? 'min-h-12 gap-2.5 text-[15px]' : 'gap-2 text-[13px]',
    active ? 'text-foreground' : 'group-hover/sidebar-nav:text-foreground',
  );
}

/** Help affordance inside a nav row — follows row select/hover (no separate surface). */
export function sidebarNavHelpClassName(active = false) {
  return cn(
    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
    TRANSITION_COLOR_CLASS,
    'focus-visible:outline-none',
    active ? 'text-foreground' : 'text-muted-foreground/70 group-hover/sidebar-nav:text-foreground',
  );
}

/** Expanded sidebar wordmark — thinner than default BrandLogoLink sizing. */
export const sidebarLogoWordmarkClassName =
  '!h-4 !max-w-[5.5rem] w-auto shrink-0 object-contain object-left';

/** Collapsed sidebar mark. */
export const sidebarLogoShortClassName = '!h-5 !w-5 !max-h-5 !max-w-5 object-contain';

/** Vertical spacing between sidebar nav rows (expanded and collapsed). */
export const sidebarNavListGapClassName = 'gap-1';

export const sidebarNavListClassName = cn('flex flex-col', sidebarNavListGapClassName);

  /** Collapsed rail — tighter gap so icons fit the narrow 52px rail.
   *  Allows `overflow-y-auto` so long lists can still be scrolled if needed. */
  export const sidebarNavListCollapsedClassName = cn(
    'flex flex-col items-center gap-1',
  );

/** Nested Room tools — indented under the sidebar "Room" section label. */
export const sidebarRoomNestedGroupClassName = cn(
  'ml-2 flex flex-col border-l border-border-subtle/70 pl-1.5',
  sidebarNavListGapClassName,
);

/**
 * Primary-tinted sidebar nav chrome.
 *
 * Variants:
 *  - touchLayout: full-width, larger targets (mobile sheet)
 *  - squareCollapsed: icon-only cell (centered, tighter padding)
 *  - denseIcons: room / opportunity detail (smaller gap + denser padding)
 */
export function sidebarNavItemClassName(
  active = false,
  options?: {
    touchLayout?: boolean;
    collapsed?: boolean;
    /** Collapsed icon-only cell (centered, tighter padding). */
    iconOnly?: boolean;
    /** Larger icons + tighter padding (room / opportunity detail sidebar). */
    denseIcons?: boolean;
  },
) {
  const { touchLayout, collapsed, iconOnly, denseIcons } = options ?? {};
  const squareCollapsed = (collapsed || iconOnly) && !touchLayout;

  return cn(
    'sidebar-nav-item group/sidebar-nav flex items-center justify-center rounded-md text-left font-display font-normal leading-none',
    TRANSITION_COLOR_CLASS,
    'focus-visible:outline-none',
    DISABLED_CLASS,
    !squareCollapsed && 'w-full',
    !squareCollapsed && !touchLayout && 'justify-start',
    // Taller rows for expanded / touch layouts; collapsed keeps the square icon cell below.
    !squareCollapsed && !touchLayout && 'min-h-[36px]',
    touchLayout
      ? 'min-h-12 w-full justify-start gap-2.5 rounded-xl px-4 py-3 text-[15px]'
      : denseIcons
        ? 'gap-1.5 px-2 py-1.5 text-[13px]'
        : 'gap-2 px-3 py-2 text-[13px]',
    squareCollapsed && 'mx-auto aspect-square h-8 w-8 shrink-0 p-0',
    sidebarNavSurfaceClassName(active),
  );
}

/** Default icon class for top-level sidebar nav rows. */
export const sidebarNavIconClass = cn('shrink-0', ICON_SIZE_SM);

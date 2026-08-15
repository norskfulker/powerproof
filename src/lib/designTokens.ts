/**
 * Design system primitives — Stripe-inspired shared constants.
 *
 * Every interactive component derives its focus, hover, disabled, and
 * active treatment from these tokens. Avoid hard-coded values in
 * component code; reference these instead.
 */

/** Sidebar nav active / hover background CSS variables (theme-driven). */
export const SIDEBAR_NAV_ACTIVE_BG = "var(--sidebar-nav-active-bg)";
export const SIDEBAR_NAV_HOVER_BG = "var(--sidebar-nav-hover-bg)";

/**
 * Focus treatment shared by every interactive primitive.
 * Rings are intentionally removed app-wide — interactive feedback comes from
 * hover/active states instead. Keeps `outline-none` so the browser default
 * outline doesn't reintroduce a ring.
 */
export const FOCUS_RING_CLASS = "focus-visible:outline-none";

/** Disabled treatment used by every interactive primitive. */
export const DISABLED_CLASS =
  "disabled:pointer-events-none disabled:opacity-50 disabled:grayscale";

/** Stripe-style subtle press feedback (omit for purely static surfaces). */
export const PRESS_CLASS = "active:translate-y-px active:opacity-95";

/** Unified color/border/background transition for all interactive elements. */
export const TRANSITION_COLOR_CLASS =
  "transition-[background-color,border-color,color,opacity,transform] duration-200 ease-out";

/** Canonical surface elevation tokens (used by Card, Modal, Dropdown, etc). */
export const SURFACE_FLAT = "bg-card border border-border-subtle";
export const SURFACE_RAISED =
  "bg-card border border-border-subtle shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
export const SURFACE_DROPDOWN =
  "bg-card border border-border-subtle shadow-[0_8px_24px_-8px_rgba(0,0,0,0.10),0_2px_6px_-2px_rgba(0,0,0,0.05)]";
export const SURFACE_MODAL =
  "bg-background border border-border-subtle shadow-[0_24px_64px_-20px_rgba(0,0,0,0.18)]";

/** Standardized radius scale (Stripe-style restrained). */
export const RADIUS_SHARP = "rounded-md";
export const RADIUS_DEFAULT = "rounded-lg";
export const RADIUS_LARGE = "rounded-xl";
export const RADIUS_XL = "rounded-2xl";
export const RADIUS_FULL = "rounded-full";

/** Composite class strings for nav row chrome (sidebar, mobile sheet). */
export const NAV_ITEM_INTERACTIVE = [
  "inline-flex items-center justify-center text-left font-medium",
  TRANSITION_COLOR_CLASS,
  FOCUS_RING_CLASS,
].join(" ");

/** Pill / segmented control idle/active/disabled treatment. */
export const PILL_BASE =
  "inline-flex items-center justify-center whitespace-nowrap select-none rounded-full border font-medium leading-none";
export const PILL_TRANSITION =
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out";
export const PILL_PRESS = "active:scale-[0.98]";

/** Hover/active row treatment reused by table rows, lists, etc. */
export const ROW_HOVER_CLASS = "hover:bg-muted/40 transition-colors";
export const ROW_ACTIVE_CLASS = "bg-muted";

/** Subtle border hover treatment for cards / outlined containers. */
export const CARD_HOVER_CLASS =
  "hover:border-border-default hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow] duration-200 ease-out";

/** Standard icon sizes used across nav rows, popovers, accordion triggers. */
export const ICON_SIZE_XS = "h-3 w-3";
export const ICON_SIZE_SM = "h-3.5 w-3.5";
export const ICON_SIZE_MD = "h-4 w-4";
export const ICON_SIZE_LG = "h-5 w-5";

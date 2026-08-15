import { discoverHeroBoxGridClassName } from '@/components/discover/DiscoverHeroBox'
import { appShellPadClass } from '@/lib/platformLayout'
import type { FluidTextTone } from '@/components/detail/DetailHeroPanel'
import { cn } from '@/lib/utils'

/**
 * Shared discover-hero tokens module — className constants + small style helpers.
 * Section shell lives in `DiscoverHeroSection.tsx`.
 * Composer textarea → `ComposerTextarea.tsx`.
 * Room shell + chrome hook → `DiscoverHeroRoomShell.tsx` (see mobileRoom* / desktopRoom* classes).
 * Shared room hero field → `HeroInput.tsx`.
 * Composer shell padding → `SharedCommandComposerShell.tsx`.
 */

/** Max characters in the discover hero composer input. */
export const DISCOVER_HERO_COMPOSER_MAX_LENGTH = 200
export function clampDiscoverHeroComposerQuery(value: string): string {
  return value.slice(0, DISCOVER_HERO_COMPOSER_MAX_LENGTH)
}

/** Responsive max width for hero stack — 1200px platform column. */
export const discoverHeroContentMaxWidthClass = 'w-full max-w-platform'

/** Centers headline, tabs, and workspace — not the fluid grain band. */
export const discoverHeroContentWidthShellClassName = cn(
  discoverHeroContentMaxWidthClass,
  'mx-auto w-full',
)

/**
 * Vertically centered hero stack — short content sits mid-viewport via child `my-auto`.
 * When workspace content grows past the viewport, auto margins collapse so scroll starts at the top.
 */
export const discoverHeroCenteredInnerClass = cn(
  appShellPadClass,
  'mx-auto flex min-h-0 w-full max-w-platform flex-1 flex-col items-center justify-start',
)

/** Left-aligned hero inner — standalone pages such as Investors. */
export const discoverHeroLeftInnerClass = cn(
  appShellPadClass,
  'mx-auto flex min-h-0 w-full max-w-platform flex-1 flex-col items-start justify-start',
)

/** Tab row inside the mode box (Firecrawl-style, separate from composer). */
export const discoverHeroTabsHeaderClassName =
  'flex w-full min-w-0 shrink-0 justify-center'

/** Browse tabs row inside the discover hero composer search shell. */
export const discoverHeroComposerBrowseTabsClassName =
  'flex w-full min-w-0 justify-center border-b border-border-subtle/70 py-2'

/** Horizontally scrollable tab rail on narrow viewports (pairs with `horizontal-scroll` in index.css). */
export const discoverHeroTabsScrollRailClassName =
  'w-full min-w-0 -mx-1 overflow-x-auto overscroll-x-contain px-1 horizontal-scroll'

/** Mode `TabsList` — intrinsic width with scroll snap on mobile. */
export const discoverHeroModeTabsListClassName =
  'min-w-max snap-x snap-mandatory'

/** Mode tabs box (`DiscoverHeroLiveSearch`) — outer shell only: no padding below the tab row. */
export const discoverHeroModeTabsBoxBodyClassName =
  'px-4 pt-3 pb-0 layout-sm:px-5 layout-sm:pt-3.5 layout-sm:pb-0'

/** Mode tabs row — sits above the bordered hero box (not inside the card). Desktop only. */
export const discoverHeroModeTabsRowClassName =
  'hidden layout-sm:flex w-full min-w-0 shrink-0 justify-center px-3 pt-1 pb-0 layout-sm:px-4 layout-sm:pb-0 layout-lg:px-6'

/** Mobile — mode cards live inside the fluid hero card (not above it). */
export const discoverHeroMobileModeCardsInsideFluidClassName =
  'layout-sm:hidden w-full min-w-0 shrink-0'

/** Vertical gap between the fluid hero card and the workspace `DiscoverHeroBox` below it. */
export const discoverHeroFluidToWorkspaceStackClassName =
  'flex w-full min-w-0 flex-col gap-0'

/** `TabsList` inside discover hero — uses default sunken pill bg from `tabs.tsx`. */
export const discoverHeroTabsListClassName = 'w-fit max-w-full'

export const discoverHeroTabDividerClassName =
  'mx-2 h-3 w-px shrink-0 self-center rounded-full bg-muted-foreground/35 dark:bg-muted-foreground/50 layout-sm:mx-1.5'

export const discoverHeroTabTriggerClassName =
  'outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-nowrap rounded-b-none'

/** ItchMyBack mode + workspace tabs — foreground accent (active state must beat outlineBlue defaults). */
export const discoverHeroItchTabTriggerClassName = cn(
  '[--tab-accent:var(--foreground)]',
  'data-[state=active]:!border-foreground',
  'data-[state=active]:!text-foreground',
  'data-[state=active]:![&_svg]:!text-foreground',
  'data-[state=active]:![&_.tab-icon]:!text-foreground',
  'data-[state=active]:!from-foreground/10 data-[state=active]:!via-foreground/5 data-[state=active]:!to-background',
  'hover:!text-foreground hover:![&_svg]:!text-foreground hover:![&_.tab-icon]:!text-foreground',
)

/** ItchMyBack workspace tabs (The itches / Saved). */
export const discoverHeroItchWorkspaceTabTriggerClassName = discoverHeroItchTabTriggerClassName

/** outlineBlue triggers in discover hero — top corners only, square bottom edge. */
export const discoverHeroOutlineBlueTabTriggerClassName =
  'rounded-b-none data-[state=inactive]:rounded-b-none'

/** Primary accent for default mode tabs (Research, Opportunities, Arsenal, etc.). */
export const discoverHeroPrimaryModeTabTriggerClassName = '[--tab-accent:var(--primary)]'

/** Content body for workspace sections inside `DiscoverHeroBox` (no card padding). */
export const discoverHeroWorkspaceCardsBodyClassName = 'min-w-0 overflow-visible'

/** Room-mode workspace box body — research, war room, sourcing, itch, market test. */
export const discoverHeroModeWorkspaceBoxBodyClassName = discoverHeroWorkspaceCardsBodyClassName

/** Research / playbook hero history grids — 1 col mobile, 3 cols from layout-sm up. */
export const discoverHeroWorkspaceHistoryGridClassName = discoverHeroBoxGridClassName

/** War Room playbook cards — same grid as other workspace boxes. */
export const discoverHeroWorkspacePlaybookHistoryGridClassName = discoverHeroBoxGridClassName

/** Button-chip row for workspace panel switchers (Explore ideas, Opportunities, etc.). */
export const discoverHeroWorkspacePanelChipsClassName =
  'flex flex-wrap items-center gap-3'

/** Row for panel chips + optional toolbar (filters, actions). */
export const discoverHeroWorkspacePanelRowClassName =
  'flex flex-wrap items-center justify-between gap-2'

export function discoverHeroFluidSegmentTextClassName(tone: FluidTextTone): string {
  return tone === 'light' ? 'text-white' : 'text-foreground'
}

/** Header above fluid hero idea chips (no panel chrome). */
export const discoverHeroFluidChipsHeaderClassName =
  'inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-inherit opacity-80'

/** Header above embedded idea chips on solid room composer surfaces. */
export const discoverHeroEmbeddedChipsHeaderClassName =
  'inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground'

/** Shared outer padding for fluid hero composer + idea chips glass panels (nested shell). */
export const discoverHeroFluidBoxPaddingClassName =
  'p-0 max-layout-sm:p-0 layout-sm:p-2 layout-lg:p-2.5'

/** Shared frosted-glass surface — foreground tint, light border. */
export const discoverHeroFluidGlassSurfaceClassName = cn(
  'border border-foreground/10 bg-foreground/[0.04] backdrop-blur-md',
  'shadow-[0_2px_10px_-4px_rgba(0,0,0,0.07)]',
)

/** Solid surface for discover hero composer (input + shared composer shell). */
export const discoverHeroComposerSurfaceClassName =
  'border border-foreground/12 bg-card'

/**
 * Single hero composer shell — no glass nest.
 * Equal padding; foreground border + depth shadow on focus/press (not primary).
 */
export const discoverHeroComposerShellClassName = cn(
  'group/composer relative z-[1] flex w-full min-w-0 max-w-full flex-col items-stretch overflow-visible text-left text-foreground',
  'rounded-lg bg-card p-2 layout-sm:p-2.5',
  'border border-foreground/12',
  'shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]',
  'transition-[border-color,box-shadow] duration-150 ease-out',
  'hover:border-foreground/22',
  'focus-within:border-foreground/35',
  'focus-within:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.22),0_2px_8px_-2px_rgba(0,0,0,0.08)]',
  'active:border-foreground/40',
  'active:shadow-[0_6px_18px_-8px_rgba(0,0,0,0.28),0_1px_4px_-1px_rgba(0,0,0,0.1)]',
)

/** @deprecated Use `discoverHeroComposerShellClassName` — glass nest removed. */
export const discoverHeroComposerGlassWrapClassName = discoverHeroComposerShellClassName

/** @deprecated Use `discoverHeroComposerShellClassName` — glass nest removed. */
export const discoverHeroComposerInnerShellClassName = 'contents'

/** Fluid hero composer — full width within the hero content shell. */
export const discoverHeroFluidComposerWrapClassName = 'mx-auto w-full max-w-platform'

/** Frosted glass shell wrapping the mobile mode menu scroll row. */
export const discoverHeroMobileModeMenuGlassShellClassName = cn(
  discoverHeroFluidGlassSurfaceClassName,
  'w-full min-w-0 rounded-lg max-layout-sm:rounded-lg layout-sm:rounded-xl',
  'px-1.5 py-1.5',
)

/** Mode item inside the glass menu list — flat row, no nested card chrome. */
export const discoverHeroMobileModeMenuItemClassName =
  'border-0 bg-transparent shadow-none'

export const discoverHeroMobileModeMenuItemActiveClassName =
  'bg-[hsl(var(--tab-accent)/0.16)] ring-1 ring-[hsl(var(--tab-accent)/0.25)]'

export const discoverHeroMobileModeMenuItemInactiveClassName =
  'hover:bg-surface/40 active:bg-surface/50'

/** Individual idea chip — solid background surface inside fluid hero. */
export const discoverHeroFluidGlassChipButtonClassName = cn(
  'inline-flex max-w-full items-center gap-1.5 rounded-md border border-foreground/10',
  'bg-background px-2 py-1.5',
  'text-[11px] font-medium text-foreground',
  'shadow-[0_1px_6px_-3px_rgba(0,0,0,0.08)]',
  'transition-[color,border-color,background-color]',
  'hover:border-foreground/18 hover:bg-background hover:text-foreground',
  'disabled:cursor-default disabled:opacity-40',
  'max-layout-sm:gap-2.5 max-layout-sm:rounded-lg max-layout-sm:px-3.5 max-layout-sm:py-3.5 max-layout-sm:text-[13px] max-layout-sm:leading-snug',
)

/** War Room variant — same background chips; subtle red hover on the pill only. */
export const discoverHeroFluidGlassChipButtonWarRoomClassName = cn(
  'hover:border-red-200/55 hover:bg-background hover:text-foreground',
  'dark:hover:border-red-900/45',
)

/** Generated idea chips — inside the fluid discover hero card, below the composer. */
export const discoverHeroFluidChipsInsideClassName = 'w-full min-w-0 shrink-0'

export function discoverHeroFluidComposerColumnClassName(_composerExpanded = false) {
  return discoverHeroFluidComposerWrapClassName
}

/** Elevated `<Button />` in discover hero — 3D shadow must not clip inside shells. */
export const discoverHeroButtonClassName = 'overflow-visible'

/** outlineBlue secondary actions in discover hero. */
export const discoverHeroButtonOutlineBlueClassName = discoverHeroButtonClassName

/** Primary CTA in discover hero. */
export const discoverHeroButtonPrimaryClassName = discoverHeroButtonClassName

/** Itch mode — centered Generate / Submit actions (no flex-grow). */
export const discoverHeroItchButtonRowClassName =
  'flex min-h-[44px] w-full min-w-0 flex-none flex-wrap items-center justify-center gap-1.5 overflow-visible max-layout-sm:gap-1.5 layout-sm:gap-2'

/** Validation error below the composer shell — outside the bordered box, bottom-left. */
export const discoverHeroComposerErrorBelowClassName =
  'min-w-0 flex-1 text-left pt-1 layout-sm:pt-1.5'

/** Shared footer row under the composer shell (error left, credits right). */
export const discoverHeroComposerFooterBelowClassName =
  'flex w-full min-w-0 items-start justify-between gap-3'

/** Error state — red border + ring on the discover composer box (not the textarea). */
export const discoverHeroComposerShellErrorClassName = cn(
  'border-[hsl(0,72%,51%)] ring-1 ring-[hsl(0,72%,51%)/0.35]',
  'hover:border-[hsl(0,72%,51%)]',
  'focus-within:border-[hsl(0,72%,51%)] focus-within:ring-[hsl(0,72%,51%)/0.45]',
)

/** Embedded idea chips in discover hero — 1 column mobile, 2 columns desktop. */
export const discoverHeroEmbeddedIdeaChipsGridClassName =
  'grid w-full grid-cols-1 gap-3 layout-sm:grid-cols-2 layout-sm:gap-3'

/** Reserved space below composer for research / sourcing / war room (prevents page jump). */
export const DISCOVER_HERO_EXPANSION_MIN_H = 'min-h-[160px]'

/** Fluid grain card — full width within shell padding, grows to fill viewport. */
export const discoverHeroResearchFluidBandClassName =
  'relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col shrink-0'

/** Mobile chrome — bottom nav (4.5rem) + safe area + breathing room. */
export const discoverHeroMobileViewportInsetClassName =
  'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)'

/** Minimum height for the fluid grain card — fits between mobile navbar and bottom nav. */
export const discoverHeroFluidCardMinHeightMobileViewportClassName =
  'max-layout-sm:min-h-[calc(100dvh-var(--discover-hero-mobile-inset))] max-layout-sm:max-h-[calc(100dvh-var(--discover-hero-mobile-inset))]'

/** Compact fluid card for discover browse (opportunities + itch) — fits headline + composer, not full viewport. */
export const discoverHeroFluidCardMinHeightBrowseClassName =
  'min-h-0 max-h-none max-layout-sm:min-h-0 max-layout-sm:max-h-none'

/** Full viewport when idea chips are open — dynamic height tracks viewport. */
export const discoverHeroFluidCardMinHeightChipsClassName = cn(
  discoverHeroFluidCardMinHeightMobileViewportClassName,
  'layout-sm:min-h-[calc(100dvh-var(--discover-hero-fluid-top-inset))]',
  'layout-sm:max-h-[calc(100dvh-var(--discover-hero-fluid-top-inset))]',
)

/** Fluid card shell — tighter corners on all breakpoints. */
export const discoverHeroFluidCardMobileShellClassName =
  'max-layout-sm:!rounded-lg layout-sm:rounded-xl'

/** Fluid card inner body — extra inset on mobile; flush bottom for composer dock. */
export const discoverHeroFluidCardBodyMobileClassName =
  'max-layout-sm:!px-5 max-layout-sm:!pt-5 max-layout-sm:!pb-0 layout-sm:p-5'

/** Inner stack for headline + composer + chips — centered as one unit in the fluid card. */
export const discoverHeroResearchFluidInnerClassName = cn(
  discoverHeroContentWidthShellClassName,
  'flex w-full shrink-0 flex-col items-center gap-1.5 layout-sm:gap-2 layout-lg:gap-2',
)

/** Centers greeting + composer vertically inside the fluid card body (scroll handled by LandingFluidCard). */
export const discoverHeroFluidCardBodyClassName = cn(
  'items-center',
  'justify-center',
)

/** Wraps hero content — vertically centered in the fluid card. */
export const discoverHeroFluidInnerCenterWrapClassName = cn(
  'flex w-full flex-col items-center justify-center',
  'layout-sm:min-h-min layout-sm:flex-1',
)

/**
 * Bottom stack — greeting, idea chips, then composer on mobile; on desktop `contents`
 * keeps composer-then-chips order in the parent column. Top-aligned (not mt-auto).
 */
export const discoverHeroFluidMobileBottomStackClassName = cn(
  'flex w-full flex-col gap-2.5 max-layout-sm:shrink-0',
  'max-layout-sm:pb-[env(safe-area-inset-bottom,0px)]',
  'layout-sm:contents layout-sm:gap-1.5',
)

/** Composer slot in fluid hero — below chips on mobile, above chips on desktop. */
export const discoverHeroFluidMobileComposerOrderClassName =
  'w-full shrink-0 text-inherit max-layout-sm:order-2 layout-sm:order-none'

/** Idea chips in fluid hero — above composer on mobile, below on desktop. */
export const discoverHeroFluidMobileChipsOrderClassName = cn(
  discoverHeroFluidChipsInsideClassName,
  discoverHeroFluidComposerColumnClassName(),
  'max-layout-sm:order-1 layout-sm:order-none',
)

/** Top cluster — headline, menu, composer (stays at top when chips load). */
export const discoverHeroResearchFluidTopClusterClassName =
  'flex w-full shrink-0 flex-col items-center gap-1.5 max-layout-sm:gap-2 layout-sm:gap-2 layout-lg:gap-2.5'

/** Vertical spacing between hero regions. */
export const discoverHeroStackClassName =
  'flex w-full flex-col items-center gap-4 layout-sm:gap-6 layout-lg:gap-8'

/** Centered block — intrinsic width. */
export const discoverHeroCenteredBlockClassName =
  'flex w-fit max-w-full min-w-0 flex-col items-center'

/** Short PowerProof mark above onboarding demo hero. */
export const discoverHeroLogoAboveGreetingClassName =
  'mx-auto mb-3 flex justify-center layout-sm:mb-3'

/** Stacked hero sections — separate boxes with gap (no attachment). */
export const discoverHeroSectionsStackClassName =
  'flex w-full min-w-0 flex-col gap-3 layout-sm:gap-4'

/** Tab root — boxed workspace fills hero content width. */
export const discoverHeroTabsInnerStackClassName =
  'flex w-full max-w-full min-w-0 flex-col items-center'

/** Full-viewport shell wrapping the hero — does not extend under mobile bottom nav. */
export const discoverHeroViewportShellClassName =
  'flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-visible layout-sm:min-h-dvh'

/**
 * Hero slot with vertical scroll chaining to the page.
 * Use on pages that have content below the hero — scroll chains up to <main>
 * once the inner section has nothing left to scroll.
 */
export const discoverHeroSectionSlotScrollChainClassName =
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-auto'

import { cardPadding } from '@/lib/cardSurface'
import { cn } from '@/lib/utils'
import {
  opportunityDetailCardClass,
  opportunityDetailCardRadiusClass,
} from '@/lib/opportunityCardClasses'
import { heroGlassBadgeClassForTone } from '@/lib/heroStyles'
import { appShellPadClass } from '@/lib/platformLayout'

export {
  opportunityDetailCardClass,
  opportunityDetailCardClass as opportunityDetailCardSurfaceClass,
  opportunityDetailCardGlowClass,
  opportunityDetailCardGlowClass as opportunityDetailCardGlowRadiusClass,
  opportunityDetailCardPaddingClass,
  opportunityDetailCardRadiusClass,
  opportunityMetricCardClass,
} from '@/lib/opportunityCardClasses'

/** Equal landing-fluid badge on dark opportunity hero surfaces (white label). */
export const opportunityDetailEqualBadgeFluidHeroClassName =
  heroGlassBadgeClassForTone('light')

/**
 * Default opportunity badge — icon-friendly, no fill, subtle border, inherits color.
 * Use as the base shell; semantic variants only tint text via section badges.
 */
export const opportunityDetailEqualBadgeCardClassName = cn(
  'inline-flex items-center gap-1.5 rounded-full border border-border-subtle/55 bg-transparent',
  'px-3 py-1.5 text-[clamp(0.6875rem,1vw,0.8125rem)] font-normal leading-none text-inherit',
)

/** Frosted glass on dark opportunity fluid heroes — white tint, not surface fill. */
export const opportunityDetailFluidGlassSurfaceClassName = cn(
  'border border-white/20 bg-white/10 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.22),0_2px_6px_-3px_rgba(0,0,0,0.12)]',
)

/** Subtle page canvas for opportunity detail — applied on `AppLayout` main column. */
export const opportunityDetailPageBackgroundClass = 'bg-background'

/** Page shell — 1200px platform column. */
export const opportunityDetailPageShellClassName = cn('mx-auto w-full min-w-0 max-w-platform overflow-x-clip', appShellPadClass)

/** Wrapper on `LandingFluidCard` for opportunity detail heroes. */
export const opportunityDetailFluidHeroClassName = 'opportunity-detail-fluid-hero w-full overflow-hidden'

/** Detail page hero title panel — flush surface, no surrounding border. */
export const detailHeroCardClassName = cn(
  'rounded-none border-0 bg-transparent',
  cardPadding.lg,
  'w-full overflow-hidden shadow-none',
)

/** Frosted glass badge on fluid opportunity hero — prefer equal landing-fluid badge. */
export const opportunityDetailFluidGlassBadgeClassName =
  opportunityDetailEqualBadgeFluidHeroClassName

/** Frosted glass metric tile inside fluid opportunity hero. */
export const opportunityDetailFluidMetricCardClassName = cn(
  opportunityDetailFluidGlassSurfaceClassName,
  'flex h-full min-h-0 min-w-0 flex-col justify-center border-transparent p-3 shadow-none layout-sm:p-3.5',
)

/** Title on fluid opportunity hero — white per landing fluid surfaces. */
export const opportunityDetailFluidHeroTitleClassName =
  '!text-white selection:bg-white/20'

/** Subtitle on fluid opportunity hero. */
export const opportunityDetailFluidHeroSubtitleClassName = '!text-white/80'

/** Title on light fluid heroes (e.g. roadmap) — dark foreground for contrast. */
export const opportunityDetailFluidHeroDarkTitleClassName =
  '!text-foreground selection:bg-primary/20'

/** Subtitle on light fluid heroes. */
export const opportunityDetailFluidHeroDarkSubtitleClassName = '!text-foreground/80'

/** Frosted badge on light fluid heroes. */
export const opportunityDetailFluidDarkGlassSurfaceClassName = cn(
  'border border-border-subtle/55 bg-surface/50 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.08),0_2px_6px_-3px_rgba(0,0,0,0.04)]',
)

/** Frosted glass icon action on fluid opportunity hero. */
export const opportunityDetailFluidGlassActionClassName = cn(
  opportunityDetailFluidGlassSurfaceClassName,
  'text-white hover:border-white/35 hover:bg-white/15 hover:text-white',
)

/** Pencil edit control on fluid opportunity hero title / description. */
export const opportunityDetailFluidGlassEditButtonClassName = cn(
  opportunityDetailFluidGlassSurfaceClassName,
  'text-white/90 hover:border-white/35 hover:bg-white/15 hover:text-white',
)

/** Pencil edit control on light fluid heroes (dark foreground). */
export const opportunityDetailFluidDarkGlassEditButtonClassName = cn(
  opportunityDetailFluidDarkGlassSurfaceClassName,
  'text-muted-foreground hover:border-primary/35 hover:bg-surface-hover hover:text-primary',
)

/** Active state for fluid hero glass actions (e.g. saved bookmark). */
export const opportunityDetailFluidGlassActionActiveClassName =
  'border-white/40 bg-white/15 text-white shadow-[0_4px_12px_rgba(255,255,255,0.12)]'

/** Accordion trigger title — sentence case, responsive for phone / tablet / desktop. */
export const opportunityAccordionTitleClass =
  'font-sans text-[15px] font-semibold leading-snug text-foreground layout-sm:text-base layout-lg:text-lg layout-lg:font-medium'

/** Accordion trigger subtitle below the title. */
export const opportunityAccordionDescriptionClass =
  'font-sans text-[12px] font-normal leading-snug text-muted-foreground'

/** Badge size for all opportunity detail surfaces — use with `<Badge size={…} />`. */
export const opportunityDetailBadgeSize = 'lg' as const

/** Inline badge chrome — equal landing-fluid badge on cards. */
export const opportunityDetailInlineBadgeClass = opportunityDetailEqualBadgeCardClassName

/** Nested surfaces inside opportunity detail sections. */
export const opportunityDetailInnerRadiusClass = 'rounded-lg'

/** Accordion item chrome — default bottom rule; Market Readiness opts into full border. */
export const opportunityDetailAccordionItemClass = cn(
  'rounded-none border-0 border-b border-border-subtle bg-background shadow-none',
  'hover:border-border-subtle',
  'data-[state=open]:border-border-subtle data-[state=open]:bg-background data-[state=open]:shadow-none',
)

/** Metrics bar grid — 2 cols phone, 4 desktop (glance strip). */
export const opportunityMetricsGridClass = cn(
  'grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-4 auto-rows-fr items-stretch',
  'sm:grid-cols-4 sm:gap-x-6 sm:gap-y-3',
)

/** Metrics bar grid when demand trend is a chip (4 primary tiles). */
export const opportunityMetricsGridFourClass = cn(
  'grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-4 auto-rows-fr items-stretch',
  'sm:grid-cols-4 sm:gap-x-6 sm:gap-y-3',
)

/** Section panel wrapper — same surface with overflow clip for decorative overlays. */
export const opportunityDetailPanelClass = cn(
  opportunityDetailCardClass,
  'relative overflow-hidden',
)

/** @deprecated Prefer `opportunityDetailCardRadiusClass` for full card styling. */
export const opportunityCardRadiusClass = opportunityDetailCardRadiusClass

/** Single-column page grid — generous Stripe-like section breathing room. */
export function opportunityDetailPageGridClass(_isCompact?: boolean) {
  return cn(
    'grid w-full min-w-0 grid-cols-1 auto-rows-min gap-4',
    'sm:gap-5 lg:gap-6',
  )
}

/** Bento-style asymmetric grid for metric / intelligence cards. */
export function opportunityBentoGridClass() {
  return cn(
    'grid min-w-0 grid-flow-dense items-stretch gap-3',
    'grid-cols-2 auto-rows-[minmax(7rem,auto)]',
    'layout-sm:grid-cols-4 layout-sm:gap-3.5 layout-sm:auto-rows-[minmax(7.5rem,auto)]',
    'layout-lg:grid-cols-6 layout-lg:gap-4 layout-lg:auto-rows-[minmax(8.25rem,auto)]',
  )
}

export type OpportunityBentoSpan = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '4x1' | 'full'

/** Cell span classes for `opportunityBentoGridClass` layouts. */
export function opportunityBentoCellClass(span: OpportunityBentoSpan = '1x1') {
  const map: Record<OpportunityBentoSpan, string> = {
    '1x1': '',
    '2x1': 'col-span-2 layout-sm:col-span-2 layout-lg:col-span-2',
    '1x2': 'row-span-2 layout-sm:row-span-2 layout-lg:row-span-2',
    '2x2': 'col-span-2 row-span-2 layout-sm:col-span-2 layout-sm:row-span-2 layout-lg:col-span-2 layout-lg:row-span-2',
    '3x1': 'col-span-2 layout-sm:col-span-3 layout-lg:col-span-3',
    '4x1': 'col-span-2 layout-sm:col-span-4 layout-lg:col-span-4',
    full: 'col-span-2 layout-sm:col-span-4 layout-lg:col-span-6',
  }
  return map[span]
}

/** @deprecated Use `opportunityBentoGridClass` for bento layouts. */
export function opportunityMetricCardsGridClass() {
  return opportunityBentoGridClass()
}

/** Section row wrapper — width only; vertical rhythm from page grid gap. */
export function opportunitySectionWrapClass(_isMobile: boolean) {
  return 'min-w-0 w-full scroll-mt-[7.5rem]'
}

/** Section H2 titles (was sectionHeadingStyle on TypewriterText). */
export function opportunitySectionHeadingClass(isCompact: boolean, opts?: { flushBottom?: boolean }) {
  return cn(
    'font-display font-medium tracking-normal text-foreground',
    isCompact ? 'text-[22px] layout-sm:text-[26px]' : 'text-[36px]',
    opts?.flushBottom && 'mb-0',
  )
}

/** Row above section body: title + actions. */
export function opportunitySectionHeaderRowClass(isMobile: boolean) {
  return cn('flex items-center justify-between', isMobile ? 'mb-3' : 'mb-4')
}

/** Slightly larger header gap (e.g. Space & Location). */
export function opportunitySectionHeaderRowLooseClass(isMobile: boolean) {
  return cn('flex items-center justify-between', isMobile ? 'mb-3' : 'mb-5')
}

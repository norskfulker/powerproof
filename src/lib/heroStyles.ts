import { cn } from '@/lib/utils'

/** Frosted glass pill used in hero meta rows on dark-toned heroes. */
export const heroGlassBadgeClass = cn(
  'inline-flex items-center rounded-full border border-border-subtle/55 bg-surface/45 px-3.5 py-1.5',
  'text-[clamp(0.6875rem,1vw,0.8125rem)] font-normal leading-none text-foreground/90',
  'backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(0,0,0,0.1),0_2px_6px_-3px_rgba(0,0,0,0.05)]',
)

/** Light-mode variant of the glass pill for use on dark hero backgrounds. */
export const heroGlassBadgeLightClass = cn(
  'inline-flex items-center rounded-full border border-white/30 bg-white/14 px-3.5 py-1.5',
  'text-[clamp(0.6875rem,1vw,0.8125rem)] font-normal leading-none text-white/92',
  'backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(0,0,0,0.28),0_2px_6px_-3px_rgba(0,0,0,0.16)]',
)

export function heroGlassBadgeClassForTone(tone: 'light' | 'dark'): string {
  return tone === 'light' ? heroGlassBadgeLightClass : heroGlassBadgeClass
}

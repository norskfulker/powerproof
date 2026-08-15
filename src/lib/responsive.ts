import type { Breakpoint } from '@/hooks/useBreakpoint'

type ResponsiveValue<T> = {
  mobile: T
  tablet?: T
  desktop: T
  wide?: T
}

export function rv<T>(bp: Breakpoint, values: ResponsiveValue<T>): T {
  if (bp === 'mobile') return values.mobile
  if (bp === 'tablet') return values.tablet ?? values.desktop
  if (bp === 'desktop') return values.desktop
  return values.wide ?? values.desktop
}

export const r = {
  pagePad: (bp: Breakpoint) => rv(bp, { mobile: '0 16px', tablet: '0 24px', desktop: '0 32px' }),
  sectionPad: (bp: Breakpoint) => rv(bp, { mobile: '32px 16px', tablet: '48px 24px', desktop: '64px 32px' }),

  heroTitle: (bp: Breakpoint) => rv(bp, { mobile: '32px', tablet: '44px', desktop: '64px' }),
  sectionTitle: (bp: Breakpoint) => rv(bp, { mobile: '22px', tablet: '26px', desktop: '32px' }),
  cardTitle: (bp: Breakpoint) => rv(bp, { mobile: '17px', tablet: '19px', desktop: '21px' }),

  cardGrid: (bp: Breakpoint) =>
    rv(bp, {
      mobile: 'minmax(0, 1fr)',
      tablet: 'repeat(2, 1fr)',
      desktop: 'repeat(3, minmax(0, 1fr))',
      wide: 'repeat(auto-fill, minmax(260px, 1fr))',
    }),
  twoCol: (bp: Breakpoint) => rv(bp, {
    mobile: '1fr',
    tablet: '1fr 1fr',
    desktop: '1.5fr 1fr',
  }),

  cardGap: (bp: Breakpoint) => rv(bp, { mobile: '8px', tablet: '14px', desktop: '16px' }),

  /** Shared padding for discover toolbars (search strip, filter bar row, page-size row). */
  toolbarPad: (bp: Breakpoint) => rv(bp, { mobile: '6px 10px', tablet: '14px 24px', desktop: '14px 24px' }),

  contentMax: '100%',
}

import { useEffect, useState } from 'react'

/** Viewport bands aligned to layout artboards: 390 / 810 / 1200 / 1600 (min-width edges at 810, 1200, 1600). */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

export const BREAKPOINT = {
  /** min-width for `tablet` tier */
  tabletMin: 810,
  /** min-width for `desktop` tier */
  desktopMin: 1200,
  /** min-width for `wide` (xl) tier */
  wideMin: 1600,
} as const

const BELOW_TABLET = `(max-width: ${BREAKPOINT.tabletMin - 1}px)`
const TABLET_ONLY = `(min-width: ${BREAKPOINT.tabletMin}px) and (max-width: ${BREAKPOINT.desktopMin - 1}px)`
const DESKTOP_ONLY = `(min-width: ${BREAKPOINT.desktopMin}px) and (max-width: ${BREAKPOINT.wideMin - 1}px)`
const WIDE_UP = `(min-width: ${BREAKPOINT.wideMin}px)`

export function useBreakpoint(): Breakpoint {
  const getBreakpoint = (): Breakpoint => {
    if (typeof window === 'undefined') return 'desktop'
    const w = window.innerWidth
    if (w < BREAKPOINT.tabletMin) return 'mobile'
    if (w < BREAKPOINT.desktopMin) return 'tablet'
    if (w < BREAKPOINT.wideMin) return 'desktop'
    return 'wide'
  }

  const [bp, setBp] = useState<Breakpoint>(getBreakpoint)

  useEffect(() => {
    const handler = () => setBp(getBreakpoint())
    const mqBelowTablet = window.matchMedia(BELOW_TABLET)
    const mqTablet = window.matchMedia(TABLET_ONLY)
    const mqDesktop = window.matchMedia(DESKTOP_ONLY)
    const mqWide = window.matchMedia(WIDE_UP)
    mqBelowTablet.addEventListener('change', handler)
    mqTablet.addEventListener('change', handler)
    mqDesktop.addEventListener('change', handler)
    mqWide.addEventListener('change', handler)
    window.addEventListener('resize', handler, { passive: true })
    return () => {
      mqBelowTablet.removeEventListener('change', handler)
      mqTablet.removeEventListener('change', handler)
      mqDesktop.removeEventListener('change', handler)
      mqWide.removeEventListener('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [])

  return bp
}

export function useIsMobile() {
  return useBreakpoint() === 'mobile'
}

export function useIsTablet() {
  return useBreakpoint() === 'tablet'
}

/** Large screens: desktop (1200–1599) or wide (1600+). */
export function useIsDesktop() {
  const bp = useBreakpoint()
  return bp === 'desktop' || bp === 'wide'
}

/** True when the primary pointer supports hover (mouse/trackpad), not touch-only. */
export function useCanHover() {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const handler = () => setCanHover(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return canHover
}

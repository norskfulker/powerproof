import { useEffect, useState } from 'react'

import { BREAKPOINT } from '@/hooks/useBreakpoint'

const DESKTOP_SHEET_MQ = `(min-width: ${BREAKPOINT.desktopMin}px)`

/**
 * Bottom sheet on mobile + tablet; right sheet on desktop (≥1200px).
 * Defaults to bottom for mobile-first paint.
 */
export function useResponsiveSheetSide(): 'bottom' | 'right' {
  const [side, setSide] = useState<'bottom' | 'right'>('bottom')

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_SHEET_MQ)
    const update = () => setSide(mq.matches ? 'right' : 'bottom')
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return side
}

/** True when viewport should use a bottom sheet instead of a right sidesheet. */
export function useIsCompactSheetViewport(): boolean {
  return useResponsiveSheetSide() === 'bottom'
}

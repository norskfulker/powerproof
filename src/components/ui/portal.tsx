import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into `document.body` so that fixed-position overlays
 * are not clipped by transformed/filter ancestors (cards, framer-motion
 * containers, accordion content, etc.). Stacking-context safe.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

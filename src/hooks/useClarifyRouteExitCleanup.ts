import { useEffect, useRef } from 'react'

/**
 * Resets in-progress clarify flow when leaving the dedicated clarify route
 * (browser back, nav link, etc.) so the room page does not immediately redirect back.
 */
export function useClarifyRouteExitCleanup(
  shouldReset: () => boolean,
  onExit: () => void,
) {
  const shouldResetRef = useRef(shouldReset)
  const onExitRef = useRef(onExit)
  shouldResetRef.current = shouldReset
  onExitRef.current = onExit

  useEffect(() => {
    return () => {
      if (shouldResetRef.current()) {
        onExitRef.current()
      }
    }
  }, [])
}

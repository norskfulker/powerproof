/** Scroll container for app chrome (`AppLayout` `#app-main-scroll`). */
export const APP_MAIN_SCROLL_ID = 'app-main-scroll'

/**
 * Keep wheel / trackpad scroll inside a nested panel instead of `#app-main-scroll`.
 */
export function keepNestedWheelScrollLocal(e: React.WheelEvent<HTMLDivElement>) {
  const el = e.currentTarget
  if (el.scrollHeight <= el.clientHeight + 1) return

  const delta = e.deltaY
  const atTop = el.scrollTop <= 0
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1

  if ((delta < 0 && atTop) || (delta > 0 && atBottom)) return

  e.stopPropagation()
}

/**
 * IntersectionObserver / scroll listeners should use this root.
 * Falls back to the viewport when the main region is not scrollable.
 */
export function getAppScrollRoot(): Element | null {
  const main = document.getElementById(APP_MAIN_SCROLL_ID)
  if (!main) return null
  if (main.scrollHeight > main.clientHeight + 1) return main
  return null
}

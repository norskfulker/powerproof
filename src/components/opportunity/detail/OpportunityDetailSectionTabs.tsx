import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { focusOpportunityNavAnchor } from '@/lib/opportunitySectionNav'
import { getAppScrollRoot } from '@/lib/appScrollRoot'
import type { OpportunitySectionNavItem } from '@/components/opportunity/detail/OpportunitySectionNav'

export type OpportunityDetailSectionTabsProps = {
  sections: OpportunitySectionNavItem[]
  className?: string
  /**
   * `scroll` (default): underline follows scroll-spy and clicks scroll to anchors.
   * `panel`: controlled tab switch only — no scroll-spy / anchor jump.
   */
  mode?: 'scroll' | 'panel'
  /** Controlled active tab (required for reliable `panel` mode). */
  activeId?: string
  onActiveIdChange?: (sectionId: string) => void
  /** Fired on click — e.g. expand content before scroll in `scroll` mode. */
  onSectionSelect?: (sectionId: string) => void
}

function getStickyChromeOffsetPx(): number {
  const header = document.querySelector<HTMLElement>('[data-app-chrome-header]')
  if (header) return Math.ceil(header.getBoundingClientRect().height) + 8
  return 108
}

/**
 * Full-width underline tabs — white track, primary active text + underline.
 * Labels stay fully visible (horizontal scroll).
 */
export function OpportunityDetailSectionTabs({
  sections,
  className,
  mode = 'scroll',
  activeId: controlledActiveId,
  onActiveIdChange,
  onSectionSelect,
}: OpportunityDetailSectionTabsProps) {
  const isPanel = mode === 'panel'
  const ids = useMemo(() => sections.map((s) => s.id), [sections])
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState(ids[0] ?? '')
  const isControlled = controlledActiveId != null
  const activeId = isControlled ? controlledActiveId : uncontrolledActiveId
  const setActiveId = (next: string) => {
    if (!isControlled) setUncontrolledActiveId(next)
    onActiveIdChange?.(next)
  }
  const tablistRef = useRef<HTMLDivElement | null>(null)
  const activeFromClickRef = useRef<string | null>(null)

  useEffect(() => {
    if (!ids.length) return
    if (!ids.includes(activeId)) setActiveId(ids[0]!)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when section list changes
  }, [ids.join('|')])

  // Keep the active tab button fully in view inside the horizontal tab scroller.
  useEffect(() => {
    if (!activeId || !tablistRef.current) return
    const btn = tablistRef.current.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId)}"]`)
    if (!btn) return
    const list = tablistRef.current
    const btnLeft = btn.offsetLeft
    const btnRight = btnLeft + btn.offsetWidth
    const viewLeft = list.scrollLeft
    const viewRight = viewLeft + list.clientWidth
    if (btnLeft < viewLeft) {
      list.scrollTo({ left: Math.max(0, btnLeft - 16), behavior: 'smooth' })
    } else if (btnRight > viewRight) {
      list.scrollTo({ left: btnRight - list.clientWidth + 16, behavior: 'smooth' })
    }
  }, [activeId])

  // Scroll-spy: pick the last section whose top has crossed below the sticky chrome.
  useEffect(() => {
    if (isPanel || !ids.length) return

    const root = getAppScrollRoot()
    const scrollEl: HTMLElement | Window = root instanceof HTMLElement ? root : window

    const resolveActive = () => {
      if (activeFromClickRef.current) {
        const pending = activeFromClickRef.current
        const el = document.getElementById(pending)
        if (el) {
          const offset = getStickyChromeOffsetPx()
          const rootTop =
            root instanceof HTMLElement ? root.getBoundingClientRect().top : 0
          const top = el.getBoundingClientRect().top - rootTop
          if (Math.abs(top - offset) < 48) {
            activeFromClickRef.current = null
          }
        }
      }

      const offset = getStickyChromeOffsetPx()
      const rootTop =
        root instanceof HTMLElement ? root.getBoundingClientRect().top : 0

      let current = ids[0] ?? ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top - rootTop
        if (top <= offset + 12) current = id
      }

      if (activeFromClickRef.current) {
        setActiveId(activeFromClickRef.current)
        return
      }
      if (current) setActiveId(current)
    }

    resolveActive()
    const retry = window.setTimeout(resolveActive, 120)
    const retry2 = window.setTimeout(resolveActive, 400)

    scrollEl.addEventListener('scroll', resolveActive, { passive: true })
    window.addEventListener('resize', resolveActive, { passive: true })

    return () => {
      window.clearTimeout(retry)
      window.clearTimeout(retry2)
      scrollEl.removeEventListener('scroll', resolveActive)
      window.removeEventListener('resize', resolveActive)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll-spy keyed to section ids
  }, [ids.join('|'), isPanel])

  if (sections.length < 2) return null

  return (
    <nav aria-label="On this page" className={cn('w-full min-w-0', className)}>
      <div
        ref={tablistRef}
        className="flex w-full min-w-0 items-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {sections.map((section) => {
          const active = section.id === activeId
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              data-tab-id={section.id}
              aria-selected={active}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-3.5 py-2.5 font-sans text-[13px] font-medium transition-colors sm:px-4 sm:py-3 sm:text-[14px]',
                'outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setActiveId(section.id)
                onSectionSelect?.(section.id)
                if (isPanel) return

                activeFromClickRef.current = section.id
                const scrollDelay = onSectionSelect ? 100 : 0
                window.setTimeout(() => {
                  focusOpportunityNavAnchor(section.id, { highlight: false })
                }, scrollDelay)
                window.setTimeout(() => {
                  if (activeFromClickRef.current === section.id) {
                    activeFromClickRef.current = null
                  }
                }, 700 + scrollDelay)
              }}
            >
              {section.label}
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-primary transition-opacity',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

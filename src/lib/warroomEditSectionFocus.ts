import { getAppScrollRoot } from '@/lib/appScrollRoot'

const SCROLL_OFFSET_FALLBACK_PX = 108
const HIGHLIGHT_MS = 1400

const WARROOM_SECTION_SCROLL_IDS: Record<string, string> = {
  founder_honest_take: 'wr-founder-honest-take',
  thirty_day_sprint: 'wr-thirty-day-sprint',
  red_flags: 'wr-red-flags',
  steps: 'wr-steps',
}

function getStickyChromeOffsetPx(): number {
  const header = document.querySelector<HTMLElement>('[data-app-chrome-header]')
  if (header) return Math.ceil(header.getBoundingClientRect().height) + 8
  return SCROLL_OFFSET_FALLBACK_PX
}

function scrollToId(scrollId: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(scrollId)
  if (!el) return

  const offset = getStickyChromeOffsetPx()
  const root = getAppScrollRoot()
  if (root) {
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const top = root.scrollTop + (elRect.top - rootRect.top) - offset
    root.scrollTo({ top: Math.max(0, top), behavior })
  } else {
    el.scrollIntoView({ behavior, block: 'start' })
  }

  el.classList.remove('opportunity-nav-anchor-highlight')
  void el.offsetWidth
  el.classList.add('opportunity-nav-anchor-highlight')
  window.setTimeout(() => el.classList.remove('opportunity-nav-anchor-highlight'), HIGHLIGHT_MS)
}

export function focusWarroomEditSection(sectionKey: string): void {
  if (!sectionKey) return
  const scrollId =
    WARROOM_SECTION_SCROLL_IDS[sectionKey] ?? `wr-${sectionKey.replace(/_/g, '-')}`
  window.setTimeout(() => scrollToId(scrollId), 120)
}

export function focusWarroomEditStep(stepOrder: number): void {
  if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
    focusWarroomEditSection('steps')
    return
  }
  window.setTimeout(() => scrollToId(`wr-step-${stepOrder}`), 120)
}

/** Prefer first updated step, else first flat key in `updated_data`. */
export function focusWarroomEditResult(
  updatedData: Record<string, unknown>,
  targetSteps?: number[],
): void {
  const firstStep = targetSteps?.[0]
  if (firstStep != null) {
    focusWarroomEditStep(firstStep)
    return
  }
  if (Array.isArray(updatedData.steps)) {
    focusWarroomEditSection('steps')
    return
  }
  for (const key of ['founder_honest_take', 'thirty_day_sprint', 'red_flags'] as const) {
    if (key in updatedData) {
      focusWarroomEditSection(key)
      return
    }
  }
}

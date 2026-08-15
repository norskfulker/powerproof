export type TimedSectionStatus = 'pending' | 'active' | 'complete'

export type TimedResearchSection = {
  id: string
  label: string
  completeAtSec: number
}

/** Perceived progress spread across a typical 60–90s deep research run. */
export const RESEARCH_TIMED_SECTIONS: TimedResearchSection[] = [
  { id: 'validate', label: 'Validating your idea', completeAtSec: 8 },
  { id: 'markets', label: 'Market intelligence loaded', completeAtSec: 20 },
  { id: 'competitors', label: 'Competitive landscape mapped', completeAtSec: 32 },
  { id: 'financials', label: 'Financial projections built', completeAtSec: 44 },
  { id: 'marketing', label: 'Go-to-market details drafted', completeAtSec: 56 },
  { id: 'operations', label: 'Licences & operations checked', completeAtSec: 66 },
  { id: 'final', label: 'Research brief finalised', completeAtSec: 78 },
]

export const RESEARCH_TIMED_DURATION_SEC = 78
export const RESEARCH_TIMED_HINT = 'Usually 60–90 seconds'

export function researchElapsedSeconds(startedAt: string | null | undefined, nowMs = Date.now()): number {
  if (!startedAt) return 0
  const start = Date.parse(startedAt)
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((nowMs - start) / 1000))
}

export function resolveTimedSectionStates(
  elapsedSec: number,
): Array<TimedResearchSection & { status: TimedSectionStatus }> {
  const elapsed = Math.max(0, elapsedSec)
  let activeAssigned = false

  return RESEARCH_TIMED_SECTIONS.map((section, index) => {
    if (elapsed >= section.completeAtSec) {
      return { ...section, status: 'complete' as const }
    }

    const prevCompleteAt = index > 0 ? RESEARCH_TIMED_SECTIONS[index - 1].completeAtSec : 0
    if (!activeAssigned && elapsed >= prevCompleteAt) {
      activeAssigned = true
      return { ...section, status: 'active' as const }
    }

    return { ...section, status: 'pending' as const }
  })
}

export function timedResearchProgressPct(elapsedSec: number): number {
  const elapsed = Math.max(0, elapsedSec)
  const total = RESEARCH_TIMED_SECTIONS.length
  const completed = RESEARCH_TIMED_SECTIONS.filter((s) => elapsed >= s.completeAtSec).length
  const activeIndex = RESEARCH_TIMED_SECTIONS.findIndex((s) => elapsed < s.completeAtSec)

  let pct = (completed / total) * 100
  if (activeIndex >= 0) {
    const prevAt = activeIndex > 0 ? RESEARCH_TIMED_SECTIONS[activeIndex - 1].completeAtSec : 0
    const nextAt = RESEARCH_TIMED_SECTIONS[activeIndex].completeAtSec
    const span = Math.max(1, nextAt - prevAt)
    const within = Math.min(1, Math.max(0, (elapsed - prevAt) / span))
    pct += (within / total) * 100
  }

  return Math.min(100, Math.round(pct))
}

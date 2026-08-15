import { useEffect, useMemo, useState } from 'react'
import {
  researchElapsedSeconds,
  resolveTimedSectionStates,
  timedResearchProgressPct,
} from '@/lib/researchTimedProgress'

export function useResearchTimedProgress(startedAt: string | null | undefined) {
  const [elapsed, setElapsed] = useState(() => researchElapsedSeconds(startedAt))

  useEffect(() => {
    setElapsed(researchElapsedSeconds(startedAt))
    if (!startedAt) return

    const tick = () => setElapsed(researchElapsedSeconds(startedAt))
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  const sections = useMemo(() => resolveTimedSectionStates(elapsed), [elapsed])
  const progressPct = useMemo(() => timedResearchProgressPct(elapsed), [elapsed])
  const allComplete = sections.every((s) => s.status === 'complete')

  return { elapsed, sections, progressPct, allComplete }
}

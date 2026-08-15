/** Estimated total streamed JSON chars for a full deep-research report. */
export const RESEARCH_STREAM_EXPECTED_CHARS = 80_000

export function researchStreamProgressPct(chars: number, complete = false): number {
  if (complete) return 100
  return Math.min(95, Math.round((chars / RESEARCH_STREAM_EXPECTED_CHARS) * 100))
}

export function researchStreamStatusMessage(chars: number): string {
  if (chars < 20_000) return 'Analysing market landscape…'
  if (chars < 40_000) return 'Mapping competitors and demand…'
  if (chars < 60_000) return 'Building financial projections…'
  return 'Finalising your report…'
}

export function formatResearchStreamChars(chars: number): string {
  const formatted = chars.toLocaleString('en-US')
  const expected = RESEARCH_STREAM_EXPECTED_CHARS.toLocaleString('en-US')
  return `${formatted} / ~${expected} chars`
}

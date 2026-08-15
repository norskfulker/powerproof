export type ResearchPageState = 'loading' | 'complete' | 'failed' | 'initial'

export function resolveResearchPageState(status: string | null | undefined): ResearchPageState {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'complete') return 'complete'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'initial') return 'initial'
  return 'loading'
}

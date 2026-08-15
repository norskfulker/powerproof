import { ResearchDeepLoadingPage } from '@/components/research/ResearchDeepLoadingPage'
import type { ResearchStyle } from '@/lib/researchStyles'

export interface ResearchPendingStateProps {
  query?: string | null
  startedAt?: string | null
  researchStyle?: ResearchStyle | string | null
  onCancel?: () => void
  cancelDisabled?: boolean
}

export function ResearchPendingState({
  query,
  startedAt,
  researchStyle,
  onCancel,
  cancelDisabled,
}: ResearchPendingStateProps) {
  return (
    <ResearchDeepLoadingPage
      query={query}
      startedAt={startedAt}
      researchStyle={researchStyle}
      onCancel={onCancel}
      cancelDisabled={cancelDisabled}
    />
  )
}

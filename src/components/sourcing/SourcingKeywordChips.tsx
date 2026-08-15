import { forwardRef } from 'react'
import { IdeaChips, type IdeaChipsHandle } from '@/components/ideas/IdeaChips'
import type { IdeaChipsSession } from '@/hooks/useIdeaChipsSession'

interface SourcingKeywordChipsProps {
  onSelect: (keyword: string) => void
  disabled?: boolean
  className?: string
  inputId?: string
  embedded?: boolean
  hideSuggestControl?: boolean
  onLoadingChange?: (loading: boolean) => void
  onVisibilityChange?: (visible: boolean) => void
  session?: IdeaChipsSession
  fluidGlass?: boolean
}

/** Sourcing product keyword suggestions — DB pool on load; `generate-idea-chips` on Suggest Ideas. */
export const SourcingKeywordChips = forwardRef<IdeaChipsHandle, SourcingKeywordChipsProps>(
  function SourcingKeywordChips(props, ref) {
    return <IdeaChips ref={ref} context="sourcing" {...props} />
  },
)

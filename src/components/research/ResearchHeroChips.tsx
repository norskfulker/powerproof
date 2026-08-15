import { forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useIdeaChipsSession } from '@/hooks/useIdeaChipsSession'
import { IdeaChips } from '@/components/ideas/IdeaChips'
import {
  ResearchHeroHistoryPanel,
  type ResearchHeroHistoryRow,
} from '@/components/research/ResearchHeroHistoryPanel'
import type { ClarificationDraft } from '@/types/research'

export type ResearchHeroWorkspaceSlots = {
  /** Idea chip suggestions — rendered in a separate card when visible. */
  chips: ReactNode
  chipsVisible: boolean
  /** Saved research history cards. */
  history: ReactNode
  historyHasContent: boolean
}

export type ResearchHeroChipsHandle = {
  suggest: () => void
}

export const ResearchHeroChips = forwardRef<
  ResearchHeroChipsHandle,
  {
    onIdeaSelect: (idea: string) => void
    disabled?: boolean
    inputId?: string
    refreshKey?: string | number
    onReResearch?: (row: ResearchHeroHistoryRow) => void
    onResumeDraft?: (draft: ClarificationDraft) => void
    workspaceDisabled?: boolean
    reResearchingOpportunityId?: string | null
    onSuggestLoadingChange?: (loading: boolean) => void
    /** Hide loaded idea chips while clarification wizard is active. */
    hideChipsDuringWizard?: boolean
    /** Frosted glass chip styling inside the fluid discover hero. */
    fluidGlass?: boolean
    children?: (slots: ResearchHeroWorkspaceSlots) => ReactNode
  }
>(function ResearchHeroChips(
  {
    onIdeaSelect,
    disabled,
    inputId,
    refreshKey,
    onReResearch,
    onResumeDraft,
    workspaceDisabled = false,
    reResearchingOpportunityId = null,
    onSuggestLoadingChange,
    hideChipsDuringWizard = false,
    fluidGlass = false,
    children,
  },
  ref,
) {
  const { user } = useAuth()
  const [historyCount, setHistoryCount] = useState<number | undefined>(undefined)
  const [hasHistoryContent, setHasHistoryContent] = useState(false)
  const [chipsVisible, setChipsVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const ideaChipsSession = useIdeaChipsSession('research')

  useEffect(() => {
    setSearchQuery('')
  }, [refreshKey])

  const handleSuggest = useCallback(() => {
    if (workspaceDisabled || disabled) return
    void ideaChipsSession.suggestChips()
  }, [workspaceDisabled, disabled, ideaChipsSession.suggestChips])

  useImperativeHandle(ref, () => ({ suggest: handleSuggest }), [handleSuggest])

  const chipsSlot = (
    <div className="w-full min-w-0 overflow-x-hidden">
      <IdeaChips
        session={ideaChipsSession}
        fluidGlass={fluidGlass}
        embedded
        hideSuggestControl
        context="research"
        onSelect={onIdeaSelect}
        disabled={disabled || workspaceDisabled}
        inputId={inputId}
        hideWhenLoaded={hideChipsDuringWizard}
        onLoadingChange={onSuggestLoadingChange}
        onVisibilityChange={setChipsVisible}
      />
    </div>
  )

  const historySlot = (
    <div className="w-full min-w-0" data-tour="my-research">
      <ResearchHeroHistoryPanel
        expanded
        refreshKey={refreshKey}
        onHistoryCount={setHistoryCount}
        onHasContentChange={setHasHistoryContent}
        onReResearch={onReResearch}
        onResumeDraft={onResumeDraft}
        workspaceDisabled={workspaceDisabled}
        reResearchingOpportunityId={reResearchingOpportunityId}
        searchQuery={searchQuery}
      />
    </div>
  )

  if (children) {
    const historyHasContentResolved =
      hasHistoryContent || (historyCount != null && historyCount > 0)
    return children({
      chips: chipsSlot,
      chipsVisible,
      history: historySlot,
      historyHasContent: historyHasContentResolved,
    })
  }

  return (
    <div className="flex flex-col">
      {chipsSlot}
      {historySlot}
    </div>
  )
})

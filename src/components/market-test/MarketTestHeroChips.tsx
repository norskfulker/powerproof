import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useIdeaChipsSession } from '@/hooks/useIdeaChipsSession'
import { IdeaChips } from '@/components/ideas/IdeaChips'
import { MarketTestHeroHistoryPanel } from '@/components/market-test/MarketTestHeroHistoryPanel'
import type { MarketTestListRow } from '@/lib/marketTestApi'
import { cn } from '@/lib/utils'

export type MarketTestHeroWorkspaceSlots = {
  chips: ReactNode
  chipsVisible: boolean
  history: ReactNode
  historyHasContent: boolean
}

export type MarketTestHeroChipsHandle = {
  suggest: () => void
}

export const MarketTestHeroChips = forwardRef<
  MarketTestHeroChipsHandle,
  {
    onIdeaSelect: (idea: string) => void
    onReRunMarketTest?: (row: MarketTestListRow) => void
    disabled?: boolean
    inputId?: string
    refreshKey?: string | number
    workspaceDisabled?: boolean
    onSuggestLoadingChange?: (loading: boolean) => void
    fluidGlass?: boolean
    children?: (slots: MarketTestHeroWorkspaceSlots) => ReactNode
  }
>(function MarketTestHeroChips(
  {
    onIdeaSelect,
    onReRunMarketTest,
    disabled,
    inputId,
    refreshKey,
    workspaceDisabled = false,
    onSuggestLoadingChange,
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
  const ideaChipsSession = useIdeaChipsSession('market_test')

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
        context="market_test"
        onSelect={onIdeaSelect}
        disabled={disabled || workspaceDisabled}
        inputId={inputId}
        onLoadingChange={onSuggestLoadingChange}
        onVisibilityChange={setChipsVisible}
      />
    </div>
  )

  const historySlot = (
    <div className="w-full min-w-0" data-tour="my-market-test">
      <MarketTestHeroHistoryPanel
        expanded
        refreshKey={refreshKey}
        onHistoryCount={setHistoryCount}
        onHasContentChange={setHasHistoryContent}
        workspaceDisabled={workspaceDisabled}
        searchQuery={searchQuery}
        onReRun={onReRunMarketTest}
      />
    </div>
  )

  if (children) {
    return children({ chips: chipsSlot, chipsVisible, history: historySlot, historyHasContent: hasHistoryContent })
  }

  return (
    <div className="flex flex-col">
      {chipsSlot}
      {historySlot}
    </div>
  )
})

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react'
import type { SourcingHistoryRow } from '@/lib/sourcingTypes'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useIdeaChipsSession } from '@/hooks/useIdeaChipsSession'
import { SourcingKeywordChips } from '@/components/sourcing/SourcingKeywordChips'
import { SourcingHeroHistoryPanel } from '@/components/sourcing/SourcingHeroHistoryPanel'

export type SourcingHeroWorkspaceSlots = {
  /** Keyword chip suggestions — rendered in a separate card when visible. */
  chips: ReactNode
  chipsVisible: boolean
  /** Saved sourcing history cards. */
  history: ReactNode
  historyHasContent: boolean
}

export type SourcingHeroChipsHandle = {
  suggest: () => void
}

export const SourcingHeroChips = forwardRef<
  SourcingHeroChipsHandle,
  {
    onKeywordSelect: (keyword: string) => void
    onReSearch?: (row: SourcingHistoryRow) => void
    disabled?: boolean
    inputId?: string
    refreshKey?: string | number
    onSuggestLoadingChange?: (loading: boolean) => void
    fluidGlass?: boolean
    children?: (slots: SourcingHeroWorkspaceSlots) => ReactNode
  }
>(function SourcingHeroChips(
  {
    onKeywordSelect,
    disabled,
    inputId,
    refreshKey,
    onReSearch,
    onSuggestLoadingChange,
    fluidGlass = false,
    children,
  },
  ref,
) {
  const { user } = useAuth()
  const [historyCount, setHistoryCount] = useState<number | undefined>(undefined)
  const [hasHistoryContent, setHasHistoryContent] = useState(true)
  const [chipsVisible, setChipsVisible] = useState(false)
  const ideaChipsSession = useIdeaChipsSession('sourcing')

  useEffect(() => {
    if (!user?.id) {
      setHistoryCount(undefined)
      return
    }
    void (async () => {
      const { count } = await supabase
        .from('sourcing_search_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setHistoryCount(count ?? 0)
    })()
  }, [user?.id, refreshKey])

  const handleSuggest = useCallback(() => {
    if (disabled) return
    void ideaChipsSession.suggestChips()
  }, [disabled, ideaChipsSession.suggestChips])

  useImperativeHandle(ref, () => ({ suggest: handleSuggest }), [handleSuggest])

  const chipsSlot = (
    <div className="w-full min-w-0 overflow-x-hidden">
      <SourcingKeywordChips
        session={ideaChipsSession}
        fluidGlass={fluidGlass}
        embedded
        hideSuggestControl
        onSelect={onKeywordSelect}
        disabled={disabled}
        inputId={inputId}
        onLoadingChange={onSuggestLoadingChange}
        onVisibilityChange={setChipsVisible}
      />
    </div>
  )

  const historySlot = (
    <div className="w-full min-w-0" data-tour="my-sources">
      <SourcingHeroHistoryPanel
        expanded
        onHistoryCount={setHistoryCount}
        onHasContentChange={setHasHistoryContent}
        onReSearch={onReSearch}
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

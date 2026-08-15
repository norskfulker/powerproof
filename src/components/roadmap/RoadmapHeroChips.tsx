import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useIdeaChipsSession } from '@/hooks/useIdeaChipsSession'
import { IdeaChips } from '@/components/ideas/IdeaChips'
import { RoadmapRoomPanel } from '@/components/roadmap/RoadmapRoomPanel'
import { cn } from '@/lib/utils'

export type RoadmapHeroWorkspaceSlots = {
  /** Goal idea chips — rendered in a separate card when visible. */
  chips: ReactNode
  chipsVisible: boolean
  /** Saved roadmap history cards. */
  history: ReactNode
  historyHasContent: boolean
}

export type RoadmapHeroChipsHandle = {
  suggest: () => void
}

export const RoadmapHeroChips = forwardRef<
  RoadmapHeroChipsHandle,
  {
    onIdeaSelect: (idea: string) => void
    disabled?: boolean
    inputId?: string
    refreshKey?: number
    generating?: boolean
    generatingMessage?: string
    onResumeClarifyRoadmap?: (roadmap: import('@/pages/roadmap/roadmapTypes').UserRoadmap) => void
    onSuggestLoadingChange?: (loading: boolean) => void
    /** Hide loaded idea chips while clarification wizard is active. */
    hideChipsDuringWizard?: boolean
    fluidGlass?: boolean
    children?: (slots: RoadmapHeroWorkspaceSlots) => ReactNode
  }
>(function RoadmapHeroChips(
  {
    onIdeaSelect,
    disabled,
    inputId,
    refreshKey,
    generating = false,
    generatingMessage,
    onResumeClarifyRoadmap,
    onSuggestLoadingChange,
    hideChipsDuringWizard = false,
    fluidGlass = false,
    children,
  },
  ref,
) {
  const { user } = useAuth()
  const [historyCount, setHistoryCount] = useState<number | undefined>(undefined)
  const [chipsVisible, setChipsVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const ideaChipsSession = useIdeaChipsSession('roadmap')

  useEffect(() => {
    setSearchQuery('')
  }, [refreshKey])

  const handleSuggest = useCallback(() => {
    if (disabled) return
    void ideaChipsSession.suggestChips()
  }, [disabled, ideaChipsSession.suggestChips])

  useImperativeHandle(ref, () => ({ suggest: handleSuggest }), [handleSuggest])

  useEffect(() => {
    if (generating) setChipsVisible(false)
  }, [generating])

  const chipsSlot =
    !generating ? (
      <div className="w-full min-w-0 overflow-x-hidden">
        <IdeaChips
          session={ideaChipsSession}
          fluidGlass={fluidGlass}
          embedded
          hideSuggestControl
          suppressErrorDisplay
          context="roadmap"
          onSelect={onIdeaSelect}
          disabled={disabled}
          inputId={inputId}
          hideWhenLoaded={hideChipsDuringWizard}
          onLoadingChange={onSuggestLoadingChange}
          onVisibilityChange={setChipsVisible}
        />
      </div>
    ) : null

  const historySlot = user?.id ? (
    <div data-tour="my-roadmaps" className="w-full min-w-0">
      <RoadmapRoomPanel
        refreshKey={refreshKey}
        generating={generating}
        generatingMessage={generatingMessage}
        onResumeClarify={onResumeClarifyRoadmap}
        onHistoryCount={setHistoryCount}
        searchQuery={searchQuery}
      />
    </div>
  ) : null

  if (children) {
    const historyHasContent = (historyCount ?? 0) > 0
    return children({ chips: chipsSlot, chipsVisible, history: historySlot, historyHasContent })
  }

  return (
    <div className="flex flex-col gap-4">
      {chipsSlot}
      {historySlot}
    </div>
  )
})

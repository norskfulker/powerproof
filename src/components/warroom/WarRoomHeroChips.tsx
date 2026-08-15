import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useIdeaChipsSession } from '@/hooks/useIdeaChipsSession'
import { IdeaChips } from '@/components/ideas/IdeaChips'
import { WarRoomHeroHistoryPanel } from '@/components/warroom/WarRoomHeroHistoryPanel'
import { cn } from '@/lib/utils'
import type { UserPlaybook } from '@/lib/playbookTypes'

export type WarRoomHeroWorkspaceSlots = {
  chips: ReactNode
  chipsVisible: boolean
  history: ReactNode
  historyHasContent: boolean
}

export type WarRoomHeroChipsHandle = {
  suggest: () => void
}

const PLAYBOOK_STATUS_COMPLETE = 'complete' as const

export const WarRoomHeroChips = forwardRef<
  WarRoomHeroChipsHandle,
  {
    onIdeaSelect: (idea: string) => void
    disabled?: boolean
    inputId?: string
    refreshKey?: string | number
    className?: string
    warRoomPhase?: string
    workspaceDisabled?: boolean
    onReRunPlaybook?: (playbook: UserPlaybook) => void
    onResumeClarifyPlaybook?: (playbook: UserPlaybook) => void
    onResumeIntakeDraft?: () => void
    onDiscardIntakeDraft?: () => void
    onSuggestLoadingChange?: (loading: boolean) => void
    fluidGlass?: boolean
    children?: (slots: WarRoomHeroWorkspaceSlots) => ReactNode
  }
>(function WarRoomHeroChips(
  {
    onIdeaSelect,
    disabled,
    inputId,
    refreshKey,
    className,
    warRoomPhase = 'idle',
    workspaceDisabled = false,
    onReRunPlaybook,
    onResumeClarifyPlaybook,
    onResumeIntakeDraft,
    onDiscardIntakeDraft,
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
  const ideaChipsSession = useIdeaChipsSession('warroom')

  useEffect(() => {
    setSearchQuery('')
  }, [refreshKey])

  useEffect(() => {
    if (!user?.id) {
      setHistoryCount(undefined)
      return
    }
    void (async () => {
      const { count } = await supabase
        .from('user_playbooks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('generation_status', [PLAYBOOK_STATUS_COMPLETE, 'clarifying'])
      setHistoryCount(count ?? 0)
    })()
  }, [user?.id, refreshKey])

  const handleSuggest = useCallback(() => {
    if (workspaceDisabled || disabled) return
    void ideaChipsSession.suggestChips()
  }, [workspaceDisabled, disabled, ideaChipsSession.suggestChips])

  useImperativeHandle(ref, () => ({ suggest: handleSuggest }), [handleSuggest])

  const chipsSlot = (
    <div className={cn('w-full min-w-0 overflow-x-hidden', className)}>
      <IdeaChips
        session={ideaChipsSession}
        fluidGlass={fluidGlass}
        embedded
        hideSuggestControl
        context="warroom"
        onSelect={onIdeaSelect}
        disabled={disabled || workspaceDisabled}
        inputId={inputId}
        onLoadingChange={onSuggestLoadingChange}
        onVisibilityChange={setChipsVisible}
      />
    </div>
  )

  const historySlot = user?.id ? (
    <div data-tour="my-playbooks" className="w-full min-w-0">
      <WarRoomHeroHistoryPanel
        expanded
        refreshKey={refreshKey}
        warRoomPhase={warRoomPhase}
        onHistoryCount={setHistoryCount}
        onHasContentChange={setHasHistoryContent}
        onReRunPlaybook={onReRunPlaybook}
        onResumeClarifyPlaybook={onResumeClarifyPlaybook}
        onResumeIntakeDraft={onResumeIntakeDraft}
        onDiscardIntakeDraft={onDiscardIntakeDraft}
        workspaceDisabled={workspaceDisabled}
        searchQuery={searchQuery}
      />
    </div>
  ) : null

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

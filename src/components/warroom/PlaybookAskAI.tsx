import type { ReactNode } from 'react'
import { playbookAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'
import { WarRoomEditChatPanel } from '@/components/warroom/WarRoomEditChatPanel'
import type { WarroomEditCompleteResponse } from '@/lib/warroomEditChat'

type Props = {
  playbookId: string
  playbookTitle: string
  onEditComplete?: (payload: WarroomEditCompleteResponse) => void
  children?: ReactNode
}

export function PlaybookAskAI({ playbookId, playbookTitle, onEditComplete, children }: Props) {
  return (
    <AskAiChatStateProvider
      resourceId={playbookId}
      resourceTitle={playbookTitle}
      storageNamespace="playbook"
      adapter={playbookAskAiAdapter}
      ariaTitle="Ask AI about this playbook"
      layout="sidebar"
      showOpportunityEditToggle
      editToggleLabel="Edit"
      editModePanel={
        <WarRoomEditChatPanel playbookId={playbookId} onEditComplete={onEditComplete} />
      }
    >
      {children}
    </AskAiChatStateProvider>
  )
}

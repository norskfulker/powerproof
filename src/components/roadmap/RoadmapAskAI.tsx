import type { ReactNode } from 'react'
import { roadmapAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'

type Props = {
  roadmapId: string
  roadmapTitle: string
  children?: ReactNode
}

export function RoadmapAskAI({ roadmapId, roadmapTitle, children }: Props) {
  return (
    <AskAiChatStateProvider
      resourceId={roadmapId}
      resourceTitle={roadmapTitle}
      storageNamespace="roadmap"
      adapter={roadmapAskAiAdapter}
      ariaTitle="Ask AI about this roadmap"
      layout="sidebar"
    >
      {children}
    </AskAiChatStateProvider>
  )
}

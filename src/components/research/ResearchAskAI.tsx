import type { ReactNode } from 'react'
import { researchAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'

type Props = {
  userOpportunityId: string
  researchTitle: string
  children?: ReactNode
}

export function ResearchAskAI({ userOpportunityId, researchTitle, children }: Props) {
  return (
    <AskAiChatStateProvider
      resourceId={userOpportunityId}
      resourceTitle={researchTitle}
      storageNamespace="research"
      adapter={researchAskAiAdapter}
      ariaTitle="Ask AI about this research"
      layout="sidebar"
      showOpportunityEditToggle
    >
      {children}
    </AskAiChatStateProvider>
  )
}

import type { ReactNode } from 'react'
import { catalogAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'

/** Catalog opportunity Ask AI sidebar (ask-research-ai + opportunity_id). */
export function CatalogOpportunityAskAI({
  opportunityId,
  title,
  children,
}: {
  opportunityId: string
  title: string
  children: ReactNode
}) {
  return (
    <AskAiChatStateProvider
      resourceId={opportunityId}
      resourceTitle={title}
      storageNamespace="research"
      adapter={catalogAskAiAdapter}
      ariaTitle="Ask AI about this opportunity"
      layout="sidebar"
    >
      <AskAiChatPageShell>{children}</AskAiChatPageShell>
    </AskAiChatStateProvider>
  )
}

import type { ReactNode } from 'react'
import { onboardingCatalogAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'
import { AskAiChatPageShell } from '@/components/ask-ai/AskAiChatPageShell'

/** Onboarding catalog preview — Ask AI via ask-research-ai (opportunity_id + onboarding_demo). */
export function OnboardingOpportunityAskAI({
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
      adapter={onboardingCatalogAskAiAdapter}
      ariaTitle="Ask AI about this opportunity"
      layout="sidebar"
      panelHighlight
    >
      <AskAiChatPageShell>{children}</AskAiChatPageShell>
    </AskAiChatStateProvider>
  )
}

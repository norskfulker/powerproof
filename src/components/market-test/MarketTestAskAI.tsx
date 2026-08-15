import type { ReactNode } from 'react'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'
import { marketTestAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { MarketTestEditChatPanel } from '@/components/market-test/MarketTestEditChatPanel'
import type { EditChatCompleteResponse } from '@/lib/marketTestEditChat'

type Props = {
  marketTestId: string
  onEditComplete?: (payload: EditChatCompleteResponse) => void
  children?: ReactNode
}

export function MarketTestAskAI({ marketTestId, onEditComplete, children }: Props) {
  return (
    <AskAiChatStateProvider
      resourceId={marketTestId}
      resourceTitle="this market test"
      storageNamespace="market_test"
      adapter={marketTestAskAiAdapter}
      ariaTitle="Ask AI about this market test"
      layout="sidebar"
      showOpportunityEditToggle
      editToggleLabel="Edit"
      editModePanel={
        <MarketTestEditChatPanel marketTestId={marketTestId} onEditComplete={onEditComplete} />
      }
    >
      {children}
    </AskAiChatStateProvider>
  )
}

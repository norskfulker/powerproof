import type { ReactNode } from 'react'
import { AskAiSidebarShell } from '@/components/ask-ai/AskAiSidebarShell'
import { heroWorkspaceAskAiAdapter } from '@/components/ask-ai/askAiAdapters'
import { AskAiChatStateProvider } from '@/components/ask-ai/useAskAiChatState'
import { useAuth } from '@/contexts/AuthContext'
import type { DiscoverHeroTab } from '@/lib/discoverHeroRoutes'

const WORKSPACE_EMPTY_HINT: Partial<Record<DiscoverHeroTab | 'scanner', string>> = {
  research: 'Open a saved research from your history to chat with full context.',
  sourcing: 'Open a saved search from My sources to ask about suppliers and pricing.',
  'market-test': 'Open a market test from your history to dig into the verdict.',
  scanner: 'Open a scan from recent scans to ask about SEO, business, and competitors.',
  'war-room': 'Open a playbook from your history to pressure-test your strategy.',
  roadmap: 'Open a roadmap from your history to plan your next move.',
}

type DiscoverHeroAskAiShellProps = {
  mode: DiscoverHeroTab | 'scanner'
  children: ReactNode
}

/** Side Ask AI panel for discover hero pages (research, sourcing, market test, scanner, …). */
export function DiscoverHeroAskAiShell({ mode, children }: DiscoverHeroAskAiShellProps) {
  const { user } = useAuth()
  const resourceId = user?.id ? `${mode}:${user.id}` : ''

  if (!resourceId) {
    return <>{children}</>
  }

  return (
    <AskAiChatStateProvider
      resourceId={resourceId}
      resourceTitle={mode}
      storageNamespace="workspace"
      adapter={heroWorkspaceAskAiAdapter}
      ariaTitle="Ask AI"
      layout="sidebar"
      emptyStateHint={WORKSPACE_EMPTY_HINT[mode]}
    >
      <AskAiSidebarShell>{children}</AskAiSidebarShell>
    </AskAiChatStateProvider>
  )
}

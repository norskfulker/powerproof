import type { AskAiAdapter } from '@/lib/askAiTypes'
import type { AskAiStorageNamespace } from '@/lib/askAiStorage'
import { askAiEmptyStateTitle } from '@/lib/askAiPresentation'
import {
  askResearchSessionPreview,
  createAskCatalogOpportunitySession,
  createAskResearchSession,
  fetchAskCatalogOpportunityHistory,
  fetchAskResearchHistory,
  RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  sendAskCatalogOpportunityMessage,
  sendAskResearchMessage,
} from '@/lib/askResearchAi'
import {
  askWarroomSessionPreview,
  createAskWarroomSession,
  fetchAskWarroomHistory,
  sendAskWarroomMessage,
  WARROOM_ASK_AI_FALLBACK_SUGGESTIONS,
} from '@/lib/askWarroomAi'
import {
  createMarketTestChatSession,
  fetchMarketTestChatHistory,
  MARKET_TEST_ASK_AI_FALLBACK_SUGGESTIONS,
  marketTestChatSessionPreview,
  sendMarketTestChatMessage,
} from '@/lib/marketTestChatApi'
import {
  askRoadmapSessionPreview,
  createAskRoadmapSession,
  fetchAskRoadmapHistory,
  ROADMAP_ASK_AI_FALLBACK_SUGGESTIONS,
  sendAskRoadmapMessage,
} from '@/lib/askRoadmapAi'

/** @deprecated Use `askAiEmptyStateTitle` from `@/lib/askAiPresentation`. */
export function askAiEmptyStateLabel(namespace: AskAiStorageNamespace): string {
  return askAiEmptyStateTitle(namespace)
}

export const roadmapAskAiAdapter: AskAiAdapter = {
  placeholder: 'What should we plan next on this roadmap…',
  emptyHistoryCopy: 'No past sessions yet. Ask a question to start one.',
  defaultSuggestions: ROADMAP_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: createAskRoadmapSession,
  sendMessage: sendAskRoadmapMessage,
  fetchHistory: fetchAskRoadmapHistory,
  sessionPreview: askRoadmapSessionPreview,
}

export const marketTestAskAiAdapter: AskAiAdapter = {
  placeholder: 'What part of this verdict should we unpack…',
  emptyHistoryCopy: 'No past sessions yet. Ask a question to start one.',
  defaultSuggestions: MARKET_TEST_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: createMarketTestChatSession,
  sendMessage: sendMarketTestChatMessage,
  fetchHistory: fetchMarketTestChatHistory,
  sessionPreview: marketTestChatSessionPreview,
}

export const researchAskAiAdapter: AskAiAdapter = {
  placeholder: 'What should we dig into in this research…',
  emptyHistoryCopy: 'No past sessions yet. Ask a question to start one.',
  defaultSuggestions: RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: createAskResearchSession,
  sendMessage: (userOpportunityId, sessionId, message, options) =>
    sendAskResearchMessage(userOpportunityId, sessionId, message, options),
  fetchHistory: fetchAskResearchHistory,
  sessionPreview: askResearchSessionPreview,
}

/** Catalog opportunity Ask AI (uses ask-research-ai + opportunity_id). */
export const catalogAskAiAdapter: AskAiAdapter = {
  placeholder: 'Ask anything about this opportunity…',
  emptyHistoryCopy: 'No past sessions yet. Ask a question to start one.',
  defaultSuggestions: RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: (opportunityId) => createAskCatalogOpportunitySession(opportunityId),
  sendMessage: (opportunityId, sessionId, message, options) =>
    sendAskCatalogOpportunityMessage(opportunityId, sessionId, message, {
      recentMessages: options?.recentMessages,
    }),
  fetchHistory: (opportunityId) => fetchAskCatalogOpportunityHistory(opportunityId),
  sessionPreview: askResearchSessionPreview,
}

/** Onboarding catalog reveal — free Ask AI via onboarding_demo. */
export const onboardingCatalogAskAiAdapter: AskAiAdapter = {
  placeholder: 'Ask anything about this opportunity…',
  emptyHistoryCopy: 'Ask a question to explore this opportunity.',
  defaultSuggestions: RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: (opportunityId) =>
    createAskCatalogOpportunitySession(opportunityId, { onboardingDemo: true }),
  sendMessage: (opportunityId, sessionId, message, options) =>
    sendAskCatalogOpportunityMessage(opportunityId, sessionId, message, {
      recentMessages: options?.recentMessages,
      onboardingDemo: true,
    }),
  fetchHistory: (opportunityId) =>
    fetchAskCatalogOpportunityHistory(opportunityId, { onboardingDemo: true }),
  sessionPreview: askResearchSessionPreview,
}

export const playbookAskAiAdapter: AskAiAdapter = {
  placeholder: 'Which move should we pressure-test…',
  emptyHistoryCopy: 'No past sessions yet. Ask a question to start one.',
  defaultSuggestions: WARROOM_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: createAskWarroomSession,
  sendMessage: sendAskWarroomMessage,
  fetchHistory: fetchAskWarroomHistory,
  sessionPreview: askWarroomSessionPreview,
}

/** Hero workspace — local session only; full chat opens on saved items. */
export const heroWorkspaceAskAiAdapter: AskAiAdapter = {
  placeholder: 'Ask about your workspace…',
  emptyHistoryCopy: 'Open a saved item below to chat with full context.',
  defaultSuggestions: RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  createSession: async () => ({
    session_id: crypto.randomUUID(),
    status: 'active',
    suggestions: RESEARCH_ASK_AI_FALLBACK_SUGGESTIONS,
  }),
  sendMessage: async (_resourceId, _sessionId, message) => ({
    reply:
      'Open a saved item from your workspace history below to chat with full context about that report.\n\n' +
      `You asked: “${message.trim()}”`,
    byok_used: false,
    credits_remaining: 0,
  }),
  fetchHistory: async () => ({ sessions: [] }),
  sessionPreview: (session) =>
    session.messages?.[0]?.content?.slice(0, 72) ?? 'Workspace chat',
}
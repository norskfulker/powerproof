import { createContext, useContext, type ReactNode } from 'react'
import { useResearchOpportunity } from '@/hooks/useResearchOpportunity'

const ResearchOpportunityContext = createContext<ReturnType<typeof useResearchOpportunity> | null>(
  null,
)

export function ResearchOpportunityProvider({ children }: { children: ReactNode }) {
  const research = useResearchOpportunity()
  return (
    <ResearchOpportunityContext.Provider value={research}>
      {children}
    </ResearchOpportunityContext.Provider>
  )
}

export function useResearchOpportunityContext() {
  const ctx = useContext(ResearchOpportunityContext)
  if (!ctx) {
    throw new Error('useResearchOpportunityContext must be used within ResearchOpportunityProvider')
  }
  return ctx
}

export function useResearchOpportunityContextOptional() {
  return useContext(ResearchOpportunityContext)
}

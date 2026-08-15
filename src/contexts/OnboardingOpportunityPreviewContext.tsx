import { createContext, useContext, type ReactNode } from 'react'

export type OnboardingOpportunityPreviewContextValue = {
  /** First-time onboarding preview of a catalog opportunity detail. */
  active: boolean
  /** Open detail section accordions by default — off for onboarding (don’t reveal all). */
  accordionsOpen: boolean
  /** Hide interest / social tracking UI. */
  hideTracking: boolean
  /** Hide chrome back control while keeping the header. */
  hideHeaderBack: boolean
}

const OnboardingOpportunityPreviewContext =
  createContext<OnboardingOpportunityPreviewContextValue | null>(null)

export function OnboardingOpportunityPreviewProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  const value: OnboardingOpportunityPreviewContextValue = {
    active,
    accordionsOpen: false,
    hideTracking: active,
    hideHeaderBack: active,
  }
  return (
    <OnboardingOpportunityPreviewContext.Provider value={value}>
      {children}
    </OnboardingOpportunityPreviewContext.Provider>
  )
}

export function useOnboardingOpportunityPreview(): OnboardingOpportunityPreviewContextValue {
  return (
    useContext(OnboardingOpportunityPreviewContext) ?? {
      active: false,
      accordionsOpen: false,
      hideTracking: false,
      hideHeaderBack: false,
    }
  )
}

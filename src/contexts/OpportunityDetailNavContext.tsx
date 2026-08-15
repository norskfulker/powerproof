import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OpportunitySectionNavItem } from '@/components/opportunity/detail/OpportunitySectionNav'

type OpportunityDetailNavContextValue = {
  sections: OpportunitySectionNavItem[]
  setSections: (sections: OpportunitySectionNavItem[]) => void
}

const OpportunityDetailNavContext = createContext<OpportunityDetailNavContextValue | null>(null)

function navSectionsEqual(
  a: OpportunitySectionNavItem[],
  b: OpportunitySectionNavItem[],
): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const other = b[index]
    return item.id === other?.id && item.label === other?.label
  })
}

export function OpportunityDetailNavProvider({ children }: { children: ReactNode }) {
  const [sections, setSectionsState] = useState<OpportunitySectionNavItem[]>([])

  const setSections = useCallback((next: OpportunitySectionNavItem[]) => {
    setSectionsState((prev) => (navSectionsEqual(prev, next) ? prev : next))
  }, [])

  const value = useMemo(() => ({ sections, setSections }), [sections, setSections])

  return (
    <OpportunityDetailNavContext.Provider value={value}>{children}</OpportunityDetailNavContext.Provider>
  )
}

export function useOpportunityDetailNav() {
  const ctx = useContext(OpportunityDetailNavContext)
  if (!ctx) {
    throw new Error('useOpportunityDetailNav must be used within OpportunityDetailNavProvider')
  }
  return ctx
}

export function useOpportunityDetailNavOptional() {
  return useContext(OpportunityDetailNavContext)
}

function navSectionsKey(sections: OpportunitySectionNavItem[] | null): string {
  if (!sections?.length) return ''
  return sections.map((item) => `${item.id}\0${item.label}`).join('\n')
}

export function useOpportunityDetailNavRegistration(sections: OpportunitySectionNavItem[] | null) {
  const setSections = useContext(OpportunityDetailNavContext)?.setSections
  const sectionsKey = navSectionsKey(sections)

  useEffect(() => {
    if (!setSections) return
    setSections(sections ?? [])
    // sectionsKey captures nav content — avoid re-running on array identity churn.
  }, [setSections, sectionsKey])

  useEffect(() => {
    if (!setSections) return
    return () => setSections([])
  }, [setSections])
}

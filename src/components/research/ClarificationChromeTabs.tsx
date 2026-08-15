import { useMemo } from 'react'
import { OpportunityDetailSectionTabs } from '@/components/opportunity/detail/OpportunityDetailSectionTabs'
import type { OpportunitySectionNavItem } from '@/components/opportunity/detail/OpportunitySectionNav'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import type { ClarifyNavModel } from '@/lib/clarifyNav'

type ClarificationChromeTabsProps = {
  model: ClarifyNavModel
  onSelectItem: (id: string) => void
}

/** Top-bar progress tabs — replaces the clarification second sidebar rail. */
export function ClarificationChromeTabs({ model, onSelectItem }: ClarificationChromeTabsProps) {
  const sections = useMemo((): OpportunitySectionNavItem[] => {
    return model.items.map((item) => ({
      id: item.id,
      label: item.label,
    }))
  }, [model.items])

  const activeId =
    model.activeItemId && sections.some((s) => s.id === model.activeItemId)
      ? model.activeItemId
      : sections[0]?.id

  if (sections.length < 2) return null

  return (
    <OpportunityDetailSectionTabs
      sections={sections}
      mode="panel"
      activeId={activeId}
      onActiveIdChange={onSelectItem}
    />
  )
}

/** Registers clarify title + progress tabs into the shared feature-page chrome header. */
export function useClarificationChromeHeader(
  model: ClarifyNavModel,
  onSelectItem: (id: string) => void,
) {
  const tabs = useMemo(
    () => <ClarificationChromeTabs model={model} onSelectItem={onSelectItem} />,
    [model, onSelectItem],
  )

  useRegisterAppChromeHeader({
    title: 'Clarify',
    tabs,
  })
}

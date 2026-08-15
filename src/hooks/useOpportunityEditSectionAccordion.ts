import { useEffect, useMemo, useState } from 'react'
import {
  OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT,
  type OpportunityEditSectionFocusDetail,
} from '@/lib/opportunityEditSectionFocus'
import { useOnboardingOpportunityPreview } from '@/contexts/OnboardingOpportunityPreviewContext'
import { cn } from '@/lib/utils'

const HIGHLIGHT_MS = 3200

/**
 * Controlled accordion + highlight when edit chat or sidebar focuses this section.
 * Pass `accordionTargets` when one wrapper hosts multiple accordion items (e.g. marketing).
 */
export function useOpportunityEditSectionAccordion(
  editSectionKey: string | string[],
  accordionItemValue?: string,
  accordionTargets?: Record<string, string>,
) {
  const { accordionsOpen } = useOnboardingOpportunityPreview()
  const editSectionKeys = useMemo(
    () => (Array.isArray(editSectionKey) ? editSectionKey : [editSectionKey]),
    [Array.isArray(editSectionKey) ? editSectionKey.join('\0') : editSectionKey],
  )
  const [accordionValue, setAccordionValue] = useState<string | undefined>(() =>
    accordionsOpen && accordionItemValue ? accordionItemValue : undefined,
  )
  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    if (!accordionsOpen || !accordionItemValue) return
    setAccordionValue(accordionItemValue)
  }, [accordionsOpen, accordionItemValue])

  useEffect(() => {
    let timer: number | undefined
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<OpportunityEditSectionFocusDetail>).detail
      if (!detail || !editSectionKeys.includes(detail.sectionKey)) return

      const nextAccordion =
        accordionTargets?.[detail.sectionKey] ?? accordionItemValue
      if (nextAccordion) {
        setAccordionValue(nextAccordion)
      }
      setHighlighted(true)
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setHighlighted(false), HIGHLIGHT_MS)
    }

    window.addEventListener(OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT, onFocus)
    return () => {
      window.removeEventListener(OPPORTUNITY_EDIT_SECTION_FOCUS_EVENT, onFocus)
      if (timer) window.clearTimeout(timer)
    }
  }, [accordionItemValue, accordionTargets, editSectionKeys])

  const wrapperClassName = cn(
    'rounded-2xl transition-[box-shadow,outline-color] duration-300',
    highlighted &&
      'ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]',
  )

  return {
    accordionValue,
    onAccordionValueChange: setAccordionValue,
    wrapperClassName,
    highlighted,
  }
}

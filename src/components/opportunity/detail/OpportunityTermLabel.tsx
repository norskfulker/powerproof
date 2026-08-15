import type { ReactNode } from 'react'
import { DottedTermTooltip } from '@/components/opportunity/detail/DottedTermTooltip'
import {
  opportunityTermDefinition,
  type OpportunityTermKey,
} from '@/lib/opportunityTermDefinitions'
import { cn } from '@/lib/utils'

export type OpportunityTermLabelProps = {
  term: OpportunityTermKey
  children?: ReactNode
  className?: string
  /** Visible label when children omitted — defaults to a title-cased form of the term key. */
  label?: string
}

function defaultLabelForTerm(term: OpportunityTermKey): string {
  return term
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function OpportunityTermLabel({
  term,
  children,
  className,
  label,
}: OpportunityTermLabelProps) {
  const text = children ?? label ?? defaultLabelForTerm(term)
  const definition = opportunityTermDefinition(term)
  const heading = typeof text === 'string' ? text : undefined

  return (
    <DottedTermTooltip className={cn('inline-flex', className)} heading={heading} content={definition}>
      {text}
    </DottedTermTooltip>
  )
}

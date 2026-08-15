import { MarketingText } from '@/components/ui/MarketingText'
import { DottedTermTooltip } from '@/components/opportunity/detail/DottedTermTooltip'
import {
  opportunityTermDefinition,
  opportunityTermKeyForTitle,
  type OpportunityTermKey,
} from '@/lib/opportunityTermDefinitions'
import { cn } from '@/lib/utils'

type TwScroll = { startWhenInView: true; inViewResetKey: string }

export type OpportunitySectionTitleProps = {
  text: string
  term?: OpportunityTermKey
  twScroll?: TwScroll
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  className?: string
}

export function OpportunitySectionTitle({
  text,
  term,
  twScroll,
  as = 'h2',
  className,
}: OpportunitySectionTitleProps) {
  const resolvedTerm = term ?? opportunityTermKeyForTitle(text)
  const definition = resolvedTerm ? opportunityTermDefinition(resolvedTerm) : null

  const title = definition ? (
    <DottedTermTooltip heading={text} content={definition}>
      {twScroll ? (
        <MarketingText
          key={twScroll.inViewResetKey}
          as="span"
          text={text}
          speed="fast"
          wordWrap
          className="min-w-0"
        />
      ) : (
        text
      )}
    </DottedTermTooltip>
  ) : twScroll ? (
    <MarketingText
      key={twScroll.inViewResetKey}
      as="span"
      text={text}
      speed="fast"
      wordWrap
      className="min-w-0"
    />
  ) : (
    text
  )

  const Tag = as

  return (
    <div className={cn('inline-flex min-w-0 max-w-full items-center', className)}>
      <Tag className="m-0 min-w-0">{title}</Tag>
    </div>
  )
}

import { useCurrency } from '@/hooks/useCurrency'
import { DottedTermTooltip } from '@/components/opportunity/detail/DottedTermTooltip'
import type { ExpertTipStructured } from '@/types/research'

export function OperatorInsightsContent({ tips }: { tips: ExpertTipStructured[] }) {
  const { localizeText } = useCurrency()

  if (tips.length === 0) return null

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {tips.map((tip, i) => {
        const title = localizeText(tip.title).trim()
        const body = localizeText(tip.body).trim()
        if (!title && !body) return null

        return (
          <li key={`${tip.title}-${i}`} className="min-w-0 font-sans text-[13px] leading-relaxed text-foreground/90">
            {title && body ? (
              <DottedTermTooltip heading={title} content={body}>
                {title}
              </DottedTermTooltip>
            ) : (
              title || body
            )}
          </li>
        )
      })}
    </ul>
  )
}

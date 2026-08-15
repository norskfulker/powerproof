import {
  askAiSuggestionChipButtonClassName,
  askAiSuggestionChipIconWrapClassName,
} from '@/lib/askAiPresentation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Props = {
  actions: string[]
  messageCreatedAt: string
  usedChipForMessage: string | null
  onChipClick: (action: string, messageCreatedAt: string) => void
}

/** Next-step actions below Explore-an-angle suggestions — same pill chrome. */
export function AskAiNextActionChips({
  actions,
  messageCreatedAt,
  usedChipForMessage,
  onChipClick,
}: Props) {
  if (actions.length === 0) return null

  const disabled = usedChipForMessage === messageCreatedAt

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="inline-flex min-w-0 items-center gap-1.5 px-0.5 text-[11px] font-medium text-foreground/70">
        <span className={askAiSuggestionChipIconWrapClassName}>
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
        </span>
        Next steps
      </span>
      <div className="flex flex-wrap gap-2 px-0.5">
        {actions.map((action, i) => (
          <Tooltip key={`${messageCreatedAt}-${i}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChipClick(action, messageCreatedAt)}
                className={cn(askAiSuggestionChipButtonClassName, 'max-w-full')}
              >
                <span className={askAiSuggestionChipIconWrapClassName}>
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                </span>
                <span className="min-w-0 max-w-[16rem] truncate whitespace-nowrap">{action}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{action}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

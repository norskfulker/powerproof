import { AnimatePresence, motion } from 'framer-motion'
import type { AskAiSuggestion } from '@/lib/askAiTypes'
import type { AskAiStorageNamespace } from '@/lib/askAiStorage'
import {
  askAiSuggestionChipButtonClassName,
  askAiSuggestionChipIconWrapClassName,
  askAiSuggestionChipsLabel,
} from '@/lib/askAiPresentation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { keepNestedWheelScrollLocal } from '@/lib/appScrollRoot'
import { Sparkles } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Props = {
  namespace: AskAiStorageNamespace
  suggestions: AskAiSuggestion[]
  suggestionsKey: string
  disabled?: boolean
  onSelect: (prefill: string) => void
  className?: string
}

export function AskAiSuggestionIdeaChips({
  namespace,
  suggestions,
  suggestionsKey,
  disabled,
  onSelect,
  className,
}: Props) {
  if (suggestions.length === 0) return null

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span className="inline-flex min-w-0 items-center gap-1.5 px-0.5 text-[11px] font-medium text-foreground/70">
        <span className={askAiSuggestionChipIconWrapClassName}>
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
        </span>
        {askAiSuggestionChipsLabel(namespace)}
      </span>
      <div
        className="hide-scrollbar flex shrink-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-x]"
        onWheel={keepNestedWheelScrollLocal}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={suggestionsKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex w-max flex-nowrap gap-2 px-0.5 pb-0.5"
          >
            {suggestions.map((suggestion, index) => (
              <Tooltip key={`${suggestion.label}-${index}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(suggestion.prefill)}
                    className={askAiSuggestionChipButtonClassName}
                  >
                    <span className={askAiSuggestionChipIconWrapClassName}>
                      <Sparkles className="h-2.5 w-2.5" aria-hidden />
                    </span>
                    <span className="min-w-0 max-w-[14rem] truncate whitespace-nowrap">
                      {suggestion.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{suggestion.label}</TooltipContent>
              </Tooltip>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

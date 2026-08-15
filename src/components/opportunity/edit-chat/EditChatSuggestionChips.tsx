import { motion, useReducedMotion } from 'framer-motion'
import { Pill } from '@/components/ui/Pill'
import { getSuggestionIcon, suggestionChipLabel } from '@/lib/editChatSuggestions'
import type { EditChatSuggestion } from '@/lib/opportunityEditChat'
import { cn } from '@/lib/utils'

type EditChatSuggestionChipsProps = {
  suggestions: EditChatSuggestion[]
  visible: boolean
  onSelect: (prefill: string) => void
  className?: string
}

export function EditChatSuggestionChips({
  suggestions,
  visible,
  onSelect,
  className,
}: EditChatSuggestionChipsProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!visible || suggestions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion, index) => {
        const Icon = getSuggestionIcon(suggestion.section)
        return (
          <motion.div
            key={`${suggestion.section}-${index}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : index * 0.05, duration: 0.2 }}
          >
            <Pill
              as="button"
              type="button"
              icon={<Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />}
              onClick={() => onSelect(suggestion.prefill)}
            >
              {suggestionChipLabel(suggestion)}
            </Pill>
          </motion.div>
        )
      })}
    </div>
  )
}

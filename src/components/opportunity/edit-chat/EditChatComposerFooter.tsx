import { ResearchStylePicker } from '@/components/research/ResearchStylePicker'
import { Pill } from '@/components/ui/Pill'
import { Wand2 } from '@/lib/icons'
import type { ResearchStyle } from '@/lib/researchStyles'
import { cn } from '@/lib/utils'

type EditChatComposerFooterProps = {
  researchStyle: ResearchStyle
  onResearchStyleChange: (style: ResearchStyle) => void
  onOpenSectionPicker: () => void
  sectionPickerActive?: boolean
  disabled?: boolean
}

/** Research style + re-research — model defaults to Lite (no picker). */
export function EditChatComposerFooter({
  researchStyle,
  onResearchStyleChange,
  onOpenSectionPicker,
  sectionPickerActive,
  disabled,
}: EditChatComposerFooterProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border-subtle/60 pt-2">
      <ResearchStylePicker
        value={researchStyle}
        onChange={onResearchStyleChange}
        disabled={disabled}
        variant="hero"
        contentClassName="z-[10002]"
      />
      <Pill
        as="button"
        type="button"
        active={sectionPickerActive}
        disabled={disabled}
        icon={<Wand2 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />}
        onClick={onOpenSectionPicker}
        className={cn('shrink-0')}
      >
        Ask AI
      </Pill>
    </div>
  )
}

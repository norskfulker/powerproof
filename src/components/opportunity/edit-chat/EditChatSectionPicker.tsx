import { useMemo } from 'react'
import { ResearchStylePicker } from '@/components/research/ResearchStylePicker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from '@/lib/icons'
import {
  getAllReResearchSections,
  getReResearchSectionGroups,
  type ReResearchSectionKey,
} from '@/lib/reResearchSections'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { cn } from '@/lib/utils'

type EditChatSectionPickerProps = {
  researchStyle: ResearchStyle
  onResearchStyleChange: (style: ResearchStyle) => void
  selected: Set<ReResearchSectionKey>
  onSelectedChange: (next: Set<ReResearchSectionKey>) => void
  onRun: () => void
  onBack: () => void
  running?: boolean
}

export function EditChatSectionPicker({
  researchStyle,
  onResearchStyleChange,
  selected,
  onSelectedChange,
  onRun,
  onBack,
  running,
}: EditChatSectionPickerProps) {
  const sectionGroups = useMemo(() => getReResearchSectionGroups(researchStyle), [researchStyle])
  const allSections = useMemo(() => getAllReResearchSections(researchStyle), [researchStyle])
  const selectedCount = selected.size
  const styleShort =
    RESEARCH_STYLE_OPTIONS.find((o) => o.value === researchStyle)?.label ?? 'Standard'

  const toggleSection = (key: ReResearchSectionKey) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectedChange(next)
  }

  const toggleGroup = (groupId: string, select: boolean) => {
    const group = sectionGroups.find((g) => g.id === groupId)
    if (!group) return
    const next = new Set(selected)
    for (const { key } of group.sections) {
      if (select) next.add(key)
      else next.delete(key)
    }
    onSelectedChange(next)
  }

  const isGroupFullySelected = (groupId: string) => {
    const group = sectionGroups.find((g) => g.id === groupId)
    if (!group?.sections.length) return false
    return group.sections.every((s) => selected.has(s.key))
  }

  const runDisabled = running || selectedCount === 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={running}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="Back to chat"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <h3 className="text-sm font-semibold text-foreground">Select sections to update</h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-[11px]">
          <button
            type="button"
            disabled={running}
            onClick={() => onSelectedChange(new Set(allSections.map((s) => s.key)))}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            Select all
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            disabled={running}
            onClick={() => onSelectedChange(new Set())}
            className="text-muted-foreground hover:underline disabled:opacity-50"
          >
            Deselect all
          </button>
        </div>

        <div className="space-y-3">
          {sectionGroups.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {group.label}
                </p>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => toggleGroup(group.id, !isGroupFullySelected(group.id))}
                  className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {isGroupFullySelected(group.id) ? 'Deselect' : 'Select all'}
                </button>
              </div>
              <div className="grid gap-1">
                {group.sections.map(({ key, label }) => (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                      selected.has(key)
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border-subtle bg-background hover:bg-muted/30',
                      running && 'pointer-events-none opacity-50',
                    )}
                  >
                    <Checkbox
                      checked={selected.has(key)}
                      disabled={running}
                      onCheckedChange={() => toggleSection(key)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] font-medium leading-snug text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border-subtle p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ResearchStylePicker
            value={researchStyle}
            onChange={onResearchStyleChange}
            disabled={running}
            variant="hero"
            contentClassName="z-[10002]"
          />
        </div>
        <div className="text-[11px] text-muted-foreground">
          {selectedCount} section{selectedCount === 1 ? '' : 's'} · {styleShort}
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mb-0 w-full"
          loading={running}
          disabled={runDisabled}
          onClick={onRun}
        >
          {isByokActive ? 'Ask AI (your key)' : 'Ask AI →'}
        </Button>
      </div>
    </div>
  )
}

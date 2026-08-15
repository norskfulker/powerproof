import { ClipboardList, Play, Trash2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { EMPTY_WORKSPACE_FINANCIAL_METRICS } from '@/components/discover/DiscoverHeroMetricStrip'
import { cn } from '@/lib/utils'

export interface ClarificationDraftCardProps {
  draft: {
    id: string
    original_query: string
    country: string
    current_round: number
    status: 'in_progress' | 'ready'
    updated_at: string
  }
  onResume: (draftId: string) => void
  onDiscard: (draftId: string) => void
  disabled?: boolean
  className?: string
}

export function ClarificationDraftCard({
  draft,
  onResume,
  onDiscard,
  disabled = false,
  className,
}: ClarificationDraftCardProps) {
  const query = draft.original_query.trim()
  const title = query || 'Research draft'

  return (
    <DiscoverHeroWorkspaceItem
      title={title}
      iconOverride={ClipboardList}
      iconTone="amber"
      metrics={EMPTY_WORKSPACE_FINANCIAL_METRICS}
      highlight="in-progress"
      onActivate={disabled ? undefined : () => onResume(draft.id)}
      disabled={disabled}
      className={className}
      actions={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled}
            className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
            onClick={(e) => {
              e.stopPropagation()
              onResume(draft.id)
            }}
          >
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Continue
          </Button>
          <button
            type="button"
            aria-label="Discard"
            title="Discard"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onDiscard(draft.id)
            }}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors',
              'hover:bg-destructive/10 hover:text-destructive',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/70',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      }
    />
  )
}

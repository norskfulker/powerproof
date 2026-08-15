import { useState } from 'react'
import { RefreshCw, Trash2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RE_RESEARCH_CONFIRM } from '@/lib/rerunConfirm'
import { cn } from '@/lib/utils'

export type RoomCardActionsConfirmCopy = {
  title: string
  description: string
  confirmLabel: string
}

export function RoomCardActions({
  onReRun,
  onDelete,
  reRunLabel = 'Re-research',
  reRunVariant = 'secondary',
  disabled = false,
  className,
  requireReRunConfirm,
  reRunConfirm,
  compact = false,
}: {
  onReRun?: () => void
  onDelete: () => void
  reRunLabel?: string
  reRunVariant?: 'primary' | 'secondary'
  disabled?: boolean
  className?: string
  /** Inline row of actions for table cells — no full-width spread. */
  compact?: boolean
  /** When true, shows a confirmation before re-run. Defaults true for Re-research. */
  requireReRunConfirm?: boolean
  /** Override confirm dialog copy (defaults to re-research copy). */
  reRunConfirm?: RoomCardActionsConfirmCopy
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const showReRun = typeof onReRun === 'function'
  const shouldConfirm = requireReRunConfirm ?? reRunLabel === 'Re-research'
  const confirmCopy = reRunConfirm ?? {
    title: RE_RESEARCH_CONFIRM.title,
    description: RE_RESEARCH_CONFIRM.description,
    confirmLabel: RE_RESEARCH_CONFIRM.confirmLabel,
  }

  const handleReRunClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onReRun) return
    if (shouldConfirm) {
      setConfirmOpen(true)
      return
    }
    onReRun()
  }

  return (
    <>
      <div
        className={cn(
          compact
            ? 'inline-flex items-center justify-end gap-1.5'
            : 'flex w-full items-center justify-between gap-2 pt-2',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {showReRun ? (
          <Button
            type="button"
            variant={reRunVariant}
            size="sm"
            disabled={disabled}
            className="h-7 min-h-7 w-auto shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold"
            onClick={handleReRunClick}
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {reRunLabel}
          </Button>
        ) : compact ? null : (
          <span aria-hidden />
        )}
        <button
          type="button"
          aria-label="Delete"
          title="Delete"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
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
      {showReRun && shouldConfirm ? (
        <ConfirmDialog
          open={confirmOpen}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          onConfirm={() => {
            setConfirmOpen(false)
            onReRun?.()
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  )
}

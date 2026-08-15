import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'
import { ChevronLeft, ChevronRight } from '@/lib/icons'
import { cn } from '@/lib/utils'

type RailCollapseToggleProps = ComponentPropsWithoutRef<'button'> & {
  collapsed: boolean
  onToggle: () => void
  expandLabel?: string
  collapseLabel?: string
  /** Which edge the rail sits on — controls chevron direction. */
  side?: 'left' | 'right'
}

export const RailCollapseToggle = forwardRef<HTMLButtonElement, RailCollapseToggleProps>(function RailCollapseToggle({
  collapsed,
  onToggle,
  expandLabel = 'Expand',
  collapseLabel = 'Collapse',
  className,
  side = 'left',
  ...buttonProps
}, ref) {
  const collapseIcon =
    side === 'right' ? (
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    ) : (
      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
    )
  const expandIcon =
    side === 'right' ? (
      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
    ) : (
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    )

  return (
    <button
      ref={ref}
      {...buttonProps}
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-border-subtle/80 bg-card text-muted-foreground',
        'transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={collapsed ? expandLabel : collapseLabel}
    >
      {collapsed ? expandIcon : collapseIcon}
    </button>
  )
})
RailCollapseToggle.displayName = 'RailCollapseToggle'

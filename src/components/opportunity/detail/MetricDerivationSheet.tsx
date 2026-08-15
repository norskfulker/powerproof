import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useIsCompactSheetViewport } from '@/hooks/useResponsiveSheetSide'
import { cn } from '@/lib/utils'

export type MetricDerivationSheetProps = {
  children: ReactNode
  label?: string
  /** Metric value (or custom node) used as the click trigger. */
  trigger?: ReactNode
  triggerClassName?: string
}

const defaultTriggerClassName =
  'inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center border-0 bg-transparent p-0 align-middle text-[13px] leading-none text-muted-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'

const floatingSheetChromeClassName =
  'overflow-hidden rounded-2xl border border-border-subtle/80 bg-card p-0 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.22)]'

const bottomSheetClassName = cn(
  floatingSheetChromeClassName,
  'flex w-[calc(100vw-1.5rem)] max-w-full flex-col gap-0',
  '!inset-x-3 !bottom-3 !left-3 !right-3 !top-auto !h-auto',
  '!max-h-[min(85dvh,calc(100dvh-1.5rem))] !w-auto',
)

const rightSheetClassName = cn(
  floatingSheetChromeClassName,
  'flex flex-col gap-0',
  '!inset-y-3 !right-3 !left-auto !top-3 !bottom-3',
  '!h-auto !max-h-[calc(100dvh-1.5rem)]',
  '!w-[min(calc(100vw-1.5rem),24rem)]',
)

/** Side / bottom sheet for metric derivation details (setup, profit, effort). */
export function MetricDerivationSheet({
  children,
  label = 'Derivation details',
  trigger,
  triggerClassName,
}: MetricDerivationSheetProps) {
  const isCompact = useIsCompactSheetViewport()
  const [open, setOpen] = useState(false)

  const triggerNode = trigger ? (
    <button
      type="button"
      className={cn(
        'border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        triggerClassName,
      )}
      aria-label={label}
    >
      {trigger}
    </button>
  ) : (
    <button type="button" className={defaultTriggerClassName} aria-label={label}>
      <span aria-hidden>ⓘ</span>
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{triggerNode}</SheetTrigger>
      <SheetContent
        side={isCompact ? 'bottom' : 'right'}
        className={isCompact ? bottomSheetClassName : rightSheetClassName}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border-subtle/60 px-4 py-3.5 text-left">
          <SheetTitle className="font-sans text-[15px] font-semibold text-foreground">{label}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 font-sans text-sm text-foreground legacy-scrollbar">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

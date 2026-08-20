import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type MetricDerivationDialogProps = {
  children: ReactNode
  label?: string
  description?: string
  /** Metric value (or custom node) used as the click trigger. */
  trigger?: ReactNode
  triggerClassName?: string
}

/** Centered dialog for setup / profit derivation details. */
export function MetricDerivationDialog({
  children,
  label = 'Derivation details',
  description,
  trigger,
  triggerClassName,
}: MetricDerivationDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent size="lg" layout="flex" className="gap-0">
        <DialogHeader className="border-b border-border-subtle/60 px-5 py-4 sm:px-6">
          <DialogTitle className="!text-base sm:!text-[18px]">{label}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              How this metric was calculated
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="py-4">{children}</DialogBody>
      </DialogContent>
    </Dialog>
  )
}

import type { ReactNode } from 'react'
import { Lock } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { openSubscriptionPricingDialog } from '@/store/filterStore'
import { cn } from '@/lib/utils'

export type OpportunityProLockProps = {
  locked?: boolean
  children: ReactNode
  className?: string
  /** Extra classes on the blurred content layer. */
  contentClassName?: string
  /** Minimum height so the PRO sticker still reads when content is short. */
  minHeightClassName?: string
}

/**
 * Blurs section / accordion content and overlays a Pro-plan CTA.
 */
export function OpportunityProLock({
  locked = false,
  children,
  className,
  contentClassName,
  minHeightClassName = 'min-h-[11rem]',
}: OpportunityProLockProps) {
  if (!locked) return <>{children}</>

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-xl',
        minHeightClassName,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none select-none blur-[6px]',
          contentClassName,
        )}
      >
        {children}
      </div>

      <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-background/70 px-4 py-6 text-center backdrop-blur-[2px]">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary px-2.5 py-1',
            'font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-sm',
          )}
        >
          <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          Locked
        </span>
        <div className="max-w-sm space-y-1">
          <p className="font-sans text-[14px] font-semibold text-foreground sm:text-[15px]">
            Included on Unlimited
          </p>
          <p className="font-sans text-[12px] text-muted-foreground sm:text-[13px]">
            This section and the rest of your research depth are part of the Unlimited plan.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          onClick={openSubscriptionPricingDialog}
        >
          View Unlimited
        </Button>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const dottedTermTriggerClassName = cn(
  'inline max-w-full min-w-0 cursor-help border-0 bg-transparent p-0 text-inherit [font:inherit]',
  'underline decoration-dotted decoration-muted-foreground/70 underline-offset-[0.22em]',
  'hover:decoration-foreground/55',
)

export const dottedTermTooltipContentClassName = cn(
  'max-w-[min(20rem,calc(100vw-2rem))] rounded-md px-3 py-2',
  'text-left text-xs font-normal leading-relaxed',
)

export type DottedTermTooltipProps = {
  children: ReactNode
  content: ReactNode
  /** Optional heading shown above the tooltip body. */
  heading?: string
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/** Wraps text in a dotted underline; hover/focus shows a compact tooltip. */
export function DottedTermTooltip({
  children,
  content,
  heading,
  className,
  side = 'top',
}: DottedTermTooltipProps) {
  if (content == null || content === false || content === '') {
    return <span className={className}>{children}</span>
  }

  const label = heading ?? (typeof children === 'string' ? children : undefined)

  return (
    <Tooltip delayDuration={160}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(dottedTermTriggerClassName, className)}
          aria-label={label ? `About ${label}` : undefined}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align="center"
        sideOffset={6}
        showArrow
        className={dottedTermTooltipContentClassName}
      >
        {heading ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {heading}
          </p>
        ) : null}
        {typeof content === 'string' ? <p className="m-0">{content}</p> : content}
      </TooltipContent>
    </Tooltip>
  )
}

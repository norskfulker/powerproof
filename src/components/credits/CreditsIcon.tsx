import { Fragment, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const ICON_SIZE = { xs: 10, sm: 11, md: 13 } as const

/** Filled credit coupon — use instead of the "cr" suffix. */
export function CreditsIcon({
  className,
  size = 'sm',
}: {
  className?: string
  size?: keyof typeof ICON_SIZE | number
}) {
  const px = typeof size === 'number' ? size : ICON_SIZE[size]

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={cn('inline-block shrink-0 text-current', className)}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M5 4h14a2 2 0 0 1 2 2v2.05c-1.2.55-2 1.75-2 3.15s.8 2.6 2 3.15V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.65c1.2-.55 2-1.75 2-3.15S4.2 8.6 3 8.05V6a2 2 0 0 1 2-2Zm7 4.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
      />
    </svg>
  )
}

function formatCreditPart(value: number | string): string {
  return typeof value === 'number' ? value.toLocaleString('en-IN') : value
}

/** Compact credit figure + icon (replacement for deleted CreditsAmount API). */
export function formatCreditsDisplay(
  amount?: number | string,
  amounts?: Array<number | string>,
): string {
  const parts = amounts ?? (amount != null ? [amount] : [])
  return parts.map(formatCreditPart).join('+')
}

export function CreditsFigure({
  amount,
  amounts,
  className,
  iconClassName,
  size = 'sm',
  suffix,
}: {
  amount?: number | string
  amounts?: Array<number | string>
  className?: string
  iconClassName?: string
  size?: keyof typeof ICON_SIZE
  suffix?: ReactNode
}) {
  const parts = amounts ?? (amount != null ? [amount] : [])
  if (parts.length === 0) return null

  const textClass =
    size === 'xs' ? 'text-[9px] leading-none' : size === 'sm' ? 'text-[10px] leading-none' : 'text-xs leading-none'

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 tabular-nums font-semibold', textClass, className)}
    >
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="font-bold opacity-70">+</span> : null}
          <span>{formatCreditPart(part)}</span>
        </Fragment>
      ))}
      <CreditsIcon size={size} className={iconClassName} />
      {suffix}
    </span>
  )
}

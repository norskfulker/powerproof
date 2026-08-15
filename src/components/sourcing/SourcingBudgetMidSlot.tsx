import { useEffect, useRef, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { sanitizeBudgetInput } from '@/lib/budgetInput'
import { HERO_FOOTER_CHIP_BUTTON_CLASS } from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'

interface SourcingBudgetMidSlotProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
  /** `heroFooter` matches discover hero composer footer chip controls. */
  variant?: 'midSlot' | 'heroFooter'
}

function formatBudgetAmount(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return trimmed
  return n.toLocaleString('en-IN')
}

export function SourcingBudgetMidSlot({
  value,
  onChange,
  disabled = false,
  className,
  variant = 'midSlot',
}: SourcingBudgetMidSlotProps) {
  const { symbol, currency } = useCurrency()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.trim().length > 0

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const displayLabel = hasValue
    ? `${symbol}${formatBudgetAmount(value)}`
    : 'Set budget'

  const isHeroFooter = variant === 'heroFooter'

  return (
    <div
      data-tour="source-budget"
      className={cn(
        'flex shrink-0 items-stretch',
        isHeroFooter ? 'h-7 min-h-7 items-center' : 'h-full min-h-[44px] self-stretch',
        className,
      )}
    >
      {open ? (
        <div
          className={cn(
            'flex flex-col justify-center gap-0.5',
            isHeroFooter
              ? 'h-7 min-w-[9rem] max-w-[11rem] px-1.5'
              : 'h-full min-w-[9.5rem] max-w-[12rem] flex-1 px-2 layout-sm:min-w-[11rem] layout-sm:px-3',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{symbol}</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={`Budget (${currency})`}
              value={value}
              onChange={(e) => onChange(sanitizeBudgetInput(e.target.value))}
              onBlur={() => {
                if (!value.trim()) setOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  e.stopPropagation()
                }
              }}
              disabled={disabled}
              className={cn(
                'h-8 min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none',
                'placeholder:text-muted-foreground/50',
                'disabled:opacity-40',
              )}
              aria-label={`Budget in ${currency}`}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-1.5 transition-colors disabled:opacity-40',
            isHeroFooter
              ? cn(HERO_FOOTER_CHIP_BUTTON_CLASS, 'h-7 min-h-7 px-2 text-[11px] font-medium')
              : cn(
                  'h-full min-h-[44px] px-2.5 text-xs font-semibold layout-sm:px-3',
                  'hover:bg-muted/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                ),
            hasValue ? 'text-foreground' : 'text-muted-foreground',
          )}
          aria-label={hasValue ? `Budget ${displayLabel}, click to edit` : 'Set budget'}
        >
          <span className="shrink-0 opacity-80" aria-hidden>
            {symbol}
          </span>
          <span className="whitespace-nowrap">{displayLabel}</span>
        </button>
      )}
    </div>
  )
}

import type { InputHTMLAttributes, KeyboardEventHandler, ReactNode } from 'react'

import {
  discoverHeroButtonPrimaryClassName,
  discoverHeroComposerErrorBelowClassName,
  discoverHeroComposerFooterBelowClassName,
  discoverHeroComposerShellErrorClassName,
} from '@/components/discover/discoverHeroTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type HeroInputProps = {
  onSubmit: () => void
  /** Built-in single-line field value. Ignored when `inputSlot` is set. */
  value?: string
  onChange?: (next: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  loading?: boolean
  /** External submit gate (empty query, flow locks, …). */
  submitDisabled?: boolean
  /** URL / submit validation from the page. */
  inputError?: string | null
  /** Live moderation message — also blocks submit while set. */
  moderationError?: string | null
  /** Footer chips under the card (Generate Ideas, Fresh Crawl, …). */
  detailsSlot?: ReactNode
  /**
   * Custom field (e.g. discover textarea). When set, the built-in `Input` is
   * not rendered — pass keyboard submit on the slot yourself.
   */
  inputSlot?: ReactNode
  /** Affordance to the left of the built-in field (e.g. live site favicon). */
  leadingSlot?: ReactNode
  className?: string
  submitLabel?: string
  submitAriaLabel?: string
  submitTitle?: string
  submitAccent?: 'default' | 'war-room'
  hideSubmitButton?: boolean
  inputAriaLabel?: string
  inputId?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  /** Product-tour hook on the built-in field. */
  'data-tour'?: string
}

const heroInputCardClassName = cn(
  'group/composer relative z-[1] flex w-full min-w-0 flex-col gap-3 overflow-visible text-left text-foreground',
  'layout-sm:flex-row layout-sm:items-center',
  'rounded-2xl bg-card px-4 py-5 layout-sm:p-3.5',
  'border border-foreground/12',
  'shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]',
  'transition-[border-color,box-shadow] duration-150 ease-out',
  'hover:border-foreground/22',
  'focus-within:border-foreground/35',
  'focus-within:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.22),0_2px_8px_-2px_rgba(0,0,0,0.08)]',
  'active:border-foreground/40',
  'active:shadow-[0_6px_18px_-8px_rgba(0,0,0,0.28),0_1px_4px_-1px_rgba(0,0,0,0.1)]',
)

/** Half-cut bar under the input card — only bottom corners, slightly narrower. */
const heroInputHangingBarClassName = cn(
  'relative z-0 -mt-px flex w-[calc(100%-1.25rem)] max-w-full items-center justify-between gap-2',
  'rounded-b-2xl rounded-t-none border border-t-0 border-foreground/12 bg-card px-4 py-3 layout-sm:px-3 layout-sm:py-2',
)

/**
 * Shared room / discover hero composer: card with large field + Get Insights,
 * optional half-cut details bar below.
 */
export function HeroInput({
  value = '',
  onChange,
  onSubmit,
  placeholder,
  maxLength,
  disabled = false,
  loading = false,
  submitDisabled = false,
  inputError = null,
  moderationError = null,
  detailsSlot,
  inputSlot,
  leadingSlot,
  className,
  submitLabel = 'Get Insights',
  submitAriaLabel,
  submitTitle,
  submitAccent = 'default',
  hideSubmitButton = false,
  inputAriaLabel = 'Search',
  inputId,
  inputMode,
  autoComplete = 'off',
  onKeyDown,
  'data-tour': dataTour,
}: HeroInputProps) {
  const displayError = inputError ?? moderationError
  const blocked = disabled || loading || submitDisabled || Boolean(moderationError)
  const resolvedSubmitAriaLabel = submitAriaLabel ?? submitLabel

  const handleSubmit = () => {
    if (blocked) return
    onSubmit()
  }

  const field = (
    <Input
      id={inputId}
      type="text"
      inputMode={inputMode}
      autoComplete={autoComplete}
      data-tour={dataTour}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      value={value}
      maxLength={maxLength}
      onChange={(event) => {
        const next = event.target.value
        onChange?.(
          maxLength != null && maxLength > 0 ? next.slice(0, maxLength) : next,
        )
      }}
      placeholder={placeholder}
      aria-label={inputAriaLabel}
      disabled={disabled}
      flush
      fieldStateBorder={false}
      wrapperClassName="flex min-w-0 flex-1 flex-col [&>div]:w-full [&>div]:min-w-0"
      className={cn(
        'box-border w-full min-w-0 max-w-full border-0 bg-transparent shadow-none',
        'hover:bg-transparent focus-visible:bg-transparent focus-visible:shadow-none',
        'disabled:hover:bg-transparent disabled:focus-visible:bg-transparent',
        'h-14 px-1 text-xl layout-sm:h-14 layout-sm:text-xl',
        'placeholder:text-foreground/45 placeholder:text-xl',
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter') {
          event.preventDefault()
          handleSubmit()
        }
      }}
    />
  )

  return (
    <div className={cn('flex w-full min-w-0 flex-col items-center', className)}>
      <div
        className={cn(
          heroInputCardClassName,
          displayError && discoverHeroComposerShellErrorClassName,
        )}
      >
        <div className="flex w-full min-w-0 flex-1 items-center gap-2">
          {inputSlot ?? (
            leadingSlot ? (
              <>
                <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
                  {leadingSlot}
                </span>
                {field}
              </>
            ) : (
              field
            )
          )}
        </div>
        {!hideSubmitButton ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={blocked}
            loading={loading}
            disablePressAnimation
            className={cn(
              discoverHeroButtonPrimaryClassName,
              'h-12 w-full shrink-0 rounded-lg px-5 text-base',
              'layout-sm:h-14 layout-sm:w-auto layout-sm:px-6 layout-sm:text-lg',
              submitAccent === 'war-room' &&
                'bg-red-600 text-white border-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600',
            )}
            aria-label={resolvedSubmitAriaLabel}
            title={submitTitle ?? resolvedSubmitAriaLabel}
          >
            {submitLabel}
          </Button>
        ) : null}
      </div>

      {detailsSlot ? (
        <div className={heroInputHangingBarClassName}>{detailsSlot}</div>
      ) : null}

      {displayError ? (
        <div className={cn(discoverHeroComposerFooterBelowClassName, 'w-full items-center pt-1.5')}>
          <div className={discoverHeroComposerErrorBelowClassName} role="alert">
            <p className="font-sans text-[13px] leading-[1.4] text-[hsl(0,72%,51%)]">
              {displayError}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

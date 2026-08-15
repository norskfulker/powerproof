import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'

import { cn } from '@/lib/utils'

type DiscoverHeroComposerInputProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'rows'
> & {
  /** Smaller text — used by Ask AI dock composer. */
  compact?: boolean
  /** Center placeholder overlay only; typed text stays left-aligned. */
  centerPlaceholder?: boolean
  /** Single-line truncated placeholder overlay (Ask AI sidebar). */
  truncatePlaceholder?: boolean
  /** Grow textarea height as the user types more text. */
  autoGrow?: boolean
  /** Single-line search row — one-line placeholder, fixed height (investors search). */
  singleLine?: boolean
}

const COMPOSER_INPUT_ERROR_CLASS = 'font-sans text-[13px] leading-[1.4] text-[hsl(0,72%,51%)]'

export const composerInputErrorBorderClassName = 'ring-1 ring-[hsl(0,72%,51%)]'

export function ComposerInlineInputError({ message }: { message: string }) {
  return <p className={COMPOSER_INPUT_ERROR_CLASS}>{message}</p>
}

/**
 * Input sizing inside discover hero composer.
 * Large hero field — `text-xl` with a taller baseline so it matches the
 * Get Insights card. Compact / Ask AI keep a smaller scale.
 */
const discoverHeroInputClassName =
  'font-sans w-full max-w-full text-left text-xl font-medium tracking-normal' +
  ' placeholder:font-sans placeholder:text-foreground/45 placeholder:text-xl' +
  ' focus:placeholder:text-foreground/30'

/** Fixed empty height — single-row baseline. With `autoGrow`, expands up to
 *  a small cap so the row stays a "single row" rather than a tall block. */
const discoverHeroComposerInputReservedHeightClassName =
  'min-h-[3.5rem] md:min-h-[3.75rem]'

const COMPACT_INPUT_CLASS =
  'text-sm font-medium tracking-normal layout-sm:text-sm' +
  ' placeholder:text-sm layout-sm:placeholder:text-sm'

const COMPACT_HEIGHT = 'min-h-[3rem]'

const SINGLE_LINE_HEIGHT = 'min-h-[2.25rem] layout-sm:min-h-[2.5rem]'

export const DiscoverHeroComposerInput = forwardRef<
  HTMLTextAreaElement,
  DiscoverHeroComposerInputProps
>(function DiscoverHeroComposerInput(
  {
    className,
    value,
    onChange,
    placeholder,
    compact = false,
    centerPlaceholder: _centerPlaceholder = false,
    truncatePlaceholder: _truncatePlaceholder = false,
    autoGrow = false,
    singleLine = false,
    ...props
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  /** Grow with content when `autoGrow` is set. `singleLine` stays fixed.
   *  Auto-grow cap is intentionally small — keeps the composer a compact single
   *  row rather than a tall block. Beyond the cap, the textarea scrolls
   *  vertically so all typed text stays reachable. */
  const syncAutoGrowHeight = useCallback(() => {
    if (!autoGrow || singleLine) return
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, 120)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
  }, [autoGrow, singleLine])

  useLayoutEffect(() => {
    if (!autoGrow || singleLine) {
      const el = innerRef.current
      if (el) {
        el.style.height = ''
        el.style.overflowY = singleLine ? 'hidden' : ''
        el.style.overflowX = singleLine && String(value ?? '').trim() ? 'auto' : 'hidden'
      }
      return
    }
    syncAutoGrowHeight()
  }, [autoGrow, singleLine, syncAutoGrowHeight, value])

  return (
    <div className="relative flex min-w-0 w-full flex-col">
      <textarea
        ref={setRef}
        rows={1}
        value={value}
        onChange={(e) => {
          onChange?.(e)
          if (autoGrow) requestAnimationFrame(() => syncAutoGrowHeight())
        }}
        placeholder={placeholder}
        className={cn(
          'relative z-[1] block min-w-0 w-full max-w-full resize-none border-0 bg-transparent p-0 shadow-none outline-none',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'transition-colors duration-200',
          'whitespace-pre-wrap break-words [word-break:break-word] leading-snug',
          'text-left text-foreground caret-foreground',
          compact ? COMPACT_INPUT_CLASS : discoverHeroInputClassName,
          singleLine
            ? SINGLE_LINE_HEIGHT
            : compact
              ? COMPACT_HEIGHT
              : discoverHeroComposerInputReservedHeightClassName,
          singleLine && 'whitespace-nowrap',
          className,
        )}
        {...props}
      />
    </div>
  )
})

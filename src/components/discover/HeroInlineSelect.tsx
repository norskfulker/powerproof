/**
 * Shared inline `Select` primitive for discover-hero footer / toolbar chips.
 *
 * Used for things like "Connected to Gemini" and "Destination: Public Catalog"
 * — a small, chip-style trigger that opens a tightly-scoped menu beside it.
 *
 * Two visual modes:
 *  - `default`  — neutral chip. Inherits the system Select trigger chrome.
 *  - `accent`   — primary-tinted chip when an "active" value is selected
 *                 (e.g. visibility = "catalog"). Driven by `tone === 'accent'`.
 *
 * Reuses the underlying `@/components/ui/select` primitive, so it inherits
 * the secondary-button surface (border-default, bg-surface, hover depth)
 * from the design system.
 */
import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type HeroInlineSelectTone = 'default' | 'accent'

export type HeroInlineSelectItem = {
  value: string
  label: ReactNode
  icon?: ReactNode
}

export type HeroInlineSelectProps = {
  value: string
  onValueChange: (value: string) => void
  /** Optional icon rendered before the prefix/value (e.g. a brand logo, Globe, Lock). */
  leadingIcon?: ReactNode
  /** Optional small caps-style label that sits before the value ("Connected to", "Destination"). */
  prefix?: ReactNode
  /** Override the visible value text in the trigger; defaults to current SelectValue. */
  valueLabel?: ReactNode
  /** Items rendered in the dropdown menu. */
  items: ReadonlyArray<HeroInlineSelectItem>
  /** Select content alignment. */
  align?: 'start' | 'center' | 'end'
  /** Min width of the dropdown content. */
  contentMinWidthClass?: string
  /** Color tone — `accent` paints the trigger with primary tint. */
  tone?: HeroInlineSelectTone
  /** Accessible label for the trigger (e.g. "Connected to Gemini"). */
  'aria-label'?: string
  /** Disable the trigger. */
  disabled?: boolean
  /** Extra className for the trigger. */
  triggerClassName?: string
  /** Extra className for the content. */
  contentClassName?: string
  /** Extra className for each item. */
  itemClassName?: string
  /** Forwarded to each SelectItem (size hint). */
  itemTextSizeClassName?: string
}

const TONE_CLASSES: Record<HeroInlineSelectTone, string> = {
  default: 'hover:border-border-strong hover:bg-muted',
  accent: 'border-primary/30 bg-primary/[0.07] text-primary hover:border-primary/45 hover:bg-primary/[0.10]',
}

export function HeroInlineSelect({
  value,
  onValueChange,
  leadingIcon,
  prefix,
  valueLabel,
  items,
  align = 'end',
  contentMinWidthClass = 'min-w-[10.5rem]',
  tone = 'default',
  disabled,
  triggerClassName,
  contentClassName,
  itemClassName,
  itemTextSizeClassName = 'text-[12px]',
  'aria-label': ariaLabel,
}: HeroInlineSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      // Trigger already paints `leadingIcon` — avoid Select's auto item-icon injection.
      leadingVariant="textOnly"
    >
      <SelectTrigger
        aria-label={ariaLabel}
        triggerWidth="min"
        className={cn(TONE_CLASSES[tone], triggerClassName)}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {leadingIcon ? (
            <span
              aria-hidden
              className={cn(
                'inline-flex shrink-0 items-center justify-center',
                tone === 'default' && 'text-muted-foreground',
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          {prefix ? (
            <span className="font-medium text-muted-foreground">{prefix}</span>
          ) : null}
          <SelectValue>{valueLabel}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent
        align={align}
        className={cn(contentMinWidthClass, contentClassName)}
      >
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className={cn(itemTextSizeClassName, itemClassName)}
            icon={item.icon}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

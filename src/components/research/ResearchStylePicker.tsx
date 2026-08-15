import type { ComponentPropsWithoutRef } from 'react'
import { Microscope } from '@/lib/icons'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import {
  HeroComposerFooterChipContent,
  HERO_FOOTER_CHIP_ICON_CLASS,
} from '@/components/composer/HeroComposerFooterChipContent'
import { researchStyleLogoUrl } from '@/lib/brandLogos'
import {
  HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS,
  HERO_FOOTER_SELECT_CONTENT_CLASS,
  HERO_FOOTER_SELECT_ITEM_CLASS,
} from '@/lib/heroComposerSelect'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { cn } from '@/lib/utils'

export interface ResearchStylePickerProps {
  value: ResearchStyle
  onChange: (style: ResearchStyle) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  contentProps?: Omit<ComponentPropsWithoutRef<typeof SelectContent>, 'children'>
  /** Discover hero footer: compact, light bg, logos in menu. */
  variant?: 'default' | 'hero'
}

/** Research style dropdown (same `select.tsx` primitive as `CountrySelect`). */
export function ResearchStylePicker({
  value,
  onChange,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  contentProps,
  variant = 'default',
}: ResearchStylePickerProps) {
  const hero = variant === 'hero'
  const selected =
    RESEARCH_STYLE_OPTIONS.find((o) => o.value === value) ?? RESEARCH_STYLE_OPTIONS[0]!
  const selectedLogoUrl = researchStyleLogoUrl(selected.value)

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ResearchStyle)}
      disabled={disabled}
    >
      <SelectTrigger
        triggerWidth="min"
        className={cn(
          hero
            ? HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS
            : [
                'h-9 min-w-[6.25rem] max-w-[8.5rem] border-0 bg-transparent px-2 shadow-none',
                'hover:bg-muted/60 hover:translate-y-0 hover:shadow-none',
                'focus:ring-0 focus:border-0 focus:shadow-none',
                '[&>span:first-child]:min-w-0',
              ],
          triggerClassName,
          className,
        )}
        aria-label={`Research type: ${selected.label}`}
      >
        {hero ? (
          <>
            <span className="sr-only">
              <SelectValue />
            </span>
            <HeroComposerFooterChipContent
              label={selected.label}
              icon={
                selectedLogoUrl ? (
                  <BrandLogoImg
                    src={selectedLogoUrl}
                    alt={selected.firm}
                    height={14}
                    className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'max-w-[0.875rem] object-contain object-center')}
                  />
                ) : (
                  <Microscope
                    className={cn(HERO_FOOTER_CHIP_ICON_CLASS, 'text-muted-foreground/70')}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                )
              }
            />
          </>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent
        data-tour="arsenal-research-style-menu"
        position="popper"
        avoidCollisions
        collisionPadding={12}
        className={cn(
          hero
            ? cn(HERO_FOOTER_SELECT_CONTENT_CLASS, 'w-[min(100vw-2rem,16rem)]')
            : 'z-[10001] max-h-[min(60vh,360px)] w-[min(100vw-2rem,18rem)] overflow-y-auto overflow-x-hidden',
          contentClassName,
        )}
        {...contentProps}
      >
        <SelectGroup>
          {RESEARCH_STYLE_OPTIONS.map((option) => {
            const logoUrl = researchStyleLogoUrl(option.value)
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                textValue={`${option.firm} ${option.label}`}
                className={hero ? HERO_FOOTER_SELECT_ITEM_CLASS : 'py-2'}
              >
                {hero ? (
                  <span className="flex w-full min-w-0 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {logoUrl ? (
                        <BrandLogoImg src={logoUrl} alt={option.firm} height={18} />
                      ) : (
                        <span className="text-[11px] font-medium text-foreground">
                          {option.label}
                        </span>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="flex min-w-0 flex-col gap-0.5 text-left">
                      <span className="text-sm leading-tight">{option.label}</span>
                      <span className="text-[11px] font-normal leading-snug text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </span>
                )}
              </SelectItem>
            )
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

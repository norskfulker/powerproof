import type { ComponentPropsWithoutRef } from 'react'

import { CountryFlagImg } from '@/components/CountryFlagImg'
import {
  HeroComposerFooterChipContent,
  HERO_FOOTER_CHIP_ICON_CLASS,
} from '@/components/composer/HeroComposerFooterChipContent'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCountryByCode, getCountryCodeFromName, SUPPORTED_COUNTRIES } from '@/lib/countries'
import {
  HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS,
  HERO_FOOTER_SELECT_CONTENT_CLASS,
  HERO_FOOTER_SELECT_ITEM_CLASS,
} from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'

export type CountrySelectOption = {
  /** Select value (e.g. War Room market label). */
  name: string
  /** ISO 3166-1 alpha-2 for flags. */
  code: string
}

type CountrySelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  /** Sidebar: full trigger + name (code). Composer mid: flag-only. Hero footer: compact flag trigger. */
  triggerVariant?: 'default' | 'flagOnly' | 'heroFooter'
  /** When set, options use these display names as values. Codes resolved via `getCountryCodeFromName`. */
  countryNames?: readonly string[]
  /** Explicit name + code pairs (preferred for War Room markets). */
  countryOptions?: readonly CountrySelectOption[]
  triggerClassName?: string
  contentClassName?: string
  contentProps?: Omit<ComponentPropsWithoutRef<typeof SelectContent>, 'children'>
}

/** Shared country picker for research composer, War Room, and profile. */
export function CountrySelect({
  value,
  onValueChange,
  disabled,
  triggerVariant = 'default',
  countryNames,
  countryOptions,
  triggerClassName,
  contentClassName,
  contentProps,
}: CountrySelectProps) {
  const namedOptions =
    countryOptions != null && countryOptions.length > 0
      ? countryOptions
      : countryNames != null && countryNames.length > 0
        ? countryNames.map((name) => ({ name, code: getCountryCodeFromName(name) }))
        : null
  const useNames = namedOptions != null
  const selected = useNames
    ? {
        name: value,
        code: namedOptions.find((o) => o.name === value)?.code ?? getCountryCodeFromName(value),
      }
    : getCountryByCode(value)
  const flagOnly = triggerVariant === 'flagOnly'
  const heroFooter = triggerVariant === 'heroFooter'

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        triggerWidth={heroFooter || flagOnly ? 'min' : 'full'}
        className={cn(
          !flagOnly && !heroFooter && triggerClassName,
          heroFooter && HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS,
          flagOnly &&
            !heroFooter && [
              'h-9 w-9 min-w-9 max-w-9 justify-center gap-0 border-0 bg-transparent p-1 shadow-none',
              'hover:bg-muted/60 [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:overflow-visible',
            ],
          triggerClassName,
        )}
        aria-label={`Country or market: ${selected.name}`}
      >
        {heroFooter ? (
          <>
            <span className="sr-only">
              <SelectValue />
            </span>
            <HeroComposerFooterChipContent
              label={selected.name}
              icon={
                <span className={cn('inline-flex overflow-hidden rounded-full', HERO_FOOTER_CHIP_ICON_CLASS)}>
                  <CountryFlagImg
                    code={selected.code}
                    size={14}
                    className="h-full w-full !border-0 object-cover"
                  />
                </span>
              }
            />
          </>
        ) : flagOnly ? (
          <>
            <span className="sr-only">
              <SelectValue />
            </span>
            <CountryFlagImg code={selected.code} size={22} className="!border-0" />
          </>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent
        position="popper"
        avoidCollisions
        collisionPadding={12}
        className={cn(heroFooter ? HERO_FOOTER_SELECT_CONTENT_CLASS : 'z-[320]', contentClassName)}
        {...contentProps}
      >
        <SelectGroup>
          {useNames
            ? namedOptions!.map(({ name, code }) => (
                <SelectItem
                  key={name}
                  value={name}
                  textValue={name}
                  className={heroFooter ? HERO_FOOTER_SELECT_ITEM_CLASS : undefined}
                  icon={<CountryFlagImg code={code} size={16} className="!border-0" />}
                >
                  {heroFooter ? (
                    <span className="text-[11px] font-medium">{name}</span>
                  ) : (
                    name
                  )}
                </SelectItem>
              ))
            : SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem
                  key={c.code}
                  value={c.code}
                  textValue={c.name}
                  className={heroFooter ? HERO_FOOTER_SELECT_ITEM_CLASS : undefined}
                  icon={<CountryFlagImg code={c.code} size={16} className="!border-0" />}
                >
                  {heroFooter ? (
                    <span className="text-[11px] font-medium">{c.name}</span>
                  ) : flagOnly ? (
                    c.name
                  ) : (
                    `${c.name} (${c.code})`
                  )}
                </SelectItem>
              ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

import { PHONE_DIAL_CODES } from '@/lib/phoneDialCodes'
import { CountryFlagImg } from '@/components/CountryFlagImg'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (dialCode: string) => void
  disabled?: boolean
  className?: string
}

/**
 * E.164 dial code picker (Radix Select). List is scrollable with `legacy-scrollbar` (see `select` Viewport).
 */
export function CountryCodeSelect({ value, onChange, disabled, className }: Props) {
  const safe =
    PHONE_DIAL_CODES.some((d) => d.code === value) ? value : PHONE_DIAL_CODES[0]?.code ?? '+91'

  return (
    <Select value={safe} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('w-full min-w-0', className)}>
        <SelectValue placeholder="Code" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="z-[100100]">
        {PHONE_DIAL_CODES.map((d) => (
          <SelectItem
            key={d.code}
            value={d.code}
            textValue={d.label}
            className="text-xs"
            icon={<CountryFlagImg code={d.iso} size={14} className="!border-0" />}
          >
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

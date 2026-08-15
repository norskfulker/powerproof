import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ComposerFilterSelect({
  title,
  value,
  placeholder,
  onValueChange,
  children,
  leadingVariant,
}: {
  title: string
  value: string
  placeholder: string
  onValueChange: (value: string) => void
  children: ReactNode
  leadingVariant?: 'iconWithText'
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <Select leadingVariant={leadingVariant} value={value} onValueChange={onValueChange}>
        <SelectTrigger triggerWidth="full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[10002] max-h-60">
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

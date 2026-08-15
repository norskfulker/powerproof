import { useState } from 'react'
import { SlidersHorizontal } from '@/lib/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { SelectItem } from '@/components/ui/select'
import { ComposerFilterSelect } from '@/components/composer/ComposerFilterSelect'
import { formatInvestorFirmType, formatInvestorLabel } from '@/lib/investorsDisplay'
import { cn } from '@/lib/utils'

type InvestorsFilterPopoverProps = {
  firmType: string
  sector: string
  portfolioCompany: string
  firmTypes: string[]
  sectors: string[]
  portfolioNames: string[]
  onFirmTypeChange: (value: string) => void
  onSectorChange: (value: string) => void
  onPortfolioCompanyChange: (value: string) => void
  onReset: () => void
}

export function InvestorsFilterPopover({
  firmType,
  sector,
  portfolioCompany,
  firmTypes,
  sectors,
  portfolioNames,
  onFirmTypeChange,
  onSectorChange,
  onPortfolioCompanyChange,
  onReset,
}: InvestorsFilterPopoverProps) {
  const [open, setOpen] = useState(false)

  const activeCount = [
    firmType !== 'all',
    sector !== 'all',
    portfolioCompany !== 'all',
  ].filter(Boolean).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter investors"
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            activeCount > 0
              ? 'border-primary/35 bg-primary text-primary-foreground'
              : 'border-border-subtle bg-card text-muted-foreground hover:border-primary/20 hover:bg-primary/[0.04] hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="z-[10001] w-[min(300px,calc(100vw-24px))] border-border/80 p-3 shadow-lg"
      >
        <div className="space-y-3">
          <ComposerFilterSelect
            title="Firm type"
            value={firmType}
            placeholder="All types"
            onValueChange={onFirmTypeChange}
          >
            <SelectItem value="all">All types</SelectItem>
            {firmTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {formatInvestorFirmType(type)}
              </SelectItem>
            ))}
          </ComposerFilterSelect>

          <ComposerFilterSelect
            title="Sectors"
            value={sector}
            placeholder="All sectors"
            onValueChange={onSectorChange}
          >
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map((value) => (
              <SelectItem key={value} value={value}>
                {formatInvestorLabel(value)}
              </SelectItem>
            ))}
          </ComposerFilterSelect>

          <ComposerFilterSelect
            title="Portfolio"
            value={portfolioCompany}
            placeholder="All portfolio"
            onValueChange={onPortfolioCompanyChange}
          >
            <SelectItem value="all">All portfolio</SelectItem>
            {portfolioNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </ComposerFilterSelect>

          {activeCount > 0 ? (
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onReset}>
              Reset filters
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

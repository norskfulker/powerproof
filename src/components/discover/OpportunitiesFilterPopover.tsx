import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SlidersHorizontal } from '@/lib/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { SelectItem } from '@/components/ui/select'
import { ComposerFilterSelect } from '@/components/composer/ComposerFilterSelect'
import { useCurrency } from '@/hooks/useCurrency'
import { useFilterOptions } from '@/hooks/useFilterOptions'
import type { BudgetFilter, DiscoverFilters } from '@/types/discovery'
import { renderCategoryIcon } from '@/lib/categoryIcons'
import { SETUP_BUDGET_USD } from '@/lib/opportunityBudgetUsd'
import { cn } from '@/lib/utils'

type OpportunitiesFilterPopoverProps = {
  filters: DiscoverFilters
  onFiltersChange: (patch: Partial<DiscoverFilters>) => void
  categories: Array<{ slug: string; name: string; lucide?: string | null }>
  categoriesLoading?: boolean
  categoriesError?: Error | null
}

export function OpportunitiesFilterPopover({
  filters,
  onFiltersChange,
  categories,
  categoriesLoading = false,
  categoriesError = null,
}: OpportunitiesFilterPopoverProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const { formatMoney } = useCurrency()
  const { options } = useFilterOptions(
    filters.category !== 'all' ? filters.category : undefined,
    filterOpen,
  )

  const budgetOptions = useMemo(() => {
    const chips = [
      { value: 'all' as const, label: 'All costs', show: true },
      {
        value: 'under_1l' as const,
        label: `Under ${formatMoney(SETUP_BUDGET_USD.under1lMax)}`,
        show: options.has_under_1l,
      },
      {
        value: '1l_5l' as const,
        label: `${formatMoney(SETUP_BUDGET_USD.l1to5Min)}–${formatMoney(SETUP_BUDGET_USD.l1to5Max)}`,
        show: options.has_1l_5l,
      },
      {
        value: '5l_20l' as const,
        label: `${formatMoney(SETUP_BUDGET_USD.l5to20Min)}–${formatMoney(SETUP_BUDGET_USD.l5to20Max)}`,
        show: options.has_5l_20l,
      },
      {
        value: 'above_20l' as const,
        label: `${formatMoney(SETUP_BUDGET_USD.above20Min)}+`,
        show: options.has_above_20l,
      },
    ]
    return chips.filter((c) => c.value === 'all' || c.show) as Array<{ value: BudgetFilter; label: string }>
  }, [options, formatMoney])

  const sectorOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All sectors', icon: null as ReactNode },
      ...(categories ?? []).map((c) => ({
        value: c.slug,
        label: c.name,
        icon: renderCategoryIcon(c.slug, c.lucide, 'h-3.5 w-3.5'),
      })),
    ],
    [categories],
  )

  const activeCount = [
    filters.budget !== 'all',
    filters.category !== 'all',
  ].filter(Boolean).length

  const resetFilters = () => {
    onFiltersChange({ budget: 'all', category: 'all' })
  }

  return (
    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
      <PopoverTrigger asChild>
        <button
          data-tour="opp-filters"
          type="button"
          aria-label="Filter opportunities"
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
            title="Cost"
            value={filters.budget}
            placeholder="All costs"
            onValueChange={(v) => onFiltersChange({ budget: v as BudgetFilter })}
          >
            {budgetOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </ComposerFilterSelect>

          {categoriesLoading ? (
            <p className="px-1 text-xs text-muted-foreground">Loading sectors…</p>
          ) : categoriesError ? (
            <p role="alert" className="px-1 text-xs text-destructive">
              Sector filters are temporarily unavailable.
            </p>
          ) : categories.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">No sectors available.</p>
          ) : (
            <ComposerFilterSelect
              title="Sector"
              value={filters.category}
              placeholder="All sectors"
              leadingVariant="iconWithText"
              onValueChange={(v) => onFiltersChange({ category: v })}
            >
              {sectorOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} icon={opt.icon}>
                  {opt.label}
                </SelectItem>
              ))}
            </ComposerFilterSelect>
          )}

          {activeCount > 0 ? (
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={resetFilters}>
              Reset filters
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

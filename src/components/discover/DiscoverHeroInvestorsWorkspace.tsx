import {
  DiscoverHeroBox,
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroWorkspaceLayoutSwitcher,
  DiscoverHeroWorkspaceTable,
  INVESTOR_WORKSPACE_METRIC_COLUMNS,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroWorkspaceEmptyState } from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import { discoverHeroModeWorkspaceBoxBodyClassName } from '@/components/discover/discoverHeroTokens'
import { InvestorCard } from '@/components/investors/InvestorCard'
import { InvestorsActiveQuery } from '@/components/investors/InvestorsActiveQuery'
import { InvestorsFilterPopover } from '@/components/investors/InvestorsFilterPopover'
import { Button } from '@/components/ui/button'
import { Briefcase } from '@/lib/icons'
import type { Investor } from '@/types/investors'

type DiscoverHeroInvestorsWorkspaceProps = {
  bodyClassName?: string
  search: string
  onSearchChange: (value: string) => void
  firmType: string
  sector: string
  portfolioCompany: string
  firmTypes: string[]
  sectors: string[]
  portfolioNames: string[]
  onFirmTypeChange: (value: string) => void
  onSectorChange: (value: string) => void
  onPortfolioCompanyChange: (value: string) => void
  onResetFilters: () => void
  filtered: Investor[]
  showLockedList?: boolean
  isUnlocked?: boolean
  accessLoading?: boolean
  checkoutLoading?: boolean
  investorCount?: number | null
  loading: boolean
  error: string | null
  onUnlock?: () => void
}

export function DiscoverHeroInvestorsWorkspace({
  bodyClassName,
  search,
  onSearchChange,
  firmType,
  sector,
  portfolioCompany,
  firmTypes,
  sectors,
  portfolioNames,
  onFirmTypeChange,
  onSectorChange,
  onPortfolioCompanyChange,
  onResetFilters,
  filtered,
  investorCount,
  loading,
  error,
}: DiscoverHeroInvestorsWorkspaceProps) {
  const resultCount = filtered.length
  const totalCount =
    typeof investorCount === 'number' && investorCount > resultCount ? investorCount : null
  const countLabel =
    resultCount === 1
      ? '1 investor'
      : `${resultCount.toLocaleString('en-IN')} investors`
  const countMeta = totalCount
    ? `${countLabel} of ${totalCount.toLocaleString('en-IN')}`
    : countLabel

  return (
    <DiscoverHeroBox
      ariaLabel="Investors"
      className="shrink-0"
      bodyClassName={bodyClassName ?? discoverHeroModeWorkspaceBoxBodyClassName}
    >
      <InvestorsActiveQuery query={search} onClear={() => onSearchChange('')} />

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <p className="text-[13px] font-semibold tabular-nums text-foreground">
            {loading ? 'Loading investors…' : countMeta}
          </p>
          <InvestorsFilterPopover
            firmType={firmType}
            sector={sector}
            portfolioCompany={portfolioCompany}
            firmTypes={firmTypes}
            sectors={sectors}
            portfolioNames={portfolioNames}
            onFirmTypeChange={onFirmTypeChange}
            onSectorChange={onSectorChange}
            onPortfolioCompanyChange={onPortfolioCompanyChange}
            onReset={onResetFilters}
          />
        </div>
        <DiscoverHeroWorkspaceLayoutSwitcher />
      </div>

      {loading ? (
        <DiscoverHeroBoxLoadingSkeleton
          count={6}
          columns="metrics"
          metricColumns={INVESTOR_WORKSPACE_METRIC_COLUMNS}
          initialVisibleCount={0}
        />
      ) : error ? (
        <div className="py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <DiscoverHeroWorkspaceEmptyState
          icon={Briefcase}
          title="No investors match your filters"
          description="Try clearing search or resetting the filters."
        >
          <Button type="button" variant="secondary" size="sm" onClick={onResetFilters}>
            Reset filters
          </Button>
        </DiscoverHeroWorkspaceEmptyState>
      ) : (
        <div className="pb-4 layout-sm:pb-5 layout-lg:pb-6">
          <DiscoverHeroWorkspaceTable
            ariaLabel="Investors"
            columns="metrics"
            metricColumns={INVESTOR_WORKSPACE_METRIC_COLUMNS}
            initialVisibleCount={0}
          >
            {filtered.map((investor) => (
              <InvestorCard key={investor.id} investor={investor} />
            ))}
          </DiscoverHeroWorkspaceTable>
        </div>
      )}
    </DiscoverHeroBox>
  )
}

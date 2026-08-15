import { Lock } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { cardPadding, cardSurface } from '@/lib/cardSurface'
import { INVESTORS_LIST_PRICE_INR } from '@/hooks/useInvestorsListAccess'
import { cn } from '@/lib/utils'

type InvestorsUnlockBannerProps = {
  investorCount?: number | null
  isLoading?: boolean
  checkoutLoading?: boolean
  onUnlock: () => void
  className?: string
}

export function InvestorsUnlockBanner({
  investorCount,
  isLoading = false,
  checkoutLoading = false,
  onUnlock,
  className,
}: InvestorsUnlockBannerProps) {
  const countLabel =
    typeof investorCount === 'number' && investorCount > 0
      ? `${investorCount}+ verified investors`
      : 'the full investor database'

  return (
    <div
      className={cn(
        cardSurface,
        cardPadding.md,
        'relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/[0.06] via-card to-primary/[0.04]',
        className,
      )}
    >
      <div className="flex flex-col gap-4 layout-sm:flex-row layout-sm:items-center layout-sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Premium access
          </div>
          <p className="font-display text-base font-bold tracking-heading text-foreground layout-sm:text-lg">
            Get the entire investors list at just ₹{INVESTORS_LIST_PRICE_INR.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-muted-foreground">
            Unlock {countLabel} — firm types, thesis, check sizes, portfolio, and contact links.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="shrink-0"
          disabled={isLoading || checkoutLoading}
          onClick={onUnlock}
        >
          {checkoutLoading ? 'Opening checkout…' : `Unlock for ₹${INVESTORS_LIST_PRICE_INR}`}
        </Button>
      </div>
    </div>
  )
}

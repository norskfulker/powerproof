import { Calendar, ExternalLink, ShieldCheck } from '@/lib/icons'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import { formatSourcingTimestamp } from '@/lib/sourcingHistoryDetails'
import { SOURCE_META, type SourcingCard } from '@/lib/sourcingTypes'
import { Card, cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'

function formatCardPrice(card: SourcingCard, formatMoney: (amountUSD: number) => string): string {
  const { price_min, price_max, price_unit } = card
  if (price_min === null && price_max === null) return 'Price on request'

  const lo = price_min !== null ? formatMoney(price_min) : null
  const hi = price_max !== null ? formatMoney(price_max) : null
  const range = lo && hi && lo !== hi ? `${lo} – ${hi}` : (lo ?? hi ?? '')
  const unit =
    price_unit && price_unit !== 'USD' && price_unit !== 'piece' ? ` / ${price_unit}` : ''
  return `${range}${unit}`
}

export function SupplierCard({
  card,
  onClick,
}: {
  card: SourcingCard
  onClick?: () => void
}) {
  const { formatMoney } = useCurrency()
  const price = useMemo(() => formatCardPrice(card, formatMoney), [card, formatMoney])
  const scrapedLabel = useMemo(() => formatSourcingTimestamp(card.scraped_at), [card.scraped_at])
  const sourceMeta = SOURCE_META[card.source]
  const placeholderLetter = (
    (card.title || card.supplier_name || '?').trim().charAt(0) || '?'
  ).toUpperCase()

  return (
    <Card
      padding="none"
      radius="xl"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group relative flex min-w-0 w-full flex-col overflow-hidden text-left shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5',
        onClick && 'cursor-pointer',
      )}
      topSlot={
        <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
          <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>{sourceMeta.label}</span>
          <span className="truncate text-[13px] font-semibold text-foreground">{price}</span>
        </div>
      }
    >
      <div className="relative h-[7.5rem] w-full overflow-hidden bg-muted layout-sm:h-32">
        {card.image_thumb ?? card.image_url ? (
          <img
            src={card.image_thumb ?? card.image_url ?? ''}
            alt={card.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40 text-3xl font-bold text-muted-foreground/25">
            {placeholderLetter}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        <span
          className="absolute right-2 top-2 z-[1] rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-black/5"
          style={{
            backgroundColor: sourceMeta.badgeBg,
            color: sourceMeta.badgeText,
          }}
        >
          {sourceMeta.country}
        </span>

        {card.is_verified ? (
          <span className="absolute left-2 top-2 z-[1] inline-flex items-center gap-0.5 rounded-full bg-emerald-600/95 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
            Verified
          </span>
        ) : null}
        {card.all_images && card.all_images.length > 1 ? (
          <span className="absolute bottom-1 right-1 z-[1] rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            +{card.all_images.length - 1} photos
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {card.title}
          </h3>
          {card.supplier_name ? (
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {card.supplier_name}
            </p>
          ) : null}
        </div>

        {scrapedLabel ? (
          <p className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            {scrapedLabel}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle/60 pt-2.5">
          {card.moq ? (
            <span className="rounded-md bg-bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              MOQ {card.moq}
            </span>
          ) : (
            <span />
          )}
          {onClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              View
              <ExternalLink className="h-3 w-3" aria-hidden />
            </button>
          ) : (
            <a
              href={card.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              View
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

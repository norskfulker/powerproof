import { useState, useEffect, useMemo } from 'react'
import {
  X,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Mail,
  Smartphone,
} from '@/lib/icons'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabsContent } from '@/components/ui/tabs'
import {
  InternalPageDataTabs,
  internalPageTabPanelClass,
} from '@/components/shared/InternalPageDataTabs'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { CountrySelect } from '@/components/CountrySelect'
import { useAuth } from '@/contexts/AuthContext'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useCurrency, SUPPORTED_CURRENCIES } from '@/hooks/useCurrency'
import { useAIBrief, useRFQGenerator, usePriceIntelligence } from '@/hooks/useSupplierDrawer'
import type { SupplierDrawerProps, PriceTier } from '@/lib/sourcingDrawerTypes'
import { getCountryByCode, getCountryCodeFromName } from '@/lib/countries'
import { getGoogleAuthName } from '@/lib/profileDisplayName'
import { SOURCE_META, type SourcingCard } from '@/lib/sourcingTypes'
import { SupplierDrawerShopifyAction } from '@/components/sourcing/SupplierDrawerShopifyAction'

function PriceTierBadge({ tier }: { tier: PriceTier }) {
  if (tier === 'unknown') return null
  const config = {
    best: {
      label: '🟢 Best price',
      bg: 'bg-green-500/10',
      text: 'text-green-700 dark:text-green-400',
    },
    mid: {
      label: '🟡 Mid range',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    premium: {
      label: '🔴 Premium',
      bg: 'bg-red-500/10',
      text: 'text-destructive dark:text-red-400',
    },
  }[tier]
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', config.bg, config.text)}>
      {config.label}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-auto gap-1.5 px-3 py-1.5 font-medium"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  )
}

type Tab = 'overview' | 'brief' | 'rfq'

const MIC_COMPANY_INFO_KEY_PREFIX =
  /^(Company Profile|General Information|Trade Capacity|Production Capacity|R&D Capacity|Company Show) - /

export function SupplierProductDetail({
  card,
  keyword,
  onClose,
  variant = 'sheet',
}: {
  card: SourcingCard
  keyword: string
  onClose?: () => void
  /** `sheet` = drawer/side panel; `page` = full product page. */
  variant?: 'sheet' | 'page'
}) {
  const isPage = variant === 'page'
  const [tab, setTab] = useState<Tab>('overview')
  const { profile, user } = useAuth()
  const { formatMoney, currency, toUSD } = useCurrency()
  const currencySymbol =
    SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency

  const aibrief = useAIBrief(card, keyword)
  const rfq = useRFQGenerator(card, keyword)
  const intel = usePriceIntelligence(keyword, card.source, card.price_min ?? null)

  useEffect(() => {
    setTab('overview')
  }, [card.product_url])

  useEffect(() => {
    const displayName = getGoogleAuthName(user)
    const countryCode = profile?.home_country
      ? getCountryCodeFromName(profile.home_country)
      : 'IN'
    rfq.setForm((f) => ({
      ...f,
      buyer_name: displayName || f.buyer_name,
      buyer_country_code: countryCode,
    }))
  }, [card.product_url, user, profile?.home_country])

  useEffect(() => {
    if (tab === 'brief' && !aibrief.brief && !aibrief.loading && card) {
      void aibrief.generate()
    }
  }, [tab, card, aibrief.brief, aibrief.loading, aibrief.generate])

  const sourceMeta = SOURCE_META[card.source]

  const overviewFacts = useMemo(() => {
    if (!card) return []
    let priceValue = 'Price on request'
    if (card.price_min !== null || card.price_max !== null) {
      const lo = card.price_min !== null ? formatMoney(card.price_min) : null
      const hi = card.price_max !== null ? formatMoney(card.price_max) : null
      const range = lo && hi && lo !== hi ? `${lo} – ${hi}` : (lo ?? hi ?? '')
      priceValue =
        card.price_unit && card.price_unit !== 'USD' && card.price_unit !== 'piece'
          ? `${range} / ${card.price_unit}`
          : range
    }
    const facts: { label: string; value: string }[] = [
      { label: 'Price', value: priceValue },
      {
        label: 'MOQ',
        value: card.moq
          ? `${card.moq}${card.moq_type ? ` (${card.moq_type})` : ''}`
          : '—',
      },
      { label: 'Location', value: card.location || '—' },
    ]
    if (card.year_established) facts.push({ label: 'Est.', value: String(card.year_established) })
    if (card.member_since_display) {
      facts.push({ label: 'Member', value: card.member_since_display })
    }
    if (card.gst_number) facts.push({ label: 'GST', value: card.gst_number })
    return facts
  }, [card, formatMoney])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: null },
    { id: 'brief', label: 'AI Brief', icon: null },
    { id: 'rfq', label: 'RFQ', icon: null },
  ]

  const handleGenerateRfq = () => {
    const countryName = getCountryByCode(rfq.form.buyer_country_code).name
    const raw = rfq.form.target_price.trim()
    const targetPriceUsd = raw
      ? String(toUSD(Number.parseFloat(raw) || 0, currency))
      : ''
    void rfq.generate({
      buyer_country: countryName,
      target_price_usd: targetPriceUsd,
    })
  }

  const rangeMin = intel?.price_min_all ?? intel?.price_p20 ?? null
  const rangeMax = intel?.price_max_all ?? intel?.price_p80 ?? null
  let priceMarkerPct: number | null = null
  if (
    card?.price_min != null &&
    rangeMin != null &&
    rangeMax != null &&
    rangeMax > rangeMin
  ) {
    priceMarkerPct = Math.min(
      100,
      Math.max(0, ((card.price_min - rangeMin) / (rangeMax - rangeMin)) * 100),
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        isPage ? 'min-h-0 w-full' : 'h-full min-h-0',
      )}
    >
            <div
              className={cn(
                'flex items-start justify-between gap-3 border-b border-border-subtle',
                isPage ? 'px-4 py-4 layout-sm:px-6' : 'px-5 py-4',
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: sourceMeta?.badgeBg, color: sourceMeta?.badgeText }}
                  >
                    {sourceMeta?.label}
                  </span>
                  {card.is_verified && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                  {intel && <PriceTierBadge tier={intel.tier} />}
                </div>
                <h2
                  className={cn(
                    'font-semibold leading-snug text-foreground',
                    isPage
                      ? 'text-xl layout-sm:text-2xl'
                      : 'line-clamp-2 text-sm',
                  )}
                >
                  {card.title}
                </h2>
                {card.supplier_name ? (
                  <p
                    className={cn(
                      'text-muted-foreground',
                      isPage ? 'text-sm' : 'truncate text-xs',
                    )}
                  >
                    {card.supplier_name}
                  </p>
                ) : null}
              </div>
              {!isPage && onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={onClose}
                  aria-label="Close supplier details"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div
              className={cn(
                'flex flex-col gap-2 pt-3',
                isPage ? 'max-w-xl px-4 layout-sm:px-6' : 'px-5',
              )}
            >
              <Button
                type="button"
                variant="primary"
                size="md"
                full={!isPage}
                className="gap-2"
                onClick={() => window.open(card.product_url, '_blank', 'noopener,noreferrer')}
              >
                View on {sourceMeta.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <SupplierDrawerShopifyAction card={card} />
              {card.company_url ? (
                <a
                  href={card.company_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-xs text-primary hover:underline layout-sm:text-left"
                >
                  View Supplier Store →
                </a>
              ) : null}
            </div>

            <InternalPageDataTabs
              tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
              value={tab}
              onValueChange={(value) => {
                if (value === 'overview' || value === 'brief' || value === 'rfq') setTab(value)
              }}
              className={cn(isPage ? 'mt-2' : 'flex min-h-0 flex-1 flex-col')}
              panelClassName={isPage ? undefined : 'min-h-0 flex-1 overflow-y-auto'}
            >
              <TabsContent value="overview" className={cn('mt-0 outline-none', internalPageTabPanelClass)}>
                <div className="flex flex-col gap-4">
                  {(card.image_large ?? card.image_url) ? (
                    <div className="h-48 w-full overflow-hidden rounded-xl bg-muted">
                      <img
                        src={card.image_large ?? card.image_url ?? ''}
                        alt={card.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : null}

                  {(card.email_verified || card.mobile_verified || card.gst_verified) && (
                    <div className="flex flex-wrap gap-1.5">
                      {card.gst_verified ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          GST Verified
                        </span>
                      ) : null}
                      {card.email_verified ? (
                        <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                          <Mail className="h-3 w-3" aria-hidden />
                          Email Verified
                        </span>
                      ) : null}
                      {card.mobile_verified ? (
                        <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
                          <Smartphone className="h-3 w-3" aria-hidden />
                          Mobile Verified
                        </span>
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {overviewFacts.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-border-subtle bg-bg-sunken/50 px-3 py-2.5"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {card.quantity_prices && card.quantity_prices.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bulk Pricing Tiers
                      </p>
                      <div className="overflow-hidden rounded-xl border border-border-subtle">
                        <div className="grid grid-cols-2 bg-bg-sunken/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>Quantity</span>
                          <span className="text-right">Price</span>
                        </div>
                        {card.quantity_prices.map((tier, i) => (
                          <div
                            key={`${tier.quantity}-${i}`}
                            className={cn(
                              'grid grid-cols-2 px-3 py-2 text-xs',
                              i % 2 === 0 ? 'bg-transparent' : 'bg-bg-sunken/20',
                            )}
                          >
                            <span className="text-muted-foreground">{tier.quantity}</span>
                            <span className="text-right font-medium text-foreground">
                              {formatMoney(tier.price_usd)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {card.composite_score !== null ? (
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { label: 'Overall', value: card.composite_score },
                          { label: 'Product', value: card.goods_score },
                          { label: 'Shipping', value: card.logistics_score },
                        ] as const
                      )
                        .filter((s): s is { label: string; value: number } => s.value !== null)
                        .map((score) => (
                          <div
                            key={score.label}
                            className="flex min-w-[64px] flex-col items-center rounded-xl border border-border-subtle bg-bg-sunken/50 px-3 py-2"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {score.label}
                            </span>
                            <span
                              className={cn(
                                'text-base font-bold',
                                (score.value ?? 0) >= 4
                                  ? 'text-success dark:text-green-400'
                                  : (score.value ?? 0) >= 3
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-500',
                              )}
                            >
                              {score.value.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      {card.order_count !== null && card.order_count > 0 ? (
                        <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-border-subtle bg-bg-sunken/50 px-3 py-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Orders
                          </span>
                          <span className="text-base font-bold text-foreground">{card.order_count}</span>
                        </div>
                      ) : null}
                      {card.repurchase_rate ? (
                        <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-border-subtle bg-bg-sunken/50 px-3 py-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Repeat
                          </span>
                          <span className="text-base font-bold text-success dark:text-green-400">
                            {card.repurchase_rate}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {card.phone ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-sunken/50 px-3 py-2.5">
                      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Phone
                      </span>
                      <a
                        href={`tel:+91${card.phone.replace(/\D/g, '')}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        +91 {card.phone}
                      </a>
                    </div>
                  ) : null}

                  {card.product_description ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </p>
                      <p className="line-clamp-6 text-xs leading-relaxed text-foreground/80">
                        {card.product_description}
                      </p>
                    </div>
                  ) : null}

                  {card.specifications.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Specifications
                      </p>
                      <div className="overflow-hidden rounded-xl border border-border-subtle">
                        {card.specifications.map((spec, i) => (
                          <div
                            key={spec.key}
                            className={cn(
                              'flex items-start gap-3 px-3 py-2 text-xs',
                              i % 2 === 0 ? 'bg-bg-sunken/30' : 'bg-transparent',
                            )}
                          >
                            <span className="w-32 shrink-0 font-medium text-muted-foreground">
                              {spec.key}
                            </span>
                            <span className="text-foreground">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {card.product_properties && card.product_properties.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Product Specifications
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border-default">
                        <table className="w-full text-xs">
                          <tbody>
                            {card.product_properties.map((prop, i) => (
                              <tr
                                key={`${prop.key}-${i}`}
                                className={i % 2 === 0 ? 'bg-bg-surface' : 'bg-background'}
                              >
                                <td className="w-2/5 border-r border-border-subtle px-3 py-2 font-medium text-text-secondary">
                                  {prop.key}
                                </td>
                                <td className="break-words px-3 py-2 text-foreground">
                                  {prop.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {card.all_images && card.all_images.length > 1 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Image Gallery ({card.all_images.length} photos)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {card.all_images.slice(0, 12).map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                            <img
                              src={img}
                              alt={`${card.title} photo ${i + 1}`}
                              className="h-16 w-16 rounded-md border border-border-subtle object-cover transition-colors hover:border-primary/40"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {card.company_info && card.company_info.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Supplier Profile
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border-default">
                        <table className="w-full text-xs">
                          <tbody>
                            {card.company_info.map((info, i) => (
                              <tr
                                key={`${info.key}-${i}`}
                                className={i % 2 === 0 ? 'bg-bg-surface' : 'bg-background'}
                              >
                                <td className="w-2/5 border-r border-border-subtle px-3 py-2 font-medium text-text-secondary">
                                  {info.key.replace(MIC_COMPANY_INFO_KEY_PREFIX, '')}
                                </td>
                                <td className="whitespace-pre-wrap break-words px-3 py-2 text-foreground">
                                  {info.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {card.extra_info && card.extra_info.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Additional Information
                      </div>
                      <div className="space-y-3">
                        {card.extra_info.map((info, i) => (
                          <div key={`${info.key}-${i}`}>
                            <div className="mb-1 text-xs font-semibold text-text-secondary">
                              {info.key}
                            </div>
                            <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                              {info.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {card.category_names.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {card.category_names.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {card.certifications.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Certifications
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {card.certifications.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-foreground"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {intel && intel.total_listings > 3 && (
                    <div className="rounded-xl border border-border-subtle bg-bg-sunken/50 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Price Intelligence · {intel.search_count} search
                        {intel.search_count > 1 ? 'es' : ''}
                      </p>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Lowest</span>
                        <span>Median</span>
                        <span>Highest</span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        {priceMarkerPct != null && (
                          <div
                            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
                            style={{ left: `calc(${priceMarkerPct}% - 5px)` }}
                          />
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs font-medium">
                        <span>{rangeMin != null ? formatMoney(rangeMin) : '—'}</span>
                        <span>{intel.price_median != null ? formatMoney(intel.price_median) : '—'}</span>
                        <span>{rangeMax != null ? formatMoney(rangeMax) : '—'}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Based on {intel.total_listings} listings across {intel.search_count} searches
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="brief" className={cn('mt-0 outline-none', internalPageTabPanelClass)}>
                <div className="flex flex-col gap-4">
                  {aibrief.loading && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating sourcing brief…</p>
                    </div>
                  )}
                  {aibrief.error && !aibrief.loading && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {aibrief.error}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-auto p-0 underline"
                        onClick={() => void aibrief.generate()}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                  {aibrief.brief && (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{aibrief.brief}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rfq" className={cn('mt-0 outline-none', internalPageTabPanelClass)}>
                <div className="flex flex-col gap-4">
                  {!rfq.rfq ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Fill in your details. AI will write a professional RFQ you can send
                        directly.
                        <span className="ml-1 font-medium text-foreground">Costs 1 credit.</span>
                      </p>
                      <Input
                        label="Your name"
                        type="text"
                        placeholder="Your name"
                        value={rfq.form.buyer_name}
                        onChange={(e) =>
                          rfq.setForm((f) => ({ ...f, buyer_name: e.target.value }))
                        }
                      />
                      <Input
                        label="Your company"
                        type="text"
                        placeholder="Acme Exports Pvt Ltd"
                        value={rfq.form.buyer_company}
                        onChange={(e) =>
                          rfq.setForm((f) => ({ ...f, buyer_company: e.target.value }))
                        }
                      />
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Your country
                        </label>
                        <CountrySelect
                          value={rfq.form.buyer_country_code}
                          onValueChange={(code) =>
                            rfq.setForm((f) => ({ ...f, buyer_country_code: code }))
                          }
                        />
                      </div>
                      <Input
                        label="Quantity needed"
                        type="text"
                        placeholder="500 units"
                        value={rfq.form.quantity_needed}
                        onChange={(e) =>
                          rfq.setForm((f) => ({ ...f, quantity_needed: e.target.value }))
                        }
                      />
                      <Input
                        label={`Target price (${currency})`}
                        type="text"
                        inputMode="decimal"
                        placeholder={`e.g. ${currencySymbol}250`}
                        value={rfq.form.target_price}
                        onChange={(e) =>
                          rfq.setForm((f) => ({ ...f, target_price: e.target.value }))
                        }
                        helperText="Enter amount in your display currency; we convert to USD for the RFQ."
                      />
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Additional notes (optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Any specific requirements, packaging, branding..."
                          value={rfq.form.additional_notes}
                          onChange={(e) =>
                            rfq.setForm((f) => ({ ...f, additional_notes: e.target.value }))
                          }
                          className="resize-none rounded-lg border border-border-subtle bg-bg-sunken/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
                        />
                      </div>
                      {rfq.error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {rfq.error}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        full
                        loading={rfq.loading}
                        disabled={rfq.loading}
                        className="gap-2"
                        onClick={handleGenerateRfq}
                        icon={!rfq.loading ? <Sparkles className="h-4 w-4" /> : undefined}
                      >
                        {rfq.loading ? 'Generating…' : 'Generate Smart RFQ — 1 credit'}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">Your RFQ is ready</p>
                        <div className="flex gap-2">
                          <CopyButton text={rfq.rfq} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => rfq.clearRfq()}
                          >
                            Regenerate
                          </Button>
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap rounded-xl border border-border-subtle bg-bg-sunken/50 px-4 py-3 text-sm leading-relaxed text-foreground">
                        {rfq.rfq}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

            </InternalPageDataTabs>
    </div>
  )
}

export function SupplierDrawer({ card, keyword, onClose }: SupplierDrawerProps) {
  const bp = useBreakpoint()
  const isDesktop = bp === 'desktop' || bp === 'wide'
  const open = card !== null

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-[480px] flex-col gap-0 overflow-hidden p-0 layout-sm:max-w-[480px] [&>button.absolute]:hidden"
        >
          {card ? (
            <SupplierProductDetail card={card} keyword={keyword} onClose={onClose} />
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="flex max-h-[92dvh] flex-col overflow-hidden p-0">
        {card ? (
          <SupplierProductDetail card={card} keyword={keyword} onClose={onClose} />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

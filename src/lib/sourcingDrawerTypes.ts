import type { SourcingCard } from './sourcingTypes'

export type SupplierStatus = 'shortlisted' | 'contacted' | 'sample_ordered' | 'negotiating' | 'rejected'

export const SUPPLIER_STATUS_OPTIONS: { value: SupplierStatus; label: string; color: string }[] = [
  { value: 'shortlisted', label: 'Shortlisted', color: 'hsl(var(--kind-buy-bg))' },
  { value: 'contacted', label: 'Contacted', color: 'hsl(var(--kind-sell-bg))' },
  { value: 'sample_ordered', label: 'Sample Ordered', color: 'hsl(var(--kind-svc-bg))' },
  { value: 'negotiating', label: 'Negotiating', color: 'hsl(var(--kind-ptr-bg))' },
  { value: 'rejected', label: 'Rejected', color: 'hsl(var(--destructive) / 0.15)' },
]

export type PriceTier = 'best' | 'mid' | 'premium' | 'unknown'

export interface PriceIntelligence {
  tier: PriceTier
  price_p20: number | null
  price_median: number | null
  price_p80: number | null
  price_avg: number | null
  price_min_all?: number | null
  price_max_all?: number | null
  total_listings: number
  search_count: number
}

export interface SupplierDrawerProps {
  card: SourcingCard | null
  keyword: string
  onClose: () => void
}

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SourcingCard } from '@/lib/sourcingTypes'
import type { PriceIntelligence } from '@/lib/sourcingDrawerTypes'

export function useAIBrief(card: SourcingCard | null, keyword: string) {
  const [brief, setBrief] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!card) return
    setLoading(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sourcing-ai-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: card.title,
            supplier_name: card.supplier_name,
            source: card.source,
            location: card.location,
            price_min: card.price_min,
            price_max: card.price_max,
            moq: card.moq,
            certifications: card.certifications,
            is_verified: card.is_verified,
            gst_verified: card.gst_verified,
            year_established: card.year_established,
            member_since_display: card.member_since_display,
            specifications: card.specifications,
            category_names: card.category_names,
            keyword,
          }),
        },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Brief generation failed')
      setBrief(json.brief)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [card, keyword])

  useEffect(() => {
    setBrief(null)
    setError(null)
  }, [card?.product_url])

  return { brief, loading, error, generate }
}

export interface RFQFormValues {
  buyer_name: string
  buyer_company: string
  buyer_country_code: string
  quantity_needed: string
  /** Amount in the user's display currency (converted to USD when generating). */
  target_price: string
  additional_notes: string
}

export type RFQGenerateOverrides = {
  buyer_country?: string
  target_price_usd?: string
}

export function useRFQGenerator(card: SourcingCard | null, keyword: string) {
  const [rfq, setRfq] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RFQFormValues>({
    buyer_name: '',
    buyer_company: '',
    buyer_country_code: 'IN',
    quantity_needed: '',
    target_price: '',
    additional_notes: '',
  })

  const clearRfq = useCallback(() => setRfq(null), [])

  const generate = useCallback(
    async (overrides?: RFQGenerateOverrides) => {
    if (!card) return
    setLoading(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sourcing-rfq`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: card.title,
            supplier_name: card.supplier_name,
            source: card.source,
            location: card.location,
            price_min: card.price_min,
            price_max: card.price_max,
            moq: card.moq,
            keyword,
            buyer_name: form.buyer_name,
            buyer_company: form.buyer_company,
            buyer_country: overrides?.buyer_country ?? form.buyer_country_code,
            quantity_needed: form.quantity_needed,
            target_price: overrides?.target_price_usd ?? form.target_price,
            additional_notes: form.additional_notes,
          }),
        },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'RFQ generation failed')
      setRfq(json.rfq)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  },
    [card, keyword, form],
  )

  useEffect(() => {
    setRfq(null)
    setError(null)
  }, [card?.product_url])

  return { rfq, loading, error, form, setForm, generate, clearRfq }
}

export function usePriceIntelligence(keyword: string, source: string, priceMin: number | null) {
  const [intel, setIntel] = useState<PriceIntelligence | null>(null)

  useEffect(() => {
    if (!keyword || !source) {
      setIntel(null)
      return
    }
    void supabase
      .from('sourcing_price_intelligence')
      .select('*')
      .eq('keyword', keyword.toLowerCase())
      .eq('source', source)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setIntel(null)
          return
        }
        const row = data as Record<string, unknown>
        let tier: PriceIntelligence['tier'] = 'unknown'
        const p20 = row.price_p20 != null ? Number(row.price_p20) : null
        const p80 = row.price_p80 != null ? Number(row.price_p80) : null
        if (priceMin !== null && p20 !== null && p80 !== null) {
          if (priceMin <= p20) tier = 'best'
          else if (priceMin <= p80) tier = 'mid'
          else tier = 'premium'
        }
        setIntel({
          tier,
          price_p20: p20,
          price_median: row.price_median != null ? Number(row.price_median) : null,
          price_p80: p80,
          price_avg: row.price_avg != null ? Number(row.price_avg) : null,
          price_min_all:
            row.price_min_all != null
              ? Number(row.price_min_all)
              : p20,
          price_max_all:
            row.price_max_all != null
              ? Number(row.price_max_all)
              : p80,
          total_listings: Number(row.total_listings ?? 0),
          search_count: Number(row.search_count ?? 0),
        })
      })
  }, [keyword, source, priceMin])

  return intel
}

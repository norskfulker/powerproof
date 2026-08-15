import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from '@/lib/icons'

import { Seo } from '@/components/Seo'
import { NotFoundState } from '@/components/NotFoundState'
import { Button } from '@/components/ui/button'
import { SupplierProductDetail } from '@/components/sourcing/SupplierDrawer'
import { useAuth } from '@/contexts/AuthContext'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { landingSignInTo } from '@/lib/authLanding'
import { findCardInHistoryRows } from '@/lib/sourcingFilters'
import {
  parseSourcingProductParams,
  sourcingProductPath,
  sourcingSearchResultsPath,
} from '@/lib/sourcingRoutes'
import type { SourcingCard, SourcingHistoryRow } from '@/lib/sourcingTypes'
import { supabase } from '@/lib/supabase'

export type SourcingProductLocationState = {
  card?: SourcingCard
  keyword?: string
}

export default function SourcingProductPage() {
  const { searchId } = useParams<{ searchId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setTrail } = useNavbarTrail()

  const navState = (location.state as SourcingProductLocationState | null) ?? null
  const { source, productUrl } = parseSourcingProductParams(location.search)

  const [card, setCard] = useState<SourcingCard | null>(navState?.card ?? null)
  const [keyword, setKeyword] = useState(navState?.keyword ?? '')
  const [loading, setLoading] = useState(!navState?.card)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setTrail(card?.title ? card.title.slice(0, 48) : 'Product')
    return () => setTrail(null)
  }, [card?.title, setTrail])

  const load = useCallback(async () => {
    if (!searchId || !user?.id || !source || !productUrl) {
      setNotFound(true)
      setLoading(false)
      return
    }

    // Prefer in-memory card from navigation when it matches the URL.
    if (
      navState?.card &&
      navState.card.source === source &&
      navState.card.product_url === productUrl
    ) {
      setCard(navState.card)
      setKeyword(navState.keyword ?? '')
      setNotFound(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('sourcing_search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(50)

    if (error || !data?.length) {
      setCard(null)
      setNotFound(true)
      setLoading(false)
      return
    }

    const rows = data as SourcingHistoryRow[]
    const primary = rows.find((r) => r.search_id === searchId) ?? null
    const found =
      findCardInHistoryRows(primary ? [primary] : [], source, productUrl) ??
      findCardInHistoryRows(rows, source, productUrl)

    if (!found) {
      setCard(null)
      setNotFound(true)
      setLoading(false)
      return
    }

    setCard(found)
    setKeyword(primary?.keyword ?? navState?.keyword ?? '')
    setNotFound(false)
    setLoading(false)
  }, [navState?.card, navState?.keyword, productUrl, searchId, source, user?.id])

  useEffect(() => {
    if (!searchId || !source || !productUrl) {
      setNotFound(true)
      setLoading(false)
      return
    }
    if (!user?.id) {
      navigate(
        landingSignInTo(sourcingProductPath(searchId, { source, product_url: productUrl })),
        { replace: true },
      )
      return
    }
    void load()
  }, [load, navigate, productUrl, searchId, source, user?.id])

  const backPath = searchId ? sourcingSearchResultsPath(searchId) : '/room?mode=sourcing'

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound || !card || !searchId) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16">
        <NotFoundState message="This product could not be found in your sourcing results.">
          <Button type="button" variant="primary" onClick={() => navigate(backPath)}>
            Back to results
          </Button>
        </NotFoundState>
      </div>
    )
  }

  return (
    <>
      <Seo
        title={`${card.title} · Sourcing | PowerProof`}
        description={card.product_description?.slice(0, 160) || `Supplier listing for ${card.title}`}
        canonicalPath={sourcingProductPath(searchId, card)}
        noIndex
      />

      <div className="mx-auto w-full max-w-platform py-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-2 gap-1.5 px-4 layout-sm:px-6 layout-lg:px-8"
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Button>

        <SupplierProductDetail
          card={card}
          keyword={keyword || card.title}
          variant="page"
        />
      </div>
    </>
  )
}

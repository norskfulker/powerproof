import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Seo } from '@/components/Seo'
import { InvestorDetailProfile } from '@/components/investors/InvestorDetailProfile'
import { DiscoverWide } from '@/components/page-shells'
import { fetchInvestorBySlug, investorDetailPath } from '@/lib/investorsApi'
import { investorsPageShellClass } from '@/lib/investorsLayout'
import type { Investor } from '@/types/investors'
import { useNavbarTrail } from '@/contexts/NavbarTrailContext'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { BookMarked } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function InvestorDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { setTrail } = useNavbarTrail()
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useRegisterAppChromeHeader({
    title: investor?.name ?? (notFound ? 'Investor not found' : 'Investor'),
    icon: <BookMarked className="h-full w-full" aria-hidden />,
  })

  const load = useCallback(async () => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)

    try {
      const row = await fetchInvestorBySlug(slug)
      if (!row) {
        setInvestor(null)
        setNotFound(true)
      } else {
        setInvestor(row)
      }
    } catch {
      setInvestor(null)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!investor?.name) {
      setTrail(null)
      return
    }
    setTrail(investor.name)
    return () => setTrail(null)
  }, [investor?.name, setTrail])

  const shellClassName = cn(investorsPageShellClass, 'py-3 layout-sm:py-5 layout-lg:py-6')

  if (loading) {
    return (
      <DiscoverWide className={shellClassName}>
        <div
          className="overflow-hidden rounded-xl border border-border-subtle"
          aria-busy
          aria-label="Loading investor"
        >
          <div className="h-11 animate-pulse bg-muted/40" />
          <div className="space-y-4 bg-card p-5 layout-sm:p-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-muted/40" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-7 w-2/3 animate-pulse rounded-md bg-muted/40" />
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted/30" />
              </div>
            </div>
            <div className="h-16 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-16 animate-pulse rounded-md bg-muted/25" />
          </div>
        </div>
      </DiscoverWide>
    )
  }

  if (notFound || !investor) {
    return (
      <DiscoverWide className={shellClassName}>
        <Seo title="Investor not found | PowerProof" noIndex canonicalPath="/investors" />
        <div className="rounded-xl border border-dashed border-border-subtle/80 bg-muted/15 px-5 py-12 text-center">
          <p className="font-display text-lg font-semibold text-foreground">Investor not found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            This profile may have been removed or the link is incorrect.
          </p>
        </div>
      </DiscoverWide>
    )
  }

  return (
    <DiscoverWide className={shellClassName}>
      <Seo
        title={`${investor.name} | Investors | PowerProof`}
        description={investor.description ?? `Investor profile for ${investor.name}.`}
        canonicalPath={investorDetailPath(investor.slug)}
        noIndex
      />
      <InvestorDetailProfile investor={investor} />
    </DiscoverWide>
  )
}

export default InvestorDetailPage

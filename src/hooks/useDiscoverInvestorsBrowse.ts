import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatInvestorFirmType } from '@/lib/investorsDisplay'
import {
  collectInvestorSectors,
  collectPortfolioCompanyNames,
  fetchAllInvestors,
  fetchInvestorsActiveCount,
  investorMatchesSearch,
} from '@/lib/investorsApi'
import type { Investor } from '@/types/investors'

export function useDiscoverInvestorsBrowse(enabled: boolean) {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [investorCount, setInvestorCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [firmType, setFirmType] = useState<string>('all')
  const [sector, setSector] = useState<string>('all')
  const [portfolioCompany, setPortfolioCompany] = useState<string>('all')

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function loadCount() {
      try {
        const count = await fetchInvestorsActiveCount()
        if (!cancelled) setInvestorCount(count)
      } catch {
        if (!cancelled) setInvestorCount(null)
      }
    }

    void loadCount()
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAllInvestors()
        if (!cancelled) setInvestors(data)
      } catch {
        if (!cancelled) {
          setError('Could not load investors. Please try again.')
          setInvestors([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [enabled])

  const firmTypes = useMemo(() => {
    const values = new Set<string>()
    for (const investor of investors) {
      if (investor.firm_type) values.add(investor.firm_type)
    }
    return Array.from(values).sort((a, b) => formatInvestorFirmType(a).localeCompare(formatInvestorFirmType(b)))
  }, [investors])

  const sectors = useMemo(() => collectInvestorSectors(investors), [investors])
  const portfolioNames = useMemo(() => collectPortfolioCompanyNames(investors), [investors])

  const filtered = useMemo(() => {
    return investors.filter((investor) => {
      if (firmType !== 'all' && investor.firm_type !== firmType) return false
      if (sector !== 'all' && !(investor.sectors ?? []).includes(sector)) return false
      if (
        portfolioCompany !== 'all' &&
        !(investor.portfolio_companies ?? []).some((company) => company.name === portfolioCompany)
      ) {
        return false
      }
      return investorMatchesSearch(investor, search)
    })
  }, [firmType, investors, portfolioCompany, search, sector])

  const resetFilters = useCallback(() => {
    setSearch('')
    setFirmType('all')
    setSector('all')
    setPortfolioCompany('all')
  }, [])

  return {
    search,
    setSearch,
    firmType,
    setFirmType,
    sector,
    setSector,
    portfolioCompany,
    setPortfolioCompany,
    firmTypes,
    sectors,
    portfolioNames,
    filtered,
    resetFilters,
    showLockedList: false,
    accessLoading: false,
    checkoutLoading: false,
    investorCount,
    loading,
    error,
    isUnlocked: true,
    handleUnlock: async () => {},
  }
}

import { useState, useEffect } from 'react'
import {
  getCategoryFilterOptions,
  getGlobalFilterOptions,
} from '@/lib/catalogCache'

export interface FilterOptions {
  has_under_1l: boolean
  has_1l_5l: boolean
  has_5l_20l: boolean
  has_above_20l: boolean
  min_budget: number
  max_budget: number
}

const DEFAULT_OPTIONS: FilterOptions = {
  has_under_1l: true,
  has_1l_5l: true,
  has_5l_20l: true,
  has_above_20l: true,
  min_budget: 0.1,
  max_budget: 60,
}

/** Budget filter bounds — only fetched when `enabled` (filter panel open / opportunities tab). */
export function useFilterOptions(categorySlug?: string, enabled = false) {
  const [options, setOptions] = useState<FilterOptions>(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)

    async function fetch() {
      try {
        const data =
          categorySlug && categorySlug !== 'all'
            ? await getCategoryFilterOptions(categorySlug)
            : await getGlobalFilterOptions()
        if (!cancelled && data) setOptions(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetch()
    return () => {
      cancelled = true
    }
  }, [categorySlug, enabled])

  return { options, loading }
}

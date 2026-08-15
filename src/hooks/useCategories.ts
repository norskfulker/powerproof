import { useState, useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { getCategoryCounts } from '@/lib/catalogCache'

import { Category } from '@/lib/types'

function dbToLocal(row: { slug: string; lucide: string; name: string; opportunity_count?: number }): Category {
  return {
    slug: row.slug,
    lucide: row.lucide,
    name: row.name,
    count: row.opportunity_count ?? 0,
  }
}

/** Category list + counts — only loads when `enabled` (opportunities tab active). */
export function useCategories(enabled = false) {
  const [data, setData] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const fetch = async () => {
      try {
        const [{ data: cats, error: catsError }, counts] = await Promise.all([
          supabase
            .from('categories')
            .select('id, slug, name, lucide')
            .eq('is_active', true)
            .order('name'),
          getCategoryCounts(),
        ])

        if (cancelled) return

        if (catsError) throw catsError
        if (!cats || cats.length === 0) {
          setData([])
          return
        }

        const countMap = (counts ?? []).reduce(
          (acc, row: { category_slug?: string; opportunity_count?: number }) => {
            const slug = row?.category_slug
            if (typeof slug === 'string' && slug) {
              acc[slug] = Number(row.opportunity_count ?? 0)
            }
            return acc
          },
          {} as Record<string, number>,
        )

        const rows = cats.map((c: { slug: string; lucide: string; name: string }) => ({
          ...c,
          opportunity_count: countMap[c.slug] ?? 0,
        }))

        setData(rows.map(dbToLocal))
      } catch (cause) {
        if (cancelled) return
        setData([])
        setError(cause instanceof Error ? cause : new Error('Failed to load categories'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetch()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { data, isLoading, error }
}

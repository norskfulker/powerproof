import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeGeoIso } from '@/lib/geoIso'

export type GeoSubdivisionRow = { id: string; name: string }

export type GeoSubdivisionsState = {
  subdivisions: GeoSubdivisionRow[]
  isLoading: boolean
  error: string | null
}

const subdivisionsCache = new Map<string, GeoSubdivisionRow[]>()
const subdivisionsInflight = new Map<string, Promise<GeoSubdivisionRow[]>>()

async function loadGeoSubdivisions(isoKey: string): Promise<GeoSubdivisionRow[]> {
  const cached = subdivisionsCache.get(isoKey)
  if (cached) return cached

  let inflight = subdivisionsInflight.get(isoKey)
  if (!inflight) {
    inflight = supabase
      .from('geo_city')
      .select('subdivision_name')
      .eq('country_iso', isoKey)
      .order('subdivision_name', { ascending: true })
      .then(({ data, error: qErr }) => {
        if (qErr) throw qErr
        const seen = new Set<string>()
        const rows: GeoSubdivisionRow[] = []
        for (const row of data ?? []) {
          const name = String((row as { subdivision_name?: string }).subdivision_name ?? '').trim()
          if (!name || seen.has(name)) continue
          seen.add(name)
          rows.push({ id: name, name })
        }
        subdivisionsCache.set(isoKey, rows)
        return rows
      })
      .catch((err) => {
        console.warn('[useGeoSubdivisions]', err instanceof Error ? err.message : err)
        subdivisionsCache.set(isoKey, [])
        return []
      })
      .finally(() => {
        subdivisionsInflight.delete(isoKey)
      })
    subdivisionsInflight.set(isoKey, inflight)
  }
  return inflight
}

/** States / provinces from geo_city — fetched after a country is selected; cached per ISO. */
export function useGeoSubdivisions(
  countryIso: string | null | undefined,
  enabled = true,
): GeoSubdivisionsState {
  const [subdivisions, setSubdivisions] = useState<GeoSubdivisionRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isoKey = normalizeGeoIso(countryIso)

  useEffect(() => {
    if (!enabled || !isoKey) {
      setSubdivisions([])
      setIsLoading(false)
      setError(null)
      return
    }

    const cached = subdivisionsCache.get(isoKey)
    if (cached) {
      setSubdivisions(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void loadGeoSubdivisions(isoKey).then((rows) => {
      if (cancelled) return
      setSubdivisions(rows)
      setIsLoading(false)
      if (rows.length === 0) setError(null)
    })

    return () => {
      cancelled = true
    }
  }, [isoKey, enabled])

  return { subdivisions, isLoading, error }
}

/** Normalize ISO 3166-1 alpha-2 for geo_* queries (DB stores uppercase). */
export function normalizeGeoIso(iso: string | null | undefined): string | null {
  const s = String(iso ?? '').trim().toUpperCase()
  return s || null
}

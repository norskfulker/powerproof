import { DEFAULT_DISPLAY_CURRENCY_CODE } from '@/lib/displayCurrency'
import { readGuestCurrencyFromStorage } from '@/lib/guestDisplayCurrency'

/** Session hint set after a successful geo lookup (guests on marketing pages only). */
export const LANDING_GEO_CURRENCY_SESSION_KEY = 'powerproof_landing_geo_currency'
export const LANDING_GEO_COUNTRY_SESSION_KEY = 'powerproof_landing_geo_country'

const GUEST_COUNTRY_STORAGE_KEY = 'powerproof_country'
const GUEST_COUNTRY_CHANGE_EVENT = 'powerproof_country_change'

/** ISO 4217 codes we can convert to in the app (must match `SUPPORTED_CURRENCIES` in useCurrency). */
const KNOWN = new Set(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'TZS', 'AED', 'SGD', 'NGN'])

/** Eurozone (EUR) — common subset; unlisted EU countries fall through to default USD. */
const EUROZONE = new Set([
  'AT',
  'BE',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
])

/**
 * Map a geo IP country (ISO 3166-1 alpha-2) to a supported display currency.
 * Unknown or unsupported regions use `DEFAULT_DISPLAY_CURRENCY_CODE`.
 */
export function countryCodeToSupportedCurrency(country: string | null | undefined): string {
  if (!country) return DEFAULT_DISPLAY_CURRENCY_CODE
  const c = country.trim().toUpperCase()
  if (c.length !== 2) return DEFAULT_DISPLAY_CURRENCY_CODE

  if (c === 'IN') return 'INR'
  if (c === 'US') return 'USD'
  if (c === 'GB') return 'GBP'
  if (EUROZONE.has(c)) return 'EUR'
  if (c === 'AE') return 'AED'
  if (c === 'SG') return 'SGD'
  if (c === 'NG') return 'NGN'
  if (c === 'TZ') return 'TZS'
  if (c === 'JP') return 'JPY'
  if (c === 'KR') return 'KRW'

  return DEFAULT_DISPLAY_CURRENCY_CODE
}

export function readLandingGeoCurrencySession(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LANDING_GEO_CURRENCY_SESSION_KEY)?.trim().toUpperCase()
    if (raw && KNOWN.has(raw)) return raw
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Country code from GeoJS (CORS-friendly). Fails softly on network / adblock.
 * @see https://www.geojs.io/docs/v1/endpoints/
 */
export async function fetchGeoCountryCode(): Promise<string | null> {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/country.json', {
      credentials: 'omit',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { country?: string }
    const code = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : ''
    return code.length === 2 ? code : null
  } catch {
    return null
  }
}

export function readLandingGeoCountrySession(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LANDING_GEO_COUNTRY_SESSION_KEY)?.trim().toUpperCase()
    if (raw && raw.length === 2) return raw
  } catch {
    /* ignore */
  }
  return null
}

function applyLandingGeoToGuestStorage(countryCode: string | null, currency: string) {
  try {
    sessionStorage.setItem(LANDING_GEO_CURRENCY_SESSION_KEY, currency)
    if (countryCode) sessionStorage.setItem(LANDING_GEO_COUNTRY_SESSION_KEY, countryCode)
    if (
      countryCode &&
      !localStorage.getItem(GUEST_COUNTRY_STORAGE_KEY) &&
      !readGuestCurrencyFromStorage()
    ) {
      localStorage.setItem(GUEST_COUNTRY_STORAGE_KEY, countryCode)
      window.dispatchEvent(new Event(GUEST_COUNTRY_CHANGE_EVENT))
    }
  } catch {
    /* ignore */
  }
}

export type LandingGeoResolution = {
  countryCode: string | null
  currency: string
}

let landingGeoPromise: Promise<LandingGeoResolution> | null = null

/**
 * Resolve display currency (and country) for marketing guests via IP geo.
 * Dedupes in-flight requests and caches in sessionStorage for the tab.
 */
export function resolveLandingGeo(): Promise<LandingGeoResolution> {
  const cachedCurrency = readLandingGeoCurrencySession()
  const cachedCountry = readLandingGeoCountrySession()
  if (cachedCurrency) {
    return Promise.resolve({
      countryCode: cachedCountry,
      currency: cachedCurrency,
    })
  }

  if (!landingGeoPromise) {
    landingGeoPromise = (async () => {
      const countryCode = await fetchGeoCountryCode()
      const currency = countryCodeToSupportedCurrency(countryCode)
      applyLandingGeoToGuestStorage(countryCode, currency)
      return { countryCode, currency }
    })()
  }

  return landingGeoPromise
}

/** @deprecated Prefer `resolveLandingGeo()` */
export async function fetchLandingGeoDisplayCurrency(): Promise<string> {
  const { currency } = await resolveLandingGeo()
  return currency
}

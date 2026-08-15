/** Persisted display currency for logged-out users (profile uses `preferred_currency`). */
export const GUEST_DISPLAY_CURRENCY_STORAGE_KEY = 'powerproof_display_currency'

const SUPPORTED_GUEST_CURRENCY_CODES = new Set([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'KRW',
  'TZS',
  'AED',
  'SGD',
  'NGN',
])

/** Guest explicitly chose a currency (CurrencySwitcher); when unset, marketing pages may use IP hint. */
export function readGuestCurrencyFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GUEST_DISPLAY_CURRENCY_STORAGE_KEY)?.trim().toUpperCase()
    if (raw && SUPPORTED_GUEST_CURRENCY_CODES.has(raw)) return raw
  } catch {
    /* ignore */
  }
  return null
}

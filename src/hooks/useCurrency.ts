import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  buildEffectiveUsdBaseRates,
  DEFAULT_DISPLAY_CURRENCY_CODE,
  formatCompactMoneyAmount,
} from '@/lib/displayCurrency'
import { localizeUsdAmountsInText } from '@/lib/opportunityDetailUtils'

/** Format a numeric amount in a specific ISO currency (for B2B post budgets, etc.). */
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—'
  const n = Number(amount)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    const currObj = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode)
    const sym = currObj?.symbol ?? currencyCode
    return `${sym}${Math.round(n).toLocaleString('en-IN')}`
  }
}

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', flagCountry: 'in' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', flagCountry: 'us' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', flagCountry: 'eu' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', flagCountry: 'gb' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', flagCountry: 'jp' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', flagCountry: 'kr' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿', flagCountry: 'tz' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', flagCountry: 'ae' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', flagCountry: 'sg' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', flagCountry: 'ng' },
] as const

export const FALLBACK_INR_BASE_RATES: Record<string, number> = {
  INR: 1,
  USD: 1 / 83,
  EUR: 1 / 90,
  GBP: 1 / 105,
  JPY: 1.8,
  KRW: 16.5,
  TZS: 0.32,
  AED: 0.044,
  SGD: 0.016,
  NGN: 18,
}

export const FALLBACK_USD_BASE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150,
  KRW: 1370,
  TZS: 2615,
  AED: 3.67,
  SGD: 1.35,
  NGN: 1644,
}

function mergeRates(dbRates: Record<string, number> | null | undefined): Record<string, number> {
  const fromDb = dbRates && typeof dbRates === 'object' ? dbRates : {}
  return { ...FALLBACK_INR_BASE_RATES, ...fromDb, INR: 1 }
}

function mergeUSDRates(dbRates: Record<string, number> | null | undefined): Record<string, number> {
  const fromDb = dbRates && typeof dbRates === 'object' ? dbRates : {}
  return { ...FALLBACK_USD_BASE_RATES, ...fromDb, USD: 1 }
}

let cachedRates: Record<string, number> | null = null
let fetchPromise: Promise<Record<string, number>> | null = null

let cachedRatesUSD: Record<string, number> | null = null
let fetchPromiseUSD: Promise<Record<string, number>> | null = null

const getRates = async (): Promise<Record<string, number>> => {
  if (cachedRates) return cachedRates
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rates')
        .eq('base_currency', 'INR')
        .maybeSingle()

      if (error) {
        cachedRates = mergeRates(null)
        return cachedRates
      }

      const raw = data?.rates
      const merged = mergeRates(typeof raw === 'object' && raw !== null ? (raw as Record<string, number>) : null)
      cachedRates = merged
      return merged
    } catch {
      cachedRates = mergeRates(null)
      return cachedRates
    }
  })()

  return fetchPromise
}

const getUSDRates = async (): Promise<Record<string, number>> => {
  if (cachedRatesUSD) return cachedRatesUSD
  if (fetchPromiseUSD) return fetchPromiseUSD

  fetchPromiseUSD = (async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rates')
        .eq('base_currency', 'USD')
        .maybeSingle()

      if (error) {
        cachedRatesUSD = mergeUSDRates(null)
        return cachedRatesUSD
      }

      const raw = data?.rates
      const merged = mergeUSDRates(typeof raw === 'object' && raw !== null ? (raw as Record<string, number>) : null)
      cachedRatesUSD = merged
      return merged
    } catch {
      cachedRatesUSD = mergeUSDRates(null)
      return cachedRatesUSD
    }
  })()

  return fetchPromiseUSD
}

const INR_CURRENCY =
  SUPPORTED_CURRENCIES.find((c) => c.code === DEFAULT_DISPLAY_CURRENCY_CODE) ?? SUPPORTED_CURRENCIES[0]

/** Display currency is fixed to INR; rates are still fetched for USD→INR formatting. */
export function useCurrency() {
  const currency = DEFAULT_DISPLAY_CURRENCY_CODE
  const [rates, setRates] = useState<Record<string, number>>(() => ({ ...FALLBACK_INR_BASE_RATES }))
  const [ratesUSD, setRatesUSD] = useState<Record<string, number>>(() => ({ ...FALLBACK_USD_BASE_RATES }))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getRates(), getUSDRates()]).then(([inr, usdFromDb]) => {
      if (cancelled) return
      const usd = buildEffectiveUsdBaseRates(inr, usdFromDb, FALLBACK_USD_BASE_RATES)
      setRates(inr)
      setRatesUSD(usd)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setCurrency = useCallback(async (_code: string) => {
    /* INR-only display */
  }, [])

  const convert = useCallback((amountINR: number, targetCurrency: string = currency): number => {
    if (!amountINR || !rates) return amountINR
    const code = String(targetCurrency || currency).toUpperCase()
    const rate = rates[code] ?? FALLBACK_INR_BASE_RATES[code] ?? 1
    return amountINR * rate
  }, [rates, currency])

  const toINR = useCallback((amount: number, fromCurrency: string): number => {
    if (amount === null || amount === undefined || Number.isNaN(amount)) return 0
    if (!rates) return amount
    const code = String(fromCurrency || 'INR').toUpperCase()
    if (code === 'INR') return amount
    const rate = rates[code] ?? FALLBACK_INR_BASE_RATES[code] ?? 1
    return amount / rate
  }, [rates])

  const convertFromUSD = useCallback(
    (amountUSD: number, targetCurrency: string = currency): number => {
      if (amountUSD === null || amountUSD === undefined || Number.isNaN(amountUSD)) return 0
      if (!ratesUSD) return amountUSD
      const code = String(targetCurrency || currency).toUpperCase()
      if (code === 'USD') return amountUSD
      const rate = ratesUSD[code] ?? FALLBACK_USD_BASE_RATES[code] ?? 1
      return amountUSD * rate
    },
    [ratesUSD, currency],
  )

  const toUSD = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (amount === null || amount === undefined || Number.isNaN(amount)) return 0
      if (!ratesUSD) return amount
      const code = String(fromCurrency || 'USD').toUpperCase()
      if (code === 'USD') return amount
      const rate = ratesUSD[code] ?? FALLBACK_USD_BASE_RATES[code] ?? 1
      return amount / rate
    },
    [ratesUSD],
  )

  const formatMoney = useCallback((amountUSD: number, targetCurrency: string = currency): string => {
    if (amountUSD === null || amountUSD === undefined || Number.isNaN(amountUSD)) return '—'
    const code = String(targetCurrency || currency).toUpperCase()
    const converted = convertFromUSD(amountUSD, code)
    const currObj = SUPPORTED_CURRENCIES.find((c) => c.code === code)
    return formatCompactMoneyAmount(converted, code, currObj?.symbol)
  }, [convertFromUSD, currency])

  const formatRentReference = useCallback(
    (amountLocal: number, fromCurrency: string, targetCurrency?: string): string => {
      const usd = toUSD(amountLocal, fromCurrency)
      return formatMoney(usd, targetCurrency ?? currency)
    },
    [toUSD, formatMoney, currency],
  )

  const formatSetupCost = useCallback(
    (minUSD: number | null | undefined, maxUSD: number | null | undefined): string => {
      const a = Number(minUSD) || 0
      const b = Number(maxUSD) || 0
      if (!a && !b) return '—'
      if (!b || a === b) return formatMoney(a)
      return `${formatMoney(a)} – ${formatMoney(b)}`
    },
    [formatMoney],
  )

  const formatFromUSD = useCallback(
    (amountUSD: number, targetCurrency: string = currency): string => {
      if (amountUSD === null || amountUSD === undefined || Number.isNaN(amountUSD)) return '—'

      const converted = convertFromUSD(amountUSD, targetCurrency)
      const abs = Math.abs(converted)
      const sign = converted < 0 ? '-' : ''

      const code = String(targetCurrency || currency).toUpperCase()
      const currObj = SUPPORTED_CURRENCIES.find((c) => c.code === code)
      const sym = currObj?.symbol || code

      if (abs === 0) return `${sym}0`

      if (abs < 1000) {
        return `${sign}${sym}${abs.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      }
      return `${sign}${sym}${Math.round(abs).toLocaleString('en-IN')}`
    },
    [convertFromUSD, currency],
  )

  const localizeText = useCallback(
    (text: string | null | undefined): string => {
      const raw = String(text ?? '')
      if (!raw.trim()) return raw
      return localizeUsdAmountsInText(raw, formatMoney, { targetCurrency: currency })
    },
    [currency, formatMoney],
  )

  return {
    currency,
    setCurrency,
    formatMoney,
    formatRentReference,
    formatSetupCost,
    convert,
    toINR,
    convertFromUSD,
    toUSD,
    formatFromUSD,
    localizeText,
    symbol: INR_CURRENCY.symbol,
    rates,
    ratesUSD,
    loading,
    geoCurrencyResolved: true,
    currentCurrency: INR_CURRENCY,
  }
}

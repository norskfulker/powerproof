import { isProductionAnalyticsEnabled } from '@/lib/analyticsEnv'

export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

function cleanParams(params?: AnalyticsEventParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined),
  )
}

/** Fire a custom event to GA4 (`gtag`) and Meta Pixel (`trackCustom`). */
export function trackAnalyticsEvent(eventName: string, params?: AnalyticsEventParams): void {
  const payload = cleanParams(params)

  if (!isProductionAnalyticsEnabled()) {
    if (import.meta.env.DEV) {
      console.debug('[analytics]', eventName, payload)
    }
    return
  }

  if (typeof window === 'undefined') return

  if (window.gtag) {
    window.gtag('event', eventName, payload)
  }

  if (window.fbq) {
    window.fbq('trackCustom', eventName, payload)
  }
}

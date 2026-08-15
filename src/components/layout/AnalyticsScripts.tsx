import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getGaMeasurementId, isProductionAnalyticsEnabled } from '@/lib/analyticsEnv'

const CLARITY_PROJECT_ID = (import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined)?.trim()
const GA_MEASUREMENT_ID = getGaMeasurementId()
const META_PIXEL_ID = (
  (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || '1319591490259578'
).trim()

const META_PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] }
    fbq?: Fbq
    _fbq?: Fbq
  }
}

function gtagScriptPresent(measurementId: string): boolean {
  return Boolean(
    document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`),
  )
}

function initGtagStub(measurementId: string) {
  window.dataLayer = window.dataLayer || []
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
}

function trackGaPageView(measurementId: string) {
  if (!window.gtag) return
  const pagePath = `${window.location.pathname}${window.location.search}`
  window.gtag('config', measurementId, {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  })
}

function ensureGtag(measurementId: string): Promise<void> {
  if (window.gtag && gtagScriptPresent(measurementId)) {
    return Promise.resolve()
  }

  initGtagStub(measurementId)

  if (gtagScriptPresent(measurementId)) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })
}

function loadClarity(projectId: string) {
  if (window.clarity) return
  if (document.querySelector(`script[src="https://www.clarity.ms/tag/${projectId}"]`)) return

  window.clarity =
    window.clarity ||
    function (...args: unknown[]) {
      ;(window.clarity!.q = window.clarity!.q || []).push(args)
    }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${projectId}`
  const firstScript = document.getElementsByTagName('script')[0]
  firstScript?.parentNode?.insertBefore(script, firstScript)
}

function loadMetaPixel(pixelId: string) {
  if (window.fbq) return
  if (document.querySelector(`script[src="${META_PIXEL_SRC}"]`)) return

  const fbq = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args)
  } as Fbq

  if (!window._fbq) window._fbq = fbq
  window.fbq = fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []

  const script = document.createElement('script')
  script.async = true
  script.src = META_PIXEL_SRC
  const firstScript = document.getElementsByTagName('script')[0]
  firstScript?.parentNode?.insertBefore(script, firstScript)

  window.fbq('init', pixelId)
}

/**
 * Clarity, GA4, Meta Pixel. GA base tag is also injected into index.html at production build time;
 * this component loads any missing scripts and sends SPA pageviews on route changes.
 */
export function AnalyticsScripts() {
  const location = useLocation()
  const [gtagReady, setGtagReady] = useState(false)

  useEffect(() => {
    if (!isProductionAnalyticsEnabled()) return
    if (typeof document === 'undefined') return

    if (CLARITY_PROJECT_ID) loadClarity(CLARITY_PROJECT_ID)
    if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID)

    if (!GA_MEASUREMENT_ID) {
      if (import.meta.env.PROD) {
        console.warn('[analytics] VITE_GA_MEASUREMENT_ID is missing — GA4 will not run.')
      }
      return
    }

    let cancelled = false
    void ensureGtag(GA_MEASUREMENT_ID).then(() => {
      if (!cancelled) setGtagReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isProductionAnalyticsEnabled()) return
    if (!GA_MEASUREMENT_ID || !gtagReady) return
    trackGaPageView(GA_MEASUREMENT_ID)
  }, [gtagReady, location.pathname, location.search])

  useEffect(() => {
    if (!isProductionAnalyticsEnabled()) return
    if (!META_PIXEL_ID || !window.fbq) return
    window.fbq('track', 'PageView')
  }, [location.pathname, location.search])

  return null
}

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ExternalLink, Link2, X } from '@/lib/icons'
import {
  copyPageUrlToClipboard,
  detectInAppBrowser,
  dismissInAppBrowserBanner,
  getInAppBrowserBannerInstructions,
  getInAppBrowserBannerTitle,
  hasTrackedInAppBrowserThisSession,
  isAndroidDevice,
  isInAppBrowserBannerDismissed,
  isIosDevice,
  isSocialTraffic,
  markInAppBrowserTracked,
  shouldShowInAppBrowserBanner,
  tryOpenInChrome,
} from '@/lib/inAppBrowser'
import { trackAnalyticsEvent } from '@/lib/trackAnalyticsEvent'
import { cn } from '@/lib/utils'

function readUtmSource(search: string): string | undefined {
  const value = new URLSearchParams(search).get('utm_source')?.trim()
  return value || undefined
}

export function InAppBrowserBanner() {
  const { pathname, search } = useLocation()
  const [dismissed, setDismissed] = useState(isInAppBrowserBannerDismissed)
  const [copied, setCopied] = useState(false)

  const inApp = useMemo(() => detectInAppBrowser(), [])
  const fromSocial = useMemo(() => isSocialTraffic(search), [search])
  const visible = shouldShowInAppBrowserBanner(search) && !dismissed
  const isAndroid = isAndroidDevice()
  const isIos = isIosDevice()

  useEffect(() => {
    if (!inApp.isInApp || hasTrackedInAppBrowserThisSession()) return

    markInAppBrowserTracked()
    trackAnalyticsEvent('in_app_browser', {
      in_app_browser: true,
      in_app_browser_id: inApp.id ?? 'unknown',
      from_social: fromSocial,
      utm_source: readUtmSource(search),
      page_path: `${pathname}${search}`,
    })
  }, [fromSocial, inApp.id, inApp.isInApp, pathname, search])

  if (!visible) return null

  const title = getInAppBrowserBannerTitle(inApp)
  const instructions = getInAppBrowserBannerInstructions(inApp)

  const trackOpen = (method: string) => {
    trackAnalyticsEvent('in_app_browser_open_external', {
      in_app_browser: true,
      in_app_browser_id: inApp.id ?? 'unknown',
      from_social: fromSocial,
      utm_source: readUtmSource(search),
      page_path: `${pathname}${search}`,
      method,
    })
  }

  const handleOpenExternal = () => {
    trackOpen(isAndroid ? 'android_chrome_intent' : 'tap')
    if (isAndroid) {
      tryOpenInChrome(window.location.href)
    }
  }

  const handleCopyLink = () => {
    void (async () => {
      const ok = await copyPageUrlToClipboard(window.location.href)
      trackOpen(ok ? 'copy_link' : 'copy_link_failed')
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    })()
  }

  const handleDismiss = () => {
    dismissInAppBrowserBanner()
    setDismissed(true)
    trackAnalyticsEvent('in_app_browser_banner_dismissed', {
      in_app_browser: true,
      in_app_browser_id: inApp.id ?? 'unknown',
      from_social: fromSocial,
      utm_source: readUtmSource(search),
      page_path: `${pathname}${search}`,
    })
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-[220] border-b border-primary/20 bg-primary px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground shadow-md',
        )}
        role="region"
        aria-label="Open in browser"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-foreground/90">{instructions}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-primary-foreground/80 transition hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={handleDismiss}
              aria-label="Dismiss open in browser notice"
            >
              <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAndroid ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                Open in Chrome
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={isAndroid ? 'ghost' : 'secondary'}
              className={cn(
                'h-9 shrink-0',
                isAndroid
                  ? 'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground'
                  : 'bg-primary-foreground text-primary hover:bg-primary-foreground/90',
              )}
              onClick={handleCopyLink}
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              {copied ? 'Link copied' : isIos ? 'Copy link for Safari' : 'Copy link'}
            </Button>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'shrink-0',
          isAndroid || isIos
            ? 'h-[calc(6.75rem+env(safe-area-inset-top))]'
            : 'h-[calc(5.5rem+env(safe-area-inset-top))]',
        )}
        aria-hidden
      />
    </>
  )
}

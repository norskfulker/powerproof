export type InAppBrowserId =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'twitter'
  | 'snapchat'
  | 'line'
  | 'wechat'
  | 'generic'

export type InAppBrowserInfo = {
  isInApp: boolean
  id: InAppBrowserId | null
  label: string
}

const UA_PATTERNS: Array<{ id: InAppBrowserId; label: string; test: RegExp }> = [
  { id: 'instagram', label: 'Instagram', test: /Instagram/i },
  { id: 'facebook', label: 'Facebook', test: /FBAN|FBAV|FB_IAB/i },
  { id: 'tiktok', label: 'TikTok', test: /TikTok|musical_ly|BytedanceWebview/i },
  { id: 'linkedin', label: 'LinkedIn', test: /LinkedInApp/i },
  { id: 'twitter', label: 'X (Twitter)', test: /Twitter/i },
  { id: 'snapchat', label: 'Snapchat', test: /Snapchat/i },
  { id: 'line', label: 'LINE', test: /\bLine\//i },
  { id: 'wechat', label: 'WeChat', test: /MicroMessenger/i },
]

const SOCIAL_UTM_SOURCES = new Set([
  'instagram',
  'facebook',
  'fb',
  'meta',
  'tiktok',
  'linkedin',
  'twitter',
  'x',
  'snapchat',
])

const SOCIAL_REFERRER_PATTERN =
  /instagram\.com|facebook\.com|fb\.com|tiktok\.com|linkedin\.com|twitter\.com|t\.co|snapchat\.com/i

export function detectInAppBrowser(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InAppBrowserInfo {
  if (!userAgent) {
    return { isInApp: false, id: null, label: '' }
  }

  for (const { id, label, test } of UA_PATTERNS) {
    if (test.test(userAgent)) return { isInApp: true, id, label }
  }

  const isAndroidWebView =
    /Android/i.test(userAgent) && /wv\)/.test(userAgent) && !/Chrome\/[\d.]+ Mobile Safari/i.test(userAgent)

  if (isAndroidWebView) {
    return { isInApp: true, id: 'generic', label: 'in-app browser' }
  }

  return { isInApp: false, id: null, label: '' }
}

export function isSocialTraffic(search = '', referrer = typeof document !== 'undefined' ? document.referrer : ''): boolean {
  const params = new URLSearchParams(search)
  const utmSource = (params.get('utm_source') ?? '').toLowerCase()
  const utmMedium = (params.get('utm_medium') ?? '').toLowerCase()

  if (SOCIAL_UTM_SOURCES.has(utmSource)) return true
  if (utmMedium === 'social' || utmMedium === 'paid_social') return true
  if (SOCIAL_REFERRER_PATTERN.test(referrer)) return true

  return false
}

export function shouldShowInAppBrowserBanner(
  search = '',
  referrer = typeof document !== 'undefined' ? document.referrer : '',
): boolean {
  const inApp = detectInAppBrowser()
  if (!inApp.isInApp) return false
  // Known social in-app browsers — show regardless of UTM (Instagram often strips them).
  if (inApp.id && inApp.id !== 'generic') return true
  return isSocialTraffic(search, referrer)
}

export function isAndroidDevice(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /Android/i.test(userAgent)
}

export function isIosDevice(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent)
}

/** Best-effort Android redirect into Chrome. Falls back to the system browser chooser on some devices. */
export function tryOpenInChrome(url = typeof window !== 'undefined' ? window.location.href : ''): void {
  if (!url || typeof window === 'undefined') return

  const parsed = new URL(url)
  const intentUrl =
    `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}` +
    '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
    encodeURIComponent(url) +
    ';end'

  window.location.href = intentUrl
}

/** Copy the current URL so users can paste it into Safari / Chrome. */
export async function copyPageUrlToClipboard(
  url = typeof window !== 'undefined' ? window.location.href : '',
): Promise<boolean> {
  if (!url || typeof navigator === 'undefined') return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const input = document.createElement('input')
    input.value = url
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    return ok
  } catch {
    return false
  }
}

export function getInAppBrowserSignInMessage(info: InAppBrowserInfo): string {
  if (!info.isInApp) return ''

  const appLabel = info.label || 'This app'
  return `${appLabel}'s built-in browser blocks Google sign-in. Open this page in Chrome or Safari, then try again.`
}

export function getInAppBrowserBannerTitle(info: InAppBrowserInfo): string {
  const appLabel = info.label || 'This app'
  return `Open outside ${appLabel}`
}

export function getInAppBrowserBannerInstructions(info: InAppBrowserInfo): string {
  if (isIosDevice()) {
    return info.id === 'instagram' || info.id === 'facebook'
      ? 'Tap ••• (or the share icon) at the top right → Open in Safari / Open in browser. Sign-in won’t work reliably in this preview.'
      : 'Tap … at the top right, then choose Open in Safari. Sign-in works best in Safari or Chrome.'
  }
  if (isAndroidDevice()) {
    return 'Tap ⋮ in the top right → Open in Chrome / Open in browser. Or use the button below — this in-app preview blocks sign-in.'
  }
  return 'Open this page in your phone’s browser (Chrome or Safari). In-app browsers block sign-in for most people.'
}

const ANALYTICS_DEDUPE_KEY = 'powerproof_in_app_browser_tracked'
const BANNER_DISMISS_KEY = 'powerproof_in_app_browser_banner_dismissed'

export function hasTrackedInAppBrowserThisSession(): boolean {
  try {
    return sessionStorage.getItem(ANALYTICS_DEDUPE_KEY) === '1'
  } catch {
    return false
  }
}

export function markInAppBrowserTracked(): void {
  try {
    sessionStorage.setItem(ANALYTICS_DEDUPE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isInAppBrowserBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInAppBrowserBanner(): void {
  try {
    sessionStorage.setItem(BANNER_DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}

import {
  moderateScannerUrlText,
  type ModerationStatus,
} from '@/lib/textModeration'

/** Scanner composer — URL field limits and copy. */
export const SCANNER_URL_MAX_LENGTH = 100
export const SCANNER_URL_PLACEHOLDER = 'https://example.com'

const SCANNER_BLOCKED_HOST_MESSAGE =
  'Localhost, IP addresses, and internal hosts cannot be scanned.'

const SCANNER_NSFW_MESSAGE =
  'Adult, porn, or gore sites cannot be scanned.'

const SCANNER_CHARS_MESSAGE =
  'Emails and special characters are not allowed. Use a plain website URL like https://example.com'

/** Letters, digits, and common URL punctuation only — no @, spaces, quotes, etc. */
const SCANNER_URL_SAFE_CHARS = /^[a-zA-Z0-9:/.\-_~?&=%#+]+$/

const EMAIL_LIKE =
  /(?:^|[^\w.-])[\w.+-]+@[\w.-]+\.[a-z]{2,}(?:$|[^\w.-])/i

function scannerUrlCharacterError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.includes('@') || EMAIL_LIKE.test(trimmed)) {
    return SCANNER_CHARS_MESSAGE
  }
  if (!SCANNER_URL_SAFE_CHARS.test(trimmed)) {
    return SCANNER_CHARS_MESSAGE
  }
  return null
}

const IPV4_HOST = /^(\d{1,3}\.){3}\d{1,3}$/

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'host.docker.internal',
  'metadata.google.internal',
])

/** Adult / porn / gore TLDs. */
const BLOCKED_TLDS = new Set(['xxx', 'adult', 'porn', 'sex'])

const NSFW_HOST_TOKENS = [
  'pornhub',
  'xvideos',
  'xhamster',
  'xnxx',
  'redtube',
  'youporn',
  'spankbang',
  'chaturbate',
  'stripchat',
  'onlyfans',
  'fansly',
  'brazzers',
  'realitykings',
  'bangbros',
  'adultfriendfinder',
  'camsoda',
  'livejasmin',
  'myfreecams',
  'nhentai',
  'javhd',
  'javlibrary',
  'erome',
  'imagefap',
  'nudevista',
  'sexvid',
  'tubegalore',
  'beeg',
  'tnaflix',
  'drtuber',
  'hqporner',
  'eporner',
  'bestgore',
  'theync',
  'kaotic',
  'goregrish',
  'documentingreality',
  'liveleak',
  'ogrish',
  'rotten',
  'deathaddict',
  'septicisle',
] as const

const NSFW_PATH_TOKENS = [
  'bestgore',
  'snuff',
  'guro',
] as const

function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function hostLabels(hostname: string): string[] {
  return hostname
    .toLowerCase()
    .replace(/\.$/, '')
    .split('.')
    .filter(Boolean)
}

/** Public website URLs only — no localhost, literals, or internal hosts. */
export function isBlockedScannerHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[/, '').replace(/\]$/, '')
  if (!host) return true

  if (BLOCKED_HOSTNAMES.has(host)) return true
  if (host.endsWith('.localhost')) return true
  if (host.endsWith('.local')) return true
  if (host.endsWith('.internal')) return true
  if (host.endsWith('.localdomain')) return true

  if (IPV4_HOST.test(host)) return true
  if (host.includes(':')) return true

  return isPrivateOrReservedIpv4(host)
}

function hasNsfwTld(hostname: string): boolean {
  const labels = hostLabels(hostname)
  const tld = labels[labels.length - 1]
  return Boolean(tld && BLOCKED_TLDS.has(tld))
}

function hasNsfwHostToken(hostname: string): boolean {
  const labels = hostLabels(hostname)
  return NSFW_HOST_TOKENS.some((token) =>
    labels.some((label) => label === token || label.startsWith(`${token}-`) || label.endsWith(`-${token}`)),
  )
}

function hasNsfwPathToken(pathname: string): boolean {
  const segments = pathname
    .toLowerCase()
    .split(/[/_.-]+/)
    .filter(Boolean)
  return NSFW_PATH_TOKENS.some((token) => segments.includes(token))
}

/** Known adult / gore destinations (token lists + foul-word URL scan). */
export function isBlockedNsfwScannerUrl(url: URL): boolean {
  if (hasNsfwTld(url.hostname)) return true
  if (hasNsfwHostToken(url.hostname)) return true
  if (hasNsfwPathToken(url.pathname)) return true
  return false
}

function scannerUrlModerationMessage(raw: string): string | null {
  const foul = moderateScannerUrlText(raw)
  if (!foul.ok) return foul.message
  return null
}

export function parseScannerUrl(raw: string):
  | { ok: true; url: string }
  | { ok: false; message: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, message: 'Please enter a URL.' }
  }
  if (trimmed.length > SCANNER_URL_MAX_LENGTH) {
    return {
      ok: false,
      message: `URL must be ${SCANNER_URL_MAX_LENGTH} characters or fewer.`,
    }
  }

  const charsMessage = scannerUrlCharacterError(trimmed)
  if (charsMessage) {
    return { ok: false, message: charsMessage }
  }

  const foulMessage = scannerUrlModerationMessage(trimmed)
  if (foulMessage) {
    return { ok: false, message: foulMessage }
  }

  const normalized = ensureHttpsScheme(trimmed)

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, message: 'Enter a valid URL like https://powerproof.live' }
    }
    if (parsed.username || parsed.password || parsed.href.includes('@')) {
      return { ok: false, message: SCANNER_CHARS_MESSAGE }
    }
    if (isBlockedScannerHostname(parsed.hostname)) {
      return { ok: false, message: SCANNER_BLOCKED_HOST_MESSAGE }
    }
    if (isBlockedNsfwScannerUrl(parsed)) {
      return { ok: false, message: SCANNER_NSFW_MESSAGE }
    }
    const foulAfterParse = scannerUrlModerationMessage(parsed.toString())
    if (foulAfterParse) {
      return { ok: false, message: foulAfterParse }
    }
    return { ok: true, url: scannerSiteOrigin(parsed) }
  } catch {
    return { ok: false, message: 'Enter a valid URL like https://powerproof.live' }
  }
}

export type ScannerUrlValidation =
  | { ok: true; url: string }
  | { ok: false; message: string }

/** Submit-time validation — URL shape + foul-word / NSFW rules. */
export function validateScannerUrlInput(raw: string): ScannerUrlValidation {
  return parseScannerUrl(raw)
}

/** Realtime checks while typing — foul words inside URL + NSFW tokens. */
export function scannerInputModerationError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const charsMessage = scannerUrlCharacterError(trimmed)
  if (charsMessage) return charsMessage

  const foulMessage = scannerUrlModerationMessage(trimmed)
  if (foulMessage) return foulMessage

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.username || parsed.password) return SCANNER_CHARS_MESSAGE
      if (isBlockedNsfwScannerUrl(parsed)) return SCANNER_NSFW_MESSAGE
    } catch {
      /* incomplete URL while typing */
    }
  }

  return null
}

export type { ModerationStatus }

function ensureHttpsScheme(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^https?:\/?\/?$/i.test(trimmed) || /^https?:/i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function scannerSiteOrigin(parsed: URL): string {
  return `${parsed.protocol}//${parsed.host}`
}

function websiteUrlHasSiteHost(hostname: string): boolean {
  return Boolean(hostname) && hostname.includes('.') && !hostname.startsWith('.') && !hostname.endsWith('.')
}

function cutTypedUrlAtSiteBoundary(trimmed: string): string {
  const schemeMatch = trimmed.match(/^(https?:\/\/)/i)
  const rest = schemeMatch ? trimmed.slice(schemeMatch[1].length) : trimmed
  const cut = rest.search(/[/?#]/)
  if (cut <= 0) return trimmed
  const hostPart = rest.slice(0, cut)
  if (!websiteUrlHasSiteHost(hostPart.split(':')[0] ?? '')) return trimmed
  return `${schemeMatch ? schemeMatch[1] : ''}${hostPart}`
}

/**
 * Live input clamp — keep scheme + host only.
 * Paths, query strings, and hashes are cut as the user types or pastes.
 */
export function clampWebsiteUrlToSite(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const hadScheme = /^https?:\/\//i.test(trimmed)
  const candidate = ensureHttpsScheme(trimmed)

  try {
    const parsed = new URL(candidate)
    if (!websiteUrlHasSiteHost(parsed.hostname)) return trimmed

    const afterScheme = hadScheme ? trimmed.replace(/^https?:\/\//i, '') : trimmed
    if (/[/?#]/.test(afterScheme) || !hadScheme) {
      return scannerSiteOrigin(parsed)
    }
    return trimmed
  } catch {
    return cutTypedUrlAtSiteBoundary(trimmed)
  }
}

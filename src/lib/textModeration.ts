import type { RegExpMatcher } from 'obscenity'
import {
  RegExpMatcher as RegExpMatcherCtor,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity'

let matcher: RegExpMatcher | null = null

function getMatcher(): RegExpMatcher {
  if (!matcher) {
    matcher = new RegExpMatcherCtor({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    })
  }
  return matcher
}

const VOWELS = /[aeiou]/gi
const ALPHA = /[a-z]/gi
const REPEAT_4_PLUS = /(.)\1{3,}/i
const NO_VOWEL_RUN_5_PLUS = /[^aeiou\s\W\d_]{5,}/i

/** Normalize common leetspeak / symbol substitutions before custom term checks. */
function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/4/g, 'a')
    .replace(/8/g, 'b')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termPattern(term: string): RegExp {
  const escaped = escapeRegExp(term.trim())
  if (/\s/.test(term)) {
    return new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i')
  }
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

/**
 * Extra discover-hero blocklist — profanity, sexual slurs, abuse, fraud, and harm prompts
 * (checked in addition to the obscenity matcher).
 */
const DISCOVER_HERO_BLOCKED_WORDS = [
  'fuck',
  'fucker',
  'fucking',
  'fucked',
  'motherfucker',
  'mf',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'slut',
  'whore',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'asshole',
  'bastard',
  'sex',
  'sexy',
  'porn',
  'porno',
  'xxx',
  'nude',
  'nudes',
  'naked',
  'rape',
  'rapist',
  'pedo',
  'pedophile',
  'paedophile',
  'nazi',
  'nigger',
  'faggot',
  'retard',
  'terrorist',
  'terrorism',
  'terrorists',
  'isis',
  'alqaeda',
  'scam',
  'scams',
  'scammer',
  'scamming',
  'phishing',
  'phish',
  'ponzi',
  'hitman',
  'hitmen',
  'meth',
  'cocaine',
  'heroin',
  'fentanyl',
  'drugdealing',
  'traphouse',
  'trap house',
  'ransomware',
  'malware',
  'botnet',
  'carding',
  'skimmer',
] as const

const DISCOVER_HERO_BLOCKED_PHRASES = [
  'running traps',
  'run traps',
  'run a scam',
  'run scam',
  'start a scam',
  'pyramid scheme',
  'ponzi scheme',
  'money laundering',
  'launder money',
  'credit card fraud',
  'identity theft',
  'steal passwords',
  'steal password',
  'phishing email',
  'phishing site',
  'phishing scam',
  'bomb making',
  'make a bomb',
  'build a bomb',
  'school shooting',
  'mass shooting',
  'kill yourself',
  'kys',
  'child porn',
  'cp site',
  'sex trafficking',
  'human trafficking',
  'sell drugs',
  'selling drugs',
  'drug dealing',
  'cook meth',
  'card skimming',
  'romance scam',
  'investment scam',
  'crypto scam',
  'wire fraud',
  'bank fraud',
  'social engineering attack',
  'al qaeda',
  'al-qaeda',
] as const

const DISCOVER_HERO_BLOCKED_PATTERNS = [
  ...DISCOVER_HERO_BLOCKED_WORDS.map(termPattern),
  ...DISCOVER_HERO_BLOCKED_PHRASES.map(termPattern),
]

let discoverHeroBlockedPatterns: RegExp[] | null = null

function getDiscoverHeroBlockedPatterns(): RegExp[] {
  if (!discoverHeroBlockedPatterns) {
    discoverHeroBlockedPatterns = DISCOVER_HERO_BLOCKED_PATTERNS
  }
  return discoverHeroBlockedPatterns
}

/**
 * Returns true if the input contains any flagged profanity (English).
 */
export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false
  try {
    return getMatcher().hasMatch(text)
  } catch {
    return false
  }
}

/** Discover hero — custom restricted terms beyond the obscenity dataset. */
export function containsDiscoverHeroBlockedContent(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return false

  const normalized = normalizeForModeration(trimmed)
  if (!normalized) return false

  return getDiscoverHeroBlockedPatterns().some(
    (pattern) => pattern.test(trimmed) || pattern.test(normalized),
  )
}

/**
 * Heuristic gibberish check. Triggers on:
 * - Strings whose alphabetic portion has < 25% vowels (when long enough).
 * - Any character repeated 4+ times in a row (e.g. "asdfasdfaaaa").
 * - Any consonant cluster of 5+ in a row (e.g. "qwrtypljkx").
 * - Less than 30% of tokens have at least one vowel (for 3+ token strings).
 */
export function looksLikeGibberish(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  const alpha = (trimmed.match(ALPHA) ?? []).length
  if (alpha < 8) return false

  if (REPEAT_4_PLUS.test(trimmed)) return true
  if (NO_VOWEL_RUN_5_PLUS.test(trimmed)) return true

  const vowels = (trimmed.match(VOWELS) ?? []).length
  if (alpha >= 12 && vowels / alpha < 0.25) return true

  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z]/g, ''))
    .filter((t) => t.length >= 3)
  if (tokens.length >= 3) {
    const vowelTokens = tokens.filter((t) => VOWELS.test(t)).length
    VOWELS.lastIndex = 0
    if (vowelTokens / tokens.length < 0.3) return true
  }

  return false
}

export type ModerationStatus = {
  ok: boolean
  reason?: 'profanity' | 'gibberish' | 'restricted'
  message: string
}

const OFFENSIVE_INPUT_MESSAGE = 'Please remove offensive or restricted language.'

/**
 * Substring terms checked inside URL hostname/path segments (pornhub, bestgore, …).
 * Includes discover-hero foul words plus gore / adult / sexual URL indicators.
 */
const SCANNER_URL_SUBSTRING_TERMS = [
  ...DISCOVER_HERO_BLOCKED_WORDS,
  'gore',
  'adult',
  'snuff',
  'guro',
  'hentai',
  'nsfw',
  'bestgore',
  'goregrish',
  'camgirl',
  'onlyfans',
  'fansly',
  'pornhub',
  'xhamster',
  'xvideos',
  'redtube',
  'youporn',
  'chaturbate',
  'stripchat',
  'motherless',
  'liveleak',
  'ogrish',
] as const

function scannerUrlSegments(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const tryParse = (value: string): string[] => {
    try {
      const url = new URL(value)
      return [
        ...url.hostname.toLowerCase().split('.'),
        ...url.pathname.toLowerCase().split(/[/_.-]+/),
        ...url.search.toLowerCase().split(/[/_.=&?-]+/),
      ].filter(Boolean)
    } catch {
      return []
    }
  }

  const parsed = tryParse(trimmed)
  if (parsed.length > 0) return parsed

  return trimmed
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function segmentContainsFoulUrlTerm(segment: string): boolean {
  const seg = segment.toLowerCase()
  if (!seg) return false

  if (containsProfanity(seg)) return true
  if (containsDiscoverHeroBlockedContent(seg)) return true

  const normalized = normalizeForModeration(seg.replace(/[^a-z0-9]/g, ' '))
  for (const term of SCANNER_URL_SUBSTRING_TERMS) {
    const token = term.replace(/\s+/g, '')
    if (token.length < 3) continue
    if (seg.includes(token)) return true
    if (normalized.includes(token)) return true
  }

  return false
}

/** Foul / adult / gore language inside a scanner URL (host, path, query segments). */
export function containsFoulTermInScannerUrl(raw: string): boolean {
  const trimmed = (raw || '').trim()
  if (!trimmed) return false

  if (!moderateDiscoverHeroInput(trimmed).ok) return true

  const segments = scannerUrlSegments(trimmed)
  if (segments.some(segmentContainsFoulUrlTerm)) return true

  const compact = segments.join('')
  if (compact && segmentContainsFoulUrlTerm(compact)) return true

  return false
}

/** Scanner URL moderation — full string + per-segment foul / NSFW tokens. */
export function moderateScannerUrlText(raw: string): ModerationStatus {
  if (containsFoulTermInScannerUrl(raw)) {
    return {
      ok: false,
      reason: 'restricted',
      message: OFFENSIVE_INPUT_MESSAGE,
    }
  }
  return { ok: true, message: '' }
}

export function moderateText(text: string): ModerationStatus {
  if (containsProfanity(text)) {
    return {
      ok: false,
      reason: 'profanity',
      message: OFFENSIVE_INPUT_MESSAGE,
    }
  }
  if (looksLikeGibberish(text)) {
    return {
      ok: false,
      reason: 'gibberish',
      message: 'Please use real, descriptive words instead of random characters.',
    }
  }
  return { ok: true, message: '' }
}

/** Realtime discover hero composer check — profanity library + explicit blocklist. */
export function moderateDiscoverHeroInput(text: string): ModerationStatus {
  const trimmed = (text || '').trim()
  if (!trimmed) return { ok: true, message: '' }

  if (containsProfanity(trimmed) || containsDiscoverHeroBlockedContent(trimmed)) {
    return {
      ok: false,
      reason: 'restricted',
      message: OFFENSIVE_INPUT_MESSAGE,
    }
  }

  return { ok: true, message: '' }
}

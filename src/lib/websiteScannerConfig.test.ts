import { describe, expect, it } from 'vitest'

import {
  clampWebsiteUrlToSite,
  validateScannerUrlInput,
} from '@/lib/websiteScannerConfig'

describe('clampWebsiteUrlToSite', () => {
  it('leaves a site origin unchanged', () => {
    expect(clampWebsiteUrlToSite('https://example.com')).toBe('https://example.com')
  })

  it('adds https when the host is complete', () => {
    expect(clampWebsiteUrlToSite('example.com')).toBe('https://example.com')
  })

  it('strips paths, query, and hash', () => {
    expect(clampWebsiteUrlToSite('https://example.com/about/team')).toBe('https://example.com')
    expect(clampWebsiteUrlToSite('https://shop.example.com/products?id=1')).toBe(
      'https://shop.example.com',
    )
    expect(clampWebsiteUrlToSite('https://example.com/#pricing')).toBe('https://example.com')
    expect(clampWebsiteUrlToSite('example.com/blog/post')).toBe('https://example.com')
  })

  it('strips a trailing slash once the host is complete', () => {
    expect(clampWebsiteUrlToSite('https://example.com/')).toBe('https://example.com')
  })

  it('does not rewrite an incomplete host', () => {
    expect(clampWebsiteUrlToSite('https://exam')).toBe('https://exam')
  })
})

describe('validateScannerUrlInput', () => {
  it('normalizes a subpage paste to the site origin', () => {
    const result = validateScannerUrlInput('https://example.com/pricing?ref=1')
    expect(result).toEqual({ ok: true, url: 'https://example.com' })
  })

  it('adds https when the scheme is omitted', () => {
    expect(validateScannerUrlInput('example.com')).toEqual({
      ok: true,
      url: 'https://example.com',
    })
  })
})

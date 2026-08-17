import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PREVIEW_WEBSITE_EMPTY_URL_MESSAGE,
  PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE,
  PREVIEW_WEBSITE_TOKEN_PARAM,
  fetchPreviewWebsiteScan,
  normalizePreviewWebsiteScanResponse,
  previewWebsiteScanErrorMessage,
  previewWebsiteScanLoadingMessage,
  startSignUpPath,
} from '@/lib/previewWebsiteScan'

describe('previewWebsiteScanLoadingMessage', () => {
  it('starts on the first stage and holds the last instead of looping', () => {
    expect(previewWebsiteScanLoadingMessage(0)).toBe('Reading your website…')
    expect(previewWebsiteScanLoadingMessage(7_999)).toBe('Reading your website…')
    expect(previewWebsiteScanLoadingMessage(8_000)).toBe('Scanning SEO signals…')
    expect(previewWebsiteScanLoadingMessage(18_000)).toBe('Analyzing your positioning…')
    expect(previewWebsiteScanLoadingMessage(28_000)).toBe(
      'Checking the competitive landscape…',
    )
    expect(previewWebsiteScanLoadingMessage(38_000)).toBe('Almost there…')
    expect(previewWebsiteScanLoadingMessage(49_999)).toBe('Almost there…')
  })

  it('switches to a patience message instead of lingering on Almost there', () => {
    expect(previewWebsiteScanLoadingMessage(50_000)).toBe(
      PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE,
    )
    expect(previewWebsiteScanLoadingMessage(80_000)).toBe(
      PREVIEW_WEBSITE_LOADING_PATIENCE_MESSAGE,
    )
  })
})

describe('previewWebsiteScanErrorMessage', () => {
  it('shows the backend invalid_url message as-is', () => {
    expect(previewWebsiteScanErrorMessage('invalid_url', 'That host is blocked.')).toBe(
      'That host is blocked.',
    )
  })

  it('uses a reachability message for fetch_failed', () => {
    expect(previewWebsiteScanErrorMessage('fetch_failed', 'ignored')).toBe(
      "Site is not reachable. Either 404 or JavaScript error.",
    )
  })

  it('hides misconfigured internals behind a generic retry', () => {
    expect(previewWebsiteScanErrorMessage('misconfigured', 'FIRECRAWL_API_KEY missing')).toBe(
      'Something went wrong. Try again shortly.',
    )
  })

  it('keeps timeout distinct from fetch_failed', () => {
    expect(previewWebsiteScanErrorMessage('timeout')).not.toBe(
      previewWebsiteScanErrorMessage('fetch_failed'),
    )
  })
})

describe('normalizePreviewWebsiteScanResponse', () => {
  it('treats a blank session_token as null and drops empty AI arrays', () => {
    const data = normalizePreviewWebsiteScanResponse({
      session_token: '   ',
      preview: {
        seo: { score: 78, topFindings: [{ title: 'Single <h1>', severity: 'good', detail: 'Home' }] },
        ai: {
          verdict: 'Competitive but Viable',
          likelyCompetitors: [],
          standoutInsights: ['', 'A real insight'],
        },
      },
    })

    expect(data?.session_token).toBeNull()
    expect(data?.preview.ai.verdict).toBe('Competitive but Viable')
    expect(data?.preview.ai.likelyCompetitors).toEqual([])
    expect(data?.preview.ai.standoutInsights).toEqual(['A real insight'])
    expect(data?.preview.seo.score).toBe(78)
    expect(data?.preview.seo.topFindings).toHaveLength(1)
    expect(data?.preview.seo.lockedFindingsCount).toBe(0)
    expect(data?.preview.seo.lockedFindingsPreview).toEqual([])
  })

  it('keeps locked finding titles and the real locked count', () => {
    const data = normalizePreviewWebsiteScanResponse({
      session_token: 'tok',
      preview: {
        seo: {
          score: 61,
          topFindings: [{ title: 'Single <h1>', severity: 'good', detail: 'Home' }],
          lockedFindingsCount: 4,
          lockedFindingsPreview: [
            { title: 'Missing canonical link', severity: 'warn', detail: 'should be stripped' },
            { title: 'Thin on-page copy', severity: 'warn' },
            { title: 'No structured data', severity: 'warn' },
            { title: 'Multiple <h1> tags', severity: 'warn' },
            { title: 'Extra title should be dropped', severity: 'bad' },
          ],
        },
        ai: {},
      },
    })

    expect(data?.preview.seo.lockedFindingsCount).toBe(4)
    expect(data?.preview.seo.lockedFindingsPreview).toEqual([
      { title: 'Missing canonical link', severity: 'warn' },
      { title: 'Thin on-page copy', severity: 'warn' },
      { title: 'No structured data', severity: 'warn' },
      { title: 'Multiple <h1> tags', severity: 'warn' },
    ])
    expect(data?.preview.seo.lockedFindingsPreview[0]).not.toHaveProperty('detail')
  })

  it('drops locked preview rows when the real count is zero', () => {
    const data = normalizePreviewWebsiteScanResponse({
      session_token: 'tok',
      preview: {
        seo: {
          score: 90,
          lockedFindingsCount: 0,
          lockedFindingsPreview: [{ title: 'Should not surface', severity: 'warn' }],
        },
        ai: {},
      },
    })

    expect(data?.preview.seo.lockedFindingsCount).toBe(0)
    expect(data?.preview.seo.lockedFindingsPreview).toEqual([])
  })

  it('returns null when preview is missing', () => {
    expect(normalizePreviewWebsiteScanResponse({ session_token: 'abc' })).toBeNull()
  })
})

describe('startSignUpPath', () => {
  it('omits the token query when the backend returned null', () => {
    expect(startSignUpPath(null)).toBe('/sign-in')
  })

  it('carries a token as preview_token', () => {
    expect(startSignUpPath('a1b2c3d4')).toBe(`/sign-in?${PREVIEW_WEBSITE_TOKEN_PARAM}=a1b2c3d4`)
  })
})

describe('fetchPreviewWebsiteScan', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not call the API for an empty URL', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchPreviewWebsiteScan('   ')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      code: 'missing_url',
      message: PREVIEW_WEBSITE_EMPTY_URL_MESSAGE,
    })
  })

  it('maps a 400 invalid_url payload to the backend error text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'invalid_url', error: 'Adult sites are not allowed.' }),
      }),
    )

    const result = await fetchPreviewWebsiteScan('https://example.xxx')
    expect(result).toEqual({
      ok: false,
      code: 'invalid_url',
      message: 'Adult sites are not allowed.',
    })
  })

  it('maps fetch_failed to the reachability copy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ code: 'fetch_failed', error: 'Firecrawl timeout' }),
      }),
    )

    const result = await fetchPreviewWebsiteScan('https://down.example')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('fetch_failed')
    expect(result.message).toBe("Site is not reachable. Either 404 or JavaScript error.")
  })
})

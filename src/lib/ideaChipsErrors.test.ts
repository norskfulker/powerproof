import { describe, expect, it } from 'vitest'

import {
  formatIdeaChipsErrorForDisplay,
  formatTimeUntilIdeaChipsReset,
  parseIdeaChipsResponseBody,
  readIdeaChipsErrorPayload,
} from '@/lib/ideaChipsErrors'

describe('readIdeaChipsErrorPayload', () => {
  it('reads generate-idea-chips rate limit body', () => {
    const info = readIdeaChipsErrorPayload({
      code: 'hourly_limit_exceeded',
      error: 'Hourly limit of 30 reached. Resets at 2026-05-29T15:00:00+00:00.',
      resets_at: '2026-05-29T15:00:00+00:00',
    })
    expect(info).toEqual({
      message: 'Hourly limit of 30 reached. Resets at 2026-05-29T15:00:00+00:00.',
      code: 'hourly_limit_exceeded',
      resetsAt: '2026-05-29T15:00:00+00:00',
    })
  })
})

describe('formatTimeUntilIdeaChipsReset', () => {
  it('formats hours, minutes, and seconds until reset', () => {
    const reset = '2026-06-07T09:00:00+00:00'
    const now = new Date('2026-06-07T07:54:30+00:00').getTime()
    expect(formatTimeUntilIdeaChipsReset(reset, now)).toBe('1 hour, 5 mins, 30 seconds')
  })

  it('formats sub-minute countdown', () => {
    const reset = '2026-06-07T09:00:00+00:00'
    const now = new Date('2026-06-07T08:59:40+00:00').getTime()
    expect(formatTimeUntilIdeaChipsReset(reset, now)).toBe('20 seconds')
  })
})

describe('formatIdeaChipsErrorForDisplay', () => {
  it('replaces ISO timestamp in API message with countdown', () => {
    const error = readIdeaChipsErrorPayload({
      code: 'hourly_limit_exceeded',
      error: 'Hourly limit of 30 reached. Resets at 2026-06-07T09:00:00+00:00.',
      resets_at: '2026-06-07T09:00:00+00:00',
    })!
    const now = new Date('2026-06-07T07:54:30+00:00').getTime()
    expect(formatIdeaChipsErrorForDisplay(error, now)).toBe(
      'Hourly limit of 30 reached. Resets in 1 hour, 5 mins, 30 seconds.',
    )
  })
})

describe('parseIdeaChipsResponseBody', () => {
  it('returns payload error for non-2xx', () => {
    const info = parseIdeaChipsResponseBody(
      {
        error: 'Hourly limit of 30 reached. Resets at 2026-05-29T15:00:00+00:00.',
        code: 'hourly_limit_exceeded',
        resets_at: '2026-05-29T15:00:00+00:00',
      },
      429,
    )
    expect(info?.message).toContain('Hourly limit of 30')
    expect(info?.code).toBe('hourly_limit_exceeded')
  })
})

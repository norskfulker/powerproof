import { describe, expect, it } from 'vitest'
import { getValidatedFitScore, hasCanonicalScoreBreakdown, isFitScoreDisplayValid } from '@/lib/fitScore'

const FULL_BREAKDOWN = {
  profitability: 72,
  ease: 65,
  govt_support: 58,
  market_momentum: 80,
}

describe('isFitScoreDisplayValid', () => {
  it('requires score and all four breakdown keys', () => {
    expect(isFitScoreDisplayValid(75, FULL_BREAKDOWN)).toBe(true)
    expect(isFitScoreDisplayValid(null, FULL_BREAKDOWN)).toBe(false)
    expect(isFitScoreDisplayValid(75, { profitability: 70 })).toBe(false)
    expect(isFitScoreDisplayValid(75, null)).toBe(false)
  })
})

describe('hasCanonicalScoreBreakdown', () => {
  it('requires every dimension, not just one', () => {
    expect(hasCanonicalScoreBreakdown(FULL_BREAKDOWN)).toBe(true)
    expect(hasCanonicalScoreBreakdown({ profitability: 8 })).toBe(false)
  })
})

describe('getValidatedFitScore', () => {
  it('returns clamped headline score without scaling partial breakdown', () => {
    expect(getValidatedFitScore(84, FULL_BREAKDOWN)).toBe(84)
    expect(getValidatedFitScore(8, { profitability: 8 })).toBe(null)
  })
})

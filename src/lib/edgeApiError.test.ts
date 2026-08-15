import { describe, expect, it } from 'vitest'

import {
  EdgeApiError,
  edgeApiErrorFromPayload,
  edgeApiErrorFromSupabase,
  isEdgeApiError,
} from '@/lib/edgeApiError'

describe('edgeApiError', () => {
  it('normalizes a structured 402 response', () => {
    const error = edgeApiErrorFromPayload(402, {
      code: 'insufficient_credits',
      error: 'You need more credits.',
      required_credits: 20,
      current_credits: 5,
    })

    expect(error).toBeInstanceOf(EdgeApiError)
    expect(error.message).toBe('insufficient_credits')
    expect(error.displayMessage).toBe('You need more credits.')
    expect(error.requiredCredits).toBe(20)
    expect(error.currentCredits).toBe(5)
  })

  it('normalizes legacy 402 aliases', () => {
    const error = edgeApiErrorFromPayload(402, {
      required: 10,
      balance: 2,
    })

    expect(isEdgeApiError(error, 'insufficient_credits')).toBe(true)
    expect(error.requiredCredits).toBe(10)
    expect(error.currentCredits).toBe(2)
  })

  it('reads the status from a Supabase function error context', () => {
    const error = edgeApiErrorFromSupabase(
      { message: 'Edge Function returned a non-2xx status code', context: { status: 402 } },
      null,
    )

    expect(error?.status).toBe(402)
    expect(error?.code).toBe('insufficient_credits')
  })
})

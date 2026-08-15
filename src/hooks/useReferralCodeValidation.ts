import { useEffect, useMemo, useState } from 'react'
import type { InputHelperVariant } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { normalizeReferralCodeInput, REFERRAL_CODE_LENGTH } from '@/lib/referrals'

export type ReferralCheckState = 'idle' | 'too_short' | 'checking' | 'valid' | 'invalid'

type ValidationResult = {
  valid?: boolean
  error?: string
  referrer_username?: string | null
  referrer_display?: string | null
}

export function useReferralCodeValidation(
  code: string,
  enabled = true,
  /** Sign-in email — used to block self-referral before auth session exists. */
  signerEmail = '',
) {
  const normalized = normalizeReferralCodeInput(code)
  const emailForCheck = signerEmail.trim().toLowerCase()
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setResult(null)
      setChecking(false)
      return
    }

    if (!normalized || normalized.length < REFERRAL_CODE_LENGTH) {
      setResult(null)
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)

    const run = async () => {
      const { data, error } = await supabase.rpc('validate_referral_code', {
        p_code: normalized,
        p_email: emailForCheck || null,
      })
      if (cancelled) return
      if (error) {
        setResult({ valid: false, error: 'error' })
      } else {
        setResult((data as ValidationResult) ?? { valid: false, error: 'not_found' })
      }
      setChecking(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [normalized, enabled, emailForCheck])

  const checkState = useMemo((): ReferralCheckState => {
    if (!enabled || !code.trim()) return 'idle'
    if (normalized.length > 0 && normalized.length < REFERRAL_CODE_LENGTH) return 'too_short'
    if (checking) return 'checking'
    if (result?.valid) return 'valid'
    if (result && !result.valid) return 'invalid'
    return 'idle'
  }, [code, normalized.length, checking, result, enabled])

  const helper = useMemo((): { text?: string; variant: InputHelperVariant } => {
    if (!enabled || !code.trim()) {
      return { variant: 'default' }
    }
    if (checkState === 'too_short') {
      return { text: `Enter all ${REFERRAL_CODE_LENGTH} letters of the code.`, variant: 'info' }
    }
    if (checkState === 'invalid' && result?.error === 'invalid_length') {
      return { text: `Referral codes are exactly ${REFERRAL_CODE_LENGTH} letters.`, variant: 'error' }
    }
    if (checkState === 'checking') {
      return { text: 'Checking referral code…', variant: 'info' }
    }
    if (checkState === 'valid') {
      const who = result?.referrer_display?.trim() || 'this member'
      return { text: `Referred by ${who.replace(/^@/, '')}`, variant: 'default' }
    }
    if (checkState === 'invalid') {
      if (result?.error === 'self_referral') {
        return { text: 'You cannot use your own referral code.', variant: 'error' }
      }
      if (result?.error === 'not_found') {
        return { text: 'Referral code not found.', variant: 'error' }
      }
      return { text: 'Invalid referral code.', variant: 'error' }
    }
    return { variant: 'default' }
  }, [checkState, code, enabled, result])

  const isValid = checkState === 'valid'

  return {
    normalized,
    checking,
    checkState,
    helper,
    isValid,
    result,
    fieldStateBorder:
      checkState === 'invalid' || checkState === 'checking' || checkState === 'valid',
  }
}

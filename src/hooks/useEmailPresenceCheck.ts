import { useEffect, useMemo, useState } from 'react'
import type { InputHelperVariant } from '@/components/ui/input'
import { DISPOSABLE_EMAIL_ERROR, isDisposableEmail } from '@/lib/disposableEmailDomains'
import { isEmailFormatValid } from '@/lib/emailValidation'
import { supabase } from '@/lib/supabase'

export type EmailPresenceState =
  | 'idle'
  | 'invalid_format'
  | 'disposable_email'
  | 'checking'
  | 'exists'
  | 'new_email'

type PresenceResult = {
  valid_format?: boolean
  exists?: boolean
  already_referred?: boolean
}

const PRESENCE_DEBOUNCE_MS = 200
/** Never leave the UI stuck on “Checking email…”. */
const PRESENCE_TIMEOUT_MS = 2000

export function useEmailPresenceCheck(email: string, enabled = true) {
  const trimmed = email.trim()
  const formatOk = isEmailFormatValid(trimmed)
  const disposable = formatOk && isDisposableEmail(trimmed)
  const [result, setResult] = useState<PresenceResult | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!enabled || !trimmed) {
      setResult(null)
      setChecking(false)
      return
    }

    if (!formatOk || disposable) {
      setResult(null)
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)
    setResult(null)

    const finish = (next: PresenceResult) => {
      if (cancelled) return
      setResult(next)
      setChecking(false)
    }

    const timeoutId = window.setTimeout(() => {
      finish({ valid_format: true, exists: false })
    }, PRESENCE_TIMEOUT_MS)

    const debounceId = window.setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await supabase.rpc('check_email_registered', {
            p_email: trimmed,
          })
          if (cancelled) return
          window.clearTimeout(timeoutId)
          if (error) {
            finish({ valid_format: true, exists: false })
          } else {
            finish((data as PresenceResult) ?? { valid_format: true, exists: false })
          }
        } catch {
          if (cancelled) return
          window.clearTimeout(timeoutId)
          finish({ valid_format: true, exists: false })
        }
      })()
    }, PRESENCE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(debounceId)
      window.clearTimeout(timeoutId)
    }
  }, [trimmed, formatOk, disposable, enabled])

  const checkState = useMemo((): EmailPresenceState => {
    if (!enabled || !trimmed) return 'idle'
    if (!formatOk) return 'invalid_format'
    if (disposable) return 'disposable_email'
    if (checking) return 'checking'
    if (result?.valid_format && result.exists) return 'exists'
    if (result?.valid_format) return 'new_email'
    return 'idle'
  }, [trimmed, formatOk, disposable, checking, result, enabled])

  const helper = useMemo((): { text?: string; variant: InputHelperVariant } => {
    if (!enabled || !trimmed) return { variant: 'default' }
    if (checkState === 'invalid_format') {
      return { text: 'Enter a valid email address.', variant: 'error' }
    }
    if (checkState === 'disposable_email') {
      return { text: DISPOSABLE_EMAIL_ERROR, variant: 'error' }
    }
    if (checkState === 'checking') {
      return { text: 'Checking email…', variant: 'info' }
    }
    // exists / new_email messaging lives in the card title + description
    return { variant: 'default' }
  }, [checkState, trimmed, enabled])

  /** Format is valid — Continue may proceed even while presence is still checking. */
  const canSubmitEmail = formatOk && !disposable
  const emailReady =
    formatOk && !disposable && (checkState === 'exists' || checkState === 'new_email')

  const alreadyReferred = Boolean(result?.already_referred)

  return {
    checkState,
    helper,
    emailReady,
    canSubmitEmail,
    alreadyReferred,
    formatOk,
    checking,
    fieldStateBorder:
      checkState === 'checking' ||
      checkState === 'invalid_format' ||
      checkState === 'disposable_email',
  }
}

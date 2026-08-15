type SupabaseLikeError = {
  message?: string
  code?: string
}

/** Seconds until another OTP email can be sent (`over_email_send_rate_limit`). */
export function parseEmailSendRateLimitSeconds(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const e = error as SupabaseLikeError
  const code = String(e.code ?? '')
  const msg = String(e.message ?? '')
  const isRateLimited =
    code === 'over_email_send_rate_limit' ||
    /email send rate limit/i.test(msg) ||
    /only request this after \d+/i.test(msg)
  if (!isRateLimited) return null
  const match = msg.match(/after\s+(\d+)\s*seconds?/i) ?? msg.match(/(\d+)\s*seconds?/i)
  if (match) return Math.max(1, parseInt(match[1], 10))
  return 60
}

export function isEmailSendRateLimited(error: unknown): boolean {
  return parseEmailSendRateLimitSeconds(error) != null
}

export function handleSupabaseError(error: any): string {
  if (!error) return ''
  if (isEmailSendRateLimited(error)) return ''
  const msg = error.message || ''
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed')) return 'Please check your email to confirm your account.'
  if (msg.includes('Token has expired') || msg.includes('otp_expired')) {
    return 'This code has expired. Request a new one.'
  }
  if (msg.includes('Invalid OTP') || msg.includes('invalid otp')) {
    return 'Invalid code. Check the email and try again.'
  }
  if (msg.includes('User already registered')) return 'An account with this email already exists.'
  if (msg.includes('Password should be')) return 'Password must be at least 8 characters.'
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.'
  if (msg.includes('Email rate limit')) return 'Too many emails sent. Please wait a moment.'
  return 'Something went wrong. Please try again.'
}

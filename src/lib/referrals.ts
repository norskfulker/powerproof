export const PENDING_REFERRAL_STORAGE_KEY = 'powerproof_pending_referral_code'

export const REFERRAL_SIGNUP_REWARD = 100
export const REFERRAL_PURCHASE_MULTIPLIER = 2
export const REFERRAL_CODE_LENGTH = 8

export function normalizeReferralCodeInput(code: string): string {
  return code.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, REFERRAL_CODE_LENGTH)
}

export function buildReferralLink(code: string, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const norm = normalizeReferralCodeInput(code)
  if (!norm) return origin ? `${origin}/` : '/'
  return `${origin}/?ref=${encodeURIComponent(norm)}`
}

export function readPendingReferralCode(): string {
  try {
    return sessionStorage.getItem(PENDING_REFERRAL_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function storePendingReferralCode(code: string) {
  const norm = normalizeReferralCodeInput(code)
  try {
    if (norm.length === REFERRAL_CODE_LENGTH) {
      sessionStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, norm)
    } else {
      sessionStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function clearPendingReferralCode() {
  try {
    sessionStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export async function applyReferralCode(
  supabase: {
    rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>
  },
  code: string,
) {
  const norm = normalizeReferralCodeInput(code)
  if (norm.length !== REFERRAL_CODE_LENGTH) {
    return { applied: false as const, error: 'invalid' as const }
  }

  const { data, error } = await supabase.rpc('apply_referral_code', { p_code: norm })
  if (error) {
    console.warn('[Referral] apply failed:', error.message)
    return { applied: false as const, error: error.message }
  }

  const result = data as { success?: boolean; error?: string } | null
  if (result?.success) {
    clearPendingReferralCode()
    return { applied: true as const, signupReward: (result as { signup_reward?: number }).signup_reward }
  }

  if (result?.error === 'already_referred') {
    clearPendingReferralCode()
  }

  return { applied: false as const, error: result?.error ?? 'unknown' }
}

export async function applyPendingReferralIfAny(supabase: {
  rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>
}) {
  const code = readPendingReferralCode()
  if (code.length !== REFERRAL_CODE_LENGTH) return { applied: false as const }

  return applyReferralCode(supabase, code)
}

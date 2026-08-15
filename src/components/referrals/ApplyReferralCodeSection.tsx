import { useState } from 'react'
import { Check } from '@/lib/icons'
import { toast } from '@/components/ui/sonner'
import { ReferralCodeInputCard } from '@/components/referrals/ReferralCodeInputCard'
import { useProfile } from '@/hooks/useProfile'
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation'
import {
  applyReferralCode,
  normalizeReferralCodeInput,
  REFERRAL_CODE_LENGTH,
} from '@/lib/referrals'
import { supabase } from '@/lib/supabase'
import { cardPadding, cardSurface } from '@/lib/cardSurface'
import { cn } from '@/lib/utils'

export function ApplyReferralCodeSection() {
  const { profile, refreshProfile } = useProfile()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fieldActive = code.trim().length > 0
  const {
    helper,
    fieldStateBorder,
    isValid,
    checkState,
  } = useReferralCodeValidation(code, fieldActive, profile?.email ?? undefined)

  const alreadyReferred = Boolean(profile?.referred_by_user_id)

  if (alreadyReferred) {
    return (
      <section className={cn(cardSurface, cardPadding.md, 'border-success/20 bg-success-bg/30')}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-success/30 bg-success-bg text-success">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Referral linked</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your account is already connected to a referral. Rewards apply automatically when you meet
          the program rules.
        </p>
      </section>
    )
  }

  const handleApply = async () => {
    if (!isValid) {
      toast.error(helper.text ?? 'Enter a valid referral code.')
      return
    }
    setSubmitting(true)
    const result = await applyReferralCode(supabase, code)
    setSubmitting(false)

    if (result.applied) {
      toast.success('Referral code applied.')
      setCode('')
      await refreshProfile()
      return
    }

    if (result.error === 'already_referred') {
      toast.message('Referral already linked on your account.')
      await refreshProfile()
      return
    }
    if (result.error === 'self_referral') {
      toast.error('You cannot use your own referral code.')
      return
    }
    if (result.error === 'not_found') {
      toast.error('Referral code not found.')
      return
    }

    toast.error(result.error ?? 'Could not apply referral code.')
  }

  return (
    <ReferralCodeInputCard
      title="Have a friend's referral code?"
      description={`Enter their ${REFERRAL_CODE_LENGTH}-letter code to link your account and unlock referral rewards.`}
      value={code}
      onChange={(next) => setCode(normalizeReferralCodeInput(next))}
      onApply={() => void handleApply()}
      applying={submitting}
      applyDisabled={!isValid}
      helperText={fieldActive ? helper.text : undefined}
      helperVariant={fieldActive ? helper.variant : 'default'}
      fieldStateBorder={fieldActive && fieldStateBorder}
      checkState={checkState}
    />
  )
}

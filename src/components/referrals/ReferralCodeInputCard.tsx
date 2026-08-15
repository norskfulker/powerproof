import { Button, Input } from '@/components/ui'
import { ReferralCodeStatusIcon } from '@/components/referrals/ReferralCodeStatusIcon'
import type { ReferralCheckState } from '@/hooks/useReferralCodeValidation'
import { REFERRAL_CODE_LENGTH } from '@/lib/referrals'
import { cardPadding, cardSurface } from '@/lib/cardSurface'
import { cn } from '@/lib/utils'

type ReferralCodeInputCardProps = {
  title?: string
  description?: string
  value: string
  onChange: (value: string) => void
  onApply: () => void
  applying?: boolean
  applyDisabled?: boolean
  helperText?: string
  helperVariant?: 'default' | 'error' | 'info' | 'success'
  fieldStateBorder?: boolean
  checkState: ReferralCheckState
  applyLabel?: string
}

export function ReferralCodeInputCard({
  title = 'Have a referral code?',
  description,
  value,
  onChange,
  onApply,
  applying = false,
  applyDisabled = false,
  helperText,
  helperVariant = 'default',
  fieldStateBorder = false,
  checkState,
  applyLabel = 'Apply',
}: ReferralCodeInputCardProps) {
  return (
    <section className={cn(cardSurface, cardPadding.md)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 layout-sm:flex-row layout-sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder={`${REFERRAL_CODE_LENGTH}-letter code`}
            autoComplete="off"
            maxLength={REFERRAL_CODE_LENGTH}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            helperText={helperText}
            helperVariant={helperVariant}
            fieldStateBorder={fieldStateBorder}
            rightSlot={<ReferralCodeStatusIcon state={checkState} />}
            rightSlotClassName="pointer-events-none"
            className={cn(
              checkState === 'valid' && 'border-success/50',
              checkState === 'invalid' && 'border-destructive/50',
            )}
            aria-label="Referral code"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="h-11 shrink-0 layout-sm:mt-0"
          loading={applying}
          disabled={applyDisabled || applying}
          onClick={onApply}
        >
          {applyLabel}
        </Button>
      </div>
    </section>
  )
}

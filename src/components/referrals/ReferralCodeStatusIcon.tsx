import { Check, Loader2, X } from '@/lib/icons'
import type { ReferralCheckState } from '@/hooks/useReferralCodeValidation'

export function ReferralCodeStatusIcon({ state }: { state: ReferralCheckState }) {
  if (state === 'checking') {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
  }
  if (state === 'valid') {
    return <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-hidden />
  }
  if (state === 'invalid') {
    return <X className="h-4 w-4 text-destructive" strokeWidth={2.5} aria-hidden />
  }
  return null
}

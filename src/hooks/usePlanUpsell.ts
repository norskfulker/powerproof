import { useCallback } from 'react'

import { toast } from '@/components/ui/sonner'
import { formatPlanGateMessage, planGateReason } from '@/lib/planGate'
import { openSubscriptionPricingDialog } from '@/store/filterStore'

export function usePlanUpsell() {
  return useCallback(
    (errorOrReason: unknown) => {
      const reason = planGateReason(errorOrReason)
      const message = formatPlanGateMessage(errorOrReason)
      toast.message(message, {
        action:
          reason == null
            ? undefined
            : {
                label: reason === 'feature_locked' ? 'View Unlimited' : 'View plans',
                onClick: openSubscriptionPricingDialog,
              },
      })
    },
    [],
  )
}

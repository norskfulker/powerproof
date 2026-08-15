import { SubscriptionPlans } from '@/components/billing/SubscriptionPlans'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFilterStore } from '@/store/filterStore'

export function SubscriptionPricingDialog() {
  const open = useFilterStore((state) => state.subscriptionPricingDialogOpen)
  const close = useFilterStore((state) => state.closeSubscriptionPricingDialog)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="sm" layout="flex" className="sm:w-[min(calc(100vw-2rem),20rem)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Choose your plan</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-5 pb-5 pt-5 sm:px-5 sm:pb-5 sm:pt-5">
          <SubscriptionPlans compact />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

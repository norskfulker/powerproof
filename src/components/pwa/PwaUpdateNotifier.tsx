import { useEffect } from 'react'
import { toast } from '@/components/ui/sonner'
import { bindPwaUpdateListener, dismissPwaUpdate } from '@/lib/pwa'

const UPDATE_TOAST_ID = 'powerproof-pwa-update'

export function PwaUpdateNotifier() {
  useEffect(() => {
    bindPwaUpdateListener(({ applyUpdate, updateKey }) => {
      toast('Update available', {
        id: UPDATE_TOAST_ID,
        description: 'A new version of PowerProof is ready. Refresh to get the latest features and fixes.',
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: applyUpdate,
        },
        cancel: {
          label: 'Later',
          onClick: () => {
            dismissPwaUpdate(updateKey)
          },
        },
      })
    })

    return () => {
      bindPwaUpdateListener(null)
    }
  }, [])

  return null
}

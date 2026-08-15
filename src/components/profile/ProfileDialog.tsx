import { lazy, Suspense, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton'
import { useFilterStore } from '@/store/filterStore'
import { useIsMobile } from '@/hooks/useBreakpoint'

const ProfilePage = lazy(() => import('@/pages/ProfilePage'))

/**
 * Sidebar profile settings surfaced as a centered dialog on desktop, or as a
 * full-screen route (`/settings/profile` → `/profile?tab=details`) on mobile.
 *
 * On mobile we close the dialog and push a real route so the user gets the
 * full canvas, the standard AppLayout chrome, and a real Back button via the
 * route stack — not a dialog sheet.
 */
export function ProfileDialog() {
  const open = useFilterStore((state) => state.profileDialogOpen)
  const close = useFilterStore((state) => state.closeProfileDialog)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Mobile: as soon as the dialog is opened, route to the full-screen page
  // and close the dialog. The effect re-runs if the user opens it again.
  useEffect(() => {
    if (open && isMobile) {
      close()
      navigate('/settings/profile', { replace: false })
    }
  }, [open, isMobile, close, navigate])

  if (isMobile) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="lg" layout="flex">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <DialogBody className="pb-5">
          <Suspense fallback={<ProfilePageSkeleton />}>
            <ProfilePage embedded />
          </Suspense>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

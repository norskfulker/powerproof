import { Link } from 'react-router-dom'
import { SignInCard } from '@/components/auth/SignInCard'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { LEGAL_PATHS } from '@/lib/legal'
import { cn } from '@/lib/utils'

/** Auto-open delay after the /start preview finishes. Must stay within 10s. */
export const START_SIGNUP_SHEET_DELAY_MS = 10_000

const SHEET_CLASS = cn(
  'flex flex-col gap-0 overflow-y-auto overscroll-contain p-0',
  'rounded-2xl border border-border-subtle/80 bg-card',
  'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.22)]',
  '!inset-x-3 !bottom-3 !left-3 !right-3 !top-auto !h-auto',
  '!max-h-[min(90dvh,calc(100dvh-1.5rem))] !w-auto',
  'sm:!left-[max(1.25rem,calc(50%-17.5rem))] sm:!right-[max(1.25rem,calc(50%-17.5rem))]',
  'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
)

export function StartSignUpSheet({
  open,
  onOpenChange,
  autoFocus = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  autoFocus?: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={SHEET_CLASS}>
        <div className="mx-auto mb-1 mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
        <SheetHeader className="space-y-1 px-5 pb-1 pr-12 pt-2 text-left sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Preview ready
          </p>
          <SheetTitle className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
            Unlock the full audit
          </SheetTitle>
          <SheetDescription className="text-sm leading-6 text-muted-foreground">
            Sign up free to save this snapshot and see every finding, competitor, and the complete report.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-2 pt-3 sm:px-6">
          <SignInCard autoFocus={autoFocus} hideHeading />
        </div>

        <p className="px-5 pb-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          By continuing you agree to our{' '}
          <Link to={LEGAL_PATHS.terms} className="font-semibold text-foreground underline underline-offset-2">
            Terms
          </Link>{' '}
          and{' '}
          <Link to={LEGAL_PATHS.privacy} className="font-semibold text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </SheetContent>
    </Sheet>
  )
}

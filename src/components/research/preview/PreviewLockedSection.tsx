import { Lock } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { PreviewUnlockMarquee } from '@/components/research/preview/PreviewUnlockMarquee'
import { dispatchOpenLandingSignIn } from '@/lib/authLanding'
import {
  previewUnlockChipsFor,
  previewUnlockTitleFor,
} from '@/components/research/preview/previewUnlockContent'
import { SIGN_UP_CTA } from '@/lib/copy'
import { landingSignUpWithPreview } from '@/lib/previewResearch'
import { cn } from '@/lib/utils'

export function PreviewLockedSection({
  focus = 'research',
  className,
}: {
  focus?: 'research' | 'roadmap'
  className?: string
}) {
  const chips = previewUnlockChipsFor(focus)
  const unlockTitle = previewUnlockTitleFor(focus)

  return (
    <div
      className={cn(
        'relative mt-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.02]',
        className,
      )}
    >
      <div
        className="pointer-events-none space-y-2 px-4 py-4 text-xs text-muted-foreground/70 blur-[3px] select-none"
        aria-hidden
      >
        {chips.slice(0, 8).map((chip) => (
          <p key={chip.label}>{chip.label}</p>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 px-4 py-5 text-center backdrop-blur-[2px]">
        <Lock className="h-5 w-5 text-primary" aria-hidden />
        <p className="text-sm font-normal text-foreground sm:text-base">{unlockTitle}</p>
        <PreviewUnlockMarquee
          chips={chips}
          className="max-w-full"
          durationClass="[animation:ticker-slide_56s_linear_infinite]"
          ariaLabel={`${unlockTitle} — features`}
        />
        <Button
          variant="primary"
          size="sm"
          type="button"
          className="mt-1 hidden xl:inline-flex"
          onClick={() => {
            window.history.replaceState(null, '', landingSignUpWithPreview())
            dispatchOpenLandingSignIn()
          }}
        >
          {SIGN_UP_CTA}
        </Button>
      </div>
    </div>
  )
}

import ShareDrawer from '@/components/ShareDrawer'
import { cn } from '@/lib/utils'

export type OpportunityPageFooterProps = {
  isMobile: boolean
  user: { id: string } | null | undefined
  handleShare: () => void | Promise<void>
  showShareDrawer: boolean
  setShowShareDrawer: (v: boolean) => void
  opp: any
  shareUrl: string
  isDesktop: boolean
  showMobileShare?: boolean
}

export function OpportunityPageFooter({
  isMobile,
  user,
  handleShare,
  showShareDrawer,
  setShowShareDrawer,
  opp,
  shareUrl,
  isDesktop,
  showMobileShare = true,
}: OpportunityPageFooterProps) {
  const showStickyActions = isMobile && showMobileShare
  const stickyAboveBottomNav = Boolean(user)

  return (
    <>
      {showStickyActions ? (
        <div
          className={cn(
            'mobile-sticky-bar safe-bottom',
            stickyAboveBottomNav && 'mobile-sticky-bar--above-bottom-nav',
          )}
        >
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-border-default bg-surface px-[11px] py-[11px] text-[13px] font-semibold text-foreground"
          >
            Share
          </button>
        </div>
      ) : null}

      {showStickyActions ? (
        <div
          className={cn(stickyAboveBottomNav ? 'h-[calc(4.5rem+5.5rem+env(safe-area-inset-bottom,0px))]' : 'h-[72px]')}
          aria-hidden
        />
      ) : null}

      <ShareDrawer
        opportunity={opp}
        url={shareUrl}
        open={showShareDrawer}
        onClose={() => setShowShareDrawer(false)}
        placement={isDesktop ? 'right' : 'bottom'}
      />
    </>
  )
}

import { useIsMobile } from '@/hooks/useBreakpoint'
import { toast } from '@/components/ui/sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface Props {
  opportunity: any
  url: string
  open: boolean
  onClose: () => void
  placement?: 'bottom' | 'right'
}

const ShareDrawer = ({ opportunity, url, open, onClose, placement = 'bottom' }: Props) => {
  const isMobile = useIsMobile()
  const isRight = placement === 'right' && !isMobile

  const text = `${opportunity.title} — ${opportunity.tagline ?? ''}\n\nCheck it out on PowerProof:`

  const options = [
    {
      label: 'WhatsApp',
      icon: '💬',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
      },
    },
    {
      label: 'Twitter / X',
      icon: '𝕏',
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          '_blank',
        )
      },
    },
    {
      label: 'LinkedIn',
      icon: '💼',
      action: () => {
        window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
      },
    },
    {
      label: 'Copy link',
      icon: '🔗',
      action: async () => {
        await navigator.clipboard.writeText(url)
        toast('Link copied!')
        onClose()
      },
    },
  ]

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={isRight ? 'right' : 'bottom'}
        className={
          isRight
            ? 'w-full max-w-[420px] border-border-default p-6'
            : 'max-h-[85dvh] rounded-t-2xl border-t border-border-default px-4 pb-6 pt-4 sm:px-6'
        }
      >
        <SheetHeader className={isRight ? 'mb-4 text-left' : 'mb-4 text-left'}>
          <SheetTitle className="font-sans text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Share via
          </SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={opt.action}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-sunken p-4 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <span className="text-[20px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ShareDrawer

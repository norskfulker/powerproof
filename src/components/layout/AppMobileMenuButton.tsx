import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Menu, X } from '@/lib/icons'
import { APP_CLOSE_SIDEBAR_EVENT, APP_OPEN_SIDEBAR_EVENT } from '@/lib/appSidebarEvents'
import { cn } from '@/lib/utils'

const appMobileMenuButtonSurfaceClassName = cn(
  'inline-flex items-center justify-center rounded-xl text-foreground',
  'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
)

const appMobileMenuButtonBorderedSurfaceClassName = cn(
  appMobileMenuButtonSurfaceClassName,
  'h-10 w-10 border border-border-subtle/80 bg-card/90 shadow-sm backdrop-blur-sm',
)

export const appMobileMenuButtonClassName = cn(
  'fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[125]',
  appMobileMenuButtonBorderedSurfaceClassName,
  'layout-sm:hidden',
)

export function AppMobileMenuButton({
  className,
  inline = false,
}: {
  className?: string
  /** Render inside a header row instead of fixed top-left. */
  inline?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onClose = () => setOpen(false)
    window.addEventListener(APP_OPEN_SIDEBAR_EVENT, onOpen)
    window.addEventListener(APP_CLOSE_SIDEBAR_EVENT, onClose)
    return () => {
      window.removeEventListener(APP_OPEN_SIDEBAR_EVENT, onOpen)
      window.removeEventListener(APP_CLOSE_SIDEBAR_EVENT, onClose)
    }
  }, [])

  const transition = reduceMotion
    ? { duration: 0.01 }
    : { type: 'spring' as const, stiffness: 480, damping: 32, mass: 0.7 }

  const handleClick = () => {
    if (open) {
      window.dispatchEvent(new CustomEvent(APP_CLOSE_SIDEBAR_EVENT))
    } else {
      window.dispatchEvent(new CustomEvent(APP_OPEN_SIDEBAR_EVENT))
    }
  }

  return (
    <button
      type="button"
      className={cn(
        inline ? cn(appMobileMenuButtonSurfaceClassName, 'h-9 w-9 shrink-0') : appMobileMenuButtonClassName,
        className,
      )}
      onClick={handleClick}
      aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: open ? 0 : 1, rotate: open ? -45 : 0, scale: open ? 0.6 : 1 }}
          transition={transition}
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </motion.span>
        <motion.span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: open ? 1 : 0, rotate: open ? 0 : 45, scale: open ? 1 : 0.6 }}
          transition={transition}
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </motion.span>
      </span>
    </button>
  )
}

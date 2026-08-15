import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/lib/icons'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import {
  FOCUS_RING_CLASS,
  RADIUS_LARGE,
  SURFACE_MODAL,
  TRANSITION_COLOR_CLASS,
} from '@/lib/designTokens'
import { cn } from '@/lib/utils'

const DialogOpenContext = React.createContext(false)

type DialogProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>

const Dialog = ({ open: controlledOpen, defaultOpen = false, onOpenChange, ...props }: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props} />
    </DialogOpenContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const reduceMotion = useReducedMotion()
  return (
    <DialogPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn(
          // Stripe-like: soft dim, light blur — not a heavy frosted sheet
          'fixed inset-0 z-[9998] bg-foreground/30 backdrop-blur-[2px]',
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
      />
    </DialogPrimitive.Overlay>
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const SIZE_WIDTH: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'w-[min(calc(100vw-2rem),22rem)]',
  md: 'w-[min(calc(100vw-2rem),28rem)]',
  lg: 'w-[min(calc(100vw-2rem),40rem)]',
  xl: 'w-[min(calc(100vw-2rem),52rem)]',
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /**
     * `stack` — padded column (confirm / short forms). Default.
     * `flex` — header / scroll body / footer shells for tall dialogs.
     */
    layout?: 'stack' | 'flex' | 'default'
    /** Hide the top-right close control (e.g. forced confirm flows). */
    hideClose?: boolean
  }
>(({ className, children, size = 'md', layout = 'stack', hideClose = false, ...props }, ref) => {
  const open = React.useContext(DialogOpenContext)
  const reduceMotion = useReducedMotion()
  const [present, setPresent] = React.useState(open)

  React.useEffect(() => {
    if (open) setPresent(true)
  }, [open])

  const resolvedLayout = layout === 'default' ? 'stack' : layout

  const panelTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }

  const enterInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 8, scale: 0.98 }
  const enterAnimate = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
  const exitAnimate = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 4, scale: 0.98 }

  return present ? (
    <DialogPortal forceMount>
      <AnimatePresence
        onExitComplete={() => {
          if (!open) setPresent(false)
        }}
      >
        {open ? (
          <>
            <DialogOverlay key="dialog-overlay" />
            <motion.div
              key="dialog-panel"
              className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto overscroll-contain p-0 sm:items-center sm:p-6"
              initial={enterInitial}
              animate={enterAnimate}
              exit={exitAnimate}
              transition={panelTransition}
            >
              <DialogPrimitive.Content
                ref={ref}
                asChild
                forceMount
                onOpenAutoFocus={(e) => e.preventDefault()}
                {...props}
              >
                <div
                  className={cn(
                    'pointer-events-auto relative mx-auto my-0 flex min-h-0 min-w-0 flex-col outline-none',
                    'max-h-[calc(100dvh-0.75rem)] sm:max-h-[calc(100dvh-3rem)]',
                    'rounded-t-[var(--radius-xl)] border-border-subtle/80 sm:my-auto sm:rounded-[var(--radius-xl)]',
                    RADIUS_LARGE,
                    SURFACE_MODAL,
                    'bg-card',
                    SIZE_WIDTH[size],
                    // Mobile sheet feel; desktop centered card
                    'max-sm:w-full max-sm:max-w-none max-sm:border-x-0 max-sm:border-b-0',
                    resolvedLayout === 'stack' &&
                      'gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-5 sm:p-6',
                    resolvedLayout === 'flex' && 'gap-0 overflow-hidden p-0',
                    className,
                  )}
                >
                  {!hideClose ? (
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        className={cn(
                          'absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md',
                          'text-muted-foreground',
                          TRANSITION_COLOR_CLASS,
                          'hover:bg-muted hover:text-foreground',
                          FOCUS_RING_CLASS,
                        )}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </DialogPrimitive.Close>
                  ) : null}
                  {children}
                </div>
              </DialogPrimitive.Content>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </DialogPortal>
  ) : null
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex min-w-0 shrink-0 flex-col gap-1.5 pr-9 text-left',
      className,
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

/** Scrollable middle section for tall / multi-block dialogs (`layout="flex"`). */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-1 sm:px-6',
      className,
    )}
    {...props}
  />
)
DialogBody.displayName = 'DialogBody'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex min-w-0 shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5',
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'min-w-0 text-balance break-words font-sans text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[36px]',
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'min-w-0 text-pretty break-words text-sm leading-relaxed text-muted-foreground',
      className,
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

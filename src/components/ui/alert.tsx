import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Alert — elevated status banner with a soft surface, inset highlight,
 * left accent rail, and clear title/body hierarchy.
 */
const alertVariants = cva(
  cn(
    'group/alert relative w-full overflow-hidden rounded-xl border',
    'px-4 py-3.5',
    // Soft physical lift + top highlight (matches button/card depth language).
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.14)]',
    // Accent rail
    'before:pointer-events-none before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full',
    // Leading icon (first SVG child)
    '[&>svg]:absolute [&>svg]:left-[1.05rem] [&>svg]:top-[0.95rem] [&>svg]:size-4 [&>svg]:shrink-0',
    '[&>svg]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]',
    '[&>svg~*]:pl-9',
  ),
  {
    variants: {
      variant: {
        default: cn(
          'border-border-subtle/75 text-foreground',
          'bg-[linear-gradient(165deg,hsl(var(--muted)/0.7)_0%,hsl(var(--card))_52%)]',
          'before:bg-primary',
          '[&>svg]:text-primary',
        ),
        destructive: cn(
          'border-destructive/25 text-destructive',
          'bg-[linear-gradient(165deg,hsl(var(--destructive)/0.12)_0%,hsl(var(--card))_58%)]',
          'before:bg-destructive',
          '[&>svg]:text-destructive',
        ),
        success: cn(
          'border-[hsl(var(--success)/0.28)] text-[hsl(var(--success))]',
          'bg-[linear-gradient(165deg,hsl(var(--success)/0.12)_0%,hsl(var(--card))_58%)]',
          'before:bg-[hsl(var(--success))]',
          '[&>svg]:text-[hsl(var(--success))]',
        ),
        warning: cn(
          'border-[hsl(var(--warning)/0.35)] text-[hsl(var(--warning))]',
          'bg-[linear-gradient(165deg,hsl(var(--warning)/0.14)_0%,hsl(var(--card))_58%)]',
          'before:bg-[hsl(var(--warning))]',
          '[&>svg]:text-[hsl(var(--warning))]',
        ),
        info: cn(
          'border-primary/25 text-primary',
          'bg-[linear-gradient(165deg,hsl(var(--primary)/0.10)_0%,hsl(var(--card))_58%)]',
          'before:bg-primary',
          '[&>svg]:text-primary',
        ),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    data-variant={variant ?? 'default'}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(
        'mb-1 font-sans text-sm font-semibold leading-snug tracking-tight',
        'text-foreground',
        className,
      )}
      {...props}
    />
  ),
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-sm font-medium leading-relaxed',
      // Soft body on default; inherit accent color on status variants.
      'text-muted-foreground',
      'group-data-[variant=destructive]/alert:text-destructive/90',
      'group-data-[variant=success]/alert:text-[hsl(var(--success)/0.92)]',
      'group-data-[variant=warning]/alert:text-[hsl(var(--warning)/0.95)]',
      'group-data-[variant=info]/alert:text-primary/90',
      '[&_p]:leading-relaxed',
      className,
    )}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription, alertVariants }

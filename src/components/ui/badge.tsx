import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Badge — Stripe-inspired muted, understated chip.
 *
 * Uses semantic status tokens (primary / saffron / destructive / etc).
 * Padding and font size scale via the `size` prop.
 */

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'gray' | 'orange';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  green:  { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.25)' },
  amber:  { background: 'hsl(var(--saffron-50))',  color: 'hsl(var(--saffron-600))',   border: '1px solid hsl(var(--saffron-100))' },
  blue:   { background: 'hsl(var(--badge-new-bg))', color: 'hsl(var(--badge-new-text))', border: '1px solid hsl(var(--badge-new-bg))' },
  red:    { background: 'hsl(var(--red-50))',      color: 'hsl(var(--destructive))',   border: '1px solid hsl(var(--red-100))' },
  purple: { background: 'hsl(var(--badge-global-bg))', color: 'hsl(var(--badge-global-text))', border: '1px solid hsl(var(--badge-global-bg))' },
  gray:   { background: 'hsl(var(--bg-sunken))',   color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border-default))' },
  orange: { background: 'hsl(var(--badge-trending-bg))', color: 'hsl(var(--badge-trending-text))', border: '1px solid hsl(var(--saffron-100))' },
};

/** Mobile two steps larger; `sm:` restores the desktop ladder. */
const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[11px] leading-[1.35] sm:px-1.5 sm:py-px sm:text-[9px]',
  sm: 'px-2.5 py-1 text-xs leading-[1.35] sm:px-[7px] sm:py-0.5 sm:text-[10px]',
  md: 'px-3 py-1.5 text-sm leading-[1.4] sm:px-2.5 sm:py-[3px] sm:text-xs',
  lg: 'px-4 py-2 text-base leading-[1.45] sm:px-3.5 sm:py-1.5 sm:text-sm',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: BadgeSize;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ variant = 'gray', children, size = 'md', className, style }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-normal tracking-wide font-sans sm:rounded-full',
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        ...BADGE_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

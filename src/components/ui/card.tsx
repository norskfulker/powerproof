/**
 * Card — Stripe-inspired bordered surface.
 *
 * - Single radius scale (sharp / default / large / xl).
 * - Semantic accent variants map to the project's status tokens.
 * - Optional topSlot header band keeps icon + title layout consistent.
 */
import React from 'react';

import { cn } from '@/lib/utils';

/** @deprecated Interactive card hover removed — no-op for call-site compatibility. */
export const cardInteractiveClassName = '';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'bordered' | 'default';
  accent?: 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'none';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  radius?: 'none' | 'md' | 'lg' | 'xl';
  /** Header band — keep icon + title layout consistent when used. */
  topSlot?: React.ReactNode;
  topSlotStyle?: React.CSSProperties;
  topSlotClassName?: string;
  contentStyle?: React.CSSProperties;
  /** @deprecated Interactive hover chrome removed — ignored. */
  interactive?: boolean;
}

const ACCENT: Record<string, React.CSSProperties> = {
  green: { background: 'hsl(var(--primary-50))', border: '1px solid hsl(var(--primary-200))' },
  amber: { background: 'hsl(var(--saffron-50))', border: '1px solid hsl(var(--saffron-100))' },
  blue: { background: 'hsl(var(--badge-new-bg))', border: '1px solid hsl(var(--badge-new-bg))' },
  red: { background: 'hsl(var(--red-50))', border: '1px solid hsl(var(--red-100))' },
  purple: { background: 'hsl(var(--badge-global-bg))', border: '1px solid hsl(var(--badge-global-bg))' },
  none: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' },
};

const VARIANT: Record<NonNullable<CardProps['variant']>, React.CSSProperties> = {
  default: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' },
  primary: { background: 'hsl(var(--primary-50))', border: '1px solid hsl(var(--primary-200))' },
  secondary: { background: 'hsl(var(--bg-sunken))', border: '1px solid hsl(var(--border-default))' },
  ghost: { background: 'transparent', border: '1px solid transparent' },
  bordered: { background: 'hsl(var(--background))', border: '1px dashed hsl(var(--border-default))' },
};

const PAD: Record<string, string> = {
  sm: '14px',
  md: '20px',
  lg: '28px',
  none: '0',
};

const RAD: Record<string, string> = {
  none: '0',
  md: '12px',
  lg: '16px',
  xl: '20px',
};

/** Shared topSlot row — icon + title (+ optional meta). Use for all topSlot content. */
export const cardTopSlotRowClass = 'flex min-w-0 items-center gap-2.5';

export const cardTopSlotIconClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] [&_svg]:h-3.5 [&_svg]:w-3.5';

export const cardTopSlotTitleClass =
  'min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight tracking-tight text-foreground';

/** Header band padding — same on cards and table header rows. */
export const cardTopSlotBandClassName = 'relative shrink-0 px-3 py-2.5';

export function Card({
  children,
  variant = 'default',
  accent = 'none',
  padding = 'md',
  radius = 'lg',
  style,
  onClick,
  className,
  topSlot,
  topSlotStyle,
  topSlotClassName,
  contentStyle,
  interactive: _interactive,
  ...rest
}: CardProps) {
  const pad = PAD[padding];
  const radiusValue = RAD[radius];
  const hasTopSlot = Boolean(topSlot);

  const base: React.CSSProperties = {
    borderRadius: radiusValue,
    padding: hasTopSlot ? 0 : pad,
    overflow: 'hidden',
    border: '1px solid hsl(var(--border-subtle))',
    ...(hasTopSlot
      ? { background: 'hsl(var(--muted) / 0.35)' }
      : VARIANT[variant]),
    ...(variant === 'default' && !hasTopSlot ? ACCENT[accent] : {}),
    ...style,
  };

  const contentStyleMerged: React.CSSProperties = {
    ...(hasTopSlot
      ? {
          position: 'relative' as const,
          zIndex: 1,
          borderTopLeftRadius: radiusValue,
          borderTopRightRadius: radiusValue,
          borderTop: '1px solid hsl(var(--border-subtle))',
          background: 'hsl(var(--card))',
          ...(pad !== '0' ? { padding: pad } : null),
        }
      : { borderRadius: radiusValue }),
    ...contentStyle,
  };

  return (
    <div style={base} className={className} onClick={onClick} {...rest}>
      {topSlot ? (
        <div
          className={cn(cardTopSlotBandClassName, topSlotClassName)}
          style={topSlotStyle}
        >
          {topSlot}
        </div>
      ) : null}
      <div style={contentStyleMerged}>
        {children}
      </div>
    </div>
  );
}

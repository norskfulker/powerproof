import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
  PRESS_CLASS,
} from '@/lib/designTokens';

/**
 * Button — Stripe-inspired shared primitive with a 3D surface (no drop shadow).
 *
 * Sizes: `sm` (default) and `md` (compact). `lg` and `icon` are kept for
 * legacy callers but new code should stick to `sm` / `md`.
 */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'default'
  | 'ghost'
  | 'danger'
  | 'glassLiquidCard';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface PowerProofButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  as?: 'button' | 'a' | 'link';
  href?: string;
  to?: string;
  disablePressAnimation?: boolean;
}

const MICRO_LOADER_SIZE: Record<ButtonSize, string> = {
  sm: 'size-3',
  md: 'size-3.5',
  lg: 'size-4',
  icon: 'size-3',
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value != null && typeof (value as PromiseLike<unknown>).then === 'function';
}

function ButtonMicroLoader({ size, variant }: { size: ButtonSize; variant: ButtonVariant }) {
  const trackClass =
    variant === 'primary'
      ? 'border-primary-foreground/25 border-t-primary-foreground'
      : 'border-foreground/15 border-t-primary';

  return (
    <span
      className={cn(
        'box-border shrink-0 animate-spin rounded-full border-2',
        MICRO_LOADER_SIZE[size],
        trackClass,
      )}
      aria-hidden
    />
  );
}

const BUTTON_TRANSITION_CLASS =
  'transition-[background-color,background-image,border-color,color,opacity,transform,box-shadow] duration-200 ease-out';

const BUTTON_BASE = cn(
  'relative inline-flex items-center justify-center whitespace-nowrap select-none rounded-md border shadow-none',
);

const BUTTON_BASE_PRIMARY = cn(
  'relative inline-flex items-center justify-center whitespace-nowrap select-none rounded-md border',
);

/** 3D face (inset highlight + overlay) without outer drop shadow. */
const PRIMARY_3D_CLASS = cn(
  'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
  'before:bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.05)_40%,rgba(0,0,0,0.06)_100%)]',
  'before:opacity-100',
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.24),inset_0_-1px_0_0_rgba(0,0,0,0.16)]',
  'hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.30),inset_0_-1px_0_0_rgba(0,0,0,0.18)]',
  'active:shadow-[inset_0_2px_0_0_rgba(0,0,0,0.16)]',
);

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: cn(
    BUTTON_BASE_PRIMARY,
    'border-primary bg-primary text-primary-foreground',
    'bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary))_55%,hsl(var(--primary-hover))_100%)]',
    'hover:bg-[linear-gradient(135deg,hsl(var(--primary-hover))_0%,hsl(var(--primary))_55%,hsl(var(--primary))_100%)]',
    'active:bg-[linear-gradient(135deg,hsl(var(--primary-hover))_0%,hsl(var(--primary-hover))_100%)]',
    'overflow-visible',
    PRIMARY_3D_CLASS,
  ),
  secondary: cn(
    BUTTON_BASE_PRIMARY,
    'border-border-subtle bg-muted/40 text-foreground',
    'hover:bg-bg-surface hover:border-border-strong',
    'overflow-hidden',
    PRIMARY_3D_CLASS,
  ),
  default: cn(
    BUTTON_BASE,
    'border-border-default bg-surface text-foreground',
    'hover:border-border-strong hover:bg-muted',
  ),
  danger: cn(
    BUTTON_BASE_PRIMARY,
    'border-destructive bg-destructive text-destructive-foreground',
    'bg-[linear-gradient(135deg,hsl(var(--destructive))_0%,hsl(var(--destructive))_60%,color-mix(in_oklab,hsl(var(--destructive))_80%,black)_100%)]',
    'hover:bg-[linear-gradient(135deg,color-mix(in_oklab,hsl(var(--destructive))_85%,black)_0%,hsl(var(--destructive))_55%,hsl(var(--destructive))_100%)]',
    'overflow-hidden',
    PRIMARY_3D_CLASS,
  ),
  ghost: cn(
    'relative inline-flex items-center justify-center whitespace-nowrap select-none rounded-md border-0 bg-transparent shadow-none',
    'text-foreground hover:bg-transparent hover:text-foreground hover:shadow-none',
    'active:shadow-none',
  ),
  glassLiquidCard: cn(
    BUTTON_BASE,
    'border-border-subtle/55 bg-surface/45 font-bold text-foreground backdrop-blur-md',
    'hover:border-border-subtle/70 hover:bg-surface/60',
  ),
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1 sm:h-7 sm:px-2.5 sm:text-[11px] sm:gap-1',
  md: 'h-10 px-4 text-sm gap-1.5 sm:h-8 sm:px-3 sm:text-xs sm:gap-1',
  lg: 'h-11 px-5 text-base gap-1.5 sm:h-9 sm:px-4 sm:text-sm',
  icon: 'h-9 w-9 p-0 gap-0 sm:h-7 sm:w-7',
};

export const Button = React.forwardRef<HTMLElement, PowerProofButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'sm',
    full = false,
    loading = false,
    disablePressAnimation = false,
    icon,
    iconRight,
    children,
    disabled,
    as: Tag = 'button',
    href,
    to,
    className,
    style,
    onClick,
    ...props
  },
  ref,
) {
  const [clickLoading, setClickLoading] = React.useState(false);
  const pendingClickRef = React.useRef(false);
  const isLoading = loading || clickLoading;

  const runClick = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || loading || pendingClickRef.current) {
        e.preventDefault();
        return;
      }
      if (!onClick) return;
      const result = onClick(e);
      if (!isPromiseLike(result)) return;
      pendingClickRef.current = true;
      setClickLoading(true);
      void Promise.resolve(result).finally(() => {
        pendingClickRef.current = false;
        setClickLoading(false);
      });
    },
    [disabled, loading, onClick],
  );

  const resolvedStyle = { ...style, fontWeight: 600 as const };

  const combinedClasses = cn(
    'group powerproof-btn font-sans font-semibold leading-none tracking-tight',
    BUTTON_TRANSITION_CLASS,
    FOCUS_RING_CLASS,
    DISABLED_CLASS,
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    full && 'w-full',
    !disablePressAnimation && PRESS_CLASS,
    isLoading && 'cursor-wait',
    className,
  );

  const labelContent = (
    <>
      {isLoading && <ButtonMicroLoader size={size} variant={variant} />}
      {!isLoading && icon && <span className="inline-flex shrink-0 items-center leading-none">{icon}</span>}
      {children}
      {!isLoading && iconRight && <span className="inline-flex shrink-0 items-center leading-none">{iconRight}</span>}
    </>
  );

  if (Tag === 'a' && href) {
    return (
      <a
        ref={ref}
        href={href}
        className={combinedClasses}
        style={resolvedStyle}
        aria-busy={isLoading || undefined}
        aria-disabled={disabled || isLoading ? true : undefined}
        onClick={runClick}
        {...props}
      >
        {labelContent}
      </a>
    );
  }

  if (Tag === 'link' && to) {
    return (
      <Link
        ref={ref}
        to={to}
        style={resolvedStyle}
        className={combinedClasses}
        aria-busy={isLoading || undefined}
        onClick={runClick}
        {...props}
      >
        {labelContent}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      {...props}
      type={props.type ?? 'button'}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={combinedClasses}
      style={resolvedStyle}
      onClick={runClick}
    >
      {labelContent}
    </button>
  );
});
Button.displayName = 'Button';

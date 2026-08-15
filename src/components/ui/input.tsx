import * as React from 'react';
import { Check, Loader2, Search, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

type InputLabelVariant = 'default' | 'muted' | 'strong';
export type InputHelperVariant = 'default' | 'info' | 'error' | 'warning' | 'success';
export type InputSize = 'default' | 'compact';
export type InputTone = 'default' | 'success';

type InputProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  label?: string;
  labelVariant?: InputLabelVariant;
  helperText?: string;
  helperVariant?: InputHelperVariant;
  /** Show a 1px colored border when the helper is in `error` / `warning` / `success`. */
  fieldStateBorder?: boolean;
  wrapperClassName?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  iconClassName?: string;
  rightSlot?: React.ReactNode;
  rightSlotClassName?: string;
  /** Visual density; not the native HTML `size` (character width). */
  size?: InputSize;
  /** Visual tone — `success` paints a green ring + checkmark. */
  tone?: InputTone;
  /** Show a small spinner inside the field (right-aligned). Use while async validation runs. */
  loading?: boolean;
  /** Render an `×` clear button when the field has a value. The button fires `onClear` (NOT `onChange`). */
  clearable?: boolean;
  /** Called when the user clicks the clear button. If omitted, clicking the button just empties the field. */
  onClear?: () => void;
  /** Preset search icon and overflow-visible inner wrapper for focus rings. */
  variant?: 'default' | 'search' | 'standalone';
  /** Tighter wrapper for inline row patterns (no top gap, no helper-text margin). */
  flush?: boolean;
};

/* ─────────────────────────────────────────────────────────────────────
 *  Canonical control sizes — mirrored in `select.tsx` + Button so the trio
 *  stays interchangeable. Mobile is two steps larger; `sm:` is desktop.
 *  default  = h-10 → sm:h-8  (matches Button md)
 *  compact  = h-9  → sm:h-7  (matches Button sm / Select chip)
 * ───────────────────────────────────────────────────────────────────── */
export const CANONICAL_RADIUS = 'rounded-md';
export const CANONICAL_HEIGHT_DEFAULT = 'h-10 sm:h-8';
export const CANONICAL_HEIGHT_COMPACT = 'h-9 sm:h-7';
export const CANONICAL_PADDING_DEFAULT = 'px-4 py-2 sm:px-3 sm:py-1';
export const CANONICAL_PADDING_COMPACT = 'px-3.5 py-1.5 sm:px-2.5 sm:py-1';
export const CANONICAL_TEXT_DEFAULT = 'text-sm sm:text-xs';
export const CANONICAL_TEXT_COMPACT = 'text-sm sm:text-[11px]';

const helperTextStyles: Record<InputHelperVariant, string> = {
  default: 'text-text-tertiary',
  info: 'text-text-secondary',
  error: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
}

const helperBorderStyles: Record<InputHelperVariant, string> = {
  default: '',
  info: '',
  error: 'border-destructive/45 ring-1 ring-destructive/15',
  warning: 'border-warning/45 ring-1 ring-warning/15',
  success: 'border-success/45 ring-1 ring-success/15',
}

/**
 * Realistic hover/focus curve — premium "expo out" easing.
 * `cubic-bezier(0.16, 1, 0.3, 1)` ≈ 220ms — same curve Linear, Notion,
 * Vercel and Claude use. Matches Select and Button so the trio feels unified.
 *
 *   resting: bg-card + 1px border, no shadow
 *   hover : subtle bg wash
 *   focus : primary ring + soft glow shadow
 *   error : destructive border + ring (when caller passes error helper)
 */
const FOCUS_RING_CLASS =
  'focus-visible:shadow-[0_0_0_1px_hsl(var(--ring)),0_0_0_4px_hsl(var(--ring)/0.15),0_1px_2px_hsl(var(--ring)/0.08)]';
const TRANSITION_BASE =
  '[transition-duration:180ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] transition-[background-color,box-shadow,color,border-color]';

/** Resting surface — real border, flat fill, no inset/drop shadow. */
const RESTING_SURFACE = 'border border-border-default bg-card shadow-none';
const HOVER_BG_CLASS = 'hover:bg-muted/60';
const FOCUS_BG_CLASS = 'focus-visible:bg-bg-surface';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      labelVariant = 'default',
      helperText,
      helperVariant = 'default',
      fieldStateBorder = true,
      wrapperClassName,
      iconLeft: iconLeftProp,
      iconRight,
      iconClassName,
      rightSlot,
      rightSlotClassName,
      size = 'default',
      variant = 'default',
      tone = 'default',
      loading = false,
      clearable = false,
      onClear,
      flush = false,
      id,
      disabled,
      readOnly,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    const iconLeft = variant === 'search' && iconLeftProp === undefined ? <Search aria-hidden /> : iconLeftProp;
    const resolvedIconClass =
      variant === 'search'
        ? cn('transition-colors group-focus-within:text-primary', iconClassName)
        : iconClassName;

    const showInternalLabel = variant !== 'standalone' && Boolean(label);
    const showInternalHelper = variant !== 'standalone' && Boolean(helperText);

    const hasValue = String(value ?? '').length > 0;
    const showClear = clearable && hasValue && !disabled && !readOnly;
    const showLoading = loading && !disabled && !readOnly;
    const showToneCheck = tone === 'success' && hasValue && !loading;
    const showAffixRight = Boolean(showClear || showLoading || showToneCheck || iconRight || rightSlot);

    const stateBorderClass = fieldStateBorder ? helperBorderStyles[helperVariant] : '';

    const handleClearClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Clear the underlying input imperatively so uncontrolled usage works.
      const el = (ref as React.RefObject<HTMLInputElement>)?.current;
      if (el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        if (nativeSetter) nativeSetter.call(el, '');
        else el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onClear?.();
    };

    // Compute left padding based on iconLeft presence; right pad inversely based on affixes.
    const leftPad = iconLeft
      ? size === 'compact'
        ? 'pl-9 sm:pl-7'
        : 'pl-10 sm:pl-8'
      : '';
    const rightPad = showAffixRight
      ? size === 'compact'
        ? 'pr-9 sm:pr-7'
        : 'pr-10 sm:pr-8'
      : '';

    return (
      <div
        className={cn(
          'group/input relative w-full flex',
          flush || variant === 'standalone' ? 'gap-0' : 'flex-col gap-1.5',
          wrapperClassName,
        )}
      >
        {showInternalLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'block transition-colors duration-200 group-focus-within/input:text-primary',
              labelVariant === 'default' && 'text-xs font-semibold text-foreground',
              labelVariant === 'muted' && 'text-xs font-semibold text-foreground',
              labelVariant === 'strong' && 'text-[13px] font-bold text-foreground',
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative',
            CANONICAL_RADIUS,
            variant === 'search' && 'overflow-visible',
          )}
        >
          <input
            id={inputId}
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            value={value}
            onChange={onChange}
            className={cn(
              'peer flex w-full text-foreground outline-none',
              CANONICAL_RADIUS,
              // Resting: real border, flat fill, no shadow.
              RESTING_SURFACE,
              // Size ladder — keeps Input + Select + Button interchangeable.
              size === 'default' && cn(
                CANONICAL_HEIGHT_DEFAULT,
                CANONICAL_PADDING_DEFAULT,
                CANONICAL_TEXT_DEFAULT,
              ),
              size === 'compact' && cn(
                CANONICAL_HEIGHT_COMPACT,
                CANONICAL_PADDING_COMPACT,
                CANONICAL_TEXT_COMPACT,
              ),

              // Subtle bg wash on hover; focus ring + soft glow.
              !disabled && !readOnly && HOVER_BG_CLASS,
              !disabled && !readOnly && cn(FOCUS_BG_CLASS, FOCUS_RING_CLASS),

              // Single transition timing function shared with Select.
              TRANSITION_BASE,

              // Tone: success paints a green ring on focus + at rest when value present.
              tone === 'success' && hasValue &&
                'shadow-[0_0_0_1px_hsl(var(--success)/0.55),0_0_0_4px_hsl(var(--success)/0.12)]',

              // Optional colored state border (error/warning/success).
              stateBorderClass,

              readOnly && 'cursor-default bg-bg-sunken text-text-secondary',
              disabled &&
                'cursor-not-allowed bg-bg-sunken/60 text-muted-foreground/70 opacity-60 hover:bg-bg-sunken/60 hover:shadow-none focus-visible:bg-bg-sunken/60 focus-visible:shadow-none',

              leftPad,
              rightPad,

              // Slight letter-spacing for "premium" body feel.
              'tracking-[-0.005em]',

              className,
            )}
            ref={ref}
            {...props}
          />

          {iconLeft ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-text-tertiary',
                size === 'compact'
                  ? 'left-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:left-2 sm:[&_svg]:h-3 sm:[&_svg]:w-3'
                  : 'left-3 [&_svg]:h-4 [&_svg]:w-4 sm:left-2.5 sm:[&_svg]:h-3.5 sm:[&_svg]:w-3.5',
                resolvedIconClass,
              )}
            >
              {iconLeft}
            </span>
          ) : null}

          {showLoading ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-primary',
                size === 'compact'
                  ? 'right-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:right-2 sm:[&_svg]:h-3 sm:[&_svg]:w-3'
                  : 'right-3 [&_svg]:h-4 [&_svg]:w-4 sm:right-2.5 sm:[&_svg]:h-3.5 sm:[&_svg]:w-3.5',
              )}
            >
              <Loader2 className="animate-spin" aria-hidden />
            </span>
          ) : showClear ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClearClick}
              aria-label="Clear"
              className={cn(
                'absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary/80 outline-none',
                'transition-[background-color,color,transform] duration-150',
                'hover:bg-foreground/[0.06] hover:text-foreground',
                'active:scale-95',
                'focus-visible:ring-2 focus-visible:ring-ring/40',
                size === 'compact' ? 'right-1 h-7 w-7 sm:h-6 sm:w-6' : 'right-1.5 h-8 w-8 sm:h-7 sm:w-7',
              )}
            >
              <X
                className={size === 'compact' ? 'h-3.5 w-3.5 sm:h-3 sm:w-3' : 'h-4 w-4 sm:h-3.5 sm:w-3.5'}
                aria-hidden
                strokeWidth={2.5}
              />
            </button>
          ) : showToneCheck ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-success',
                size === 'compact' ? 'right-2.5 sm:right-2' : 'right-3 sm:right-2.5',
              )}
            >
              <Check
                className={size === 'compact' ? 'h-3.5 w-3.5 sm:h-3 sm:w-3' : 'h-4 w-4 sm:h-3.5 sm:w-3.5'}
                aria-hidden
                strokeWidth={3}
              />
            </span>
          ) : iconRight ? (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-text-tertiary',
                size === 'compact'
                  ? 'right-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:right-2 sm:[&_svg]:h-3 sm:[&_svg]:w-3'
                  : 'right-3 [&_svg]:h-4 [&_svg]:w-4 sm:right-2.5 sm:[&_svg]:h-3.5 sm:[&_svg]:w-3.5',
                iconClassName,
              )}
            >
              {iconRight}
            </span>
          ) : null}

          {rightSlot ? (
            <span
              className={cn(
                'absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center',
                rightSlotClassName,
              )}
            >
              {rightSlot}
            </span>
          ) : null}
        </div>

        {showInternalHelper && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-0.5',
              helperVariant === 'error' && 'animate-[shake_0.18s_ease-in-out]',
            )}
          >
            <p
              className={cn(
                'text-[11px] leading-tight transition-opacity duration-200',
                helperTextStyles[helperVariant],
              )}
              role={helperVariant === 'error' ? 'alert' : undefined}
            >
              {helperText}
            </p>
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };

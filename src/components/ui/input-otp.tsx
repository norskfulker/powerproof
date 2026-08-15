import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * InputOTP — chunked one-time-code input.
 *
 * Renders `length` (default 6) individual numeric cells in a single row.
 * Behaviour:
 *   • Only digits are accepted; non-digit input is rejected at the cell level.
 *   • Typing auto-advances focus to the next empty cell.
 *   • Backspace in an empty cell jumps back to the previous cell and clears it.
 *   • ArrowLeft / ArrowRight move focus between cells.
 *   • Pasting a digit string anywhere in the row fills from the focused cell
 *     forward, overwriting as needed (handles OTP codes with spaces/dashes).
 *   • When all cells are filled, `onComplete` fires once per full code.
 *
 * The hidden `value` (single string) is what callers should consume; the cells
 * are presentational. Use the imperative `ref` to call `clear()` / `focus()`.
 */
export type InputOTPLength = 4 | 5 | 6 | 7 | 8;
export type InputOTPValue = string;

export interface InputOTPProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value' | 'defaultValue'> {
  /** Number of digit cells (default 6). */
  length?: InputOTPLength;
  /** Controlled code string (digits only). */
  value: InputOTPValue;
  /** Called on every change with the sanitised digit string. */
  onChange: (next: InputOTPValue) => void;
  /** Fires once whenever the code transitions from incomplete → complete. */
  onComplete?: (code: InputOTPValue) => void;
  /** Auto-focus the first cell on mount (default true). */
  autoFocus?: boolean;
  /** Disable all cells. */
  disabled?: boolean;
  /** Override the accessible label for the group (default "Verification code"). */
  ariaLabel?: string;
}

export interface InputOTPHandle {
  /** Clear all cells and refocus the first one. */
  clear: () => void;
  /** Focus a specific cell (0-indexed), or the first empty cell if omitted. */
  focus: (index?: number) => void;
}

const DEFAULT_LENGTH: InputOTPLength = 6;
const DEFAULT_LABEL = 'Verification code';

function clampIndex(i: number, length: number): number {
  if (i < 0) return 0;
  if (i >= length) return length - 1;
  return i;
}

function sanitizeDigits(input: string): string {
  return input.replace(/\D/g, '');
}

function pickInitialIndex(value: string, length: number): number {
  const filled = sanitizeDigits(value).slice(0, length).length;
  return clampIndex(filled, length);
}

export const InputOTP = React.forwardRef<InputOTPHandle, InputOTPProps>(function InputOTP(
  {
    length = DEFAULT_LENGTH,
    value,
    onChange,
    onComplete,
    autoFocus = true,
    disabled = false,
    ariaLabel = DEFAULT_LABEL,
    className,
    ...rest
  },
  ref,
) {
  // Normalise value into a fixed-width array of single digits.
  const digits = React.useMemo(() => {
    const clean = sanitizeDigits(value).slice(0, length);
    const out: string[] = new Array(length).fill('');
    for (let i = 0; i < clean.length; i += 1) out[i] = clean[i];
    return out;
  }, [value, length]);

  const cellRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const lastCompletedRef = React.useRef<string>('');

  // Refocus first empty cell whenever the length changes (variant switch).
  React.useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, length);
  }, [length]);

  // Fire onComplete only on the 0→full transition.
  React.useEffect(() => {
    const clean = sanitizeDigits(value);
    if (clean.length === length && lastCompletedRef.current !== clean) {
      lastCompletedRef.current = clean;
      onComplete?.(clean);
    } else if (clean.length < length) {
      lastCompletedRef.current = '';
    }
  }, [value, length, onComplete]);

  // Imperative handle.
  React.useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        onChange('');
        // Focus on next tick so the cell renders empty before we focus.
        window.setTimeout(() => {
          cellRefs.current[0]?.focus();
          cellRefs.current[0]?.select();
        }, 0);
      },
      focus: (index?: number) => {
        const target =
          typeof index === 'number' ? clampIndex(index, length) : pickInitialIndex(value, length);
        window.setTimeout(() => {
          cellRefs.current[target]?.focus();
          cellRefs.current[target]?.select();
        }, 0);
      },
    }),
    [length, onChange, value],
  );

  const commit = React.useCallback(
    (next: string) => {
      const clean = sanitizeDigits(next).slice(0, length);
      if (clean !== value) onChange(clean);
    },
    [length, onChange, value],
  );

  const setCell = React.useCallback(
    (index: number, digit: string) => {
      const clean = sanitizeDigits(digit).slice(0, 1);
      const next = digits.slice();
      next[index] = clean;
      commit(next.join(''));
    },
    [digits, commit],
  );

  const moveFocus = React.useCallback(
    (index: number, select = true) => {
      const target = clampIndex(index, length);
      window.setTimeout(() => {
        const el = cellRefs.current[target];
        if (!el) return;
        el.focus();
        if (select) el.select();
      }, 0);
    },
    [length],
  );

  const focusEmptyFrom = React.useCallback(
    (fromIndex: number) => {
      for (let i = fromIndex; i < length; i += 1) {
        if (!digits[i]) {
          moveFocus(i, false);
          return;
        }
      }
      moveFocus(length - 1, false);
    },
    [digits, length, moveFocus],
  );

  const handleChange = React.useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Selection replacement can land multiple digits at once (paste, autofill).
      const pasted = sanitizeDigits(raw);
      if (pasted.length > 1) {
        // Distribute the pasted run starting at `index`.
        const next = digits.slice();
        for (let i = 0; i < pasted.length && index + i < length; i += 1) {
          next[index + i] = pasted[i];
        }
        commit(next.join(''));
        // Focus the cell after the last filled one.
        const lastFilled = Math.min(index + pasted.length, length) - 1;
        if (lastFilled + 1 < length) moveFocus(lastFilled + 1, false);
        else moveFocus(lastFilled, false);
        return;
      }
      setCell(index, raw);
      if (pasted.length === 1 && index < length - 1) {
        moveFocus(index + 1, false);
      }
    },
    [digits, setCell, commit, moveFocus, length],
  );

  const handleKeyDown = React.useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;
      if (key === 'ArrowLeft') {
        e.preventDefault();
        moveFocus(index - 1);
        return;
      }
      if (key === 'ArrowRight') {
        e.preventDefault();
        moveFocus(index + 1);
        return;
      }
      if (key === 'Backspace') {
        if (digits[index]) {
          // Clear current cell, keep focus here.
          e.preventDefault();
          setCell(index, '');
          return;
        }
        if (index > 0) {
          e.preventDefault();
          setCell(index - 1, '');
          moveFocus(index - 1);
        }
        return;
      }
      if (key === 'Delete') {
        if (digits[index]) {
          e.preventDefault();
          setCell(index, '');
        }
        return;
      }
      if (key === 'Home') {
        e.preventDefault();
        moveFocus(0);
        return;
      }
      if (key === 'End') {
        e.preventDefault();
        moveFocus(length - 1);
        return;
      }
    },
    [digits, setCell, moveFocus, length],
  );

  const handlePaste = React.useCallback(
    (index: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text') ?? '';
      const clean = sanitizeDigits(text).slice(0, length);
      if (!clean) return;
      e.preventDefault();
      const next = digits.slice();
      for (let i = 0; i < clean.length && index + i < length; i += 1) {
        next[index + i] = clean[i];
      }
      commit(next.join(''));
      const lastFilled = Math.min(index + clean.length, length) - 1;
      if (lastFilled + 1 < length) moveFocus(lastFilled + 1, false);
      else moveFocus(lastFilled, false);
    },
    [digits, length, commit, moveFocus],
  );

  const handleFocus = React.useCallback(
    (index: number) => (e: React.FocusEvent<HTMLInputElement>) => {
      // Select-all on focus makes re-typing or paste-over trivial.
      e.target.select();
      // Stop the parent form from auto-scrolling the focused cell off-screen.
      requestAnimationFrame(() => focusEmptyFrom(index));
    },
    [focusEmptyFrom],
  );

  const setRef = React.useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      cellRefs.current[index] = el;
    },
    [],
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-otp-length={length}
      className={cn(
        'flex w-full items-center justify-center gap-2',
        // Inter Display + real Semibold + tabular numerals for steady digit width.
        'font-sans font-semibold tabular-nums',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...rest}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={setRef(i)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={false}
          disabled={disabled}
          value={digit}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste(i)}
          onFocus={handleFocus(i)}
          // `!important` keeps these unset by the parent Input primitive tokens
          // since we are not using the shared Input wrapper.
          className={cn(
            'h-12 w-11 shrink-0 rounded-lg border border-input bg-card text-center text-xl leading-none',
            'text-foreground caret-primary tracking-normal',
            'transition-colors duration-150',
            'hover:border-border-strong hover:bg-bg-hover',
            'focus:border-primary focus:bg-background focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          // Auto-focus the first cell exactly once.
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </div>
  );
});

InputOTP.displayName = 'InputOTP';

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  format?: (val: number) => string;
  leftLabel?: string;
  rightLabel?: string;
  hint?: string;
  color?: string; // optional inline override for range color
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  hideLabel?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  leftLabel,
  rightLabel,
  hint,
  color,
  showValue = true,
  size = "md",
  disabled,
  hideLabel = false,
}: SliderProps) {
  const display = format ? format(value) : String(value);

  return (
    <div className="w-full">
      {!hideLabel ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[13px] font-semibold text-foreground">{label}</label>
          {showValue ? (
            <span
              className="tabular-nums font-semibold text-[13px] font-semibold"
              style={{ color: color || "hsl(var(--primary))" }}
            >
              {display}
            </span>
          ) : null}
        </div>
      ) : null}

      {hint ? <p className="mb-2 text-[12px] leading-[1.4] text-muted-foreground">{hint}</p> : null}

      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0] ?? min)}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          size === "sm" && "h-4",
          size === "md" && "h-5",
          size === "lg" && "h-6",
          disabled && "opacity-60",
        )}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative grow overflow-hidden rounded-full bg-sunken border border-border-subtle",
            size === "sm" && "h-1",
            size === "md" && "h-1.5",
            size === "lg" && "h-2",
          )}
        >
          <SliderPrimitive.Range
            className="absolute h-full"
            style={{ background: color || "hsl(var(--primary))" }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block rounded-full border border-border bg-background shadow-sm",
            "transition-[transform,box-shadow] duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "data-[disabled]:pointer-events-none",
            "active:scale-[1.03]",
            size === "sm" && "h-4 w-4",
            size === "md" && "h-5 w-5",
            size === "lg" && "h-6 w-6",
          )}
          aria-label={label}
        />
      </SliderPrimitive.Root>

      {leftLabel || rightLabel ? (
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{leftLabel ?? ""}</span>
          <span>{rightLabel ?? ""}</span>
        </div>
      ) : null}
    </div>
  );
}

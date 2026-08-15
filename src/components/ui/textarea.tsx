import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea — matches Input surface: real border, flat fill, subtle hover bg,
 * focus ring. Multi-line padding + min-height only.
 */
const FOCUS_RING_CLASS =
  "focus-visible:shadow-[0_0_0_1px_hsl(var(--ring)),0_0_0_4px_hsl(var(--ring)/0.15),0_1px_2px_hsl(var(--ring)/0.08)]";
const TRANSITION_BASE =
  "[transition-duration:180ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] transition-[background-color,box-shadow,color,border-color]";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[52px] w-full rounded-lg border border-border-default bg-card px-3 py-2 text-xs leading-snug tracking-[-0.005em] text-foreground shadow-none outline-none",
        "placeholder:text-text-tertiary",
        "hover:bg-muted/60",
        "focus-visible:bg-bg-surface",
        FOCUS_RING_CLASS,
        TRANSITION_BASE,
        "disabled:cursor-not-allowed disabled:bg-bg-sunken/60 disabled:text-muted-foreground/70 disabled:opacity-60 disabled:hover:bg-bg-sunken/60 disabled:hover:shadow-none",
        "read-only:cursor-default read-only:bg-bg-sunken read-only:text-text-secondary",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

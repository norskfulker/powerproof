"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Provider ──────────────────────────────────────────────────────

const TooltipProvider = TooltipPrimitive.Provider;

// ─── Tooltip Root ────────────────────────────────────────────────────

const Tooltip = TooltipPrimitive.Root;

// ─── Tooltip Trigger ─────────────────────────────────────────────────

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    className={cn(
      "transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    {children}
  </TooltipPrimitive.Trigger>
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

// ─── Tooltip Content ─────────────────────────────────────────────────

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean;
    variant?: "default" | "primary" | "ghost";
  }
>(({ className, sideOffset = 8, showArrow = true, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-popover/95 text-popover-foreground border-border-subtle/70 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]",
    primary: "bg-primary/95 text-primary-foreground border-primary/30 shadow-[0_4px_24px_-4px_rgba(var(--primary-rgb),0.25)]",
    ghost: "bg-card/90 text-foreground border-border-subtle/50 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] backdrop-blur-xl",
  };

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "relative z-[9999] max-w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border px-3 py-2 text-sm font-medium",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-3 data-[side=left]:slide-in-from-right-3",
          "data-[side=right]:slide-in-from-left-3 data-[side=top]:slide-in-from-bottom-3",
          "transition-colors duration-200",
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Ambient glow for primary variant */}
        {variant === "primary" && (
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-background/10 blur-xl" />
        )}

        {/* Glass shimmer for ghost variant */}
        {variant === "ghost" && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent" />
        )}

        {props.children}

        {/* Arrow */}
        {showArrow && (
          <TooltipPrimitive.Arrow
            className={cn(
              "fill-current",
              variant === "primary" ? "text-primary/95" : variant === "ghost" ? "text-card/90" : "text-popover/95"
            )}
            width={12}
            height={6}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// ─── Tooltip With Animation Wrapper ──────────────────────────────────

function AnimatedTooltip({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration = 200,
  skipDelayDuration = 300,
  variant = "default",
  showArrow = true,
  className,
  sideOffset = 8,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  skipDelayDuration?: number;
  variant?: "default" | "primary" | "ghost";
  showArrow?: boolean;
  className?: string;
  sideOffset?: number;
}) {
  return (
    <TooltipProvider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          variant={variant}
          showArrow={showArrow}
          className={className}
          sideOffset={sideOffset}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Exports ───────────────────────────────────────────────────────

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  AnimatedTooltip,
};
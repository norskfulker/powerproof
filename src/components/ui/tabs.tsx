"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

export type TabsVariant = "default" | "outlineBlue" | "glow" | "pill";

/** Matches `button.tsx` `outlineBlue` — primary border on top/sides, open bottom. */
const OUTLINE_BLUE_TAB_ACCENT = "[--tab-accent:var(--primary)]";

const OUTLINE_BLUE_TAB_GRADIENT = cn(
  "bg-gradient-to-b from-transparent to-transparent",
  "hover:from-[hsl(var(--tab-accent)/0.14)] hover:to-transparent",
  "data-[state=active]:from-[hsl(var(--tab-accent)/0.18)] data-[state=active]:via-[hsl(var(--tab-accent)/0.07)] data-[state=active]:to-[hsl(var(--background))]",
);

const OUTLINE_BLUE_TAB_ACTIVE_BORDER = cn(
  "data-[state=active]:border-[hsl(var(--tab-accent))]",
  "data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-0",
);

type TabsContextValue = {
  variant: TabsVariant;
  activeValue: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);
const TabsListVariantContext = React.createContext<TabsVariant | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

function useResolvedTabsVariant(explicit?: TabsVariant): TabsVariant {
  const { variant: rootVariant } = useTabsContext();
  const listVariant = React.useContext(TabsListVariantContext);
  return explicit ?? listVariant ?? rootVariant;
}

type IndicatorRect = { left: number; top: number; width: number; height: number };

const LIST_STYLES: Record<TabsVariant, string> = {
  default: cn(
    "relative inline-flex w-fit items-center justify-center overflow-visible p-0",
    "rounded-full border border-[hsl(var(--tab-track-border))] bg-[hsl(var(--tab-track-bg))] shadow-none",
  ),
  outlineBlue: cn(
    "relative inline-flex w-fit max-w-full items-end justify-start gap-1 overflow-visible p-0",
    "border-0 bg-transparent",
  ),
  glow: cn(
    "relative inline-flex w-fit items-center justify-center gap-0.5 overflow-visible p-0",
    "rounded-full border border-[hsl(var(--tab-track-border))] bg-[hsl(var(--tab-track-bg))] shadow-none",
  ),
  pill: cn(
    "relative inline-flex w-fit items-center justify-center overflow-hidden p-0",
    "rounded-full border border-[hsl(var(--tab-track-border))] bg-[hsl(var(--tab-track-bg))] shadow-none",
  ),
};

const INDICATOR_STYLES: Record<TabsVariant, string> = {
  default: cn(
    "pointer-events-none absolute z-0 rounded-full border border-[hsl(var(--tab-indicator-border))] bg-[hsl(var(--tab-indicator-bg))]",
    "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    "dark:shadow-[0_1px_2px_hsl(var(--foreground)/0.06)]",
  ),
  outlineBlue: "hidden",
  glow: "hidden",
  pill: cn(
    "pointer-events-none absolute z-0 rounded-full border border-[hsl(var(--tab-indicator-border))] bg-[hsl(var(--tab-indicator-bg))]",
    "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    "dark:shadow-[0_1px_2px_hsl(var(--foreground)/0.06)]",
  ),
};

const TRIGGER_STYLES: Record<TabsVariant, string> = {
  default: cn(
    "group relative z-10 inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap",
    "rounded-full px-3 text-xs font-medium leading-none tracking-tight",
    "transition-[color] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "bg-transparent text-foreground/55",
    "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold",
    "[&_.tab-icon_svg]:h-3.5 [&_.tab-icon_svg]:w-3.5 [&_.tab-icon_svg]:shrink-0",
    "data-[state=inactive]:[&_svg]:text-foreground/55 data-[state=inactive]:[&_.tab-icon]:text-foreground/55",
    "data-[state=active]:[&_svg]:text-foreground data-[state=active]:[&_.tab-icon]:text-foreground",
  ),
  outlineBlue: cn(
    "group relative z-10 inline-flex shrink-0 items-center justify-center whitespace-nowrap",
    "rounded-t-[10px] rounded-b-none border border-transparent border-b-0 px-4 py-2",
    "text-[13px] font-normal leading-none tracking-tight",
    "transition-[background,border-color,color,box-shadow] duration-200 ease-out",
    OUTLINE_BLUE_TAB_ACCENT,
    OUTLINE_BLUE_TAB_GRADIENT,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--tab-accent)/0.25)] focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "text-foreground/55",
    "hover:text-[hsl(var(--tab-accent))]",
    "hover:[&_svg]:text-[hsl(var(--tab-accent))] hover:[&_.tab-icon]:text-[hsl(var(--tab-accent))]",
    "data-[state=active]:z-20 data-[state=active]:-mb-px",
    "data-[state=active]:text-[hsl(var(--tab-accent))] data-[state=active]:font-bold",
    OUTLINE_BLUE_TAB_ACTIVE_BORDER,
    "data-[state=active]:shadow-[0_1px_0_0_hsl(var(--background))]",
    "[&_.tab-icon_svg]:h-4 [&_.tab-icon_svg]:w-4 [&_.tab-icon_svg]:shrink-0",
    "data-[state=inactive]:[&_svg]:text-foreground/55 data-[state=inactive]:[&_.tab-icon]:text-foreground/55",
    "data-[state=active]:[&_svg]:text-[hsl(var(--tab-accent))] data-[state=active]:[&_.tab-icon]:text-[hsl(var(--tab-accent))]",
  ),
  glow: cn(
    "group relative z-10 inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap",
    "rounded-lg px-2.5 text-sm font-bold leading-none tracking-tight sm:px-3 sm:text-[15px]",
    "transition-[color] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "bg-transparent text-foreground",
    "hover:text-primary",
    "hover:[&_svg]:text-primary hover:[&_.tab-icon]:text-primary",
    "data-[state=active]:bg-transparent data-[state=active]:text-primary",
    "data-[state=active]:drop-shadow-[0_0_8px_hsl(var(--primary)/0.45)]",
    "[&_.tab-icon_svg]:h-4 [&_.tab-icon_svg]:w-4 [&_.tab-icon_svg]:shrink-0 sm:[&_.tab-icon_svg]:h-[1.125rem] sm:[&_.tab-icon_svg]:w-[1.125rem]",
    "data-[state=inactive]:[&_svg]:text-foreground data-[state=inactive]:[&_.tab-icon]:text-foreground",
    "data-[state=active]:[&_svg]:text-primary data-[state=active]:[&_.tab-icon]:text-primary",
  ),
  pill: cn(
    "group relative z-10 inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap",
    "rounded-full px-3 text-xs font-medium leading-none tracking-tight",
    "transition-[color] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "bg-transparent text-foreground/55",
    "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold",
    "[&_.tab-icon_svg]:h-3.5 [&_.tab-icon_svg]:w-3.5 [&_.tab-icon_svg]:shrink-0",
    "data-[state=inactive]:[&_svg]:text-foreground/55 data-[state=inactive]:[&_.tab-icon]:text-foreground/55",
    "data-[state=active]:[&_svg]:text-foreground data-[state=active]:[&_.tab-icon]:text-foreground",
  ),
};

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & { variant?: TabsVariant }
>(({ variant = "default", value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const activeValue = isControlled ? String(value) : uncontrolledValue;

  const handleChange = React.useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolledValue(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ variant, activeValue }}>
      <TabsPrimitive.Root
        ref={ref}
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onValueChange={handleChange}
        {...props}
      />
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: TabsVariant;
    compact?: boolean;
  }
>(({ className, variant: listVariant, compact, children, ...props }, ref) => {
  const { variant: ctxVariant, activeValue } = useTabsContext();
  const variant = listVariant ?? ctxVariant;
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = React.useState<IndicatorRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const reduceMotion = useReducedMotion();
  const [isReady, setIsReady] = React.useState(false);

  const updateIndicator = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('[data-state="active"]');
    if (
      !active ||
      !(active instanceof HTMLElement) ||
      active.hasAttribute("data-popover-trigger")
    ) {
      setIndicator((prev) => ({ ...prev, width: 0, height: 0 }));
      return;
    }
    setIndicator({
      left: active.offsetLeft,
      top: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    });
    if (!isReady) setIsReady(true);
  }, [isReady]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  React.useLayoutEffect(() => {
    const run = () => requestAnimationFrame(updateIndicator);
    const timer = setTimeout(run, 50);
    const el = listRef.current;
    if (!el) return () => clearTimeout(timer);

    const ro = new ResizeObserver(run);
    ro.observe(el);
    el.querySelectorAll('[role="tab"]').forEach((tab) => ro.observe(tab));

    const mo = new MutationObserver(run);
    mo.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "style", "class"],
    });

    window.addEventListener("resize", run);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [updateIndicator, activeValue]);

  const transition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 500, damping: 38, mass: 0.7 };

  const showIndicator =
    (variant === "default" || variant === "pill") &&
    indicator.width > 0 &&
    indicator.height > 0 &&
    isReady;

  return (
    <TabsListVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        ref={setRefs}
        className={cn(
          LIST_STYLES[variant],
          className,
        )}
        {...props}
      >
        {showIndicator ? (
          <motion.div
            aria-hidden
            className={INDICATOR_STYLES[variant]}
            initial={false}
            animate={{
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
              height: indicator.height,
            }}
            transition={transition}
          />
        ) : null}
        {children}
      </TabsPrimitive.List>
    </TabsListVariantContext.Provider>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: TabsVariant;
    icon?: React.ReactNode;
    alwaysShowLabel?: boolean;
    compactUntil?: "md" | "layout-sm";
    compact?: boolean;
  }
>(
  (
    {
      className,
      variant: triggerVariant,
      children,
      icon,
      alwaysShowLabel,
      compactUntil = "md",
      compact,
      ...props
    },
    ref,
  ) => {
    const variant = useResolvedTabsVariant(triggerVariant);

    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          TRIGGER_STYLES[variant],
          compact &&
            (variant === "default" || variant === "outlineBlue" || variant === "glow" || variant === "pill") &&
            "h-7 min-w-7 rounded-full px-2.5 text-xs [&_.tab-icon_svg]:h-3.5 [&_.tab-icon_svg]:w-3.5 data-[state=inactive]:max-layout-sm:px-2",
          variant === "outlineBlue" &&
            compact &&
            "rounded-t-[8px] rounded-b-none",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "relative inline-flex min-w-0 max-w-full items-center",
            variant === "outlineBlue" ? "gap-1.5" : compact ? "gap-1" : "gap-1.5",
          )}
        >
          {icon ? (
            <span
              className={cn(
                "tab-icon inline-flex shrink-0 items-center text-inherit",
                "duration-200 transition-[transform,color] group-data-[state=active]:scale-[1.02]",
              )}
            >
              {icon}
            </span>
          ) : null}
          {children != null && children !== false ? (
            <span
              className={cn(
                "tab-label min-w-0 transition-all duration-200",
                icon &&
                  !alwaysShowLabel &&
                  (compactUntil === "layout-sm"
                    ? "max-layout-sm:group-data-[state=inactive]:hidden"
                    : "max-md:group-data-[state=inactive]:hidden"),
              )}
            >
              {children}
            </span>
          ) : null}
        </span>
      </TabsPrimitive.Trigger>
    );
  },
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & { instant?: boolean }
>(({ className, children, value, instant, ...props }, ref) => {
  const reduceMotion = useReducedMotion();
  const { activeValue } = useTabsContext();
  const isActive = activeValue === value;

  if (instant) {
    if (!isActive) return null;
    return (
      <TabsPrimitive.Content
        ref={ref}
        value={value}
        className={cn(
          "outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          className,
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.Content>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isActive ? (
        <TabsPrimitive.Content
          ref={ref}
          value={value}
          className={cn(
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          {...props}
          asChild
          forceMount
        >
          <motion.div
            key={value}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }
            }
          >
            {children}
          </motion.div>
        </TabsPrimitive.Content>
      ) : null}
    </AnimatePresence>
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

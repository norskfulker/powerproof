"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, ChevronUp } from '@/lib/icons';
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────
 *  Chip trigger — sole Select trigger surface (composer + forms).
 *  `cubic-bezier(0.16, 1, 0.3, 1)` ≈ 200ms — same curve as Input.
 * ───────────────────────────────────────────────────────────────────── */
const REST_BORDER_CLASS = "border border-border-default";
const HOVER_BG_CLASS = "hover:border-border-strong hover:bg-muted";
const OPEN_BG_CLASS = "data-[state=open]:border-border-strong data-[state=open]:bg-muted";

const RESTING_SURFACE =
  "shadow-none hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.12),0_12px_28px_-10px_rgba(0,0,0,0.18)] active:shadow-[0_1px_2px_rgba(0,0,0,0.10),0_2px_5px_-2px_rgba(0,0,0,0.10)]";

const TRANSITION_BASE =
  "[transition-duration:200ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] transition-[background-color,border-color,box-shadow,color,transform]";

/** Chip trigger surface — also usable for read-only display chips. */
export const SELECT_CHIP_TRIGGER_CLASS = cn(
  "group relative flex min-w-0 items-center justify-between gap-1.5 bg-surface text-foreground sm:gap-1",
  "outline-none focus-visible:outline-none",
  // Mobile two steps larger + tighter radius; `sm:` matches Button sm / Input compact.
  "h-9 rounded px-2.5 py-1.5 text-sm font-medium sm:h-7 sm:rounded-md sm:px-1.5 sm:py-0.5 sm:text-[11px]",
  REST_BORDER_CLASS,
  "data-[placeholder]:text-text-tertiary",
  RESTING_SURFACE,
  HOVER_BG_CLASS,
  OPEN_BG_CLASS,
  "active:scale-[0.98]",
  TRANSITION_BASE,
);

/** Disabled chip — muted surface, no hover lift. */
export const SELECT_CHIP_TRIGGER_DISABLED_CLASS = cn(
  "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-muted/30",
  "disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none",
  "disabled:hover:border-border-subtle disabled:hover:bg-muted/30 disabled:hover:shadow-none",
  "disabled:data-[state=open]:border-border-subtle disabled:data-[state=open]:bg-muted/30 disabled:data-[state=open]:shadow-none",
  "disabled:active:scale-100",
);

/* ─────────────────────────────────────────────────────────────────────
 *  Public types
 * ───────────────────────────────────────────────────────────────────── */

type SelectLeadingVariant = "textOnly" | "iconWithText";

/* ─────────────────────────────────────────────────────────────────────
 *  Root
 * ───────────────────────────────────────────────────────────────────── */
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type SelectProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  /** Default `iconWithText` — leading icons from SelectItem always show when present. */
  leadingVariant?: SelectLeadingVariant;
};

const Select = ({
  leadingVariant = "iconWithText",
  onValueChange,
  value: valueProp,
  defaultValue,
  children,
  ...props
}: SelectProps) => {
  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(() => {
    if (isControlled) return valueProp as string;
    return typeof defaultValue === "string" ? defaultValue : undefined;
  });

  const currentValue = isControlled ? (valueProp as string | undefined) : uncontrolledValue;

  const handleValueChange = (next: string) => {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const leadingByValue = React.useMemo(() => {
    const map = new Map<string, { icon?: React.ReactNode }>();

    const visit = (node: React.ReactNode) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const n of node) visit(n);
        return;
      }
      if (!React.isValidElement(node)) return;

      const el = node as React.ReactElement<{
        value?: unknown;
        icon?: React.ReactNode;
        children?: React.ReactNode;
      }>;
      if (el.type === SelectItem) {
        const v = el.props.value;
        if (typeof v === "string") {
          const entry = map.get(v) ?? {};
          map.set(v, {
            ...entry,
            ...(el.props.icon ? { icon: el.props.icon } : {}),
          });
        }
      }

      if (el.props?.children) {
        visit(el.props.children);
      }
    };

    visit(children);
    return map;
  }, [children]);

  return (
    <SelectLeadingContext.Provider value={{ leadingVariant, currentValue, leadingByValue }}>
      <SelectPrimitive.Root
        {...props}
        {...(isControlled ? { value: valueProp } : { defaultValue })}
        onValueChange={handleValueChange}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectLeadingContext.Provider>
  );
};

/* ─────────────────────────────────────────────────────────────────────
 *  Contexts
 * ───────────────────────────────────────────────────────────────────── */
type HoverRect = { x: number; y: number; w: number; h: number };

type SelectHoverContextValue = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  setHoverRect: (r: HoverRect | null) => void;
};

const SelectHoverContext = React.createContext<SelectHoverContextValue | null>(null);

function useSelectHoverContext() {
  const ctx = React.useContext(SelectHoverContext);
  if (!ctx) return null;
  return ctx;
}

type SelectLeadingContextValue = {
  leadingVariant: SelectLeadingVariant;
  currentValue: string | undefined;
  leadingByValue: Map<string, { icon?: React.ReactNode }>;
};

const SelectLeadingContext = React.createContext<SelectLeadingContextValue | null>(null);

function useSelectLeadingContext() {
  return React.useContext(SelectLeadingContext);
}

/* ─────────────────────────────────────────────────────────────────────
 *  Trigger — chip only
 * ───────────────────────────────────────────────────────────────────── */
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    triggerWidth?: "full" | "min";
  }
>(
  (
    {
      className,
      children,
      triggerWidth = "full",
      disabled,
      ...props
    },
    ref,
  ) => {
    const leadingCtx = useSelectLeadingContext();
    const childArray = React.Children.toArray(children);
    const valueIndex = childArray.findIndex((child) => {
      if (!React.isValidElement(child)) return false;
      const t = child.type as { displayName?: string; name?: string };
      return (
        child.type === SelectValue ||
        child.type === SelectPrimitive.Value ||
        t?.displayName === "SelectValue" ||
        t?.name === "SelectValue"
      );
    });
    const valueChild = valueIndex >= 0 ? childArray[valueIndex] : null;
    const visibleChildren =
      valueIndex >= 0 ? childArray.filter((_, i) => i !== valueIndex) : childArray;
    const hasCustomTrigger = visibleChildren.length > 0;

    const resolvedLeadingIcon =
      leadingCtx?.leadingVariant === "iconWithText"
        ? (leadingCtx.leadingByValue.get(leadingCtx.currentValue ?? "")?.icon ?? null)
        : null;

    const chevronNode = (
      <SelectPrimitive.Icon asChild>
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/70 transition-colors duration-200 sm:h-3 sm:w-3",
            "group-data-[state=open]:text-foreground",
            disabled && "text-muted-foreground/40",
          )}
        >
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:h-3 sm:w-3"
            strokeWidth={2.5}
          />
        </div>
      </SelectPrimitive.Icon>
    );

    const triggerClass = cn(
      SELECT_CHIP_TRIGGER_CLASS,
      SELECT_CHIP_TRIGGER_DISABLED_CLASS,
      triggerWidth === "full" && "w-full",
      triggerWidth === "min" && "w-fit max-w-full",
      className,
    );

    const iconWrapClass = cn(
      "flex shrink-0 items-center justify-center text-muted-foreground/60 transition-colors duration-200",
      "group-data-[state=open]:text-muted-foreground",
      "[&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-3 sm:[&_svg]:w-3",
    );

    return (
      <SelectPrimitive.Trigger
        ref={ref}
        disabled={disabled}
        className={triggerClass}
        {...props}
      >
        {hasCustomTrigger ? (
          <>
            {valueChild != null
              ? React.cloneElement(valueChild as React.ReactElement<{ className?: string }>, {
                  className: cn(
                    "sr-only",
                    (valueChild as React.ReactElement<{ className?: string }>).props.className,
                  ),
                })
              : null}
            <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left font-medium">
              {resolvedLeadingIcon ? (
                <span aria-hidden className={iconWrapClass}>
                  {resolvedLeadingIcon}
                </span>
              ) : null}
              {visibleChildren}
            </span>
          </>
        ) : (
          (() => {
            if (!resolvedLeadingIcon) {
              return <span className="truncate font-medium">{children}</span>;
            }
            return (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left font-medium">
                <span aria-hidden className={cn("pointer-events-none", iconWrapClass)}>
                  {resolvedLeadingIcon}
                </span>
                <span className="truncate font-medium">{children}</span>
              </span>
            );
          })()
        )}
        {chevronNode}
      </SelectPrimitive.Trigger>
    );
  },
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

/* ─────────────────────────────────────────────────────────────────────
 *  Content (dropdown panel)
 * ───────────────────────────────────────────────────────────────────── */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset, ...props }, ref) => {
  return (
    <SelectPrimitive.Portal>
      <SelectContentInner
        ref={ref}
        position={position}
        sideOffset={sideOffset ?? 4}
        className={className}
        {...props}
      >
        {children}
      </SelectContentInner>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

type SelectScrollEdges = { up: boolean; down: boolean };

function useSelectViewportScrollEdges(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
) {
  const [edges, setEdges] = React.useState<SelectScrollEdges>({ up: false, down: false });

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !active) {
      setEdges({ up: false, down: false });
      return;
    }

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const overflow = scrollHeight - clientHeight > 1;
      setEdges({
        up: overflow && scrollTop > 1,
        down: overflow && scrollTop + clientHeight < scrollHeight - 1,
      });
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [active, viewportRef]);

  return edges;
}

/** Keep wheel / trackpad scroll inside the menu instead of `#app-main-scroll`. */
function keepSelectWheelScrollLocal(e: React.WheelEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  if (el.scrollHeight <= el.clientHeight + 1) return;
  const delta = e.deltaY;
  const atTop = el.scrollTop <= 0;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  if ((delta < 0 && atTop) || (delta > 0 && atBottom)) return;
  e.stopPropagation();
}

function SelectScrollEdgeFade({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-[2] h-7 from-popover to-transparent",
        edge === "top" && "top-0 bg-gradient-to-b",
        edge === "bottom" && "bottom-0 bg-gradient-to-t",
      )}
    />
  );
}

const SelectContentInner = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
  (
    {
      className,
      children,
      position = "popper",
      collisionPadding = 12,
      sideOffset = 4,
      ...props
    },
    ref,
  ) => {
    const viewportRef = React.useRef<HTMLDivElement | null>(null);
    const [hoverRect, setHoverRect] = React.useState<HoverRect | null>(null);
    const [contentOpen, setContentOpen] = React.useState(false);
    const reduceMotion = useReducedMotion();
    const scrollEdges = useSelectViewportScrollEdges(viewportRef, contentOpen);

    const clearHover = React.useCallback(() => {
      setHoverRect(null);
    }, []);

    const transition = reduceMotion
      ? { duration: 0.01 }
      : { type: "spring" as const, stiffness: 480, damping: 32, mass: 0.9 };

    return (
      <SelectHoverContext.Provider value={{ viewportRef, setHoverRect }}>
        <SelectPrimitive.Content
          ref={ref}
          position={position}
          collisionPadding={collisionPadding}
          sideOffset={sideOffset}
          onCloseAutoFocus={() => {
            setContentOpen(false);
            clearHover();
          }}
          className={cn(
            "relative z-[10000] flex min-w-[8rem] flex-col overflow-hidden",
            position === "popper" &&
              "max-h-[min(var(--radix-select-content-available-height,70dvh),22rem)]",
            // Rounded glass surface — same border-subtle/80 + soft layered shadow
            // the primary button uses for a consistent 3D feel. Now also tinted
            // with the subtle inset highlight so the panel reads as elevated glass.
            "rounded-md border border-border-subtle/80 bg-popover sm:rounded-lg",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-8px_rgba(0,0,0,0.18),0_2px_6px_-2px_rgba(0,0,0,0.06)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=open]:duration-200 data-[state=closed]:duration-150",
            "data-[side=bottom]:origin-top data-[side=top]:origin-bottom",
            "data-[side=left]:origin-right data-[side=right]:origin-left",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {scrollEdges.up ? <SelectScrollEdgeFade edge="top" /> : null}
            <SelectPrimitive.Viewport
              ref={(node) => {
                viewportRef.current = node;
                setContentOpen(Boolean(node));
              }}
              className={cn(
                "relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain legacy-scrollbar touch-pan-y",
                "flex flex-col gap-0.5 p-1",
                scrollEdges.up && "pt-0",
                scrollEdges.down && "pb-0",
                position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
              )}
              onPointerLeave={clearHover}
              onWheel={keepSelectWheelScrollLocal}
            >
              <AnimatePresence>
                {hoverRect ? (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-0 z-0 rounded-[6px] bg-foreground/[0.05] dark:bg-foreground/[0.08]"
                    initial={false}
                    animate={{
                      x: hoverRect.x,
                      y: hoverRect.y,
                      width: hoverRect.w,
                      height: hoverRect.h,
                    }}
                    transition={transition}
                  />
                ) : null}
              </AnimatePresence>
              {children}
            </SelectPrimitive.Viewport>
            {scrollEdges.down ? <SelectScrollEdgeFade edge="bottom" /> : null}
          </div>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectHoverContext.Provider>
    );
  },
);
SelectContentInner.displayName = "SelectContentInner";

/* ─────────────────────────────────────────────────────────────────────
 *  Item
 * ───────────────────────────────────────────────────────────────────── */
const selectItemCheckedClass = cn(
  "data-[state=checked]:font-semibold data-[state=checked]:text-foreground",
  "data-[state=checked]:[&_.text-muted-foreground]:text-foreground/75",
);

const selectItemToneClass = cn(
  "text-foreground/85",
  "data-[highlighted]:bg-foreground/[0.05] data-[highlighted]:text-foreground dark:data-[highlighted]:bg-foreground/[0.08]",
  "focus:bg-foreground/[0.05] focus:text-foreground dark:focus:bg-foreground/[0.08]",
  selectItemCheckedClass,
);

const selectItemLeadingToneClass =
  "text-muted-foreground/55 transition-colors duration-200 group-data-[highlighted]:text-foreground/80 group-data-[state=checked]:text-foreground/85";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    icon?: React.ReactNode;
    /**
     * Optional color swatch — pass a CSS color string (`hsl(...)`, hex, or
     * `hsl(var(--token))`). Renders beside the item label with code + HSL meta
     * when `colorCode` / `colorHsl` are provided.
     */
    color?: string;
    /** Token / code label shown under the item text (e.g. `--primary`). */
    colorCode?: string;
    /** Raw HSL value shown under the item text (e.g. `hsl(142 71% 35%)`). */
    colorHsl?: string;
  }
>(
  (
    { className, children, icon, color, colorCode, colorHsl, onPointerMove, ...props },
    ref,
  ) => {
    const ctx = useSelectHoverContext();
    const hasColorMeta = Boolean(color || colorCode || colorHsl);

    const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
      onPointerMove?.(e);
      const itemEl = e.currentTarget;
      if (itemEl.getAttribute("data-state") === "checked") {
        ctx?.setHoverRect(null);
        return;
      }
      const viewport = ctx?.viewportRef.current;
      if (!viewport) return;
      const vp = viewport.getBoundingClientRect();
      const r = itemEl.getBoundingClientRect();
      ctx?.setHoverRect({
        x: r.left - vp.left + viewport.scrollLeft,
        y: r.top - vp.top + viewport.scrollTop,
        w: r.width,
        h: r.height,
      });
    };

    const handlePointerLeave: React.PointerEventHandler<HTMLDivElement> = (e) => {
      props.onPointerLeave?.(e);
      ctx?.setHoverRect(null);
    };

    return (
      <SelectPrimitive.Item
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "group relative z-[1] flex w-full cursor-default select-none items-center outline-none transition-colors duration-150 ease-out",
          "gap-1.5 rounded px-3 py-2.5 text-sm font-medium leading-tight sm:rounded-[6px] sm:px-2 sm:py-1.5 sm:text-xs",
          selectItemToneClass,
          className
        )}
        {...props}
      >
        {color ? (
          <span
            className="pointer-events-none h-4 w-4 shrink-0 rounded-md border border-border-subtle/80 shadow-sm"
            style={{ background: color }}
            aria-hidden
          />
        ) : null}

        {!color && icon ? (
          <span
            className={cn(
              "pointer-events-none flex shrink-0 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5",
              selectItemLeadingToneClass,
            )}
          >
            {icon}
          </span>
        ) : null}

        {hasColorMeta ? (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SelectPrimitive.ItemText className="min-w-0 truncate text-xs font-medium">
              {children}
            </SelectPrimitive.ItemText>
            {colorCode ? (
              <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
                {colorCode}
              </span>
            ) : null}
            {colorHsl ? (
              <span className="truncate font-mono text-[10px] font-normal text-muted-foreground/80">
                {colorHsl}
              </span>
            ) : null}
          </span>
        ) : (
          <SelectPrimitive.ItemText className="min-w-0 flex-1 text-xs font-medium">
            {children}
          </SelectPrimitive.ItemText>
        )}
      </SelectPrimitive.Item>
    );
  },
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

/* ─────────────────────────────────────────────────────────────────────
 *  Scroll Buttons
 * ───────────────────────────────────────────────────────────────────── */
const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1.5 text-muted-foreground/60",
      "transition-colors duration-200",
      className
    )}
    {...props}
  >
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 shadow-sm transition-colors duration-200 hover:bg-muted/80">
      <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
    </div>
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1.5 text-muted-foreground/60",
      "transition-colors duration-200",
      className
    )}
    {...props}
  >
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 shadow-sm transition-colors duration-200 hover:bg-muted/80">
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
    </div>
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

/* ─────────────────────────────────────────────────────────────────────
 *  Label / Separator — re-exported via `@/components/ui` for parity
 *  with the Radix primitive surface. Not used internally.
 * ───────────────────────────────────────────────────────────────────── */
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1.5 text-[11px] font-semibold tracking-normal text-muted-foreground/70",
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-0.5 h-px bg-border-subtle/60", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

/* ─────────────────────────────────────────────────────────────────────
 *  Exports
 * ───────────────────────────────────────────────────────────────────── */
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

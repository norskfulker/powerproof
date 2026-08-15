import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

type CustomScrollProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  variant?: "default" | "minimal";
};

export const CustomScroll = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  CustomScrollProps
>(({ className, children, variant = "default", ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn(
      "relative overflow-hidden rounded-md border border-border-subtle bg-background",
      variant === "minimal" && "border-transparent bg-transparent",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="vertical"
      className={cn(
        "flex touch-none select-none transition-colors h-full border-l border-l-transparent p-[1px]",
        variant === "default" ? "w-2.5" : "w-2",
      )}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="horizontal"
      className={cn(
        "flex touch-none select-none transition-colors h-2.5 flex-col border-t border-t-transparent p-[1px]",
        variant === "default" ? "h-2.5" : "h-2",
      )}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
CustomScroll.displayName = "CustomScroll";


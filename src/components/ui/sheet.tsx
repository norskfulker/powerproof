import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from '@/lib/icons';
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay ref={ref} asChild {...props}>
    <motion.div
      className={cn("fixed inset-0 z-[380] bg-black/60 backdrop-blur-2xl", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    />
  </SheetPrimitive.Overlay>
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-[400] gap-4 bg-background p-6 shadow-lg",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:-translate-y-full data-[state=closed]:duration-200 data-[state=closed]:ease-in",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-lg)] border-t shadow-[var(--shadow-lg)] duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200",
        left: "inset-y-0 left-0 h-full w-3/4 border-r transition-transform duration-300 ease-out data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full sm:max-w-sm data-[state=closed]:duration-200 data-[state=closed]:ease-in",
        right: "inset-y-0 right-0 h-full w-3/4 border-l transition-transform duration-300 ease-out data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full sm:max-w-sm data-[state=closed]:duration-200 data-[state=closed]:ease-in",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, hideClose = false, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    // Premium spring — same shape Claude / Linear / Vercel use for tactile side panels.
    // Slightly softer than a default spring so the panel has a subtle settle.
    const transition = reduceMotion
      ? { duration: 0.01 }
      : { type: "spring" as const, stiffness: 360, damping: 36, mass: 0.85 };

    const initial =
      side === "right"
        ? { x: "100%", opacity: 0 }
        : side === "left"
          ? { x: "-100%", opacity: 0 }
          : side === "bottom"
            ? { y: "100%", opacity: 0 }
            : { y: "-100%", opacity: 0 };

    const exit =
      side === "right"
        ? { x: "100%", opacity: 0 }
        : side === "left"
          ? { x: "-100%", opacity: 0 }
          : side === "bottom"
            ? { y: "100%", opacity: 0 }
            : { y: "-100%", opacity: 0 };

    return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content ref={ref} asChild {...props}>
        <motion.div
          className={cn(sheetVariants({ side }), className)}
          initial={initial}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={exit}
          transition={transition}
        >
          {children}
          {hideClose ? null : (
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
          )}
        </motion.div>
      </SheetPrimitive.Content>
    </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("font-display text-lg font-normal text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};

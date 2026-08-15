import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from '@/lib/icons';

import { iconClassName } from "@/lib/iconClassNames";
import { cn } from "@/lib/utils";

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={cn("flex w-full min-w-0 flex-col gap-0 bg-background", className)}
    {...props}
  />
));
Accordion.displayName = "Accordion";

/**
 * Plain accordion item — no bordered card chrome. Section borders are owned by
 * the consuming page (e.g. `OpportunityDetailPage`), not the accordion itself.
 */
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "flex w-full min-w-0 flex-col overflow-hidden rounded-none border-0 bg-background shadow-none",
      className,
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

/**
 * Trigger renders only the provided row (icon + title) plus a chevron.
 * No nested header card, no trailing action slot — section borders live in the
 * page, trailing actions live in the section content.
 */
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex min-w-0 w-auto max-w-full self-stretch items-center">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group group/trigger flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 text-left sm:h-12 sm:px-4",
        "font-sans text-[14px] font-semibold leading-none tracking-tight text-foreground outline-none sm:text-[15px]",
        "transition-colors duration-300 ease-out",
        "hover:text-primary",
        "data-[state=open]:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <span className="flex min-h-0 min-w-0 flex-1 items-center overflow-hidden leading-none">
        {children}
      </span>
      <ChevronDown
        className={iconClassName({
          tone: "primary",
          size: "sm",
          interactive: true,
          className: cn(
            "shrink-0 transition-transform duration-300 ease-out",
            "group-data-[state=open]:rotate-180",
          ),
        })}
        strokeWidth={2.5}
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "min-w-0 overflow-hidden bg-background text-[15px] leading-relaxed text-foreground",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
    )}
    {...props}
  >
    <div className={cn("px-3 pb-2.5 pt-3 text-[14px] sm:px-4 sm:pb-3 sm:pt-4 sm:text-[15px]", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
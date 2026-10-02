import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-xl p-1 text-muted-foreground transition-all duration-300",
      "bg-muted/60 backdrop-blur-md border border-border/20 shadow-inner",
      "dark:bg-muted/30 dark:border-white/5",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300",
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
      "disabled:pointer-events-none disabled:opacity-50",
      // Inactive state
      "text-foreground/60 hover:text-foreground hover:bg-background/40",
      // Active state
      "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md",
      "data-[state=active]:border data-[state=active]:border-border/30",
      "dark:data-[state=active]:bg-background/90 dark:data-[state=active]:border-white/10",
      "dark:data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 ring-offset-background animate-fade-in",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

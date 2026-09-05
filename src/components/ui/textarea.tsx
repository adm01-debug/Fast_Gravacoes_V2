import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background/80 backdrop-blur-sm px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary/60 focus-visible:bg-background dark:bg-muted/30 dark:border-white/10 dark:focus-visible:border-primary/50 dark:focus-visible:ring-primary/30 dark:focus-visible:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 shadow-sm hover:border-primary/30",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

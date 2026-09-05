import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'xp' | 'success' | 'warning' | 'destructive';
  animated?: boolean;
  showGlow?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = 'default', animated = false, showGlow = false, ...props }, ref) => {
  const variantStyles = {
    default: 'bg-primary',
    xp: 'xp-bar',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
  };

  const glowStyles = {
    default: 'shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
    xp: 'xp-bar-glow',
    success: 'shadow-[0_0_20px_hsl(142_70%_50%/0.5)]',
    warning: 'shadow-[0_0_20px_hsl(45_100%_55%/0.5)]',
    destructive: 'shadow-[0_0_20px_hsl(var(--destructive)/0.5)]',
  };

  const numericValue = typeof value === 'number' ? value : 0;
  // Fallback accessible label; caller-supplied aria-label/labelledby via ...props overrides it.
  const defaultAriaLabel = `Progresso: ${Math.round(numericValue)}%`;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      aria-label={defaultAriaLabel}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary dark:bg-muted",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out rounded-full",
          variantStyles[variant],
          animated && "progress-animated",
          showGlow && glowStyles[variant]
        )}
        style={{ transform: `translateX(-${100 - numericValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

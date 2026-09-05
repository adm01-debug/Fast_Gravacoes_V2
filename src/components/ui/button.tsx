import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { useRipple } from "./micro-interactions";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "shadow-sm hover:shadow-md",
          "dark:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]",
          "dark:hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)]",
        ],
        destructive: [
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          "shadow-sm hover:shadow-md",
          "dark:shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.4)]",
          "dark:hover:shadow-[0_0_30px_-5px_hsl(var(--destructive)/0.6)]",
        ],
        outline: [
          "border-2 border-border bg-transparent text-foreground",
          "hover:bg-muted hover:border-primary/50 hover:text-primary",
          "dark:border-border/50 dark:hover:border-primary/50",
          "dark:hover:bg-primary/10 dark:hover:text-primary",
          "dark:hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.3)]",
        ],
        secondary: [
          "bg-muted text-foreground border border-border",
          "hover:bg-muted/80 hover:border-border/80",
          "dark:border-white/5 dark:bg-secondary/50 dark:backdrop-blur-sm",
          "dark:hover:bg-secondary/80 dark:hover:border-white/10",
        ],
        ghost: [
          "text-foreground hover:bg-muted hover:text-foreground",
          "dark:hover:bg-white/5 dark:hover:text-foreground",
        ],
        link: "text-primary underline-offset-4 hover:underline font-semibold",
        gradient: [
          "gradient-primary text-white border-0",
          "shadow-md",
          "dark:shadow-[0_4px_20px_-5px_hsl(var(--primary)/0.4)]",
          "hover:shadow-lg",
          "dark:hover:shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.6)]",
        ],
        "gradient-subtle": [
          "gradient-primary-subtle text-primary border border-primary/20",
          "hover:border-primary/40 hover:shadow-sm",
        ],
        "gradient-intense": [
          "gradient-primary-intense text-white border-0",
          "shadow-lg",
          "dark:shadow-[0_6px_25px_-5px_hsl(var(--primary)/0.5)]",
          "hover:shadow-xl",
          "dark:hover:shadow-[0_10px_40px_-5px_hsl(var(--primary)/0.7)]",
        ],
        "gradient-secondary": [
          "gradient-secondary text-white border-0",
          "shadow-md hover:shadow-lg",
          "dark:shadow-[0_4px_20px_-5px_hsl(210_100%_60%/0.4)]",
          "dark:hover:shadow-[0_8px_30px_-5px_hsl(210_100%_60%/0.6)]",
        ],
        "gradient-success": [
          "gradient-success text-white border-0",
          "shadow-md hover:shadow-lg",
          "dark:shadow-[0_4px_20px_-5px_hsl(142_70%_50%/0.4)]",
          "dark:hover:shadow-[0_8px_30px_-5px_hsl(142_70%_50%/0.6)]",
        ],
        glow: [
          "bg-primary text-primary-foreground",
          "shadow-lg",
          "dark:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]",
          "dark:hover:shadow-[0_0_50px_-5px_hsl(var(--primary)/0.7)]",
          "dark:pulse-glow",
        ],
        glass: [
          "bg-foreground/5 text-foreground border border-border/50 backdrop-blur-xl",
          "hover:bg-foreground/10 hover:border-border",
          "dark:bg-white/10 dark:text-white dark:border-white/10",
          "dark:hover:bg-white/20 dark:hover:border-white/20",
          "dark:hover:shadow-[0_0_20px_-8px_hsl(0_0%_100%/0.2)]",
        ],
        success: [
          "bg-success text-success-foreground hover:bg-success/90",
          "shadow-sm hover:shadow-md",
          "dark:shadow-[0_0_20px_-5px_hsl(var(--success)/0.4)]",
          "dark:hover:shadow-[0_0_30px_-5px_hsl(var(--success)/0.6)]",
        ],
        warning: [
          "bg-warning text-warning-foreground hover:bg-warning/90",
          "shadow-sm hover:shadow-md",
          "dark:shadow-[0_0_20px_-5px_hsl(var(--warning)/0.4)]",
          "dark:hover:shadow-[0_0_30px_-5px_hsl(var(--warning)/0.6)]",
        ],
        subtle: [
          "bg-muted/50 text-muted-foreground border border-transparent",
          "hover:text-foreground hover:bg-muted hover:border-border/50",
          "dark:bg-white/5 dark:text-muted-foreground dark:border-white/10",
          "dark:hover:bg-white/10 dark:hover:text-foreground dark:hover:border-white/20",
        ],
        premium: [
          "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-semibold",
          "border border-amber-400/50",
          "shadow-[0_4px_20px_-5px_hsl(45_100%_50%/0.4)]",
          "hover:shadow-[0_8px_30px_-5px_hsl(45_100%_50%/0.6)]",
          "dark:border-amber-300/30",
          "dark:shadow-[0_4px_25px_-5px_hsl(45_100%_50%/0.5)]",
          "dark:hover:shadow-[0_8px_40px_-5px_hsl(45_100%_50%/0.7)]",
        ],
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-xs": "h-6 w-6 rounded-md [&_svg]:size-3",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
        "icon-lg": "h-12 w-12 rounded-lg [&_svg]:size-5",
      },
      shimmer: {
        true: "relative overflow-hidden",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shimmer: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  shimmer?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shimmer, asChild = false, children, ...props }, ref) => {
    const { triggerRipple, RippleContainer } = useRipple({
      color: variant === 'default' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'
    });

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerRipple(e);
      props.onMouseDown?.(e);
    };

    // When asChild, Slot must receive exactly ONE React element child.
    // Skip ripple + shimmer so the consumer controls the DOM.
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, shimmer, className }), "relative overflow-hidden")}
        ref={ref}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
        <RippleContainer />
        {shimmer && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer-btn_2s_infinite] z-0"
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

// ===== MOTION BUTTON WITH MICRO-INTERACTIONS =====
interface MotionButtonProps {
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  shimmer?: boolean;
  haptic?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, shimmer, haptic = true, children, onClick, disabled, type = "button" }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback on supported devices
      if (haptic && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(buttonVariants({ variant, size, shimmer, className }))}
        onClick={handleClick}
        whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17,
        }}
      >
        {children}
        {shimmer && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer-btn_2s_infinite]"
            aria-hidden="true"
          />
        )}
      </motion.button>
    );
  },
);
MotionButton.displayName = "MotionButton";

// ===== ICON BUTTON WITH BOUNCE =====
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ReactNode;
  label: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, size = "icon", variant = "ghost", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn("transition-transform hover:scale-110 active:scale-90", className)}
        variant={variant}
        size={size}
        aria-label={label}
        {...props}
      >
        {icon}
      </Button>
    );
  },
);
IconButton.displayName = "IconButton";

// ===== PULSE BUTTON (for CTAs) =====
interface PulseButtonProps extends ButtonProps {
  pulseColor?: string;
}

const PulseButton = React.forwardRef<HTMLButtonElement, PulseButtonProps>(
  ({ className, variant = "gradient", children, pulseColor, ...props }, ref) => {
    return (
      <div className="relative inline-flex">
        <motion.div
          className={cn(
            "absolute inset-0 rounded-lg",
            pulseColor || "bg-primary"
          )}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <Button
          ref={ref}
          variant={variant}
          className={cn("relative z-10", className)}
          {...props}
        >
          {children}
        </Button>
      </div>
    );
  },
);
PulseButton.displayName = "PulseButton";

// ===== LOADING BUTTON =====
interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn("relative", className)}
        {...props}
      >
        <motion.span
          animate={{ opacity: isLoading ? 0 : 1 }}
          className="flex items-center gap-2"
        >
          {children}
        </motion.span>
        {isLoading && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center gap-2"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            />
            {loadingText && <span>{loadingText}</span>}
          </motion.span>
        )}
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";

export { Button, buttonVariants, MotionButton, IconButton, PulseButton, LoadingButton };

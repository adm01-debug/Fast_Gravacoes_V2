/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { memo, useCallback, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============= Ripple Effect =============
interface RippleProps {
  color?: string;
  duration?: number;
}

export function useRipple({ color = 'currentColor', duration = 600 }: RippleProps = {}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const prefersReducedMotion = useReducedMotion();

  const triggerRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, duration);
  }, [duration, prefersReducedMotion]);

  const RippleContainer = memo(function RippleContainer() {
    return (
      <span className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration / 1000, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 50,
                height: 50,
                marginLeft: -25,
                marginTop: -25,
                backgroundColor: color,
              }}
            />
          ))}
        </AnimatePresence>
      </span>
    );
  });

  return { triggerRipple, RippleContainer };
}

// ============= Press/Tap Animation =============
interface PressableProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  scale?: number;
}

export const Pressable = memo(function Pressable({
  children,
  onPress,
  disabled,
  className,
  scale = 0.97,
}: PressableProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileTap={prefersReducedMotion ? {} : { scale }}
      transition={{ duration: 0.1 }}
      onClick={disabled ? undefined : onPress}
      className={cn('cursor-pointer select-none', disabled && 'cursor-not-allowed opacity-50', className)}
    >
      {children}
    </motion.div>
  );
});

// ============= Hover Lift Effect =============
interface HoverLiftProps {
  children: ReactNode;
  className?: string;
  lift?: number;
  shadow?: boolean;
}

export const HoverLift = memo(function HoverLift({
  children,
  className,
  lift = 4,
  shadow = true,
}: HoverLiftProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -lift,
              transition: { duration: 0.2 },
            }
      }
      className={cn(
        'transition-shadow duration-200',
        shadow && 'hover:shadow-lg',
        className
      )}
    >
      {children}
    </motion.div>
  );
});

// ============= Staggered List Animation =============
interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList = memo(function StaggeredList({
  children,
  staggerDelay = 0.05,
  className,
}: StaggeredListProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: prefersReducedMotion ? 0 : index * staggerDelay,
            duration: 0.3,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
});

// ============= Pulse Animation =============
interface PulseProps {
  children: ReactNode;
  isActive?: boolean;
  color?: string;
  className?: string;
}

export const Pulse = memo(function Pulse({
  children,
  isActive = true,
  color = 'hsl(var(--primary))',
  className,
}: PulseProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!isActive || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative', className)}>
      <motion.div
        className="absolute inset-0 rounded-full opacity-30"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {children}
    </div>
  );
});

// ============= Shake Animation (for errors) =============
interface ShakeProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

export const Shake = memo(function Shake({
  children,
  trigger = false,
  className,
}: ShakeProps) {
  const [isShaking, setIsShaking] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [trigger, prefersReducedMotion]);

  return (
    <motion.div
      animate={
        isShaking
          ? {
              x: [0, -10, 10, -10, 10, -5, 5, 0],
            }
          : {}
      }
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// ============= Bounce Animation =============
interface BounceProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

export const Bounce = memo(function Bounce({
  children,
  trigger = false,
  className,
}: BounceProps) {
  const [isBouncing, setIsBouncing] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger, prefersReducedMotion]);

  return (
    <motion.div
      animate={
        isBouncing
          ? {
              y: [0, -15, 0, -8, 0, -3, 0],
            }
          : {}
      }
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// ============= Fade Slide Transition =============
interface FadeSlideProps {
  children: ReactNode;
  isVisible: boolean;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export const FadeSlide = memo(function FadeSlide({
  children,
  isVisible,
  direction = 'up',
  className,
}: FadeSlideProps) {
  const prefersReducedMotion = useReducedMotion();

  const directionMap = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, ...directionMap[direction] }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, ...directionMap[direction] }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============= Scale Pop Animation =============
interface ScalePopProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

export const ScalePop = memo(function ScalePop({
  children,
  trigger = false,
  className,
}: ScalePopProps) {
  const [isPopping, setIsPopping] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setIsPopping(true);
      const timer = setTimeout(() => setIsPopping(false), 300);
      return () => clearTimeout(timer);
    }
  }, [trigger, prefersReducedMotion]);

  return (
    <motion.div
      animate={
        isPopping
          ? {
              scale: [1, 1.15, 1],
            }
          : {}
      }
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

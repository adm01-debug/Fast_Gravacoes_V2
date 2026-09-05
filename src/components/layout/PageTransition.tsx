import { motion } from 'framer-motion';
import { useMemo, type ReactNode } from 'react';
import {
  buildPreset,
  type NavDirection,
  type TransitionEase,
  type TransitionPreset,
} from '@/lib/transitions';
import { useTransitionConfig } from '@/contexts/TransitionConfigContext';

interface PageTransitionProps {
  children: ReactNode;
  /** Override the global preset for this route. */
  preset?: TransitionPreset;
  /** Override duration in ms. */
  duration?: number;
  /** Override easing. */
  ease?: TransitionEase;
  /** Navigation direction (computed by the router). */
  direction?: NavDirection;
  /** Override slide/parallax distance in px. */
  distance?: number;
}

export function PageTransition({
  children,
  preset,
  duration,
  ease,
  direction = 'forward',
  distance,
}: PageTransitionProps) {
  const { effectiveConfig } = useTransitionConfig();

  const { variants, transition } = useMemo(() => {
    const resolvedPreset = preset ?? effectiveConfig.preset;
    return buildPreset(resolvedPreset, {
      duration: duration ?? effectiveConfig.duration,
      ease: ease ?? effectiveConfig.ease,
      distance: distance ?? effectiveConfig.distance,
      direction,
    });
  }, [preset, duration, ease, distance, direction, effectiveConfig]);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={variants}
      transition={transition}
      className="h-full w-full will-change-transform"
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}

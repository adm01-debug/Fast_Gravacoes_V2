import type { Variants, Transition, Easing } from 'framer-motion';

export type TransitionPreset =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'flip'
  | 'parallax'
  | 'blur-slide'
  | 'none';

export type TransitionEase =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring';

export type NavDirection = 'forward' | 'backward' | 'up' | 'down';

export interface TransitionConfig {
  preset: TransitionPreset;
  duration: number; // ms
  ease: TransitionEase;
  distance: number; // px (slide / parallax)
  enabled: boolean;
}

export interface BuiltTransition {
  variants: Variants;
  transition: Transition;
}

export interface BuildOptions {
  duration: number; // ms
  ease: TransitionEase;
  distance: number;
  direction: NavDirection;
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  preset: 'blur-slide',
  duration: 350,
  ease: 'easeOut',
  distance: 30,
  enabled: true,
};

export const PRESET_LABELS: Record<TransitionPreset, string> = {
  fade: 'Fade (suave)',
  slide: 'Slide (deslizar)',
  zoom: 'Zoom (escala)',
  flip: 'Flip (girar)',
  parallax: 'Parallax (profundidade)',
  'blur-slide': 'Blur + Slide (padrão)',
  none: 'Nenhuma (instantâneo)',
};

export const EASE_LABELS: Record<TransitionEase, string> = {
  linear: 'Linear',
  easeIn: 'Ease In',
  easeOut: 'Ease Out',
  easeInOut: 'Ease In/Out',
  spring: 'Spring (mola)',
};

function buildTransition(duration: number, ease: TransitionEase): Transition {
  if (ease === 'spring') {
    return { type: 'spring', stiffness: 300, damping: 30, mass: 1 };
  }
  return { duration: duration / 1000, ease: ease as Easing };
}

function fade({ duration, ease }: BuildOptions): BuiltTransition {
  return {
    variants: {
      initial: { opacity: 0 },
      in: { opacity: 1 },
      out: { opacity: 0 },
    },
    transition: buildTransition(duration, ease),
  };
}

function slide({ duration, ease, distance, direction }: BuildOptions): BuiltTransition {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const sign = direction === 'forward' || direction === 'down' ? 1 : -1;
  return {
    variants: {
      initial: { opacity: 0, [axis]: distance * sign },
      in: { opacity: 1, [axis]: 0 },
      out: { opacity: 0, [axis]: -distance * sign },
    },
    transition: buildTransition(duration, ease),
  };
}

function zoom({ duration, ease, direction }: BuildOptions): BuiltTransition {
  const inward = direction === 'backward';
  return {
    variants: {
      initial: { opacity: 0, scale: inward ? 1.05 : 0.95 },
      in: { opacity: 1, scale: 1 },
      out: { opacity: 0, scale: inward ? 0.95 : 1.05 },
    },
    transition: buildTransition(duration, ease),
  };
}

function flip({ duration, ease, direction }: BuildOptions): BuiltTransition {
  const vertical = direction === 'up' || direction === 'down';
  const axis = vertical ? 'rotateX' : 'rotateY';
  const sign = direction === 'forward' || direction === 'down' ? 1 : -1;
  return {
    variants: {
      initial: { opacity: 0, [axis]: 25 * sign },
      in: { opacity: 1, [axis]: 0 },
      out: { opacity: 0, [axis]: -25 * sign },
    },
    transition: buildTransition(duration, ease),
  };
}

function parallax({ duration, ease, distance, direction }: BuildOptions): BuiltTransition {
  const sign = direction === 'forward' ? 1 : -1;
  return {
    variants: {
      initial: { opacity: 0, x: distance * 2 * sign, scale: 0.98 },
      in: { opacity: 1, x: 0, scale: 1 },
      out: { opacity: 0, x: -distance * sign, scale: 1.02 },
    },
    transition: buildTransition(duration, ease),
  };
}

function blurSlide({ duration, ease, distance, direction }: BuildOptions): BuiltTransition {
  const sign = direction === 'forward' ? 1 : -1;
  return {
    variants: {
      initial: { opacity: 0, x: distance * sign, filter: 'blur(8px)' },
      in: { opacity: 1, x: 0, filter: 'blur(0px)' },
      out: { opacity: 0, x: -distance * sign, filter: 'blur(8px)' },
    },
    transition: buildTransition(duration, ease),
  };
}

function none(): BuiltTransition {
  return {
    variants: {
      initial: { opacity: 1 },
      in: { opacity: 1 },
      out: { opacity: 1 },
    },
    transition: { duration: 0 },
  };
}

const BUILDERS: Record<TransitionPreset, (opts: BuildOptions) => BuiltTransition> = {
  fade,
  slide,
  zoom,
  flip,
  parallax,
  'blur-slide': blurSlide,
  none,
};

export function buildPreset(
  preset: TransitionPreset,
  opts: BuildOptions,
): BuiltTransition {
  return BUILDERS[preset](opts);
}

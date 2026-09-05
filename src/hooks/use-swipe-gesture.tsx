import * as React from "react";

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (direction: SwipeDirection, distance: number) => void;
  threshold?: number; // Minimum distance to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
  preventScroll?: boolean;
  disabled?: boolean;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeState {
  swiping: boolean;
  direction: SwipeDirection | null;
  distance: number;
  velocity: number;
}

export function useSwipeGesture<T extends HTMLElement = HTMLElement>(
  options: SwipeGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    disabled = false,
  } = options;

  const ref = React.useRef<T>(null);
  const [state, setState] = React.useState<SwipeState>({
    swiping: false,
    direction: null,
    distance: 0,
    velocity: 0,
  });

  const touchStart = React.useRef<{ x: number; y: number; time: number } | null>(null);
  // Live mirror of the swipe state so touchend reads the latest values without
  // forcing `state` into the effect deps (which re-binds listeners every move).
  const swipeRef = React.useRef<SwipeState>({
    swiping: false,
    direction: null,
    distance: 0,
    velocity: 0,
  });

  React.useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      const next: SwipeState = {
        swiping: true,
        direction: null,
        distance: 0,
        velocity: 0,
      };
      swipeRef.current = next;
      setState(next);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine swipe direction based on dominant axis
      let direction: SwipeDirection | null = null;
      let distance = 0;

      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
        distance = absX;
        if (preventScroll && absX > 10) {
          e.preventDefault();
        }
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
        distance = absY;
      }

      const elapsed = Date.now() - touchStart.current.time;
      const velocity = distance / Math.max(elapsed, 1);

      const next: SwipeState = {
        swiping: true,
        direction,
        distance,
        velocity,
      };
      swipeRef.current = next;
      setState(next);
    };

    const handleTouchEnd = () => {
      if (!touchStart.current) return;

      const { direction, distance, velocity } = swipeRef.current;

      // Check if swipe meets thresholds
      if (direction && (distance >= threshold || velocity >= velocityThreshold)) {
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
        onSwipe?.(direction, distance);
      }

      touchStart.current = null;
      const reset: SwipeState = { swiping: false, direction: null, distance: 0, velocity: 0 };
      swipeRef.current = reset;
      setState(reset);
    };

    const handleTouchCancel = () => {
      touchStart.current = null;
      const reset: SwipeState = { swiping: false, direction: null, distance: 0, velocity: 0 };
      swipeRef.current = reset;
      setState(reset);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [disabled, onSwipe, onSwipeDown, onSwipeLeft, onSwipeRight, onSwipeUp, preventScroll, threshold, velocityThreshold]);

  return { ref, ...state };
}

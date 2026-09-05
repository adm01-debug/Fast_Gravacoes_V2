/* eslint-disable react-hooks/use-memo -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useRef, useEffect, useCallback } from 'react';
/**
 * Returns a throttled version of the callback that executes at most once per `delay` ms.
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending trailing-edge timer on unmount so the callback does not
  // fire against an unmounted component.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      const remaining = delay - (now - lastCall.current);

      if (remaining <= 0) {
        lastCall.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, remaining);
      }
    }) as T,
    [callback, delay]
  );
}

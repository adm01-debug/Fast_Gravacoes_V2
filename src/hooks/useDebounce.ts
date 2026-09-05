/* eslint-disable react-hooks/use-memo -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
/**
 * useDebounce - Delays updating a value until after a specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // This will only run after 300ms of no changes
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Returns a debounced version of a callback
 *
 * @param callback - The callback function to debounce
 * @param delay - Delay in milliseconds
 * @param deps - Dependencies array (like useCallback)
 * @returns Object with debounced callback, cancel, and flush functions
 *
 * @example
 * const { debouncedCallback, cancel, flush } = useDebouncedCallback(
 *   (value) => saveToServer(value),
 *   500,
 *   [saveToServer]
 * );
 *
 * // Use debouncedCallback in onChange handlers
 * <input onChange={(e) => debouncedCallback(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): {
  debouncedCallback: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
  isPending: boolean;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      lastArgsRef.current = null;
      setIsPending(false);
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current && lastArgsRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
      setIsPending(false);
    }
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setIsPending(true);

      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timerRef.current = null;
        lastArgsRef.current = null;
        setIsPending(false);
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { debouncedCallback, cancel, flush, isPending };
}

// Note: useThrottle hooks are exported from src/hooks/useThrottle.ts
// Use the canonical import: import { useThrottle, useThrottleCallback } from '@/hooks/useThrottle';

/**
 * useDebouncedState - State that debounces updates
 *
 * @param initialValue - Initial state value
 * @param delay - Delay in milliseconds
 * @returns [debouncedValue, setValue, immediateValue]
 *
 * @example
 * const [debouncedSearch, setSearch, immediateSearch] = useDebouncedState('', 300);
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number
): [T, (value: T) => void, T] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [debouncedValue, setValue, value];
}

/**
 * useDebounceWithLoading - Debounce with loading state indicator
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Object with debounced value and loading state
 *
 * @example
 * const { debouncedValue, isDebouncing } = useDebounceWithLoading(search, 300);
 *
 * return (
 *   <>
 *     <input value={search} onChange={(e) => setSearch(e.target.value)} />
 *     {isDebouncing && <Spinner />}
 *   </>
 * );
 */
export function useDebounceWithLoading<T>(
  value: T,
  delay: number
): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsDebouncing(true);

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}

/**
 * useSearchDebounce - Specialized debounce for search inputs
 * Includes minimum character requirement and loading state
 *
 * @param value - The search value
 * @param options - Configuration options
 * @returns Object with debounced value, loading state, and validation
 *
 * @example
 * const { debouncedValue, isSearching, isValid } = useSearchDebounce(search, {
 *   delay: 300,
 *   minLength: 3,
 * });
 */
export function useSearchDebounce(
  value: string,
  options: {
    delay?: number;
    minLength?: number;
    trimValue?: boolean;
  } = {}
): {
  debouncedValue: string;
  isSearching: boolean;
  isValid: boolean;
  isEmpty: boolean;
} {
  const { delay = 300, minLength = 0, trimValue = true } = options;

  const processedValue = useMemo(
    () => (trimValue ? value.trim() : value),
    [value, trimValue]
  );

  const { debouncedValue, isDebouncing } = useDebounceWithLoading(
    processedValue,
    delay
  );

  const isValid = processedValue.length >= minLength;
  const isEmpty = processedValue.length === 0;
  const isSearching = isDebouncing && isValid && !isEmpty;

  return {
    debouncedValue: isValid ? debouncedValue : '',
    isSearching,
    isValid,
    isEmpty,
  };
}

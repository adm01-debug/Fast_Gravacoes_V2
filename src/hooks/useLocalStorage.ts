import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Persists state in localStorage with automatic JSON serialization and error handling.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (e) {
      logger.error(`Failed to load value for key "${key}" from localStorage`, e, 'useLocalStorage');
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (e) {
          logger.error(`Failed to set value for key "${key}" to localStorage`, e, 'useLocalStorage');
        }
        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (e) {
      logger.error(`Failed to remove key "${key}" from localStorage`, e, 'useLocalStorage');
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

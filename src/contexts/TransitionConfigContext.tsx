import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_TRANSITION_CONFIG,
  type TransitionConfig,
} from '@/lib/transitions';

interface TransitionConfigContextValue {
  config: TransitionConfig;
  effectiveConfig: TransitionConfig; // honors prefers-reduced-motion
  reducedMotion: boolean;
  setConfig: (next: Partial<TransitionConfig>) => void;
  reset: () => void;
}

const TransitionConfigContext = createContext<TransitionConfigContextValue | null>(null);

const STORAGE_KEY = 'app:transition-config:v1';

export function TransitionConfigProvider({ children }: { children: ReactNode }) {
  const [stored, setStored, clear] = useLocalStorage<TransitionConfig>(
    STORAGE_KEY,
    DEFAULT_TRANSITION_CONFIG,
  );

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const value = useMemo<TransitionConfigContextValue>(() => {
    const effective: TransitionConfig =
      reducedMotion || !stored.enabled
        ? { ...stored, preset: 'none', duration: 0 }
        : stored;
    return {
      config: stored,
      effectiveConfig: effective,
      reducedMotion,
      setConfig: (next) => setStored((prev) => ({ ...prev, ...next })),
      reset: () => clear(),
    };
  }, [stored, reducedMotion, setStored, clear]);

  return (
    <TransitionConfigContext.Provider value={value}>
      {children}
    </TransitionConfigContext.Provider>
  );
}

export function useTransitionConfig(): TransitionConfigContextValue {
  const ctx = useContext(TransitionConfigContext);
  if (!ctx) {
    // Safe fallback: never throw if used outside provider (defensive)
    return {
      config: DEFAULT_TRANSITION_CONFIG,
      effectiveConfig: DEFAULT_TRANSITION_CONFIG,
      reducedMotion: false,
      setConfig: () => {},
      reset: () => {},
    };
  }
  return ctx;
}

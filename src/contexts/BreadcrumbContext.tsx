import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextType {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  push: (item: BreadcrumbItem) => void;
  pop: () => void;
  clear: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  const push = useCallback((item: BreadcrumbItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const pop = useCallback(() => {
    setItems((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, setItems, push, pop, clear }),
    [items, push, pop, clear],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  return ctx;
}

/**
 * Substitui o último item do breadcrumb pelo nome do recurso da página
 * (ex.: "Job OS-2024-001"). Limpa ao desmontar/navegar.
 */
export function useBreadcrumbLabel(label: string | null | undefined) {
  const { setItems } = useBreadcrumbContext();
  useEffect(() => {
    if (label) setItems([{ label }]);
    return () => setItems([]);
  }, [label, setItems]);
}

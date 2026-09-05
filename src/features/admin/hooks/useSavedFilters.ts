/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useCallback, useEffect } from 'react';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string | string[]>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAt: string;
  isDefault: boolean;
}

const STORAGE_KEY_PREFIX = 'saved-filters-';

export function useSavedFilters(context: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${context}`;
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Persist to localStorage on change
  const persist = useCallback(
    (filters: SavedFilter[]) => {
      try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* quota exceeded */ }
      setSavedFilters(filters);
    },
    [storageKey]
  );

  const saveFilter = useCallback(
    (name: string, filters: Record<string, string | string[]>, options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
      const newFilter: SavedFilter = {
        id: crypto.randomUUID(),
        name,
        filters,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
        createdAt: new Date().toISOString(),
        isDefault: false,
      };
      persist([...savedFilters, newFilter]);
      return newFilter;
    },
    [savedFilters, persist]
  );

  const deleteFilter = useCallback(
    (id: string) => {
      persist(savedFilters.filter(f => f.id !== id));
      if (activeFilterId === id) setActiveFilterId(null);
    },
    [savedFilters, activeFilterId, persist]
  );

  const setAsDefault = useCallback(
    (id: string) => {
      const updated = savedFilters.map(f => ({
        ...f,
        isDefault: f.id === id,
      }));
      persist(updated);
    },
    [savedFilters, persist]
  );

  const applyFilter = useCallback(
    (id: string) => {
      const filter = savedFilters.find(f => f.id === id);
      if (filter) {
        setActiveFilterId(id);
        return filter;
      }
      return null;
    },
    [savedFilters]
  );

  const clearActiveFilter = useCallback(() => {
    setActiveFilterId(null);
  }, []);

  const getDefaultFilter = useCallback(() => {
    return savedFilters.find(f => f.isDefault) ?? null;
  }, [savedFilters]);

  const renameFilter = useCallback(
    (id: string, newName: string) => {
      const updated = savedFilters.map(f =>
        f.id === id ? { ...f, name: newName } : f
      );
      persist(updated);
    },
    [savedFilters, persist]
  );

  return {
    savedFilters,
    activeFilterId,
    activeFilter: savedFilters.find(f => f.id === activeFilterId) ?? null,
    saveFilter,
    deleteFilter,
    setAsDefault,
    applyFilter,
    clearActiveFilter,
    getDefaultFilter,
    renameFilter,
  };
}

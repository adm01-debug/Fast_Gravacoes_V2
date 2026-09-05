import { useState, useCallback } from 'react';

export interface VersionEntry<T = Record<string, unknown>> {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete';
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  snapshot: T;
}

const STORAGE_PREFIX = 'version-history-';
const MAX_VERSIONS = 50;

export function useVersionHistory<T extends Record<string, unknown>>(entityType: string) {
  const [versions, setVersions] = useState<VersionEntry<T>[]>([]);

  const loadVersions = useCallback(
    (entityId: string) => {
      try {
        const key = `${STORAGE_PREFIX}${entityType}-${entityId}`;
        const stored = localStorage.getItem(key);
        const parsed = stored ? (JSON.parse(stored) as VersionEntry<T>[]) : [];
        setVersions(parsed);
        return parsed;
      } catch {
        setVersions([]);
        return [];
      }
    },
    [entityType]
  );

  const recordVersion = useCallback(
    (
      entityId: string,
      action: 'create' | 'update' | 'delete',
      snapshot: T,
      userId: string,
      userName: string,
      previousSnapshot?: T
    ) => {
      const changes: VersionEntry<T>['changes'] = [];

      if (previousSnapshot && action === 'update') {
        Object.keys(snapshot).forEach(field => {
          const oldVal = previousSnapshot[field];
          const newVal = snapshot[field];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field, oldValue: oldVal, newValue: newVal });
          }
        });
      }

      const entry: VersionEntry<T> = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action,
        changes,
        snapshot,
      };

      const key = `${STORAGE_PREFIX}${entityType}-${entityId}`;
      try {
        const stored = localStorage.getItem(key);
        const existing = stored ? (JSON.parse(stored) as VersionEntry<T>[]) : [];
        const updated = [entry, ...existing].slice(0, MAX_VERSIONS);
        localStorage.setItem(key, JSON.stringify(updated));
        setVersions(updated);
      } catch {
        // Storage full - clear old entries
      }

      return entry;
    },
    [entityType]
  );

  const compareVersions = useCallback(
    (versionA: VersionEntry<T>, versionB: VersionEntry<T>) => {
      const allKeys = new Set([
        ...Object.keys(versionA.snapshot),
        ...Object.keys(versionB.snapshot),
      ]);

      const diffs: Array<{ field: string; valueA: unknown; valueB: unknown }> = [];
      allKeys.forEach(field => {
        const a = versionA.snapshot[field];
        const b = versionB.snapshot[field];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          diffs.push({ field, valueA: a, valueB: b });
        }
      });

      return diffs;
    },
    []
  );

  const restoreVersion = useCallback(
    (version: VersionEntry<T>) => {
      return { ...version.snapshot };
    },
    []
  );

  return {
    versions,
    loadVersions,
    recordVersion,
    compareVersions,
    restoreVersion,
  };
}

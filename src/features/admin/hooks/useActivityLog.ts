import * as React from "react";

export type ActivityType =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "login"
  | "logout"
  | "settings"
  | "error"
  | "success"
  | "warning";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  metadata?: Record<string, unknown>;
  changes?: {
    field: string;
    from?: string;
    to?: string;
  }[];
}

// Hook for managing activity log
export function useActivityLog(maxEntries = 100) {
  const [entries, setEntries] = React.useState<ActivityLogEntry[]>([]);

  const addEntry = React.useCallback(
    (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => {
      const newEntry: ActivityLogEntry = {
        ...entry,
        id: `activity-${Date.now()}`,
        timestamp: new Date(),
      };

      setEntries((prev) => [newEntry, ...prev].slice(0, maxEntries));
      return newEntry.id;
    },
    [maxEntries]
  );

  const clearEntries = React.useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    addEntry,
    clearEntries,
  };
}

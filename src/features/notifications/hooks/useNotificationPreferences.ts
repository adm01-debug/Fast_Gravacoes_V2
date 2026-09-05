/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useCallback, useEffect } from 'react';

export interface NotificationChannel {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationCategory {
  id: string;
  label: string;
  enabled: boolean;
  channels: NotificationChannel;
}

export interface DNDSchedule {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  days: number[]; // 0=Sun, 6=Sat
}

export interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  hour: number;
  day?: number; // 0=Sun for weekly
}

export interface NotificationPreferences {
  categories: NotificationCategory[];
  dnd: DNDSchedule;
  digest: DigestSettings;
  groupSimilar: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  { id: 'job_status', label: 'Mudanças de Status de Job', enabled: true, channels: { email: false, push: true, inApp: true } },
  { id: 'alerts', label: 'Alertas Críticos', enabled: true, channels: { email: true, push: true, inApp: true } },
  { id: 'maintenance', label: 'Manutenção Preventiva', enabled: true, channels: { email: true, push: true, inApp: true } },
  { id: 'buffer', label: 'Status do Buffer', enabled: true, channels: { email: false, push: true, inApp: true } },
  { id: 'operator', label: 'Notificações de Operador', enabled: true, channels: { email: false, push: false, inApp: true } },
  { id: 'system', label: 'Atualizações do Sistema', enabled: true, channels: { email: false, push: false, inApp: true } },
];

const DEFAULT_DND: DNDSchedule = {
  enabled: false,
  startHour: 22,
  startMinute: 0,
  endHour: 7,
  endMinute: 0,
  days: [0, 1, 2, 3, 4, 5, 6],
};

const DEFAULT_DIGEST: DigestSettings = {
  enabled: false,
  frequency: 'daily',
  hour: 8,
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  categories: DEFAULT_CATEGORIES,
  dnd: DEFAULT_DND,
  digest: DEFAULT_DIGEST,
  groupSimilar: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

const STORAGE_KEY = 'notification-preferences';

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch {
      // Use defaults
    }
  }, []);

  const persist = useCallback((prefs: NotificationPreferences) => {
    setPreferences(prefs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* quota exceeded or private browsing */ }
  }, []);

  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<NotificationCategory>) => {
      persist({
        ...preferences,
        categories: preferences.categories.map(c =>
          c.id === categoryId ? { ...c, ...updates } : c
        ),
      });
    },
    [preferences, persist]
  );

  const updateCategoryChannel = useCallback(
    (categoryId: string, channel: keyof NotificationChannel, enabled: boolean) => {
      persist({
        ...preferences,
        categories: preferences.categories.map(c =>
          c.id === categoryId
            ? { ...c, channels: { ...c.channels, [channel]: enabled } }
            : c
        ),
      });
    },
    [preferences, persist]
  );

  const updateDND = useCallback(
    (updates: Partial<DNDSchedule>) => {
      persist({ ...preferences, dnd: { ...preferences.dnd, ...updates } });
    },
    [preferences, persist]
  );

  const updateDigest = useCallback(
    (updates: Partial<DigestSettings>) => {
      persist({ ...preferences, digest: { ...preferences.digest, ...updates } });
    },
    [preferences, persist]
  );

  const toggleGroupSimilar = useCallback(() => {
    persist({ ...preferences, groupSimilar: !preferences.groupSimilar });
  }, [preferences, persist]);

  const toggleSound = useCallback(() => {
    persist({ ...preferences, soundEnabled: !preferences.soundEnabled });
  }, [preferences, persist]);

  const toggleVibration = useCallback(() => {
    persist({ ...preferences, vibrationEnabled: !preferences.vibrationEnabled });
  }, [preferences, persist]);

  const isDNDActive = useCallback(() => {
    if (!preferences.dnd.enabled) return false;
    const now = new Date();
    const currentDay = now.getDay();
    if (!preferences.dnd.days.includes(currentDay)) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = preferences.dnd.startHour * 60 + preferences.dnd.startMinute;
    const endMinutes = preferences.dnd.endHour * 60 + preferences.dnd.endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    // Overnight DND (e.g., 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }, [preferences.dnd]);

  const shouldNotify = useCallback(
    (categoryId: string, channel: keyof NotificationChannel) => {
      if (isDNDActive()) return false;
      const category = preferences.categories.find(c => c.id === categoryId);
      if (!category || !category.enabled) return false;
      return category.channels[channel];
    },
    [preferences.categories, isDNDActive]
  );

  const resetToDefaults = useCallback(() => {
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  return {
    preferences,
    updateCategory,
    updateCategoryChannel,
    updateDND,
    updateDigest,
    toggleGroupSimilar,
    toggleSound,
    toggleVibration,
    isDNDActive,
    shouldNotify,
    resetToDefaults,
  };
}

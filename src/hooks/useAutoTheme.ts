import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AutoThemeConfig {
  enabled: boolean;
  darkStartHour: number; // e.g., 18 (6 PM)
  darkEndHour: number;   // e.g., 6 (6 AM)
}

const AUTO_THEME_KEY = 'auto-theme-config';

const defaultConfig: AutoThemeConfig = {
  enabled: false,
  darkStartHour: 18,
  darkEndHour: 6,
};

export function useAutoTheme() {
  const { setTheme, theme } = useTheme();
  const [config, setConfigState] = useState<AutoThemeConfig>(() => {
    try {
      const stored = localStorage.getItem(AUTO_THEME_KEY);
      return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  // Apply auto theme based on time
  useEffect(() => {
    if (!config.enabled) return;

    const checkAndApplyTheme = () => {
      const hour = new Date().getHours();
      const shouldBeDark =
        hour >= config.darkStartHour || hour < config.darkEndHour;

      const targetTheme = shouldBeDark ? 'dark' : 'light';
      if (theme !== targetTheme) {
        setTheme(targetTheme);
      }
    };

    // Check immediately
    checkAndApplyTheme();

    // Check every minute
    const interval = setInterval(checkAndApplyTheme, 60000);
    return () => clearInterval(interval);
  }, [config, setTheme, theme]);

  const setConfig = (newConfig: Partial<AutoThemeConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    try { localStorage.setItem(AUTO_THEME_KEY, JSON.stringify(updated)); } catch { /* quota exceeded or private browsing */ }
  };

  const toggleAutoTheme = () => {
    setConfig({ enabled: !config.enabled });
  };

  return {
    config,
    setConfig,
    toggleAutoTheme,
    isAutoThemeEnabled: config.enabled,
  };
}

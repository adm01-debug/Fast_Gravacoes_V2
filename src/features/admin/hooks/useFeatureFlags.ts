import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rules: Record<string, unknown> | null;
}

/**
 * Hook to manage and access runtime Feature Flags.
 * Contributes to Observability and Operationality 10/10.
 */
export function useFeatureFlags() {
  const { data: flags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');
      
      if (error) throw error;
      
      const flagMap = new Map<string, boolean>();
      data?.forEach(flag => flagMap.set(flag.name, !!flag.is_enabled));
      return { raw: data as FeatureFlag[], map: flagMap };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isEnabled = useCallback((flagName: string, defaultValue = false) => {
    if (!flags) return defaultValue;
    return flags.map.get(flagName) ?? defaultValue;
  }, [flags]);

  return {
    flags: flags?.raw || [],
    isLoading,
    isEnabled
  };
}

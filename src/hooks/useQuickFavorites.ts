/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { showErrorToast, createAppError } from '@/lib/errorHandling';

const FAVORITES_ERROR_CONTEXT = {
  fetch: { entity: 'user_favorites', operation: 'fetch' },
  save: { entity: 'user_favorites', operation: 'save' },
};

export interface QuickFavorite {
  id: string;
  label: string;
  href: string;
  icon: string;
}

const DEFAULT_FAVORITES: QuickFavorite[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'Home' },
  { id: 'alerts', label: 'Alertas', href: '/alerts', icon: 'AlertTriangle' },
];

const AVAILABLE_SHORTCUTS: QuickFavorite[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'Home' },
  { id: 'daily-calendar', label: 'Calendário Diário', href: '/calendar/daily', icon: 'Calendar' },
  { id: 'weekly-calendar', label: 'Calendário Semanal', href: '/calendar/weekly', icon: 'CalendarDays' },
  { id: 'kanban', label: 'Kanban', href: '/kanban', icon: 'LayoutGrid' },
  { id: 'pending', label: 'Pendências', href: '/pending', icon: 'List' },
  { id: 'efficiency', label: 'Eficiência', href: '/efficiency', icon: 'Zap' },
  { id: 'kpis', label: 'KPIs', href: '/kpis', icon: 'BarChart3' },
  { id: 'alerts', label: 'Alertas', href: '/alerts', icon: 'AlertTriangle' },
  { id: 'knowledge', label: 'Base de Conhecimento', href: '/knowledge', icon: 'BookOpen' },
  { id: 'operator', label: 'Visão Operador', href: '/operator', icon: 'UserCircle' },
  { id: 'scanner', label: 'Scanner QR', href: '/scanner', icon: 'QrCode' },
  { id: 'assistant', label: 'Assistente IA', href: '/assistant', icon: 'Bot' },
  { id: 'machines', label: 'Máquinas', href: '/machines', icon: 'Printer' },
  { id: 'operators', label: 'Operadores', href: '/operators', icon: 'Users' },
  { id: 'new-job', label: 'Novo Agendamento', href: '/new-job', icon: 'Plus' },
];

const MAX_FAVORITES = 6;

export function useQuickFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasMigrated, setHasMigrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch favorites from database
  const { data: dbFavorites, isLoading, isFetched } = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_FAVORITES;

      try {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('favorites')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          const appError = createAppError(error, FAVORITES_ERROR_CONTEXT.fetch);
          return DEFAULT_FAVORITES;
        }

        // Return default favorites if no data or null
        if (!data?.favorites) {
          return DEFAULT_FAVORITES;
        }

        return data.favorites as unknown as QuickFavorite[];
      } catch (error) {
        const appError = createAppError(error, FAVORITES_ERROR_CONTEXT.fetch);
        return DEFAULT_FAVORITES;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Migrate from localStorage to database on first access
  useEffect(() => {
    if (!user?.id || !isFetched || hasMigrated) return;

    // Only migrate if favorites are still default (no custom saved)
    const isDefaultFavorites = dbFavorites &&
      dbFavorites.length === DEFAULT_FAVORITES.length &&
      dbFavorites.every((f, i) => f.id === DEFAULT_FAVORITES[i]?.id);

    if (isDefaultFavorites) {
      const storageKey = `quick-favorites-${user.id}`;
      const localStorageFavorites = localStorage.getItem(storageKey);

      if (localStorageFavorites) {
        try {
          const parsed = JSON.parse(localStorageFavorites) as QuickFavorite[];
          if (Array.isArray(parsed) && parsed.length > 0) {

            // Save to database
            supabase
              .from('user_favorites')
              .upsert([{
                user_id: user.id,
                favorites: JSON.parse(JSON.stringify(parsed)),
              }], { onConflict: 'user_id' })
              .then(({ error }) => {
                if (error) {
                  toast({
                    title: 'Erro na migração',
                    description: 'Não foi possível migrar seus favoritos para a nuvem.',
                    variant: 'destructive',
                  });
                } else {
                  // Update query cache
                  queryClient.setQueryData(['user-favorites', user.id], parsed);
                  // Clean up localStorage
                  localStorage.removeItem(storageKey);
                  toast({
                    title: 'Favoritos sincronizados',
                    description: 'Seus atalhos foram migrados para a nuvem e agora sincronizam entre dispositivos.',
                  });
                }
              });
          }
        } catch {
          // Favoritos legados corrompidos no localStorage: ignora a migração.
        }
      }
    }

    setHasMigrated(true);
  }, [user?.id, isFetched, dbFavorites, hasMigrated, queryClient]);

  // Real-time subscription for cross-tab/device sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-favorites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'favorites' in payload.new) {
            queryClient.setQueryData(
              ['user-favorites', user.id],
              payload.new.favorites as unknown as QuickFavorite[]
            );
            toast({
              title: '🔄 Favoritos atualizados',
              description: 'Seus atalhos foram sincronizados de outro dispositivo.',
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const favorites = dbFavorites || DEFAULT_FAVORITES;

  // Mutation to save favorites
  const saveMutation = useMutation({
    mutationFn: async (newFavorites: QuickFavorite[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if record exists
      const { data: existing } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_favorites')
          .update({ favorites: JSON.parse(JSON.stringify(newFavorites)) })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_favorites')
          .insert([{
            user_id: user.id,
            favorites: JSON.parse(JSON.stringify(newFavorites)),
          }]);

        if (error) throw error;
      }

      return newFavorites;
    },
    onSuccess: (newFavorites) => {
      queryClient.setQueryData(['user-favorites', user?.id], newFavorites);
    },
    onError: () => {
      toast({ title: 'Erro ao salvar favoritos', description: 'Não foi possível salvar seus atalhos.', variant: 'destructive' });
    },
  });

  const addFavorite = useCallback((shortcut: QuickFavorite) => {
    const currentFavorites = dbFavorites || DEFAULT_FAVORITES;
    if (currentFavorites.some(f => f.id === shortcut.id)) return;
    if (currentFavorites.length >= MAX_FAVORITES) return;

    const newFavorites = [...currentFavorites, shortcut];
    saveMutation.mutate(newFavorites);
  }, [dbFavorites, saveMutation]);

  const removeFavorite = useCallback((id: string) => {
    const currentFavorites = dbFavorites || DEFAULT_FAVORITES;
    const newFavorites = currentFavorites.filter(f => f.id !== id);
    saveMutation.mutate(newFavorites);
  }, [dbFavorites, saveMutation]);

  const reorderFavorites = useCallback((newOrder: QuickFavorite[]) => {
    saveMutation.mutate(newOrder);
  }, [saveMutation]);

  const resetToDefault = useCallback(() => {
    saveMutation.mutate(DEFAULT_FAVORITES);
  }, [saveMutation]);

  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  return {
    favorites,
    availableShortcuts: AVAILABLE_SHORTCUTS,
    addFavorite,
    removeFavorite,
    reorderFavorites,
    resetToDefault,
    isFavorite,
    maxFavorites: MAX_FAVORITES,
    isLoading,
    isSyncing: isSyncing || saveMutation.isPending,
  };
}

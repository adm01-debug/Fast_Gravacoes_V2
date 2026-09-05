import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const widgetConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.enum(['main', 'sidebar', 'efficiency', 'bottom']),
  visible: z.boolean(),
  order: z.number(),
});

const layoutSchema = z.array(widgetConfigSchema);

export interface WidgetConfig {
  id: string;
  title: string;
  section: 'main' | 'sidebar' | 'efficiency' | 'bottom';
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'occupancy', title: 'Ocupação por Técnica', section: 'main', visible: true, order: 0 },
  { id: 'trends', title: 'Tendências de OEE e Carga', section: 'main', visible: true, order: 1 },
  { id: 'buffer', title: 'Status do Buffer', section: 'sidebar', visible: true, order: 0 },
  { id: 'conflicts', title: 'Alertas de Conflitos', section: 'sidebar', visible: true, order: 1 },
  { id: 'alerts', title: 'Alertas', section: 'sidebar', visible: true, order: 2 },
  { id: 'sequencing', title: 'Sequenciamento Inteligente', section: 'efficiency', visible: true, order: 0 },
  { id: 'loadbalancing', title: 'Balanceamento de Carga', section: 'efficiency', visible: true, order: 1 },
  { id: 'bottleneck', title: 'Previsão de Gargalos', section: 'efficiency', visible: true, order: 2 },
  { id: 'timeline', title: 'Timeline de Hoje', section: 'bottom', visible: true, order: 0 },
  { id: 'jobs', title: 'Jobs Recentes', section: 'bottom', visible: true, order: 1 },
];

const STORAGE_KEY = 'dashboard-layout';

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load layout on mount or user change
  useEffect(() => {
    let isMounted = true;
    const loadLayout = async () => {
      if (!user) return;

      try {
        // 1. Try Loading from Supabase
        const { data, error } = await supabase
          .from('dashboard_layouts')
          .select('layout')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;
        if (error) throw error;

        if (data?.layout) {
          const result = layoutSchema.safeParse(data.layout);
          
          if (result.success) {
            const parsed = result.data;
            // Merge with defaults to handle any new widgets added in code
            const merged = DEFAULT_WIDGETS.map(defaultWidget => {
              const savedWidget = parsed.find(w => w.id === defaultWidget.id);
              return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
            });
            setWidgets(merged);
            return;
          } else {
            logger.warn('Layout de dashboard inválido no banco', result.error, 'useDashboardLayout');
          }
        }

        // 2. Fallback to localStorage
        const storageKey = `${STORAGE_KEY}-${user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as WidgetConfig[];
            const merged = DEFAULT_WIDGETS.map(defaultWidget => {
              const savedWidget = parsed.find(w => w.id === defaultWidget.id);
              return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
            });
            setWidgets(merged);
          } catch (e) {
            // Invalid JSON in localStorage
          }
        }
      } catch (err) {
        logger.warn('Falha ao carregar layout do dashboard', err, 'useDashboardLayout');
      }
    };

    loadLayout();
    return () => { isMounted = false; };
  }, [user]);

  // Save layout to both DB and LocalStorage
  const saveLayout = useCallback(async (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    if (!user) return;

    setIsSaving(true);
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    try { localStorage.setItem(storageKey, JSON.stringify(newWidgets)); } catch { /* quota exceeded */ }

    try {
      const { error } = await supabase
        .from('dashboard_layouts')
        .upsert({
          user_id: user.id,
          layout: newWidgets as unknown as Json,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {

      toast.error("Erro ao salvar layout na nuvem. Mantido localmente.");
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [user]);

  // Reorder widgets within a section
  const reorderWidgets = useCallback((section: WidgetConfig['section'], activeId: string, overId: string) => {
    const sectionWidgets = widgets.filter(w => w.section === section);
    const activeIndex = sectionWidgets.findIndex(w => w.id === activeId);
    const overIndex = sectionWidgets.findIndex(w => w.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newSectionWidgets = [...sectionWidgets];
    const [removed] = newSectionWidgets.splice(activeIndex, 1);
    newSectionWidgets.splice(overIndex, 0, removed);

    // Update order for section widgets
    const reordered = newSectionWidgets.map((w, index) => ({ ...w, order: index }));

    // Merge back with other sections
    const otherWidgets = widgets.filter(w => w.section !== section);
    const newWidgets = [...otherWidgets, ...reordered];

    saveLayout(newWidgets);
  }, [widgets, saveLayout]);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const newWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    saveLayout(newWidgets);
  }, [widgets, saveLayout]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    saveLayout(DEFAULT_WIDGETS);
    toast.success("Layout resetado para o padrão.");
  }, [saveLayout]);

  // Get widgets for a specific section, sorted by order
  const getWidgetsBySection = useCallback((section: WidgetConfig['section']) => {
    return widgets
      .filter(w => w.section === section && w.visible)
      .sort((a, b) => a.order - b.order);
  }, [widgets]);

  return {
    widgets,
    isEditMode,
    setIsEditMode,
    isSaving,
    reorderWidgets,
    toggleWidgetVisibility,
    resetLayout,
    getWidgetsBySection,
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { PackagingSettings } from './usePackagingSettings';

export interface PackagingSlaOverride {
  id: string;
  technique_id: string | null;
  client: string | null;
  sla_triage_hours: number;
  sla_packaging_hours: number;
  sla_total_hours: number;
  warning_threshold_pct: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackagingSlaOverrideInput {
  id?: string;
  technique_id: string | null;
  client: string | null;
  sla_triage_hours: number;
  sla_packaging_hours: number;
  sla_total_hours: number;
  warning_threshold_pct: number;
  notes?: string | null;
  is_active?: boolean;
}

type UntypedSupabase = {
  from: (t: string) => {
    select: (cols?: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }>;
    };
    insert: (v: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    update: (v: Record<string, unknown>) => { eq: (c: string, val: string) => Promise<{ data: unknown; error: unknown }> };
    delete: () => { eq: (c: string, val: string) => Promise<{ data: unknown; error: unknown }> };
    upsert: (v: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
};

const QUERY_KEY = ['packaging-sla-overrides'] as const;

export function usePackagingSlaOverrides() {
  return useQuery<PackagingSlaOverride[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const db = supabase as unknown as UntypedSupabase;
      const { data, error } = await db
        .from('packaging_sla_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        logger.error('usePackagingSlaOverrides failed', error, 'packaging');
        throw error;
      }
      return (data as PackagingSlaOverride[] | null) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePackagingSlaOverrideMutations() {
  const qc = useQueryClient();
  const db = supabase as unknown as UntypedSupabase;

  const save = useMutation({
    mutationFn: async (input: PackagingSlaOverrideInput) => {
      const payload = {
        technique_id: input.technique_id,
        client: input.client?.trim() || null,
        sla_triage_hours: input.sla_triage_hours,
        sla_packaging_hours: input.sla_packaging_hours,
        sla_total_hours: input.sla_total_hours,
        warning_threshold_pct: input.warning_threshold_pct,
        notes: input.notes ?? null,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const { error } = await db.from('packaging_sla_overrides').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('packaging_sla_overrides').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('packaging_sla_overrides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { save, remove };
}

/**
 * Resolves the most-specific active SLA settings for a given job context.
 * Priority: client + technique > client > technique > global.
 */
export function resolveEffectiveSlaSettings(
  ctx: { technique_id: string | null | undefined; client: string | null | undefined },
  globalSettings: PackagingSettings,
  overrides: PackagingSlaOverride[] | undefined | null,
): { settings: PackagingSettings; matched: PackagingSlaOverride | null; scope: 'client+technique' | 'client' | 'technique' | 'global' } {
  if (!overrides || overrides.length === 0) {
    return { settings: globalSettings, matched: null, scope: 'global' };
  }
  const clientLc = ctx.client?.trim().toLowerCase() ?? null;
  const techId = ctx.technique_id ?? null;
  const active = overrides.filter((o) => o.is_active);

  const byClientAndTech = active.find(
    (o) => o.technique_id === techId && o.client && o.client.toLowerCase() === clientLc,
  );
  const byClient = !byClientAndTech
    ? active.find((o) => o.technique_id === null && o.client && o.client.toLowerCase() === clientLc)
    : null;
  const byTech = !byClientAndTech && !byClient
    ? active.find((o) => o.client === null && o.technique_id === techId)
    : null;

  const matched = byClientAndTech ?? byClient ?? byTech ?? null;
  if (!matched) return { settings: globalSettings, matched: null, scope: 'global' };

  const settings: PackagingSettings = {
    ...globalSettings,
    sla_triage_hours: matched.sla_triage_hours,
    sla_packaging_hours: matched.sla_packaging_hours,
    sla_total_hours: matched.sla_total_hours,
    warning_threshold_pct: matched.warning_threshold_pct,
  };
  const scope = byClientAndTech ? 'client+technique' : byClient ? 'client' : 'technique';
  return { settings, matched, scope };
}

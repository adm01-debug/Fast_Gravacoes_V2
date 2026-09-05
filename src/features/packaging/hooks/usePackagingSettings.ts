import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackagingSettings {
  id: string;
  package_types: string[];
  defect_reasons: string[];
  weight_unit: string;
  sla_triage_hours: number;
  sla_packaging_hours: number;
  sla_total_hours: number;
  warning_threshold_pct: number;
}

const DEFAULTS: PackagingSettings = {
  id: '',
  package_types: ['caixa', 'saco', 'envelope', 'pallet'],
  defect_reasons: [],
  weight_unit: 'kg',
  sla_triage_hours: 4,
  sla_packaging_hours: 8,
  sla_total_hours: 24,
  warning_threshold_pct: 75,
};

type UntypedSupabase = {
  from: (t: string) => { select: (cols?: string) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } } };
};

export function usePackagingSettings() {
  return useQuery<PackagingSettings>({
    queryKey: ['packaging-settings'],
    queryFn: async () => {
      const db = supabase as unknown as UntypedSupabase;
      const { data, error } = await db.from('packaging_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return { ...DEFAULTS, ...(data as Partial<PackagingSettings> | null ?? {}) } as PackagingSettings;
    },
    staleTime: 5 * 60_000,
  });
}

export type SlaLevel = 'ok' | 'warning' | 'overdue';

export interface SlaInfo {
  level: SlaLevel;
  elapsedHours: number;
  slaHours: number;
  progressPct: number;
  label: string;
}

export interface SlaTaskInput {
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  jobs?: { technique_id?: string | null; client?: string | null } | null;
}

export function computeSla(
  task: SlaTaskInput,
  settings: PackagingSettings,
  overrides?: import('./usePackagingSlaOverrides').PackagingSlaOverride[] | null,
): SlaInfo {
  // Resolve effective settings if overrides are provided and task carries job context
  if (overrides && overrides.length > 0 && task.jobs) {
    // Lazy-import via dynamic require would break bundlers; inline a simple resolver
    const clientLc = task.jobs.client?.trim().toLowerCase() ?? null;
    const techId = task.jobs.technique_id ?? null;
    const active = overrides.filter((o) => o.is_active);
    const matched =
      active.find((o) => o.technique_id === techId && o.client && o.client.toLowerCase() === clientLc) ??
      active.find((o) => o.technique_id === null && o.client && o.client.toLowerCase() === clientLc) ??
      active.find((o) => o.client === null && o.technique_id === techId) ??
      null;
    if (matched) {
      settings = {
        ...settings,
        sla_triage_hours: matched.sla_triage_hours,
        sla_packaging_hours: matched.sla_packaging_hours,
        sla_total_hours: matched.sla_total_hours,
        warning_threshold_pct: matched.warning_threshold_pct,
      };
    }
  }
  if (task.status === 'ready_to_ship' || task.status === 'on_hold') {
    return { level: 'ok', elapsedHours: 0, slaHours: 0, progressPct: 0, label: '—' };
  }

  const now = Date.now();
  let sla: number;
  let refIso: string;

  if (task.status === 'pending') {
    sla = settings.sla_triage_hours;
    refIso = task.created_at;
  } else if (task.status === 'in_triage') {
    sla = settings.sla_triage_hours;
    refIso = task.started_at ?? task.created_at;
  } else if (task.status === 'packaging') {
    sla = settings.sla_packaging_hours;
    refIso = task.started_at ?? task.created_at;
  } else {
    sla = settings.sla_total_hours;
    refIso = task.created_at;
  }

  const elapsed = (now - new Date(refIso).getTime()) / (1000 * 60 * 60);
  const pct = sla > 0 ? (elapsed / sla) * 100 : 0;
  const level: SlaLevel =
    pct >= 100 ? 'overdue' : pct >= settings.warning_threshold_pct ? 'warning' : 'ok';

  const label =
    level === 'overdue'
      ? `Atrasado ${(elapsed - sla).toFixed(1)}h`
      : level === 'warning'
      ? `${Math.round(pct)}% do SLA`
      : `${Math.round(pct)}% do SLA`;

  return {
    level,
    elapsedHours: Number(elapsed.toFixed(2)),
    slaHours: sla,
    progressPct: Number(pct.toFixed(1)),
    label,
  };
}

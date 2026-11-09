import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';
import {
  MaintenanceType,
  MaintenanceSchedule,
  MaintenanceChecklist,
  MaintenanceRecord,
  MaintenanceAlert,
} from './types';

export function useTPMData() {
  const queryClient = useQueryClient();

  // Realtime subscriptions for TPM data
  useRealtimeChannel('tpm-schedules-changes', [{ table: 'maintenance_schedules' }], () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
  });

  useRealtimeChannel('tpm-records-changes', [{ table: 'maintenance_records' }], () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
  });

  useRealtimeChannel('tpm-alerts-changes', [{ table: 'maintenance_alerts' }], () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
  });

  // Fetch maintenance types
  const { data: maintenanceTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['maintenance-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as MaintenanceType[];
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Fetch schedules with machine info
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*, machines(id, name, code, technique_id), maintenance_types(*)')
        .eq('is_active', true)
        .order('next_due_at');
      if (error) throw error;
      return data.map((s) => {
        const row = s as Record<string, unknown>;
        return {
          ...row,
          machine: row.machines,
          maintenance_type: row.maintenance_types,
        };
      }) as MaintenanceSchedule[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch checklists
  const { data: checklists = [], isLoading: loadingChecklists } = useQuery({
    queryKey: ['maintenance-checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_checklists')
        .select('*, maintenance_checklist_items(*)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data.map((c) => {
        const row = c as Record<string, unknown>;
        return {
          ...row,
          items: (row.maintenance_checklist_items as unknown[]) || [],
        };
      }) as MaintenanceChecklist[];
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Fetch maintenance records
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, machines(id, name, code, technique_id)')
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          ...row,
          machine: row.machines,
        };
      }) as MaintenanceRecord[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch record details function
  const fetchRecordDetails = async (recordId: string) => {
      const { data: record, error: recordError } = await supabase
        .from('maintenance_records')
        .select('*, machines(id, name, code, technique_id), maintenance_types(*)')
        .eq('id', recordId)
        .single();

      if (recordError) throw recordError;

      const { data: responses, error: responsesError } = await supabase
        .from('maintenance_item_responses')
        .select('*, maintenance_checklist_items(*)')
        .eq('record_id', recordId);

      if (responsesError) throw responsesError;

      const { data: parts, error: partsError } = await supabase
        .from('tpm_execution_parts')
        .select('*')
        .eq('execution_id', recordId);

      if (partsError) throw partsError;

      const { data: supplies, error: suppliesError } = await supabase
        .from('tpm_execution_supplies')
        .select('*')
        .eq('execution_id', recordId);

      if (suppliesError) throw suppliesError;

      const { data: executionAlerts, error: alertsError } = await supabase
        .from('tpm_execution_alerts')
        .select('*')
        .eq('execution_id', recordId);

      if (alertsError) throw alertsError;

      const { data: technicalSheet, error: sheetError } = record.technical_sheet_id
        ? await supabase.from('technical_sheets').select('*, techniques(*), product_categories(*), machines(*)').eq('id', record.technical_sheet_id).single()
        : { data: null, error: null };

      return {
        ...record,
        machine: record.machines,
        maintenance_type: record.maintenance_types,
        technical_sheet: technicalSheet,
        responses: responses.map((r) => {
          const row = r as Record<string, unknown>;
          return { ...row, item: row.maintenance_checklist_items };
        }),
        parts,
        supplies_used: supplies,
        execution_alerts: executionAlerts
      };
  };

  // Fetch alerts
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['maintenance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*, machines(id, name, code, technique_id)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((a) => {
        const row = a as Record<string, unknown>;
        return { ...row, machine: row.machines };
      }) as MaintenanceAlert[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch machines
  const { data: machines = [] } = useQuery({
    queryKey: ['machines-for-tpm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  return {
    maintenanceTypes,
    schedules,
    checklists,
    records,
    alerts,
    machines,
    isLoading: loadingTypes || loadingSchedules || loadingChecklists || loadingRecords || loadingAlerts,
    fetchRecordDetails,
  };
}

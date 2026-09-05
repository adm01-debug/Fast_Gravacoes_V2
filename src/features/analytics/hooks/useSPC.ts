import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface SPCParameter {
  id: string;
  name: string;
  product_name: string | null;
  technique_id: string | null;
  machine_id: string | null;
  measurement_type: string;
  unit: string;
  target_value: number;
  upper_spec_limit: number;
  lower_spec_limit: number;
  upper_control_limit: number | null;
  lower_control_limit: number | null;
  sample_size: number;
  frequency_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  machine?: { name: string; code: string };
}

export interface SPCMeasurement {
  id: string;
  parameter_id: string;
  job_id: string | null;
  lot_id: string | null;
  sample_number: number;
  values: number[];
  mean_value: number;
  range_value: number;
  std_deviation: number | null;
  is_in_control: boolean;
  out_of_control_type: string | null;
  operator_id: string | null;
  operator_name: string | null;
  notes: string | null;
  measured_at: string;
  created_at: string;
}

export interface SPCAlert {
  id: string;
  parameter_id: string;
  measurement_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  value: number | null;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  parameter?: SPCParameter;
}

export interface SPCCapability {
  id: string;
  parameter_id: string;
  period_start: string;
  period_end: string;
  sample_count: number;
  mean: number;
  std_deviation: number;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  calculated_at: string;
}

export function useSPCParameters() {
  return useQuery({
    queryKey: ['spc-parameters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spc_control_parameters')
        .select(`*, machine:machines(name, code)`)
        .order('name');
      if (error) throw error;
      return data as SPCParameter[];
    }
  });
}

export function useSPCMeasurements(parameterId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['spc-measurements', parameterId, limit],
    queryFn: async () => {
      if (!parameterId) return [];
      const { data, error } = await supabase
        .from('spc_measurements')
        .select('*')
        .eq('parameter_id', parameterId)
        .order('measured_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as SPCMeasurement[];
    },
    enabled: !!parameterId
  });
}

export function useSPCAlerts(onlyActive = true) {
  return useQuery({
    queryKey: ['spc-alerts', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('spc_alerts')
        .select(`*, parameter:spc_control_parameters(name, product_name)`)
        .order('created_at', { ascending: false });

      if (onlyActive) {
        query = query.is('resolved_at', null);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as SPCAlert[];
    }
  });
}

export function useSPCCapability(parameterId: string | null) {
  return useQuery({
    queryKey: ['spc-capability', parameterId],
    queryFn: async () => {
      if (!parameterId) return null;
      const { data, error } = await supabase
        .from('spc_capability_history')
        .select('*')
        .eq('parameter_id', parameterId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SPCCapability | null;
    },
    enabled: !!parameterId
  });
}

export function useSPCMutations() {
  const queryClient = useQueryClient();

  const createParameter = useMutation({
    mutationFn: async (data: {
      name: string;
      measurement_type: string;
      unit: string;
      target_value: number;
      upper_spec_limit: number;
      lower_spec_limit: number;
      sample_size?: number;
      frequency_minutes?: number;
      product_name?: string;
      technique_id?: string;
      machine_id?: string;
    }) => {
      const { error } = await supabase
        .from('spc_control_parameters')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spc-parameters'] });
      toast.success('Parâmetro SPC criado');
    },
    onError: (error) => showErrorToast(error, 'Erro')
  });

  const addMeasurement = useMutation({
    mutationFn: async (data: {
      parameter_id: string;
      values: number[];
      job_id?: string;
      lot_id?: string;
      operator_name?: string;
      notes?: string;
    }) => {
      // Calculate statistics
      const values = data.values.filter(v => Number.isFinite(v));
      if (values.length === 0) throw new Error('Nenhum valor finito fornecido para medição');
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const range = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Get parameter to check control limits
      const { data: param } = await supabase
        .from('spc_control_parameters')
        .select('upper_control_limit, lower_control_limit, upper_spec_limit, lower_spec_limit')
        .eq('id', data.parameter_id)
        .single();

      let isInControl = true;
      let outOfControlType = null;

      if (param) {
        if (param.upper_control_limit && mean > param.upper_control_limit) {
          isInControl = false;
          outOfControlType = 'above_ucl';
        } else if (param.lower_control_limit && mean < param.lower_control_limit) {
          isInControl = false;
          outOfControlType = 'below_lcl';
        }
      }

      // Get next sample number
      const { count } = await supabase
        .from('spc_measurements')
        .select('*', { count: 'exact', head: true })
        .eq('parameter_id', data.parameter_id);

      const { error } = await supabase
        .from('spc_measurements')
        .insert({
          parameter_id: data.parameter_id,
          sample_number: (count || 0) + 1,
          values: values,
          mean_value: mean,
          range_value: range,
          std_deviation: stdDev,
          is_in_control: isInControl,
          out_of_control_type: outOfControlType,
          job_id: data.job_id,
          lot_id: data.lot_id,
          operator_name: data.operator_name,
          notes: data.notes
        });

      if (error) throw error;

      // Create alert if out of control
      if (!isInControl) {
        await supabase.from('spc_alerts').insert({
          parameter_id: data.parameter_id,
          alert_type: 'out_of_control',
          severity: 'critical',
          title: 'Ponto fora de controle',
          description: `Média ${mean.toFixed(3)} está ${outOfControlType === 'above_ucl' ? 'acima do UCL' : 'abaixo do LCL'}`,
          value: mean
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spc-measurements', variables.parameter_id] });
      queryClient.invalidateQueries({ queryKey: ['spc-alerts'] });
      toast.success('Medição registrada');
    },
    onError: (error) => showErrorToast(error, 'Erro')
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution?: string }) => {
      const { error } = await supabase
        .from('spc_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          resolution,
          resolved_at: resolution ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spc-alerts'] });
      toast.success('Alerta reconhecido');
    },
    onError: (error) => showErrorToast(error, 'Erro')
  });

  const calculateControlLimits = useMutation({
    mutationFn: async (parameterId: string) => {
      // Get last 25 measurements
      // Get parameter to determine sample size
      const { data: param } = await supabase
        .from('spc_control_parameters')
        .select('sample_size')
        .eq('id', parameterId)
        .single();

      const { data: measurements } = await supabase
        .from('spc_measurements')
        .select('mean_value, range_value')
        .eq('parameter_id', parameterId)
        .order('measured_at', { ascending: false })
        .limit(25);

      if (!measurements || measurements.length < 10) {
        throw new Error('Mínimo de 10 medições necessárias');
      }

      const means = measurements.map(m => m.mean_value);
      const ranges = measurements.map(m => m.range_value);

      const xBar = means.reduce((a, b) => a + b, 0) / means.length;
      const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;

      // A2 constants by sample size (n=2..10)
      const A2_TABLE: Record<number, number> = {
        2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
        6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308,
      };
      const sampleSize = param?.sample_size ?? 5;
      const A2 = A2_TABLE[sampleSize] ?? 0.577;
      const ucl = xBar + A2 * rBar;
      const lcl = xBar - A2 * rBar;

      const { error } = await supabase
        .from('spc_control_parameters')
        .update({
          upper_control_limit: ucl,
          lower_control_limit: lcl
        })
        .eq('id', parameterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spc-parameters'] });
      toast.success('Limites de controle calculados');
    },
    onError: (error) => showErrorToast(error, 'Erro')
  });

  return {
    createParameter,
    addMeasurement,
    acknowledgeAlert,
    calculateControlLimits
  };
}

// Utility function to calculate Cp/Cpk
export function calculateCapabilityIndices(
  measurements: SPCMeasurement[],
  usl: number,
  lsl: number
): { cp: number; cpk: number; mean: number; stdDev: number; performance: string } | null {
  if (measurements.length < 5) return null;

  const means = measurements.map(m => m.mean_value);
  const overallMean = means.reduce((a, b) => a + b, 0) / means.length;

  // Calculate Pooled Standard Deviation or sample std dev
  const variance = means.reduce((sum, v) => sum + Math.pow(v - overallMean, 2), 0) / (means.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return null;

  const cp = (usl - lsl) / (6 * stdDev);
  const cpu = (usl - overallMean) / (3 * stdDev);
  const cpl = (overallMean - lsl) / (3 * stdDev);
  const cpk = Math.min(cpu, cpl);

  let performance = 'Capacidade Insuficiente';
  if (cpk >= 1.33) performance = 'Processo Capaz (Excelente)';
  else if (cpk >= 1.0) performance = 'Processo Marginal';

  return { cp, cpk, mean: overallMean, stdDev, performance };
}

/**
 * Detects violations of Western Electric / Run Rules
 */
export function detectRunRules(measurements: SPCMeasurement[], ucl: number, lcl: number, mean: number) {
  if (measurements.length < 10) return [];

  const violations = [];
  const points = measurements.slice(0, 10).reverse(); // Check last 10 points
  const values = points.map(p => p.mean_value);

  // Rule 1: Point outside control limits (already handled in db trigger usually, but good to have)
  if (values[values.length - 1] > ucl || values[values.length - 1] < lcl) {
    violations.push({ rule: 'Fora do Limite', description: 'Ponto fora dos limites de controle (UCL/LCL)' });
  }

  // Rule 2: Seven or more points in a row on one side of the mean
  let countSide = 0;
  const lastSide = values[values.length - 1] > mean;
  for (let i = values.length - 1; i >= Math.max(0, values.length - 7); i--) {
    if ((values[i] > mean) === lastSide) countSide++;
    else break;
  }
  if (countSide >= 7) {
    violations.push({ rule: 'Tendência de Desvio', description: '7 ou mais pontos consecutivos em um lado da média' });
  }

  // Rule 3: Seven points in a row steadily increasing or decreasing
  let countTrend = 1;
  const lastTrend = values[values.length - 1] > values[values.length - 2];
  for (let i = values.length - 1; i > Math.max(0, values.length - 7); i--) {
    if ((values[i] > values[i-1]) === lastTrend) countTrend++;
    else break;
  }
  if (countTrend >= 6) {
     violations.push({ rule: 'Tendência Linear', description: '6 ou mais pontos consecutivos subindo ou descendo' });
  }

  return violations;
}

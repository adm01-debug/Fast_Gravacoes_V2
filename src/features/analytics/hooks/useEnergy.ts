import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface EnergyConsumption {
  id: string;
  machine_id: string | null;
  recorded_at: string;
  consumption_kwh: number;
  power_factor: number | null;
  voltage: number | null;
  current_amps: number | null;
  peak_demand_kw: number | null;
  cost_per_kwh: number;
  total_cost: number;
  reading_type: string;
  notes: string | null;
  machine?: { name: string; code: string };
}

export interface EnergyAlert {
  id: string;
  machine_id: string | null;
  alert_type: string;
  threshold_value: number;
  current_value: number;
  severity: string;
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  machine?: { name: string };
}

export interface EnergyTarget {
  id: string;
  machine_id: string | null;
  technique_id: string | null;
  target_type: string;
  target_value: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
}

export interface EnergyStats {
  totalConsumption: number;
  totalCost: number;
  avgDailyConsumption: number;
  peakDemand: number;
  avgPowerFactor: number;
  costTrend: number;
  consumptionByMachine: { machineId: string; machineName: string; consumption: number; cost: number }[];
  dailyConsumption: { date: string; consumption: number; cost: number }[];
  hourlyPattern: { hour: number; avgConsumption: number }[];
  carbonFootprintKg: number;
  energyScore: number;
}

export function useEnergy(dateRange?: { start: Date; end: Date }) {
  const queryClient = useQueryClient();
  const now = new Date();
  const start = dateRange?.start || startOfMonth(now);
  const end = dateRange?.end || endOfMonth(now);
  const prevStart = startOfMonth(subMonths(start, 1));
  const prevEnd = endOfMonth(subMonths(start, 1));

  // Fetch consumption data
  const consumptionQuery = useQuery({
    queryKey: ['energy-consumption', start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('energy_consumption')
        .select('*, machine:machines(name, code)')
        .gte('recorded_at', start.toISOString())
        .lte('recorded_at', end.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data as EnergyConsumption[];
    },
    staleTime: 60000,
  });

  // Fetch previous month consumption for trend comparison
  const prevConsumptionQuery = useQuery({
    queryKey: ['energy-consumption-prev', prevStart.toISOString(), prevEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('energy_consumption')
        .select('total_cost')
        .gte('recorded_at', prevStart.toISOString())
        .lte('recorded_at', prevEnd.toISOString());

      if (error) throw error;
      return data as { total_cost: number }[];
    },
    staleTime: 300000, // 5 min - previous month rarely changes
  });

  // Fetch alerts
  const alertsQuery = useQuery({
    queryKey: ['energy-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('energy_alerts')
        .select('*, machine:machines(name)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EnergyAlert[];
    },
    staleTime: 30000,
  });

  // Fetch targets
  const targetsQuery = useQuery({
    queryKey: ['energy-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('energy_targets')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as EnergyTarget[];
    },
    staleTime: 60000,
  });

  // Calculate stats
  const stats: EnergyStats = (() => {
    const consumption = consumptionQuery.data || [];

    const totalConsumption = consumption.reduce((sum, c) => sum + Number(c.consumption_kwh), 0);
    const totalCost = consumption.reduce((sum, c) => sum + Number(c.total_cost), 0);
    const peakDemand = Math.max(...consumption.map(c => Number(c.peak_demand_kw) || 0), 0);
    const powerFactorEntries = consumption.filter(c => c.power_factor != null);
    const avgPowerFactor = powerFactorEntries.length > 0
      ? powerFactorEntries.reduce((sum, c) => sum + (Number(c.power_factor) || 0), 0) / powerFactorEntries.length
      : 0;

    // Days in range
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyConsumption = totalConsumption / days;

    // Compare with previous month using separate query
    const prevData = prevConsumptionQuery.data || [];
    const prevTotal = prevData.reduce((sum, c) => sum + Number(c.total_cost), 0);
    const costTrend = prevTotal > 0 ? ((totalCost - prevTotal) / prevTotal) * 100 : 0;

    // Group by machine
    const byMachine = new Map<string, { name: string; consumption: number; cost: number }>();
    consumption.forEach(c => {
      if (c.machine_id) {
        const existing = byMachine.get(c.machine_id) || {
          name: c.machine?.name || 'Desconhecida',
          consumption: 0,
          cost: 0
        };
        existing.consumption += Number(c.consumption_kwh);
        existing.cost += Number(c.total_cost);
        byMachine.set(c.machine_id, existing);
      }
    });
    const consumptionByMachine = Array.from(byMachine.entries()).map(([id, data]) => ({
      machineId: id,
      machineName: data.name,
      consumption: data.consumption,
      cost: data.cost,
    })).sort((a, b) => b.consumption - a.consumption);

    // Group by day
    const byDay = new Map<string, { consumption: number; cost: number }>();
    consumption.forEach(c => {
      const date = format(new Date(c.recorded_at), 'yyyy-MM-dd');
      const existing = byDay.get(date) || { consumption: 0, cost: 0 };
      existing.consumption += Number(c.consumption_kwh);
      existing.cost += Number(c.total_cost);
      byDay.set(date, existing);
    });
    const dailyConsumption = Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Hourly pattern
    const byHour = new Map<number, number[]>();
    consumption.forEach(c => {
      const hour = new Date(c.recorded_at).getHours();
      const existing = byHour.get(hour) || [];
      existing.push(Number(c.consumption_kwh));
      byHour.set(hour, existing);
    });
    const hourlyPattern = Array.from({ length: 24 }, (_, i) => {
      const values = byHour.get(i) || [];
      return {
        hour: i,
        avgConsumption: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      };
    });

    // Carbon Footprint Calculation (Based on Brazilian Energy Mix average: 0.088 kg CO2 / kWh)
    const carbonFootprintKg = totalConsumption * 0.088;

    // Energy Score Logic (0-100)
    // Factors: Power Factor (40%), Peak Demand vs Avg (30%), Consumption vs Prev (30%)
    const powerFactorBonus = avgPowerFactor >= 0.92 ? 40 : (avgPowerFactor / 0.92) * 40;
    const peakDemandPenalty = peakDemand > avgDailyConsumption * 5 ? 0 : 30; // Simplified
    const trendBonus = costTrend <= 0 ? 30 : Math.max(0, 30 - costTrend);
    const energyScore = Math.min(100, Math.round(powerFactorBonus + peakDemandPenalty + trendBonus));

    return {
      totalConsumption,
      totalCost,
      avgDailyConsumption,
      peakDemand,
      avgPowerFactor,
      costTrend,
      consumptionByMachine,
      dailyConsumption,
      hourlyPattern,
      carbonFootprintKg,
      energyScore,
    };
  })();

  // Add consumption reading
  const addConsumption = useMutation({
    mutationFn: async (data: {
      machine_id: string;
      consumption_kwh: number;
      power_factor?: number;
      voltage?: number;
      current_amps?: number;
      peak_demand_kw?: number;
      reading_type?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('energy_consumption')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-consumption'] });
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao registrar consumo');
    },
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('energy_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-alerts'] });
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao resolver alerta de energia');
    },
  });

  // Create target
  const createTarget = useMutation({
    mutationFn: async (data: Omit<EnergyTarget, 'id'>) => {
      const { error } = await supabase
        .from('energy_targets')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-targets'] });
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao criar meta de energia');
    },
  });

  return {
    consumption: consumptionQuery.data || [],
    alerts: alertsQuery.data || [],
    targets: targetsQuery.data || [],
    stats,
    isLoading: consumptionQuery.isLoading || alertsQuery.isLoading,
    addConsumption,
    resolveAlert,
    createTarget,
  };
}

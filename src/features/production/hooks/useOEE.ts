import { useMemo } from 'react';
import { useSchedulingData } from '@/features/jobs';
import { useBusinessConfig } from '@/features/admin';
import { startOfDay, endOfDay, subDays, differenceInMinutes, parseISO, isWithinInterval, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { logger } from '@/lib/logger';
import { calculateRealOEE } from '@/features/production/services/oeeCalculations';

const SP_TIMEZONE = 'America/Sao_Paulo';

// Data validation helpers
function isValidDate(dateStr: string | null | undefined): dateStr is string {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return isValid(date);
  } catch {
    return false;
  }
}


function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

/** Narrowing helper — invariante já garantida pelo filtro `isValidDate` acima. */
const asStr = (v: string | null | undefined): string => (v ?? '') as string;


export interface MachineOEE {
  machineId: string;
  machineName: string;
  machineCode: string;
  techniqueId: string;
  techniqueName: string;
  techniqueColor: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  plannedProductionMinutes: number;
  actualOperatingMinutes: number;
  idealCycleMinutes: number;
  actualCycleMinutes: number;
  totalPiecesProduced: number;
  goodPieces: number;
  lostPieces: number;
  totalJobs: number;
  completedJobs: number;
  oeeClass: 'world-class' | 'excellent' | 'good' | 'acceptable' | 'poor';
  previousOee?: number;
}

export interface TechniqueOEE {
  techniqueId: string;
  techniqueName: string;
  techniqueColor: string;
  machines: MachineOEE[];
  averageOEE: number;
  averageAvailability: number;
  averagePerformance: number;
  averageQuality: number;
}

export interface MaterialOEE {
  material: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  totalPieces: number;
}

export interface StudioOEE {
  studioId: string;
  studioName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  techniqueIds: string[];
  healthScore: number;
  maintenanceStatus: 'optimal' | 'warning' | 'critical';
  consumables: {
    name: string;
    level: number;
  }[];
}

export interface OEEData {
  overallOEE: number;
  overallAvailability: number;
  overallPerformance: number;
  overallQuality: number;
  byMachine: MachineOEE[];
  byTechnique: TechniqueOEE[];
  byMaterial: MaterialOEE[];
  byStudio: StudioOEE[];
  trendData: {
    date: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }[];
  heatmapData: {
    machineId: string;
    machineName: string;
    data: {
      date: string;
      oee: number;
      availability: number;
      performance: number;
      quality: number;
    }[];
  }[];
  maintenanceAlerts: {
    machineId: string;
    machineName: string;
    type: 'performance' | 'quality' | 'availability' | string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    trend: number;
  }[];
  worldClassBenchmark: number;
  availabilityLosses: number;
  performanceLosses: number;
  qualityLosses: number;
  byShift?: {
    shiftId: string;
    shiftName: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }[];
  comparison?: {
    currentOEE: number;
    previousOEE: number;
    currentAvailability: number;
    previousAvailability: number;
    currentPerformance: number;
    previousPerformance: number;
    currentQuality: number;
    previousQuality: number;
  };
}

export const WORLD_CLASS_OEE = 85;

// Static studio→technique mapping — module scope keeps it referentially stable.
const STUDIOS_MAP = [
  { id: 'serigrafia_textil', name: 'Studio Serigrafia Têxtil', techniques: ['serigrafia'] },
  { id: 'serigrafia_cilindrica', name: 'Studio Serigrafia Cilíndrica', techniques: ['serigrafia'] },
  { id: 'serigrafia_vinilica', name: 'Studio Serigrafia Vinílica', techniques: ['serigrafia'] },
  { id: 'personalizacao_uv', name: 'Studio UV Premium', techniques: ['digital_uv', 'uv'] },
  { id: 'laser', name: 'Studio Laser Precision', techniques: ['laser'] }
];

export function classifyOEE(oee: number): MachineOEE['oeeClass'] {
  if (oee >= 85) return 'world-class';
  if (oee >= 75) return 'excellent';
  if (oee >= 65) return 'good';
  if (oee >= 50) return 'acceptable';
  return 'poor';
}

export function getOEEColor(oee: number): string {
  if (oee >= 85) return 'hsl(var(--success))';
  if (oee >= 75) return 'hsl(142 76% 46%)';
  if (oee >= 65) return 'hsl(48 96% 53%)';
  if (oee >= 50) return 'hsl(25 95% 53%)';
  return 'hsl(var(--destructive))';
}

export function useOEE(daysBack: number = 30, comparisonDaysBack: number = 30, filters?: { machineId?: string; startDate?: Date; endDate?: Date; techniqueId?: string; shift?: string }) {
  const effectiveDaysBack = Math.max(daysBack + comparisonDaysBack, 60);
  const { jobs, machines, techniques, isLoading: schedulingLoading } = useSchedulingData();
  const { getConfig, isLoading: configLoading } = useBusinessConfig();
  
  const isLoading = schedulingLoading || configLoading;

  const PLANNED_MINUTES_PER_DAY = useMemo(() => {
    const hours = getConfig('operating_hours', { start: '07:00', end: '18:00' });
    const startParts = (hours.start || '07:00').split(':');
    const endParts = (hours.end || '18:00').split(':');
    const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
    return Math.max(60, endMin - startMin);
  }, [getConfig]);

  const data = useMemo<OEEData | null>(() => {
    if (!jobs || !machines || !techniques) return null;

    const validDaysBack = Math.max(1, Math.min(365, effectiveDaysBack));
    const now = new Date();
    const startDate = filters?.startDate || startOfDay(subDays(now, validDaysBack));
    const endDate = filters?.endDate || endOfDay(now);

    const previousStartDate = startOfDay(subDays(startDate, comparisonDaysBack));
    const previousEndDate = new Date(startOfDay(startDate).getTime() - 1);

    const allRelevantJobs = jobs.filter(job => {
      if (filters?.machineId && job.machine_id !== filters.machineId) return false;
      if (filters?.techniqueId && job.technique_id !== filters.techniqueId) return false;
      if (job.status !== 'finished') return false;
      if (!isValidDate(job.actual_end_time)) return false;
      return true;
    });

    const periodJobs = allRelevantJobs.filter(job => {
      const endTime = parseISO(asStr(job.actual_end_time));
      return isWithinInterval(endTime, { start: startDate, end: endDate });
    });

    const prevPeriodJobs = allRelevantJobs.filter(job => {
      const endTime = parseISO(asStr(job.actual_end_time));
      return isWithinInterval(endTime, { start: previousStartDate, end: previousEndDate });
    });

    const calculateMetrics = (jobList: typeof jobs, machineDays: number = 1, plannedMinPerDay: number) => {
      let actual = 0, estimated = 0, produced = 0, lost = 0;
      for (const job of jobList) {
        if (isValidDate(job.actual_start_time) && isValidDate(job.actual_end_time)) {
          try { 
            const start = parseISO(asStr(job.actual_start_time));
            const end = parseISO(asStr(job.actual_end_time));
            actual += differenceInMinutes(end, start);
          } catch {
            // Datas já validadas acima; ignora qualquer falha residual de parse.
          }
        }
        estimated += sanitizeNumber(job.estimated_duration || 60);
        // Null produced_quantity means "not recorded", not "fully produced as
        // ordered" — falling back to job.quantity fabricated 100% output with
        // zero loss for finished jobs whose production was never logged.
        produced += sanitizeNumber(job.produced_quantity ?? 0);
        lost += sanitizeNumber(job.lost_pieces);
      }
      const planned = Math.max(machineDays * plannedMinPerDay, estimated);
      const avail = planned > 0 ? Math.min(100, (actual / planned) * 100) : 100;
      const perf = actual > 0 ? Math.min(100, (estimated / actual) * 100) : 100;
      const qual = produced > 0 ? Math.max(0, Math.min(100, ((produced - lost) / produced) * 100)) : 100;
      const oee = (avail / 100) * (perf / 100) * (qual / 100) * 100;
      return { oee, avail, perf, qual, actual, estimated, produced, lost, planned };
    };

    const machineOEEMap = new Map<string, MachineOEE>();
    for (const machine of machines) {
      const technique = techniques.find(t => t.id === machine.technique_id);
      if (!technique) continue;

      const machineJobs = periodJobs.filter(j => j.machine_id === machine.id);
      const prevMachineJobs = prevPeriodJobs.filter(j => j.machine_id === machine.id);

      const daysWithJobs = new Set(machineJobs.map(j => startOfDay(parseISO(asStr(j.actual_end_time))).toISOString())).size || 1;
      const prevDaysWithJobs = new Set(prevMachineJobs.map(j => startOfDay(parseISO(asStr(j.actual_end_time))).toISOString())).size || 1;

      const current = calculateMetrics(machineJobs, daysWithJobs, PLANNED_MINUTES_PER_DAY);
      const previous = calculateMetrics(prevMachineJobs, prevDaysWithJobs, PLANNED_MINUTES_PER_DAY);

      machineOEEMap.set(machine.id, {
        machineId: machine.id,
        machineName: machine.name,
        machineCode: machine.code,
        techniqueId: machine.technique_id,
        techniqueName: technique.name,
        techniqueColor: technique.color,
        availability: Math.round(current.avail * 10) / 10,
        performance: Math.round(current.perf * 10) / 10,
        quality: Math.round(current.qual * 10) / 10,
        oee: Math.round(current.oee * 10) / 10,
        previousOee: Math.round(previous.oee * 10) / 10,
        plannedProductionMinutes: current.planned,
        actualOperatingMinutes: current.actual,
        idealCycleMinutes: current.estimated,
        actualCycleMinutes: current.actual,
        totalPiecesProduced: current.produced,
        goodPieces: Math.max(0, current.produced - current.lost),
        lostPieces: current.lost,
        totalJobs: machineJobs.length,
        completedJobs: machineJobs.length,
        oeeClass: classifyOEE(current.oee)
      });
    }

    const byMachine = Array.from(machineOEEMap.values()).sort((a, b) => b.oee - a.oee);

    // Group by shift
    const shifts = ['1', '2', '3'];
    const byShift = shifts.map(sId => {
      const shiftJobs = periodJobs.filter(job => {
        const timeToUse = job.actual_start_time || job.start_time;
        if (!timeToUse) return false;
        const hour = timeToUse.includes('T')
          ? toZonedTime(new Date(timeToUse), SP_TIMEZONE).getHours()
          : parseInt(timeToUse.split(':')[0], 10);
        if (sId === '1' && (hour >= 7 && hour < 15)) return true;
        if (sId === '2' && (hour >= 15 && hour < 23)) return true;
        if (sId === '3' && (hour < 7 || hour >= 23)) return true;
        return false;
      });
      const m = calculateMetrics(shiftJobs, 1, PLANNED_MINUTES_PER_DAY);
      return {
        shiftId: sId,
        shiftName: sId === '1' ? 'Manhã' : sId === '2' ? 'Tarde' : 'Noite',
        oee: Math.round(m.oee * 10) / 10,
        availability: Math.round(m.avail * 10) / 10,
        performance: Math.round(m.perf * 10) / 10,
        quality: Math.round(m.qual * 10) / 10
      };
    });

    // Group by technique
    const byTechnique: TechniqueOEE[] = techniques.map(tech => {
      const techMachines = byMachine.filter(m => m.techniqueId === tech.id);
      if (techMachines.length === 0) return null;
      const count = techMachines.length;
      return {
        techniqueId: tech.id,
        techniqueName: tech.name,
        techniqueColor: tech.color,
        machines: techMachines,
        averageOEE: Math.round(techMachines.reduce((s, m) => s + m.oee, 0) / count * 10) / 10,
        averageAvailability: Math.round(techMachines.reduce((s, m) => s + m.availability, 0) / count * 10) / 10,
        averagePerformance: Math.round(techMachines.reduce((s, m) => s + m.performance, 0) / count * 10) / 10,
        averageQuality: Math.round(techMachines.reduce((s, m) => s + m.quality, 0) / count * 10) / 10,
      };
    }).filter(Boolean) as TechniqueOEE[];

    // Build a map from technique_id → normalized technique name for studio matching
    const techniqueNameById = new Map(
      techniques.map(t => [t.id, t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')])
    );

    // Group by Studio
    const byStudio: StudioOEE[] = STUDIOS_MAP.map(studio => {
      const studioJobs = periodJobs.filter(j => {
        const techName = techniqueNameById.get(j.technique_id) || '';
        return studio.techniques.some(pattern => techName.includes(pattern));
      });
      const daysWithStudioJobs = new Set(
        studioJobs.filter(j => j.actual_end_time).map(j => startOfDay(parseISO(asStr(j.actual_end_time))).toISOString())
      ).size || 1;
      const m = calculateMetrics(studioJobs, daysWithStudioJobs, PLANNED_MINUTES_PER_DAY);

      // Derive health score from actual OEE data. There is no real
      // consumable/wear-level data source (no sensor/inventory feed for
      // lamp/ink/optics wear per studio) — previously this was overwritten
      // with hardcoded per-studio literals presented as live status, which
      // never changed regardless of actual machine condition. Left empty
      // rather than fabricated; wire to a real source (inventory_items /
      // machine_health_metrics) when one exists.
      const healthScore = Math.round(Math.max(0, Math.min(100, m.oee)));
      let maintenanceStatus: StudioOEE['maintenanceStatus'] = 'optimal';
      if (healthScore < 60) maintenanceStatus = 'critical';
      else if (healthScore < 80) maintenanceStatus = 'warning';
      const consumables: StudioOEE['consumables'] = [];

      return {
        studioId: studio.id,
        studioName: studio.name,
        oee: Math.round(m.oee * 10) / 10,
        availability: Math.round(m.avail * 10) / 10,
        performance: Math.round(m.perf * 10) / 10,
        quality: Math.round(m.qual * 10) / 10,
        techniqueIds: studio.techniques,
        healthScore,
        maintenanceStatus,
        consumables
      };
    });

    // Group by Material (Inferred from product name)
    const materialsList = ['Metal', 'Plástico', 'Têxtil', 'Papel', 'Couro', 'Vidro', 'Cerâmica'];
    const materialJobsMap = new Map<string, typeof periodJobs>();

    periodJobs.forEach(job => {
      const product = job.product?.toLowerCase() || '';
      let material = 'Outros';
      for (const m of materialsList) {
        if (product.includes(m.toLowerCase())) {
          material = m;
          break;
        }
      }
      const existing = materialJobsMap.get(material) || [];
      existing.push(job);
      materialJobsMap.set(material, existing);
    });

    const byMaterial = Array.from(materialJobsMap.entries()).map(([material, matJobs]) => {
      const daysWithMatJobs = new Set(
        matJobs.filter(j => j.actual_end_time).map(j => startOfDay(parseISO(asStr(j.actual_end_time))).toISOString())
      ).size || 1;
      const m = calculateMetrics(matJobs, daysWithMatJobs, PLANNED_MINUTES_PER_DAY);
      const totalPieces = matJobs.reduce((s, j) => s + sanitizeNumber(j.produced_quantity ?? 0), 0);
      return {
        material,
        oee: Math.round(m.oee * 10) / 10,
        availability: Math.round(m.avail * 10) / 10,
        performance: Math.round(m.perf * 10) / 10,
        quality: Math.round(m.qual * 10) / 10,
        totalPieces,
      };
    });

    // ISO 22400-2: aggregate raw production totals first, then compute ratios.
    // An arithmetic mean of per-machine OEE ratios is mathematically incorrect
    // (it weights idle machines equally with busy ones).
    const globalOEE = calculateRealOEE(periodJobs);
    const overallOEE = globalOEE.oee;
    const overallAvailability = globalOEE.availability;
    const overallPerformance = globalOEE.performance;
    const overallQuality = globalOEE.quality;

    const prevMetrics = calculateMetrics(prevPeriodJobs, Math.max(1, comparisonDaysBack), PLANNED_MINUTES_PER_DAY);
    const prevOEE = Math.round(prevMetrics.oee * 10) / 10;
    const prevAvail = Math.round(prevMetrics.avail * 10) / 10;
    const prevPerf = Math.round(prevMetrics.perf * 10) / 10;
    const prevQual = Math.round(prevMetrics.qual * 10) / 10;

    // Group periodJobs by date for efficient trend calculation
    const jobsByDate = new Map<string, typeof periodJobs>();
    periodJobs.forEach(job => {
      const dateKey = startOfDay(parseISO(asStr(job.actual_end_time))).toISOString();
      const existing = jobsByDate.get(dateKey) || [];
      existing.push(job);
      jobsByDate.set(dateKey, existing);
    });

    const trendData: OEEData['trendData'] = [];
    for (let i = validDaysBack - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateKey = startOfDay(date).toISOString();
      const dayJobs = jobsByDate.get(dateKey) || [];
      const m = calculateMetrics(dayJobs, 1, PLANNED_MINUTES_PER_DAY);
      trendData.push({
        date: dateKey,
        oee: Math.round(m.oee * 10) / 10,
        availability: Math.round(m.avail * 10) / 10,
        performance: Math.round(m.perf * 10) / 10,
        quality: Math.round(m.qual * 10) / 10
      });
    }

    const heatmapData = byMachine.map(machine => {
      const machineDayData = [];
      const machineDateJobs = periodJobs.filter(j => j.machine_id === machine.machineId);
      const mJobsByDate = new Map<string, typeof periodJobs>();
      machineDateJobs.forEach(job => {
        const dateKey = startOfDay(parseISO(asStr(job.actual_end_time))).toISOString();
        const existing = mJobsByDate.get(dateKey) || [];
        existing.push(job);
        mJobsByDate.set(dateKey, existing);
      });

      for (let i = validDaysBack - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateKey = startOfDay(date).toISOString();
        const dayJobs = mJobsByDate.get(dateKey) || [];
        const m = calculateMetrics(dayJobs, 1, PLANNED_MINUTES_PER_DAY);
        machineDayData.push({
          date: startOfDay(date).toISOString(),
          oee: Math.round(m.oee * 10) / 10,
          availability: Math.round(m.avail * 10) / 10,
          performance: Math.round(m.perf * 10) / 10,
          quality: Math.round(m.qual * 10) / 10
        });
      }
      return {
        machineId: machine.machineId,
        machineName: machine.machineName,
        data: machineDayData
      };
    });

    return {
      overallOEE: Math.round(overallOEE * 10) / 10,
      overallAvailability: Math.round(overallAvailability * 10) / 10,
      overallPerformance: Math.round(overallPerformance * 10) / 10,
      overallQuality: Math.round(overallQuality * 10) / 10,
      byMachine,
      byTechnique,
      byMaterial,
      byStudio,
      trendData,
      heatmapData,
      maintenanceAlerts: byMachine
        .filter(m => m.oee < 65 || m.quality < 90 || m.availability < 80)
        .map(m => {
          const isQuality = m.quality < 90;
          const isAvail = m.availability < 80;
          const type = isAvail ? 'availability' : isQuality ? 'quality' : 'performance';
          const val = isAvail ? m.availability : isQuality ? m.quality : m.performance;
          const trend = m.previousOee !== undefined ? Math.round((m.oee - m.previousOee) * 10) / 10 : 0;
          const severity: 'high' | 'medium' | 'low' = val < 60 ? 'high' : val < 75 ? 'medium' : 'low';
          const messages: Record<string, string> = {
            availability: `Disponibilidade crítica (${m.availability}%). Verificar paradas não planejadas.`,
            quality: `Taxa de qualidade abaixo do aceitável (${m.quality}%). Revisar processo.`,
            performance: `Performance reduzida (${m.performance}%). Verificar velocidade de ciclo.`,
          };
          return {
            machineId: m.machineId,
            machineName: m.machineName,
            type,
            severity,
            message: messages[type],
            trend,
          };
        })
        .slice(0, 5),
      worldClassBenchmark: WORLD_CLASS_OEE,
      availabilityLosses: 100 - overallAvailability,
      performanceLosses: 100 - overallPerformance,
      qualityLosses: 100 - overallQuality,
      byShift,
      comparison: {
        currentOEE: overallOEE,
        previousOEE: prevOEE,
        currentAvailability: overallAvailability,
        previousAvailability: prevAvail,
        currentPerformance: overallPerformance,
        previousPerformance: prevPerf,
        currentQuality: overallQuality,
        previousQuality: prevQual,
      }
    };
  }, [jobs, machines, techniques, effectiveDaysBack, daysBack, comparisonDaysBack, filters, PLANNED_MINUTES_PER_DAY]);

  const downloadReport = async (format: 'excel' | 'pdf' | 'csv') => {
    // Basic implementation
    logger.debug(`Downloading ${format} report`, undefined, 'useOEE');
  };

  return { data, isLoading, downloadReport };
}

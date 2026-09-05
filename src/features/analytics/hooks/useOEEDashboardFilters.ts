import { useState, useMemo, useCallback } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toast } from 'sonner';

export interface OEEDashboardFilters {
  period: string;
  machineId: string;
  techniqueId: string;
  studioId: string;
  shift: string;
  activeTab: string;
}

export interface OEEDateRange {
  start: Date;
  end: Date;
}

export interface OEEQueryFilters {
  machineId?: string;
  techniqueId?: string;
  shift?: string;
  startDate: Date;
  endDate: Date;
}

export interface OEELossFilters extends Omit<OEEQueryFilters, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string;
}

function readUrlParam(key: string, fallback: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? fallback;
}

export function useOEEDashboardFilters() {
  const [period, setPeriod] = useState(() => readUrlParam('period', '30'));
  const [machineId, setMachineId] = useState(() => readUrlParam('machineId', 'all'));
  const [techniqueId, setTechniqueId] = useState(() => readUrlParam('techniqueId', 'all'));
  const [studioId, setStudioId] = useState(() => readUrlParam('studioId', 'all'));
  const [shift, setShift] = useState(() => readUrlParam('shift', 'all'));
  const [activeTab, setActiveTab] = useState(() => readUrlParam('tab', 'overview'));

  const dateRange = useMemo<OEEDateRange>(() => {
    const now = new Date();
    return {
      start: startOfDay(subDays(now, parseInt(period, 10))),
      end: endOfDay(now),
    };
  }, [period]);

  const oeeFilters = useMemo<OEEQueryFilters>(() => ({
    machineId: machineId === 'all' ? undefined : machineId,
    techniqueId: techniqueId === 'all' ? undefined : techniqueId,
    shift: shift === 'all' ? undefined : shift,
    startDate: dateRange.start,
    endDate: dateRange.end,
  }), [machineId, techniqueId, shift, dateRange]);

  const lossFilters = useMemo<OEELossFilters>(() => ({
    ...oeeFilters,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  }), [oeeFilters, dateRange]);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams({ period, machineId, techniqueId, shift, tab: activeTab });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de compartilhamento copiado!', {
      description: 'Todos os filtros atuais foram incluídos no link.',
    });
  }, [period, machineId, techniqueId, shift, activeTab]);

  return {
    period, setPeriod,
    machineId, setMachineId,
    techniqueId, setTechniqueId,
    studioId, setStudioId,
    shift, setShift,
    activeTab, setActiveTab,
    dateRange,
    oeeFilters,
    lossFilters,
    handleShare,
  };
}

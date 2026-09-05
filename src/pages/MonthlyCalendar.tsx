import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarRange, Info, Clock, User } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
const CalendarHeader = lazy(() => import('@/components/calendar/CalendarHeader').then(m => ({ default: m.CalendarHeader })));
const CalendarFilters = lazy(() => import('@/components/calendar/CalendarFilters').then(m => ({ default: m.CalendarFilters })));
import { CalendarLegend } from '@/components/calendar/CalendarLegend';
import { CalendarEmptyState } from '@/components/calendar/CalendarEmptyState';
import { MobileFAB } from '@/components/calendar/MobileFAB';
import { useSchedulingData } from '@/features/jobs';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { useCalendarFilters } from '@/hooks/useCalendarFilters';
import { useCalendarHotkeys } from '@/hooks/useCalendarHotkeys';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateUtils';
import { statusColors, statusLabels } from '@/components/calendar/types';
import { JobStatus } from '@/types/scheduling';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function MonthlyCalendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { jobs, techniques, machines } = useSchedulingData();
  const {
    filters,
    updateFilter,
    toggleArrayValue,
    clearFilters,
    activeCount,
    applyFilters,
  } = useCalendarFilters('monthly-calendar-filters-v1');

  useCalendarHotkeys({ selectedDate, onDateChange: setSelectedDate, scope: 'monthly' });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const filteredJobs = useMemo(() => applyFilters(jobs), [jobs, applyFilters]);

  const jobsByDay = useMemo(() => {
    const acc: Record<string, typeof filteredJobs> = {};
    filteredJobs.forEach((job) => {
      const d = parseDateOnly(job.scheduled_date);
      if (!d) return;
      const k = format(d, 'yyyy-MM-dd');
      if (!acc[k]) acc[k] = [];
      acc[k].push(job);
    });
    return acc;
  }, [filteredJobs]);

  const maxJobsInDay = useMemo(
    () => Math.max(1, ...Object.values(jobsByDay).map(v => v.length)),
    [jobsByDay]
  );

  const monthJobCount = useMemo(
    () =>
      filteredJobs.filter((j) => {
        const d = parseDateOnly(j.scheduled_date);
        return !!d && d >= monthStart && d <= monthEnd;
      }).length,
    [filteredJobs, monthStart, monthEnd]
  );

  const handleDayClick = (day: Date) => {
    navigate(`/calendar/daily?date=${format(day, 'yyyy-MM-dd')}`);
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in-up calendar-print-area">
        <Breadcrumbs />

        <SectionErrorBoundary compact><Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <CalendarHeader
            title="Calendário Mensal"
            subtitle="Visão panorâmica do mês com mapa de carga"
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onPrev={() => setSelectedDate(subMonths(selectedDate, 1))}
            onNext={() => setSelectedDate(addMonths(selectedDate, 1))}
            onToday={() => setSelectedDate(new Date())}
            conflictCount={0}
            jobCount={monthJobCount}
            rangeLabel={format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            todayLabel="Este Mês"
            filtersSlot={
              <CalendarFilters
                filters={filters}
                jobs={jobs}
                techniques={techniques}
                machines={machines}
                activeCount={activeCount}
                onToggle={toggleArrayValue}
                onUpdate={updateFilter}
                onClear={clearFilters}
              />
            }
          />
        </Suspense></SectionErrorBoundary>

        <Card className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-lg text-title gradient-text flex items-center gap-2">
                <CalendarRange className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {monthJobCount} agendamento{monthJobCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {monthJobCount === 0 ? (
              <CalendarEmptyState hasFilters={activeCount > 0} onClearFilters={clearFilters} />
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((day) => {
                    const k = format(day, 'yyyy-MM-dd');
                    const dayJobs = jobsByDay[k] || [];
                    const count = dayJobs.length;
                    const ratio = count / maxJobsInDay;
                    const inMonth = isSameMonth(day, selectedDate);
                    const today = isToday(day);
                    const selected = isSameDay(day, selectedDate);


                    return (
                      <Popover key={k}>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              'aspect-square sm:aspect-[4/3] p-1.5 sm:p-2 rounded-lg text-left',
                              'border transition-all duration-200',
                              'hover:scale-[1.03] hover:border-primary/40 hover:shadow-md',
                              'focus:outline-none focus:ring-2 focus:ring-primary/40',
                              'flex flex-col justify-between',
                              inMonth ? 'border-border/40' : 'border-border/10 opacity-40',
                              today && 'border-primary/60 ring-1 ring-primary/40',
                              selected && 'bg-primary/5'
                            )}
                            style={{
                              background:
                                dayJobs.length > 0
                                  ? `hsl(var(--primary) / ${0.06 + ratio * 0.28})`
                                  : undefined,
                            }}
                            aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}: ${dayJobs.length} agendamento${dayJobs.length !== 1 ? 's' : ''}`}
                          >
                            <div className="flex items-start justify-between w-full">
                              <span
                                className={cn(
                                  'text-xs sm:text-sm font-semibold',
                                  today ? 'text-primary' : inMonth ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                              {today && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
                            </div>
                            {dayJobs.length > 0 && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-2xl text-title font-bold text-primary leading-none">
                                  {dayJobs.length}
                                </span>
                                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                  job{dayJobs.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 overflow-hidden bg-card border-border/40 shadow-2xl">
                          <div className="bg-muted/30 p-3 border-b border-border/40 flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold">{format(day, "dd 'de' MMMM", { locale: ptBR })}</h3>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{dayJobs.length} agendamentos</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDayClick(day)} className="h-8 text-xs gap-1.5">
                              Abrir dia <Info className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <ScrollArea className="max-h-[300px]">
                            <div className="p-2 space-y-2">
                              {dayJobs.map((job) => (
                                <div key={job.id} className="p-2 rounded-md bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors cursor-pointer group">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {job.order_number}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">{job.client}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0", statusColors[job.status as JobStatus])}>
                                      {statusLabels[job.status as JobStatus]}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {job.start_time} - {job.end_time}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="w-2.5 h-2.5" />
                                      {machines.find(m => m.id === job.machine_id)?.code || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 text-xs text-muted-foreground">
                  <span>Carga:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--primary) / 0.08)' }} />
                    <span>baixa</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--primary) / 0.20)' }} />
                    <span>média</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--primary) / 0.34)' }} />
                    <span>alta</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <CalendarLegend />
      </div>

      <MobileFAB />
    </MainLayout>
  );
}

import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  title: string;
  subtitle: string;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode?: 'timeline' | 'agenda';
  onViewModeChange?: (mode: 'timeline' | 'agenda') => void;
  showViewToggle?: boolean;
  filtersSlot?: React.ReactNode;
  conflictCount?: number;
  jobCount: number;
  rangeLabel?: string;
  todayLabel?: string;
}

export function CalendarHeader({
  title,
  subtitle,
  selectedDate,
  onDateChange,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
  showViewToggle,
  filtersSlot,
  conflictCount = 0,
  jobCount,
  rangeLabel,
  todayLabel = 'Hoje',
}: CalendarHeaderProps) {
  const dateLabel = rangeLabel ?? format(selectedDate, "dd MMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-title gradient-text">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            {jobCount} job{jobCount !== 1 ? 's' : ''}
          </Badge>
          {conflictCount > 0 && (
            <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5 animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {conflictCount} conflito{conflictCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {filtersSlot}

        <div className="flex items-center justify-between sm:justify-start gap-1 bg-card border border-border/40 rounded-lg p-1 w-full sm:w-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 sm:px-3 gap-1 sm:gap-2 flex-1 sm:flex-initial">
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium text-sm">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className={cn(
              'border-border/40 ml-1',
              isToday(selectedDate) && 'bg-primary/10 text-primary border-primary/30'
            )}
          >
            {todayLabel}
          </Button>
        </div>

        {showViewToggle && viewMode && onViewModeChange && (
          <div className="hidden sm:flex items-center gap-1 bg-card border border-border/40 rounded-lg p-1">
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('timeline')}
              className="h-8 px-3"
              aria-label="Vista Timeline"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Timeline
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('agenda')}
              className="h-8 px-3"
              aria-label="Vista Agenda"
            >
              <List className="h-4 w-4 mr-1" />
              Agenda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

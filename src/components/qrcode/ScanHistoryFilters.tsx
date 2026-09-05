import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { User, Play, Eye, Pause, RotateCcw, CheckCircle2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const actionConfig: Record<string, { label: string; icon: typeof Play }> = {
  view: { label: "Visualizou", icon: Eye },
  start: { label: "Iniciou", icon: Play },
  pause: { label: "Pausou", icon: Pause },
  resume: { label: "Retomou", icon: RotateCcw },
  finish: { label: "Finalizou", icon: CheckCircle2 },
};

interface ScanHistoryFiltersProps {
  operatorFilter: string;
  actionFilter: string;
  dateRange: DateRange | undefined;
  operators: { id: string; name: string }[];
  hasActiveFilters: boolean;
  onOperatorFilterChange: (v: string) => void;
  onActionFilterChange: (v: string) => void;
  onDateRangeChange: (v: DateRange | undefined) => void;
  onClear: () => void;
}

export function ScanHistoryFilters({
  operatorFilter, actionFilter, dateRange, operators, hasActiveFilters,
  onOperatorFilterChange, onActionFilterChange, onDateRangeChange, onClear
}: ScanHistoryFiltersProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Filtros</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs gap-1">
            <X className="h-3 w-3" />Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="scan-operator-filter" className="text-xs text-muted-foreground">Operador</label>
          <Select value={operatorFilter} onValueChange={onOperatorFilterChange}>
            <SelectTrigger id="scan-operator-filter" className="h-9"><User className="h-3 w-3 mr-2 text-muted-foreground" /><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os operadores</SelectItem>
              {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="scan-action-filter" className="text-xs text-muted-foreground">Tipo de Ação</label>
          <Select value={actionFilter} onValueChange={onActionFilterChange}>
            <SelectTrigger id="scan-action-filter" className="h-9"><Play className="h-3 w-3 mr-2 text-muted-foreground" /><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {Object.entries(actionConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2"><config.icon className="h-3 w-3" />{config.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="scan-period-filter" className="text-xs text-muted-foreground">Período</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="scan-period-filter" variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !dateRange?.from && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3 mr-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span className="text-xs">{format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}</span>
                  ) : <span className="text-xs">{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}</span>
                ) : <span className="text-xs">Selecionar datas</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={1} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import {
  CalendarFilterState,
  statusLabels,
  PRIORITY_LABELS,
} from './types';
import { JobStatus } from '@/types/scheduling';

interface CalendarFiltersProps {
  filters: CalendarFilterState;
  jobs: DbJob[];
  techniques: DbTechnique[];
  machines: DbMachine[];
  activeCount: number;
  onToggle: (
    key: 'techniques' | 'machines' | 'statuses' | 'priorities' | 'clients',
    value: string
  ) => void;
  onUpdate: <K extends keyof CalendarFilterState>(key: K, value: CalendarFilterState[K]) => void;
  onClear: () => void;
}

interface FilterSectionProps {
  title: string;
  items: { value: string; label: string; color?: string }[];
  selected: string[];
  onItemToggle: (v: string) => void;
}

function FilterSection({ title, items, selected, onItemToggle }: FilterSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{title}</Label>
        {selected.length > 0 && (
          <button
            onClick={() => selected.forEach(onItemToggle)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            limpar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = selected.includes(item.value);
          return (
            <button
              key={item.value}
              onClick={() => onItemToggle(item.value)}
              className={cn(
                'px-2 py-1 rounded-md text-xs border transition-all',
                active
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-card border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {item.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarFilters({
  filters,
  jobs,
  techniques,
  machines,
  activeCount,
  onToggle,
  onUpdate,
  onClear,
}: CalendarFiltersProps) {
  const [open, setOpen] = useState(false);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.client))).sort();
  }, [jobs]);

  const statusEntries = Object.entries(statusLabels) as [JobStatus, string][];
  const priorityEntries = Object.entries(PRIORITY_LABELS);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 sm:flex-initial sm:w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={filters.searchQuery}
          onChange={(e) => onUpdate('searchQuery', e.target.value)}
          placeholder="Buscar OS, cliente, produto..."
          className="pl-8 h-9 bg-card border-border/40 text-sm"
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 gap-2 bg-card border-border/40',
              activeCount > 0 && 'border-primary/40 text-primary'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-0 bg-popover">
          <div className="flex items-center justify-between p-3 border-b border-border/40">
            <span className="font-semibold text-sm">Filtros avançados</span>
            <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
              Limpar tudo
            </Button>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-3 space-y-4">
              <FilterSection
                title="Técnicas"
                items={techniques.map((t) => ({ value: t.id, label: t.short_name || t.name, color: t.color }))}
                selected={filters.techniques}
                onItemToggle={(v) => onToggle('techniques', v)}
              />
              <Separator />
              <FilterSection
                title="Status"
                items={statusEntries.map(([value, label]) => ({ value, label }))}
                selected={filters.statuses}
                onItemToggle={(v) => onToggle('statuses', v)}
              />
              <Separator />
              <FilterSection
                title="Prioridade"
                items={priorityEntries.map(([value, label]) => ({ value, label }))}
                selected={filters.priorities}
                onItemToggle={(v) => onToggle('priorities', v)}
              />
              {uniqueClients.length > 0 && uniqueClients.length <= 30 && (
                <>
                  <Separator />
                  <FilterSection
                    title="Clientes"
                    items={uniqueClients.map((c) => ({ value: c, label: c }))}
                    selected={filters.clients}
                    onItemToggle={(v) => onToggle('clients', v)}
                  />
                </>
              )}
              <Separator />
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="onlyDelayed" className="text-sm cursor-pointer">
                    Só com atrasos
                  </Label>
                  <Switch
                    id="onlyDelayed"
                    checked={filters.onlyDelayed}
                    onCheckedChange={(v) => onUpdate('onlyDelayed', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="onlyProd" className="text-sm cursor-pointer">
                    Só em produção
                  </Label>
                  <Switch
                    id="onlyProd"
                    checked={filters.onlyInProduction}
                    onCheckedChange={(v) => onUpdate('onlyInProduction', v)}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}

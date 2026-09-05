import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Search, Filter, LayoutGrid, List, Layers,
  AlertCircle, ArrowUp, ArrowDown, Minus, X, Plus, Wand2
} from 'lucide-react';
import { DbMachine } from '@/features/jobs';
import { useNavigate } from 'react-router-dom';
import { useSmartSequencing } from '@/features/jobs';
import { toast } from 'sonner';

export type ViewMode = 'expanded' | 'compact';
export type SwimlanesMode = 'none' | 'technique' | 'machine';

interface KanbanFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTechnique: string;
  onTechniqueChange: (value: string) => void;
  selectedPriority: string;
  onPriorityChange: (value: string) => void;
  selectedMachine: string;
  onMachineChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  swimlanesMode: SwimlanesMode;
  onSwimlanesChange: (mode: SwimlanesMode) => void;
  techniques: { id: string; name: string; color: string }[];
  machines: DbMachine[];
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export function KanbanFiltersBar({
  searchTerm, onSearchChange,
  selectedTechnique, onTechniqueChange,
  selectedPriority, onPriorityChange,
  selectedMachine, onMachineChange,
  viewMode, onViewModeChange,
  swimlanesMode, onSwimlanesChange,
  techniques, machines,
  activeFiltersCount, onClearFilters,
}: KanbanFiltersBarProps) {
  const navigate = useNavigate();
  const { hasSuggestions, suggestions } = useSmartSequencing();

  const handleSmartOptimization = () => {
    if (!hasSuggestions) {
      toast.info("Nenhuma otimização de setup encontrada para o cenário atual.");
      return;
    }
    toast.success(`IA identificou ${suggestions.length} máquinas que podem ser otimizadas para reduzir setup.`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jobs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-card/50 border-border/50 h-9 text-sm"
          />
        </div>

        {/* Technique */}
        <Select value={selectedTechnique} onValueChange={onTechniqueChange}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border/50 h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Técnica" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas técnicas</SelectItem>
            {techniques.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={selectedPriority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px] bg-card/50 border-border/50 h-9 text-sm">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="urgent">
              <span className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-red-400" /> Urgente</span>
            </SelectItem>
            <SelectItem value="high">
              <span className="flex items-center gap-1.5"><ArrowUp className="h-3 w-3 text-orange-400" /> Alta</span>
            </SelectItem>
            <SelectItem value="medium">
              <span className="flex items-center gap-1.5"><Minus className="h-3 w-3 text-yellow-400" /> Média</span>
            </SelectItem>
            <SelectItem value="low">
              <span className="flex items-center gap-1.5"><ArrowDown className="h-3 w-3 text-green-400" /> Baixa</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Machine */}
        <Select value={selectedMachine} onValueChange={onMachineChange}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border/50 h-9 text-sm">
            <SelectValue placeholder="Máquina" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todas máquinas</SelectItem>
            {machines.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Limpar ({activeFiltersCount})
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button 
            className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 group relative overflow-hidden h-9" 
            variant="outline"
            onClick={handleSmartOptimization}
          >
            <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">IA Otimizar</span>
            {hasSuggestions && (
              <span className="absolute inset-0 bg-primary/10 motion-safe:animate-pulse-glow pointer-events-none" />
            )}
          </Button>

          <Button className="gap-2 h-9" onClick={() => navigate('/jobs/new')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Job</span>
          </Button>
        </div>

        {/* Swimlanes */}
        <Select value={swimlanesMode} onValueChange={(v) => onSwimlanesChange(v as SwimlanesMode)}>
          <SelectTrigger className="w-[140px] bg-card/50 border-border/50 h-9 text-sm">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="none">Sem swimlanes</SelectItem>
            <SelectItem value="technique">Por técnica</SelectItem>
            <SelectItem value="machine">Por máquina</SelectItem>
          </SelectContent>
        </Select>

        {/* View mode */}
        <div className="flex items-center border border-border/50 rounded-md">
          <Toggle
            pressed={viewMode === 'expanded'}
            onPressedChange={() => onViewModeChange('expanded')}
            size="sm"
            className="rounded-r-none h-9 px-2.5"
            aria-label="Visão expandida"
          >
            <LayoutGrid className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={viewMode === 'compact'}
            onPressedChange={() => onViewModeChange('compact')}
            size="sm"
            className="rounded-l-none h-9 px-2.5"
            aria-label="Visão compacta"
          >
            <List className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
}

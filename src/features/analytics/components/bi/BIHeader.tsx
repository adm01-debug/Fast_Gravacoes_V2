import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { BarChart3, Activity, GitCompare, Command } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BIHeaderProps {
  comparisonMode: boolean;
  setComparisonMode: (v: boolean) => void;
  onNavigate: (path: string) => void;
}

export function BIHeader({ comparisonMode, setComparisonMode, onNavigate }: BIHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-title flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 shadow-glow-primary">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <span className="gradient-text">Business Intelligence</span>
          </h1>
          <FavoriteButton path="/bi" name="Business Intelligence" />
        </div>
        <p className="text-muted-foreground mt-1">
          Visão executiva consolidada • Atualizado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-4 animate-slide-left">
        <FavoritesDropdown onNavigate={onNavigate} />
        <Badge variant="outline" className="hidden md:flex gap-1.5 cursor-pointer hover:bg-muted transition-colors">
          <Command className="h-3 w-3" />
          <span className="text-xs">⌘K</span>
        </Badge>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg">
          <Switch id="comparison-mode" checked={comparisonMode} onCheckedChange={setComparisonMode} />
          <Label htmlFor="comparison-mode" className="text-sm cursor-pointer flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Comparar Períodos
          </Label>
        </div>
        <Badge variant="outline" className="text-sm border-primary/30 bg-primary/5 animate-pulse-glow">
          <Activity className="h-3 w-3 mr-1 text-primary" />
          Dados em tempo real
        </Badge>
      </div>
    </div>
  );
}

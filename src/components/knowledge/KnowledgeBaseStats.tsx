import { Card } from '@/components/ui/card';
import { BookOpen, CheckCircle2, Clock, Layers } from 'lucide-react';
import { TechnicalSheet } from '@/hooks/useTechnicalSheets';

interface KnowledgeBaseStatsProps {
  sheets: TechnicalSheet[];
  techniques: Array<{ id: string; name: string; color: string }>;
}

export const KnowledgeBaseStats = ({ sheets, techniques }: KnowledgeBaseStatsProps) => {
  const totalSheets = sheets.length;
  const avgTime = sheets.reduce((sum, s) => sum + (s.estimated_time_minutes || 0), 0) / (totalSheets || 1);
  const techniquesUsed = new Set(sheets.map(s => s.technique_id)).size;
  const totalViews = sheets.reduce((sum, s) => sum + (s.view_count || 0), 0);
  const withSteps = sheets.filter(s => s.description).length;

  const stats = [
    {
      label: 'Total de Fichas',
      value: totalSheets,
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Técnicas Cobertas',
      value: techniquesUsed,
      icon: Layers,
      color: 'text-accent-foreground',
      bg: 'bg-accent/50',
    },
    {
      label: 'Tempo Médio',
      value: `${Math.round(avgTime)}min`,
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
    },
    {
      label: 'Total de Acessos',
      value: totalViews,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-card border-border/50 p-3 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${stat.bg}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudioOEE, getOEEColor } from '@/features/production';
import { cn } from '@/lib/utils';
import { Activity, Droplets, Zap, Sparkles, Printer } from 'lucide-react';

interface StudioEfficiencyGridProps {
  studios: StudioOEE[];
}

const STUDIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'serigrafia_textil': Printer,
  'serigrafia_cilindrica': Droplets,
  'serigrafia_vinilica': Droplets,
  'personalizacao_uv': Zap,
  'laser': Sparkles,
};

export function StudioEfficiencyGrid({ studios }: StudioEfficiencyGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {studios.map((studio) => {
        const Icon = STUDIO_ICONS[studio.studioId] || Activity;
        return (
          <Card key={studio.studioId} className="bg-black/20 border-primary/20 hover:border-primary/40 transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Icon className="h-24 w-24" />
            </div>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {studio.studioName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black" style={{ color: getOEEColor(studio.oee) }}>
                    {studio.oee.toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">OEE Global</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/5 border-primary/20">
                  {studio.oee >= 85 ? 'World Class' : studio.oee >= 70 ? 'Excellent' : 'In Progress'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                <div className="text-center">
                  <p className="text-[11px] font-black">{studio.availability.toFixed(0)}%</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Disp</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black">{studio.performance.toFixed(0)}%</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Perf</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black">{studio.quality.toFixed(0)}%</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Qual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

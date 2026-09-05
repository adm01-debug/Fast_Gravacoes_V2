import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from '@/lib/recharts';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface ShiftData {
  shiftId: string;
  shiftName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface OEEShiftComparisonProps {
  shifts: ShiftData[];
}

export const OEEShiftComparison = memo(function OEEShiftComparison({ shifts }: OEEShiftComparisonProps) {
  const chartData = shifts.map(s => ({
    name: s.shiftName,
    OEE: s.oee,
    Disp: s.availability,
    Perf: s.performance,
    Qual: s.quality,
    color: s.shiftId === '1' ? 'hsl(var(--primary))' : s.shiftId === '2' ? 'hsl(var(--indicator-info))' : 'hsl(var(--accent-purple))'
  }));

  const bestShift = [...shifts].sort((a, b) => b.oee - a.oee)[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-primary/10 bg-black/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Performance por Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                domain={[0, 100]}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Bar dataKey="OEE" radius={[4, 4, 0, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-success/20 bg-success/5 h-full flex flex-col justify-center p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <TrendingUp className="h-32 w-32 text-success" />
          </div>
          <p className="text-[10px] font-black uppercase text-success tracking-widest mb-1">Melhor Turno</p>
          <h3 className="text-3xl font-black">{bestShift?.shiftName}</h3>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-4xl font-black text-success">{bestShift?.oee}%</p>
            <p className="text-xs font-bold text-success/60 pb-1">OEE MÉDIO</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Este turno apresenta a maior consistência operacional no período selecionado.
          </p>
        </Card>

        <Card className="border-indicator-warning/20 bg-indicator-warning/5 p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-indicator-warning" />
            <p className="text-[10px] font-black uppercase text-indicator-warning tracking-widest">Oportunidade</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A diferença de <span className="font-bold text-indicator-warning">{(bestShift?.oee - Math.min(...shifts.map(s => s.oee))).toFixed(1)}%</span> entre os turnos sugere potencial de padronização de processos e treinamentos.
          </p>
        </Card>
      </div>
    </div>
  );
});

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialOEE, getOEEColor } from '@/features/production';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend } from '@/lib/recharts';
import { Layers, Thermometer, ShieldCheck, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MaterialEfficiencyChartProps {
  materials: MaterialOEE[];
}

export function MaterialEfficiencyChart({ materials }: MaterialEfficiencyChartProps) {
  const sortedData = [...materials].sort((a, b) => b.oee - a.oee);

  // Material specific recommendations based on performance
  const getMaterialInsight = (m: MaterialOEE) => {
    if (m.material === 'Metal' && m.oee < 80) return "Aumentar tempo de pré-aquecimento para melhor aderência.";
    if (m.material === 'Plástico' && m.quality < 95) return "Verificar temperatura de cura UV para evitar deformação.";
    if (m.material === 'Têxtil' && m.performance < 75) return "Otimizar tempo de secagem entre camadas de tinta.";
    if (m.oee < 70) return "Revisar parâmetros de gravação e pressão do rodo.";
    return "Performance estável. Manter parâmetros atuais.";
  };

  return (
    <Card className="border-primary/20 bg-muted/5 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Box className="h-24 w-24 text-primary" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Inteligência de Materiais (OEE 10/10)
          </CardTitle>
          <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 bg-primary/5 text-primary">
            Análise em Tempo Real
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Performance Industrial por Substrato</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="h-[280px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                dataKey="material" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={4} textAnchor="end" fill="rgba(255,255,255,0.7)" fontSize={10} fontWeight="900" className="uppercase tracking-tighter">
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
                width={70}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MaterialOEE;
                    return (
                      <div className="bg-black/95 border border-primary/30 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                        <p className="text-[10px] font-black uppercase text-primary mb-2 border-b border-primary/10 pb-1">{data.material}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">OEE:</span>
                          <span className="text-[10px] font-black text-right" style={{ color: getOEEColor(data.oee) }}>{data.oee.toFixed(1)}%</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Disp.:</span>
                          <span className="text-[10px] font-black text-right">{data.availability.toFixed(1)}%</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Perf.:</span>
                          <span className="text-[10px] font-black text-right">{data.performance.toFixed(1)}%</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Qual.:</span>
                          <span className="text-[10px] font-black text-right">{data.quality.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="oee" radius={[0, 4, 4, 0]} barSize={16}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getOEEColor(entry.oee)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-2">Insights por Substrato</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedData.slice(0, 4).map((m) => (
              <div key={m.material} className="p-3 rounded-xl bg-background/40 border border-primary/10 hover:border-primary/30 transition-all group/item">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/5 group-hover/item:bg-primary/10 transition-colors">
                      {m.material === 'Metal' ? <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> :
                       m.material === 'Plástico' ? <Thermometer className="h-3.5 w-3.5 text-orange-400" /> :
                       <Box className="h-3.5 w-3.5 text-purple-400" />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight">{m.material}</span>
                  </div>
                  <span className="text-sm font-black italic" style={{ color: getOEEColor(m.oee) }}>{m.oee.toFixed(1)}%</span>
                </div>
                <p className="text-[9px] font-medium leading-relaxed text-muted-foreground">
                  {getMaterialInsight(m)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

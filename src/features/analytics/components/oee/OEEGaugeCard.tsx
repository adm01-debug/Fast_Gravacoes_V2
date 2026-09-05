import { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Zap, ShieldCheck, Gauge } from 'lucide-react';

interface OEEGaugeCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  benchmark?: number;
  size?: 'sm' | 'md' | 'lg';
  trend?: number;
  className?: string;
  variant?: 'default' | 'glass';
}

export const OEEGaugeCard = memo(function OEEGaugeCard({
  title,
  value,
  icon,
  description,
  benchmark = 85,
  size = 'md',
   trend,
   className,
   variant = 'default'
 }: OEEGaugeCardProps) {
  const { t } = useTranslation();

  const gaugeData = useMemo(() => {
    const percentage = Math.min(100, Math.max(0, value));
    const rotation = (percentage / 100) * 180;

    let color = 'hsl(var(--primary))';
    if (percentage >= 85) color = 'hsl(var(--success))';
    else if (percentage >= 75) color = 'hsl(142 76% 46%)';
    else if (percentage >= 65) color = 'hsl(48 96% 53%)';
    else if (percentage >= 50) color = 'hsl(25 95% 53%)';

    return { percentage, rotation, color };
  }, [value]);

  const sizeConfig = {
    sm: { gauge: 100, stroke: 10, text: 'text-2xl' },
    md: { gauge: 150, stroke: 14, text: 'text-4xl' },
    lg: { gauge: 200, stroke: 18, text: 'text-5xl' }
  };

  const config = sizeConfig[size];
  const radius = (config.gauge - config.stroke) / 2;
  const circumference = Math.PI * radius;
  const progress = (gaugeData.percentage / 100) * circumference;

  return (
    <Card className={cn("relative overflow-hidden group transition-all duration-500 hover:border-primary/40 shadow-lg hover:shadow-primary/5", className)} variant={variant}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
            <span className="p-1 rounded-md bg-primary/5 group-hover:bg-primary/10 transition-colors">
              {icon}
            </span>
            {title}
          </CardTitle>
          <div className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Semi-circular gauge */}
        <div className="relative group/gauge" style={{ width: config.gauge, height: config.gauge / 2 + 15 }}>
          <svg
            width={config.gauge}
            height={config.gauge / 2 + 15}
            viewBox={`0 0 ${config.gauge} ${config.gauge / 2 + 15}`}
            className="overflow-visible"
          >
            {/* Background arc with drop shadow effect via stroke */}
            <path
              d={`M ${config.stroke / 2 + 2} ${config.gauge / 2} A ${radius - 2} ${radius - 2} 0 0 1 ${config.gauge - (config.stroke / 2 + 2)} ${config.gauge / 2}`}
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={config.stroke + 4}
              strokeLinecap="round"
            />
            
            <path
              d={`M ${config.stroke / 2} ${config.gauge / 2} A ${radius} ${radius} 0 0 1 ${config.gauge - config.stroke / 2} ${config.gauge / 2}`}
              fill="none"
              stroke="hsl(var(--muted)/0.2)"
              strokeWidth={config.stroke}
              strokeLinecap="round"
            />

            {/* Progress arc with dynamic glow */}
            <path
              d={`M ${config.stroke / 2} ${config.gauge / 2} A ${radius} ${radius} 0 0 1 ${config.gauge - config.stroke / 2} ${config.gauge / 2}`}
              fill="none"
              stroke={gaugeData.color}
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              className="transition-all duration-1000 ease-out group-hover/gauge:stroke-[16px]"
              style={{ filter: `drop-shadow(0 0 8px ${gaugeData.color}44)` }}
            />

            {/* Benchmark marker */}
            {benchmark && (
              <g transform={`rotate(${(benchmark / 100) * 180 - 180}, ${config.gauge / 2}, ${config.gauge / 2})`}>
                <line
                  x1={config.gauge / 2}
                  y1={2}
                  x2={config.gauge / 2}
                  y2={config.stroke + 8}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={config.gauge / 2} cy={config.stroke + 12} r={1.5} fill="white" className="animate-pulse" />
              </g>
            )}
          </svg>

          {/* Value text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
            <span className={cn("font-black text-title leading-none tracking-tighter", config.text)} style={{ color: gaugeData.color }}>
              {value.toFixed(1)}<span className="text-[0.4em] opacity-70 ml-0.5">%</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
              trend > 0 ? "bg-success/5 text-success border-success/20" : trend < 0 ? "bg-destructive/5 text-destructive border-destructive/20" : "bg-muted/30 text-muted-foreground border-transparent"
            )}>
              {trend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : trend < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : null}
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: gaugeData.color }} />
            <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-tighter">Status: {gaugeData.percentage >= benchmark ? 'Excelência' : 'Otimizar'}</span>
          </div>
        </div>

        {description && (
          <p className="text-[9px] text-muted-foreground/60 font-medium text-center mt-3 leading-tight px-4 max-w-[200px]">{description}</p>
        )}
      </CardContent>

      {/* Industrial grid background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
      />
      
      {/* Dynamic bottom glow */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 opacity-20 pointer-events-none blur-3xl transition-all duration-1000 group-hover:opacity-40"
        style={{
          background: `radial-gradient(circle at center bottom, ${gaugeData.color} 0%, transparent 70%)`
        }}
      />
    </Card>
  );

});

import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function BIStatCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'default', onClick }: StatCardProps & { onClick?: () => void }) {
  const variantStyles = {
    default: 'border-border/50 hover:border-primary/30',
    success: 'border-success/30 bg-success/5 hover:shadow-glow-success',
    warning: 'border-warning/30 bg-warning/5 hover:shadow-glow-primary',
    danger: 'border-primary/30 bg-primary/5 hover:shadow-glow-primary',
  };

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-primary' : 'text-muted-foreground';

  return (
    <Card
      onClick={onClick}
      className={cn(
        variantStyles[variant],
        "card-interactive group transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer active:scale-95"
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-display bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)} data-testid="trend-indicator">
                <TrendIcon className="h-4 w-4" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-glow-primary transition-all duration-300">
              <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            {onClick && (
              <span className="text-[10px] text-primary/40 uppercase tracking-tighter font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalhes
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




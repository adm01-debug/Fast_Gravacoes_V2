import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function OperatorStatCard({ title, value, subtitle, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={`card-elevated hover-lift ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-display">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${
            trend === 'up' ? 'bg-success/10 text-success' :
            trend === 'down' ? 'bg-destructive/10 text-destructive' :
            'bg-primary/10 text-primary'
          }`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

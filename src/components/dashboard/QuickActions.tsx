import { Link } from 'react-router-dom';
import { Plus, Calendar, LayoutGrid, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const actions = [
  { icon: Plus, label: 'Novo Job', href: '/new-job', primary: true },
  { icon: Calendar, label: 'Calendário', href: '/calendar/daily', primary: false },
  { icon: LayoutGrid, label: 'Kanban', href: '/kanban', primary: false },
  { icon: BarChart3, label: 'KPIs', href: '/kpis', primary: false },
];

export function QuickActions() {
  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.2s]">
      <CardHeader className="pb-2">
        <CardTitle className="text-title gradient-text">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href}>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-auto py-4 flex-col gap-2 border-border/30 transition-all group press-scale",
                  "hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg",
                  action.primary && "gradient-primary border-0 text-primary-foreground hover:opacity-90 animate-glow-pulse"
                )}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

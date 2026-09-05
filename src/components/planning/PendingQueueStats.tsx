import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, Clock, History, BrainCircuit } from "lucide-react";

interface PendingQueueStatsProps {
  stats: {
    total: number;
    urgent: number;
    delayed: number;
    stuck: number;
    optimizationPotential: number;
  };
}

export function PendingQueueStats({ stats }: PendingQueueStatsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      icon: <Package className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />,
      bgColor: "bg-cyan-500/20",
    },
    {
      label: "Urgentes",
      value: stats.urgent,
      icon: <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />,
      bgColor: "bg-red-500/20",
    },
    {
      label: "Atrasados",
      value: stats.delayed,
      icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />,
      bgColor: "bg-orange-500/20",
    },
    {
      label: "Estagnados",
      value: stats.stuck,
      icon: <History className={`h-4 w-4 sm:h-5 sm:w-5 ${stats.stuck > 0 ? 'text-warning' : 'text-muted-foreground'}`} />,
      bgColor: stats.stuck > 0 ? "bg-warning/20" : "bg-muted",
      className: stats.stuck > 0 ? 'ring-1 ring-amber-500/50' : '',
    },
    {
      label: "Setup Salvo (IA)",
      value: `${stats.optimizationPotential}m`,
      icon: <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />,
      bgColor: "bg-violet-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <Card key={i} className={`bg-card/50 backdrop-blur-sm border-border/50 ${card.className || ''}`}>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-3 rounded-xl ${card.bgColor}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Activity, Gauge } from "lucide-react";
import { HookDemo } from "./HookDemo";

export const UseLoadBalancingDemo = () => {
  const [suggestions] = useState([
    { from: "SER-01", to: "SER-02", job: "OS-1234", loadDiff: 35 },
    { from: "SER-01", to: "SER-03", job: "OS-1235", loadDiff: 28 },
  ]);
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  const apply = (job: string) => {
    setApplying(job);
    setTimeout(() => {
      setApplying(null);
      setApplied(prev => [...prev, job]);
    }, 800);
  };

  return (
    <HookDemo
      title="useLoadBalancingWithActions"
      description="Análise e redistribuição de carga entre máquinas"
      icon={Activity}
      code={`const {
  suggestions,
  applySuggestion,
  applyAllSuggestions,
  isApplying
} = useLoadBalancingWithActions();

// Aplicar sugestão
await applySuggestion(suggestion);`}
    >
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              applied.includes(s.job) ? "bg-success/10 border-success/30" : "bg-background"
            }`}
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{s.job}</Badge>
              <span className="text-sm text-muted-foreground">
                {s.from} → {s.to}
              </span>
              <Badge variant="secondary" className="text-xs">
                -{s.loadDiff}% carga
              </Badge>
            </div>
            <Button
              size="sm"
              variant={applied.includes(s.job) ? "ghost" : "outline"}
              onClick={() => apply(s.job)}
              disabled={applying === s.job || applied.includes(s.job)}
            >
              {applying === s.job ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : applied.includes(s.job) ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                "Aplicar"
              )}
            </Button>
          </div>
        ))}
      </div>
    </HookDemo>
  );
};

export const UseOEEDemo = () => {
  const [oee] = useState({
    overall: 72,
    availability: 85,
    performance: 88,
    quality: 96
  });

  return (
    <HookDemo
      title="useOEE"
      description="Overall Equipment Effectiveness"
      icon={Gauge}
      code={`const { data } = useOEE(jobs, machines, techniques);

// Métricas OEE
<div>OEE: {data.overall.oee}%</div>
<div>Disponibilidade: {data.overall.availability}%</div>
<div>Performance: {data.overall.performance}%</div>
<div>Qualidade: {data.overall.quality}%</div>`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${oee.overall * 3.52} 352`} className="text-primary transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{oee.overall}%</span>
              <span className="text-xs text-muted-foreground">OEE</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-semibold text-blue-500">{oee.availability}%</div>
            <div className="text-xs text-muted-foreground">Disponibilidade</div>
          </div>
          <div>
            <div className="font-semibold text-green-500">{oee.performance}%</div>
            <div className="text-xs text-muted-foreground">Performance</div>
          </div>
          <div>
            <div className="font-semibold text-purple-500">{oee.quality}%</div>
            <div className="text-xs text-muted-foreground">Qualidade</div>
          </div>
        </div>
      </div>
    </HookDemo>
  );
};

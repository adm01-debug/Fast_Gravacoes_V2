import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Activity, Brain, Wrench, Users, Zap } from "lucide-react";
import { BookOpen } from "lucide-react";
import { UseSchedulingDataDemo, UseKPIsDemo } from "./hooks/DataHooksDemos";
import { UseLoadBalancingDemo, UseOEEDemo } from "./hooks/EfficiencyHooksDemos";
import { UseRetryableQueryDemo, UseBottleneckPredictionDemo, UseMLPredictionsDemo } from "./hooks/PredictionHooksDemos";
import { UseOperatorsDemo, UseTPMDataDemo } from "./hooks/MaintenanceOperatorDemos";

export function HooksExamplesSection() {
  const [activeCategory, setActiveCategory] = useState("data");

  const categories = [
    { id: "data", label: "Dados", icon: Database },
    { id: "efficiency", label: "Eficiência", icon: Activity },
    { id: "predictions", label: "Predições", icon: Brain },
    { id: "maintenance", label: "Manutenção", icon: Wrench },
    { id: "operators", label: "Operadores", icon: Users },
    { id: "utilities", label: "Utilitários", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Exemplos Interativos de Hooks</h3>
          <p className="text-sm text-muted-foreground">
            Demonstrações funcionais dos principais hooks do sistema
          </p>
        </div>
        <a href="/docs/HOOKS_API.md" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          Documentação completa
        </a>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2">
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="data" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <UseSchedulingDataDemo />
            <UseKPIsDemo />
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <UseLoadBalancingDemo />
            <UseOEEDemo />
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <UseBottleneckPredictionDemo />
            <UseMLPredictionsDemo />
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6 mt-6">
          <UseTPMDataDemo />
        </TabsContent>

        <TabsContent value="operators" className="space-y-6 mt-6">
          <UseOperatorsDemo />
        </TabsContent>

        <TabsContent value="utilities" className="space-y-6 mt-6">
          <UseRetryableQueryDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { DollarSign, Edit2, Save } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ABCCostPool } from '@/hooks/useABCCosts';

interface ABCCostPoolsCardProps {
  costPools: ABCCostPool[];
  totalAllocated: number;
  onUpdateBudget: (id: string, budget: number) => void;
}

const poolTypeLabels: Record<string, string> = {
  direct_labor: 'Mão de Obra',
  machine: 'Máquina',
  overhead: 'Overhead',
  material: 'Material',
  setup: 'Setup',
};

const poolTypeColors: Record<string, string> = {
  direct_labor: 'bg-blue-500',
  machine: 'bg-success',
  overhead: 'bg-warning',
  material: 'bg-purple-500',
  setup: 'bg-rose-500',
};

export function ABCCostPoolsCard({ costPools, totalAllocated, onUpdateBudget }: ABCCostPoolsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalBudget = costPools.reduce((sum, p) => sum + Number(p.monthly_budget), 0);

  const handleEdit = (pool: ABCCostPool) => {
    setEditingId(pool.id);
    setEditValue(String(pool.monthly_budget));
  };

  const handleSave = (id: string) => {
    onUpdateBudget(id, parseFloat(editValue) || 0);
    setEditingId(null);
  };

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-title">
          <DollarSign className="h-5 w-5 text-primary" />
          Pools de Custo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Orçamento Total</p>
            <p className="text-display">
              {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Alocado</p>
            <p className="text-display text-primary">
              {totalAllocated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {costPools.map((pool) => {
            const percentage = totalBudget > 0 ? (Number(pool.monthly_budget) / totalBudget) * 100 : 0;

            return (
              <div key={pool.id} className="p-3 rounded-lg border border-border/50 bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${poolTypeColors[pool.pool_type] || 'bg-gray-500'}`} />
                    <span className="font-medium text-sm">{pool.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {poolTypeLabels[pool.pool_type] || pool.pool_type}
                    </span>
                  </div>

                  {editingId === pool.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32 h-8 text-sm"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(pool.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {Number(pool.monthly_budget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(pool)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% do orçamento total
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

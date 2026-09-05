import { Activity, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ABCActivity, ABCCostPool, ABCActivityRate } from '@/hooks/useABCCosts';

interface ABCActivityRatesCardProps {
  activities: ABCActivity[];
  costPools: ABCCostPool[];
  activityRates: ABCActivityRate[];
  onUpdateRate: (data: {
    activity_id: string;
    cost_pool_id: string;
    rate_per_unit: number;
    period_start: string;
    period_end: string;
  }) => void;
}

const costDriverLabels: Record<string, string> = {
  machine_hours: 'Hora Máquina',
  setup_count: 'Setups',
  quantity: 'Quantidade',
  labor_hours: 'Hora Trabalho',
};

export function ABCActivityRatesCard({
  activities,
  costPools,
  activityRates,
  onUpdateRate
}: ABCActivityRatesCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    cost_pool_id: '',
    rate_per_unit: '',
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const periodStart = `${currentMonth}-01`;
  const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const handleEdit = (activity: ABCActivity) => {
    const currentRate = activityRates.find(
      r => r.activity_id === activity.id && r.period_start <= periodEnd && r.period_end >= periodStart
    );
    setEditingId(activity.id);
    setEditData({
      cost_pool_id: currentRate?.cost_pool_id || '',
      rate_per_unit: currentRate?.rate_per_unit?.toString() || '',
    });
  };

  const handleSave = (activityId: string) => {
    if (editData.cost_pool_id && editData.rate_per_unit) {
      onUpdateRate({
        activity_id: activityId,
        cost_pool_id: editData.cost_pool_id,
        rate_per_unit: parseFloat(editData.rate_per_unit),
        period_start: periodStart,
        period_end: periodEnd,
      });
    }
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({ cost_pool_id: '', rate_per_unit: '' });
  };

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-title">
          <Activity className="h-5 w-5 text-primary" />
          Taxas por Atividade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => {
          const currentRate = activityRates.find(
            r => r.activity_id === activity.id && r.period_start <= periodEnd && r.period_end >= periodStart
          );
          const pool = costPools.find(p => p.id === currentRate?.cost_pool_id);

          return (
            <div
              key={activity.id}
              className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{activity.name}</h4>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {costDriverLabels[activity.cost_driver] || activity.cost_driver}
                </Badge>
              </div>

              {editingId === activity.id ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={editData.cost_pool_id}
                    onValueChange={(v) => setEditData(prev => ({ ...prev, cost_pool_id: v }))}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Pool de custo" />
                    </SelectTrigger>
                    <SelectContent>
                      {costPools.map(pool => (
                        <SelectItem key={pool.id} value={pool.id}>
                          {pool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.rate_per_unit}
                      onChange={(e) => setEditData(prev => ({ ...prev, rate_per_unit: e.target.value }))}
                      className="w-24 h-9"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-muted-foreground">/unidade</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleSave(activity.id)}>
                    <Save className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleCancel}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pool ? (
                      <>
                        <Badge variant="outline">{pool.name}</Badge>
                        <span className="font-mono font-semibold text-primary">
                          R$ {Number(currentRate?.rate_per_unit || 0).toFixed(4)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{costDriverLabels[activity.cost_driver]?.toLowerCase() || 'unidade'}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Taxa não configurada
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(activity)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Clock, Calendar, AlertTriangle, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface SeverityConfig {
  id: string;
  machine_id: string | null;
  severity: 'upcoming' | 'due' | 'overdue' | 'critical';
  days_threshold: number;
  message_override: string | null;
  is_enabled: boolean;
  throttle_minutes?: number;
}

interface TPMSeverityConfigsProps {
  machineId?: string;
}

export function TPMSeverityConfigs({ machineId }: TPMSeverityConfigsProps) {
  const queryClient = useQueryClient();
  const [newSeverity, setNewSeverity] = useState<'upcoming' | 'due' | 'overdue' | 'critical'>('upcoming');

  const { data: configs, isLoading } = useQuery({
    queryKey: ['tpm-severity-configs', machineId],
    queryFn: async () => {
      let query = supabase.from('tpm_severity_configs').select('*');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      } else {
        query = query.is('machine_id', null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SeverityConfig[];
    }
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<SeverityConfig>) => {
      const payload: Database['public']['Tables']['tpm_severity_configs']['Insert'] = {
        id: config.id,
        severity: config.severity || 'upcoming',
        days_threshold: config.days_threshold,
        message_override: config.message_override,
        is_enabled: config.is_enabled,
        machine_id: machineId || null
      };

      const { error } = await supabase
        .from('tpm_severity_configs')
        .upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tpm-severity-configs', machineId] });
      toast.success('Configuração salva');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao salvar configuração');
    }
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tpm_severity_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tpm-severity-configs', machineId] });
      toast.success('Configuração removida');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao remover configuração');
    }
  });

  if (isLoading) return <div>Carregando severidades...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {configs?.map((config, index) => (
          <div key={config.id} className="space-y-4 p-4 border rounded-lg bg-secondary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {config.severity === 'upcoming' && <Calendar className="h-4 w-4 text-blue-400" />}
                {config.severity === 'due' && <Clock className="h-4 w-4 text-warning" />}
                {config.severity === 'overdue' && <AlertTriangle className="h-4 w-4 text-orange-400" />}
                {config.severity === 'critical' && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className="font-semibold capitalize">{config.severity}</span>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteConfig.mutate(config.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Limite (dias antes/depois)</Label>
                <Input
                  type="number"
                  className="h-9"
                  defaultValue={config.days_threshold}
                  onBlur={(e) => upsertConfig.mutate({ id: config.id, severity: config.severity, days_threshold: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Throttle (minutos)</Label>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    className="h-9"
                    placeholder="60"
                    defaultValue={config.throttle_minutes || 60}
                    onBlur={(e) => upsertConfig.mutate({ id: config.id, severity: config.severity, throttle_minutes: parseInt(e.target.value, 10) || 60 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mensagem Customizada</Label>
              <Input
                placeholder="Ex: Urgente! Máquina parada..."
                className="h-9"
                defaultValue={config.message_override || ''}
                onBlur={(e) => upsertConfig.mutate({ id: config.id, severity: config.severity, message_override: e.target.value })}
              />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 p-4 border border-dashed rounded-lg bg-muted/20">
          <Select value={newSeverity} onValueChange={(v: 'upcoming' | 'due' | 'overdue' | 'critical') => setNewSeverity(v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Próxima</SelectItem>
              <SelectItem value="due">Vencendo</SelectItem>
              <SelectItem value="overdue">Atrasada</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9 whitespace-nowrap" onClick={() => upsertConfig.mutate({ severity: newSeverity, days_threshold: 0 })}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </div>
      </div>
    </div>
  );
}

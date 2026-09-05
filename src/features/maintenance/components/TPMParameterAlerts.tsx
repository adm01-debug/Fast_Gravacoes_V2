 
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface TPMParameterAlert {
  id: string;
  parameter_name: string | null;
  recorded_value: string | number | null;
  recommended_range: string | null;
  created_at: string | null;
  execution?: {
    machine?: {
      name?: string | null;
      code?: string | null;
    } | null;
  } | null;
}

export function TPMParameterAlerts() {
  const [alerts, setAlerts] = useState<TPMParameterAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tpm_parameter_alerts')
        .select('*, execution:tpm_executions(id, machine:machines(name, code))')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data ?? []) as unknown as TPMParameterAlert[]);
    } catch (err) {
      logger.warn('Falha ao carregar alertas de parâmetros TPM', err, 'TPMParameterAlerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAlerts();
    return () => { isMountedRef.current = false; };
  }, []);

  // Subscription for new alerts
  useRealtimeChannel('parameter-alerts', [{ table: 'tpm_parameter_alerts' }], () => {
    fetchAlerts();
  });

  const resolveAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tpm_parameter_alerts')
        .update({ is_resolved: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Alerta resolvido');
      fetchAlerts();
    } catch (err) {
      toast.error('Erro ao resolver alerta');
    }
  };

  if (alerts.length === 0 && !isLoading) return null;

  return (
    <Card className="card-glass border-warning/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-title text-warning">
          <Zap className="h-5 w-5" />
          Desvios de Regulagem Técnica
          <Badge variant="outline" className="ml-2 bg-warning/10 border-warning/30 text-warning">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">Carregando desvios...</div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg border border-warning/20 bg-warning/5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-warning uppercase">{alert.parameter_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR }) : '—'}
                    </span>
                  </div>
                  <p className="text-sm">
                    Valor <span className="font-bold text-rose-600">{alert.recorded_value}</span> diverge do recomendado (<span className="font-bold text-success">{alert.recommended_range}</span>)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Máquina: {alert.execution?.machine?.name} ({alert.execution?.machine?.code})
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs hover:bg-warning/20 text-warning"
                  onClick={() => resolveAlert(alert.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Marcar como ciente
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
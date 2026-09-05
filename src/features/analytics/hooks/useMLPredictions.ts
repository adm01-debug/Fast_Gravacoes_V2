import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast, categorizeError, ErrorCodes } from '@/lib/errorHandling';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';

// Error context for debugging
const ML_ERROR_CONTEXT = {
  predictions: { hook: 'useMLPredictions', entity: 'machine_predictions' },
  history: { hook: 'useMLPredictions', entity: 'prediction_history' },
  generate: { hook: 'useMLPredictions', operation: 'generate_predictions' },
};

export interface MachinePrediction {
  id: string;
  machine_id: string;
  prediction_type: 'failure_risk' | 'maintenance_needed' | 'performance_degradation';
  risk_score: number;
  confidence: number;
  predicted_failure_date: string | null;
  factors: PredictionFactor[];
  recommendations: string[];
  model_version: string;
  is_active: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  expires_at: string;
  machine?: { id: string; name: string; code: string };
}

export interface PredictionFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface PredictionHistory {
  id: string;
  prediction_id: string;
  machine_id: string;
  predicted_risk_score: number;
  predicted_failure_date: string | null;
  actual_failure_date: string | null;
  was_accurate: boolean | null;
  accuracy_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useMLPredictions() {
  const queryClient = useQueryClient();

  // Fetch active predictions
  const { data: predictions = [], isLoading: loadingPredictions, refetch } = useQuery({
    queryKey: ['ml-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_predictions')
        .select('*, machines(id, name, code)')
        .eq('is_active', true)
        .order('risk_score', { ascending: false });

      if (error) throw error;
      return data.map((p: Record<string, unknown>) => ({
        ...p,
        machine: p.machines,
        factors: Array.isArray(p.factors) ? p.factors : [],
        recommendations: Array.isArray(p.recommendations) ? p.recommendations : [],
      })) as MachinePrediction[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch prediction history
  const { data: predictionHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['ml-prediction-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as PredictionHistory[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Fetch machines
  const { data: machines = [] } = useQuery({
    queryKey: ['machines-for-ml'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  // Generate predictions mutation
  const generatePredictions = useMutation({
    mutationFn: async (machineId?: string) => {
      const { data, error } = await supabase.functions.invoke('ml-predictions', {
        body: { action: 'predict', machine_id: machineId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-predictions'] });
      toast.success(`${data.predictions_generated} previsões geradas com sucesso`);
    },
    onError: (error: Error, variables: string | undefined) => {
      void (async () => {
        try {
          await supabase.from('error_logs').insert({
            component_name: 'useMLPredictions:generatePredictions',
            message: error.message,
            metadata: { machine_id: variables, severity: 'high' }
          });
        } catch (logErr: unknown) {
          console.error('Failed to write error_log', logErr);
        }
      })();

      if (error.message.includes('Rate limit')) {
        toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
      } else if (error.message.includes('Payment required')) {
        toast.error('Créditos insuficientes. Adicione créditos ao workspace.');
      } else {
        toast.error('Erro ao gerar previsões. Tente novamente.');
      }
    },
  });

  // Acknowledge prediction mutation
  const acknowledgePrediction = useMutation({
    mutationFn: async (predictionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('machine_predictions')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id ?? null,
        })
        .eq('id', predictionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-predictions'] });
      toast.success('Previsão reconhecida');
    },
    onError: (error: Error) => {
      showErrorToast(error, undefined, ML_ERROR_CONTEXT.generate);
    },
  });

  // Calculate statistics
  const stats = {
    totalPredictions: predictions.length,
    highRisk: predictions.filter(p => p.risk_score >= 70).length,
    mediumRisk: predictions.filter(p => p.risk_score >= 40 && p.risk_score < 70).length,
    lowRisk: predictions.filter(p => p.risk_score < 40).length,
    avgRiskScore: predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + Number(p.risk_score), 0) / predictions.length)
      : 0,
    avgConfidence: predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + Number(p.confidence), 0) / predictions.length)
      : 0,
    pendingAcknowledgment: predictions.filter(p => !p.acknowledged_at && p.risk_score >= 50).length,
  };

  // Get risk level label and color
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'Crítico', color: 'destructive' };
    if (score >= 60) return { label: 'Alto', color: 'destructive' };
    if (score >= 40) return { label: 'Médio', color: 'warning' };
    if (score >= 20) return { label: 'Baixo', color: 'secondary' };
    return { label: 'Mínimo', color: 'outline' };
  };

  // Get prediction type label
  const getPredictionTypeLabel = (type: string) => {
    switch (type) {
      case 'failure_risk': return 'Risco de Falha';
      case 'maintenance_needed': return 'Manutenção Necessária';
      case 'performance_degradation': return 'Degradação de Performance';
      default: return type;
    }
  };

  return {
    predictions,
    predictionHistory,
    machines,
    stats,
    isLoading: loadingPredictions || loadingHistory,
    generatePredictions,
    acknowledgePrediction,
    refetch,
    getRiskLevel,
    getPredictionTypeLabel,
  };
}

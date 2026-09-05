import { useCallback, useRef, useEffect } from 'react';
import { usePushNotifications } from '@/features/notifications';
import { useNotificationSounds } from '@/features/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { MachinePrediction, PredictionFactor } from '@/features/analytics/hooks/useMLPredictions';
import { Json } from '@/integrations/supabase/types';

interface PredictionPayload {
  id: string;
  machine_id: string;
  prediction_type: string;
  risk_score: number;
  confidence: number;
  predicted_failure_date: string | null;
  factors: Json;
  recommendations: string[] | null;
  model_version: string;
  is_active: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  expires_at: string;
}

interface MLNotificationPreferences {
  criticalRisk: boolean;
  highRisk: boolean;
  mediumRisk: boolean;
  failurePredictions: boolean;
  maintenanceNeeded: boolean;
  soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: MLNotificationPreferences = {
  criticalRisk: true,
  highRisk: true,
  mediumRisk: false,
  failurePredictions: true,
  maintenanceNeeded: true,
  soundEnabled: true,
};

const STORAGE_KEY = 'ml_prediction_notification_preferences';

const getPreferences = (): MLNotificationPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveMLNotificationPreferences = (prefs: Partial<MLNotificationPreferences>) => {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota exceeded or private browsing */ }
  return updated;
};

export const useMLPredictionNotifications = () => {
  const {
    permission,
    isSupported,
    requestPermission,
    sendNotification
  } = usePushNotifications();
  const { playAlertSound } = useNotificationSounds();
  const notifiedPredictionsRef = useRef<Set<string>>(new Set());

  // Send prediction notification
  const sendPredictionNotification = useCallback((prediction: MachinePrediction) => {
    const prefs = getPreferences();
    const riskScore = prediction.risk_score;

    // Check if this risk level is enabled
    const shouldNotifyByRisk =
      (riskScore >= 80 && prefs.criticalRisk) ||
      (riskScore >= 60 && riskScore < 80 && prefs.highRisk) ||
      (riskScore >= 40 && riskScore < 60 && prefs.mediumRisk);

    // Check if this prediction type is enabled
    const shouldNotifyByType =
      (prediction.prediction_type === 'failure_risk' && prefs.failurePredictions) ||
      (prediction.prediction_type === 'maintenance_needed' && prefs.maintenanceNeeded) ||
      (prediction.prediction_type === 'performance_degradation');

    if (!shouldNotifyByRisk || !shouldNotifyByType) return null;

    // Don't notify for already notified predictions
    if (notifiedPredictionsRef.current.has(prediction.id)) return null;
    notifiedPredictionsRef.current.add(prediction.id);

    // Play sound for critical and high risk
    if (prefs.soundEnabled && riskScore >= 60) {
      playAlertSound();
    }

    const getRiskIcon = (score: number) => {
      if (score >= 80) return '🚨';
      if (score >= 60) return '⚠️';
      if (score >= 40) return '⚡';
      return '📊';
    };

    const getRiskLabel = (score: number) => {
      if (score >= 80) return 'CRÍTICO';
      if (score >= 60) return 'Alto Risco';
      if (score >= 40) return 'Risco Médio';
      return 'Risco Baixo';
    };

    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'failure_risk': return 'Risco de Falha';
        case 'maintenance_needed': return 'Manutenção Necessária';
        case 'performance_degradation': return 'Degradação de Performance';
        default: return type;
      }
    };

    const machineName = prediction.machine?.name || 'Máquina desconhecida';

    return sendNotification({
      title: `${getRiskIcon(riskScore)} ${getRiskLabel(riskScore)} - ML Prediction`,
      body: `${machineName}: ${getTypeLabel(prediction.prediction_type)} (${riskScore}% risco)`,
      tag: `ml-prediction-${prediction.id}`,
      requireInteraction: riskScore >= 80,
      data: { route: '/ml-predictions', type: 'ml_prediction', predictionId: prediction.id }
    });
  }, [sendNotification, playAlertSound]);

  // Send critical failure alert
  const sendCriticalFailureAlert = useCallback((machineName: string, riskScore: number, predictedDate?: string) => {
    const prefs = getPreferences();
    if (!prefs.criticalRisk) return null;

    if (prefs.soundEnabled) {
      playAlertSound();
    }

    const dateInfo = predictedDate
      ? ` - Previsão: ${new Date(predictedDate).toLocaleDateString('pt-BR')}`
      : '';

    return sendNotification({
      title: '🚨 ALERTA CRÍTICO - Falha Iminente',
      body: `${machineName}: ${riskScore}% de risco de falha${dateInfo}`,
      tag: `ml-critical-${machineName}`,
      requireInteraction: true,
      data: { route: '/ml-predictions', type: 'critical_failure' }
    });
  }, [sendNotification, playAlertSound]);

  // Send high risk alert
  const sendHighRiskAlert = useCallback((machineName: string, riskScore: number, predictionType: string) => {
    const prefs = getPreferences();
    if (!prefs.highRisk) return null;

    if (prefs.soundEnabled) {
      playAlertSound();
    }

    const typeLabel = predictionType === 'failure_risk'
      ? 'Risco de Falha'
      : predictionType === 'maintenance_needed'
      ? 'Manutenção Necessária'
      : 'Degradação de Performance';

    return sendNotification({
      title: '⚠️ Alto Risco Detectado',
      body: `${machineName}: ${typeLabel} - ${riskScore}% de probabilidade`,
      tag: `ml-high-risk-${machineName}`,
      requireInteraction: true,
      data: { route: '/ml-predictions', type: 'high_risk' }
    });
  }, [sendNotification, playAlertSound]);

  // Send maintenance recommendation
  const sendMaintenanceRecommendation = useCallback((machineName: string, recommendation: string) => {
    const prefs = getPreferences();
    if (!prefs.maintenanceNeeded) return null;

    return sendNotification({
      title: '🔧 Recomendação de Manutenção',
      body: `${machineName}: ${recommendation}`,
      tag: `ml-maintenance-${machineName}`,
      data: { route: '/ml-predictions', type: 'maintenance_recommendation' }
    });
  }, [sendNotification]);

  // Listen to realtime ML predictions
  useRealtimeChannel('ml-predictions-notifications', [{ table: 'machine_predictions' }], async (payload) => {
    if (permission !== 'granted') return;
    const newPrediction = payload.new as PredictionPayload;

    if (!newPrediction.is_active || newPrediction.risk_score < 40) return;

    const { data: machine } = await supabase
      .from('machines')
      .select('id, name, code')
      .eq('id', newPrediction.machine_id)
      .single();

    const parsedFactors: PredictionFactor[] = Array.isArray(newPrediction.factors)
      ? (newPrediction.factors as unknown as PredictionFactor[])
      : [];

    const predictionWithMachine: MachinePrediction = {
      ...newPrediction,
      prediction_type: newPrediction.prediction_type as MachinePrediction['prediction_type'],
      machine: machine || undefined,
      factors: parsedFactors,
      recommendations: Array.isArray(newPrediction.recommendations) ? newPrediction.recommendations : [],
    };

    sendPredictionNotification(predictionWithMachine);
  });

  // Cleanup old notified predictions periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (notifiedPredictionsRef.current.size > 100) {
        const arr = Array.from(notifiedPredictionsRef.current);
        notifiedPredictionsRef.current = new Set(arr.slice(-50));
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    sendPredictionNotification,
    sendCriticalFailureAlert,
    sendHighRiskAlert,
    sendMaintenanceRecommendation,
    getPreferences,
    savePreferences: saveMLNotificationPreferences,
  };
};

/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../index';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { createAppError } from '@/lib/errorHandling';

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

interface MFAEnrollmentData {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
  friendly_name?: string;
}

function toSafeErrorMessage(error: unknown): string {
  return createAppError(error instanceof Error ? error : new Error(String(error))).message;
}

export function useMFA() {
  const { user } = useAuth();
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollmentData | null>(null);

  const refreshFactors = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors((data.all as MFAFactor[]) || []);
    } catch (error) {
      logger.error('Falha ao listar fatores MFA', error, 'useMFA');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshFactors();
  }, [refreshFactors]);

  const startEnrollment = async (friendlyNameArg?: string) => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Fast Gravações',
        friendlyName: friendlyNameArg || 'Fast Gravações MFA'
      });
      if (error) throw error;
      setEnrollmentData(data as MFAEnrollmentData);
      return data;
    } catch (error: unknown) {
      toast.error('Erro ao iniciar cadastro MFA', { description: toSafeErrorMessage(error) });
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async (code: string) => {
    if (!enrollmentData) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollmentData.id,
        code
      });
      if (error) throw error;
      await refreshFactors();
      setEnrollmentData(null);
      toast.success('MFA ativado com sucesso!');
      return data;
    } catch (error: unknown) {
      toast.error('Código inválido', { description: toSafeErrorMessage(error) });
    } finally {
      setIsVerifying(false);
    }
  };

  const cancelEnrollment = useCallback(async () => {
    if (enrollmentData) {
      // Remove the unverified factor from Supabase so orphaned TOTP entries
      // don't accumulate when the user repeatedly starts and cancels enrollment.
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id });
      } catch (err) {
        logger.warn('Falha ao remover fator MFA ao cancelar', { error: err }, 'useMFA');
      }
    }
    setEnrollmentData(null);
  }, [enrollmentData]);

  const unenroll = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await refreshFactors();
      toast.success('MFA desativado');
      return true;
    } catch (error: unknown) {
      toast.error('Erro ao desativar MFA', { description: toSafeErrorMessage(error) });
      return false;
    }
  };

  const isMFAEnabled = factors.some(f => f.status === 'verified');

  return {
    factors,
    isMFAEnabled,
    mfaEnabled: isMFAEnabled,
    isLoading,
    isEnrolling,
    isVerifying,
    enrollmentData,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    unenroll,
    refreshFactors
  };
}

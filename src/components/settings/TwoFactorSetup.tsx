/* eslint-disable react-hooks/immutability -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { showErrorToast } from '@/lib/errorHandling';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, QrCode, Key, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function TwoFactorSetup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; status: string; factor_type: string; friendly_name?: string }>>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [enrollData, setEnrollData] = useState<{ qr: string; secret: string; id: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    fetchMfaFactors();
  }, []);

  const fetchMfaFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data?.totp || []);
    } catch (error) {
      logger.warn('Falha ao listar fatores MFA', error, 'TwoFactorSetup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEnroll = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'FastGrava TOTP',
      });

      if (error) throw error;

      if (data?.totp) {
        setEnrollData({
          qr: data.totp.qr_code,
          secret: data.totp.secret,
          id: data.id,
        });
        setShowEnrollDialog(true);
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao configurar 2FA');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!enrollData || verifyCode.length !== 6) {
      toast.error('Digite um código de 6 dígitos');
      return;
    }

    setIsEnrolling(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      // Save to user_mfa_settings
      await supabase.from('user_mfa_settings').upsert({
        user_id: (user?.id ?? ""),
        totp_enabled: true,
        totp_verified_at: new Date().toISOString(),
      });

      toast.success('2FA ativado com sucesso!');
      setShowEnrollDialog(false);
      setEnrollData(null);
      setVerifyCode('');
      fetchMfaFactors();
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao verificar código 2FA');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDisable2FA = async () => {
    const verifiedFactor = mfaFactors.find(f => f.status === 'verified');
    if (!verifiedFactor || disableCode.length !== 6) {
      toast.error('Digite um código válido');
      return;
    }

    setIsDisabling(true);
    try {
      // First challenge to verify the code
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code: disableCode,
      });

      if (verifyError) throw verifyError;

      // Now unenroll
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (unenrollError) throw unenrollError;

      // Update user_mfa_settings
      await supabase.from('user_mfa_settings').upsert({
        user_id: (user?.id ?? ""),
        totp_enabled: false,
        totp_verified_at: null,
      });

      toast.success('2FA desativado com sucesso');
      setShowDisableDialog(false);
      setDisableCode('');
      fetchMfaFactors();
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao desativar 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      toast.success('Chave copiada!');
    }
  };

  const is2FAEnabled = mfaFactors.some(f => f.status === 'verified');

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {is2FAEnabled ? (
                <ShieldCheck className="h-8 w-8 text-success" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">TOTP (Time-based One-Time Password)</p>
                <p className="text-sm text-muted-foreground">
                  Use Google Authenticator, Authy ou similar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
                {is2FAEnabled ? 'Ativado' : 'Desativado'}
              </Badge>
              {is2FAEnabled ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Desativar
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStartEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Configurar
                </Button>
              )}
            </div>
          </div>

          {is2FAEnabled && (
            <Alert className="border-success/50 bg-success/10">
              <ShieldCheck className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Sua conta está protegida com autenticação de dois fatores.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enroll Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Configurar 2FA
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu aplicativo autenticador
            </DialogDescription>
          </DialogHeader>

          {enrollData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={enrollData.qr} size={200} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Ou digite manualmente a chave:
                </Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                    {enrollData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-code">Digite o código do app</Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnrollDialog(false);
                    setEnrollData(null);
                    setVerifyCode('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={verifyCode.length !== 6 || isEnrolling}
                >
                  {isEnrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Verificar e Ativar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desativar 2FA
            </DialogTitle>
            <DialogDescription>
              Para desativar o 2FA, digite o código atual do seu aplicativo autenticador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Desativar o 2FA tornará sua conta menos segura. Você poderá reativá-lo a qualquer momento.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="disable-code">Código do aplicativo</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false);
                  setDisableCode('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={disableCode.length !== 6 || isDisabling}
              >
                {isDisabling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Desativar 2FA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

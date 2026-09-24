import { useState } from 'react';
import { useMFA } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, QrCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function MFAEnroll() {
  const { startEnrollment, verifyEnrollment, cancelEnrollment, enrollmentData, isEnrolling, isVerifying } = useMFA();
  const [verificationCode, setVerificationCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('Autenticador');

  const handleStartEnrollment = async () => {
    await startEnrollment(friendlyName);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }
    const success = await verifyEnrollment(verificationCode);
    if (success) {
      setVerificationCode('');
      setFriendlyName('Autenticador');
    }
  };

  const handleCancel = () => {
    cancelEnrollment();
    setVerificationCode('');
  };

  if (enrollmentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Configurar Autenticador
          </CardTitle>
          <CardDescription>
            Escaneie o QR code com seu aplicativo autenticador (Google Authenticator, Authy, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img
              src={enrollmentData.totp.qr_code}
              alt="QR Code para autenticação MFA"
              className="w-48 h-48"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Ou insira manualmente: <code className="text-xs text-foreground bg-muted px-1 rounded">{enrollmentData.totp.secret}</code>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código de verificação</Label>
            <Input
              id="mfa-code"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleVerify} disabled={isVerifying || verificationCode.length !== 6} className="flex-1">
              {isVerifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Verificar
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Ativar Autenticação de Dois Fatores
        </CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="friendly-name">Nome do dispositivo</Label>
          <Input
            id="friendly-name"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="Ex: Meu celular"
          />
        </div>
        <Button onClick={handleStartEnrollment} disabled={isEnrolling}>
          {isEnrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
          Configurar MFA
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { Loader2, ShieldCheck } from 'lucide-react';

interface MFALoginVerificationProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFALoginVerification({ factorId, onSuccess, onCancel }: MFALoginVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      toast.success('Autenticação confirmada!');
      onSuccess();
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Código de verificação inválido');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Verificação em Duas Etapas</h2>
        <p className="text-sm text-muted-foreground">
          Digite o código de segurança gerado pelo seu aplicativo autenticador.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Código de Autenticação</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-3xl tracking-[0.5em] font-mono h-14"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- foco imediato no campo de código MFA é UX crítica
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full h-12" disabled={isVerifying || code.length !== 6}>
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verificar Código
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel} disabled={isVerifying}>
            Voltar para o Login
          </Button>
        </div>
      </form>
    </div>
  );
}

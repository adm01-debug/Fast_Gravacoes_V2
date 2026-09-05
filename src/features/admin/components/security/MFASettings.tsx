import { useState } from 'react';
import { useMFA } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Shield, ShieldCheck, ShieldOff, Loader2, Trash2, Key } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MFAEnroll } from './MFAEnroll';

export function MFASettings() {
  const { factors, isLoading, isMFAEnabled, unenroll, refreshFactors } = useMFA();
  const [factorToRemove, setFactorToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!factorToRemove) return;

    setIsRemoving(true);
    const success = await unenroll(factorToRemove);
    if (success) {
      setFactorToRemove(null);
    }
    setIsRemoving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified');

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMFAEnabled ? (
                <div className="p-2 rounded-full bg-green-500/10">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-warning/10">
                  <ShieldOff className="h-6 w-6 text-warning" />
                </div>
              )}
              <div>
                <CardTitle>Autenticação de Dois Fatores</CardTitle>
                <CardDescription>
                  {isMFAEnabled
                    ? 'Sua conta está protegida com 2FA'
                    : 'Adicione uma camada extra de segurança'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={isMFAEnabled ? 'default' : 'secondary'}>
              {isMFAEnabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Active Factors */}
      {verifiedFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Dispositivos Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verifiedFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {factor.friendly_name || 'Autenticador TOTP'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Configurado em {format(new Date(factor.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setFactorToRemove(factor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment */}
      {!isMFAEnabled && <MFAEnroll />}

      {/* Add Another Factor */}
      {isMFAEnabled && (
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={refreshFactors}
            >
              <Shield className="h-4 w-4 mr-2" />
              Adicionar Outro Autenticador
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!factorToRemove} onOpenChange={() => setFactorToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Autenticador?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá desativar a autenticação de dois fatores para este dispositivo.
              Sua conta ficará menos segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

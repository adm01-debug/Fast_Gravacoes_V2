import { MainLayout } from '@/components/layout/MainLayout';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

/**
 * Superfície mínima para usuários elevados que ainda não possuem MFA.
 * Não reutiliza SettingsPage: aquela rota contém ações administrativas que não
 * devem ficar acessíveis enquanto a conta não atende ao requisito AAL2.
 */
export default function MfaEnrollmentPage() {
  return (
    <MainLayout>
      <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Configuração de MFA obrigatória
            </CardTitle>
            <CardDescription>
              Seu perfil exige autenticação em duas etapas. Configure e valide um fator para liberar as demais áreas do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorSetup />
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}

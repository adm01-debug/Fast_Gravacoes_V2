import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Key,
  Smartphone,
  Lock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useMFA } from '@/features/auth';
import { useUserDevices } from '@/hooks/useUserDevices';
import { cn } from '@/lib/utils';

interface SecurityScore {
  score: number;
  level: 'critical' | 'low' | 'medium' | 'high' | 'excellent';
  color: string;
  label: string;
}

interface SecurityCheck {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
  icon: React.ReactNode;
  points: number;
}

export function SecurityOverviewCard() {
  const { isMFAEnabled, factors } = useMFA();
  const { devices } = useUserDevices();

  const securityChecks = useMemo<SecurityCheck[]>(() => {
    return [
      {
        id: 'mfa',
        label: 'Autenticação 2FA',
        description: isMFAEnabled ? 'Ativo e configurado' : 'Não configurado',
        status: isMFAEnabled ? 'pass' : 'fail',
        icon: <Key className="h-4 w-4" />,
        points: isMFAEnabled ? 30 : 0,
      },
      {
        id: 'password',
        label: 'Senha Forte',
        description: 'Senha segura definida',
        status: 'pass',
        icon: <Lock className="h-4 w-4" />,
        points: 20,
      },
      {
        id: 'devices',
        label: 'Dispositivos Verificados',
        description: `${devices?.length || 0} dispositivo(s) registrado(s)`,
        status: (devices?.length || 0) > 0 ? 'pass' : 'warn',
        icon: <Smartphone className="h-4 w-4" />,
        points: (devices?.length || 0) > 0 ? 15 : 5,
      },
      {
        id: 'email',
        label: 'Email Verificado',
        description: 'Email confirmado',
        status: 'pass',
        icon: <UserCheck className="h-4 w-4" />,
        points: 20,
      },
      {
        id: 'session',
        label: 'Sessão Segura',
        description: 'Conexão criptografada',
        status: 'pass',
        icon: <Shield className="h-4 w-4" />,
        points: 15,
      },
    ];
  }, [isMFAEnabled, devices]);

  const securityScore = useMemo<SecurityScore>(() => {
    const totalPoints = securityChecks.reduce((acc, check) => acc + check.points, 0);
    const maxPoints = 100;
    const score = Math.min(100, Math.round((totalPoints / maxPoints) * 100));

    if (score >= 90) return { score, level: 'excellent', color: 'text-green-500', label: 'Excelente' };
    if (score >= 70) return { score, level: 'high', color: 'text-blue-500', label: 'Bom' };
    if (score >= 50) return { score, level: 'medium', color: 'text-warning', label: 'Médio' };
    if (score >= 30) return { score, level: 'low', color: 'text-orange-500', label: 'Baixo' };
    return { score, level: 'critical', color: 'text-red-500', label: 'Crítico' };
  }, [securityChecks]);

  const getStatusIcon = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getScoreIcon = () => {
    if (securityScore.level === 'excellent' || securityScore.level === 'high') {
      return <ShieldCheck className="h-16 w-16 text-green-500" />;
    }
    if (securityScore.level === 'medium') {
      return <Shield className="h-16 w-16 text-warning" />;
    }
    if (securityScore.level === 'low') {
      return <ShieldAlert className="h-16 w-16 text-orange-500" />;
    }
    return <ShieldOff className="h-16 w-16 text-red-500" />;
  };

  const getProgressVariant = (): 'default' | 'success' | 'warning' | 'destructive' => {
    if (securityScore.level === 'excellent' || securityScore.level === 'high') return 'success';
    if (securityScore.level === 'medium') return 'warning';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Visão Geral de Segurança
        </CardTitle>
        <CardDescription>
          Status atual das configurações de segurança da sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Section */}
        <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex-shrink-0">
            {getScoreIcon()}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pontuação de Segurança</span>
              <Badge variant="outline" className={cn(securityScore.color)}>
                {securityScore.label}
              </Badge>
            </div>
            <Progress
              value={securityScore.score}
              className="h-3"
              variant={getProgressVariant()}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{securityScore.score}/100 pontos</span>
              {securityScore.score < 100 && (
                <span>+{100 - securityScore.score} para segurança máxima</span>
              )}
            </div>
          </div>
        </div>

        {/* Security Checks */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Verificações de Segurança</h4>
          <div className="space-y-2">
            {securityChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    {check.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                {getStatusIcon(check.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

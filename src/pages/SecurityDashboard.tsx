import { useAuth } from '@/features/auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Users,
  Lock,
  Settings,
  AlertTriangle,
  Smartphone,
  Key,
  Bell,
  LayoutDashboard,
  Globe,
  Command
} from 'lucide-react';
import { useBlockedIPs, useRateLimitLogs, useSecurityEvents } from '@/features/admin';
import { BlockedIPsPanel } from '@/features/admin/components/security/BlockedIPsPanel';
import { RateLimitSettings } from '@/features/admin/components/security/RateLimitSettings';
import { SecurityEventsLog } from '@/features/admin/components/security/SecurityEventsLog';
import { PermissionMatrix } from '@/features/admin/components/security/PermissionMatrix';
import { PermissionManager } from '@/features/admin/components/security/PermissionManager';
import { MFASettings } from '@/features/admin/components/security/MFASettings';
import { GeoBlockingSettings } from '@/features/admin/components/security/GeoBlockingSettings';
import { IPAllowlist } from '@/components/settings/IPAllowlist';
import { LoginAuditLog } from '@/components/settings/LoginAuditLog';
import { SecurityOverviewCard } from '@/features/admin/components/security/SecurityOverviewCard';
import { ActiveDevicesPanel } from '@/features/admin/components/security/ActiveDevicesPanel';
import { SecurityAlertsPanel } from '@/features/admin/components/security/SecurityAlertsPanel';
import { PushNotificationSettings } from '@/features/admin/components/security/PushNotificationSettings';

import { useMFA } from '@/features/auth';
import { useUserDevices } from '@/hooks/useUserDevices';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { CyberResilienceScore } from '@/features/admin/components/security/CyberResilienceScore';
import { AICyberAdvisor } from '@/features/admin/components/security/AICyberAdvisor';
import { MainLayout } from '@/components/layout/MainLayout';


export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { isCoordinator, isManager } = useAuth();
  const { data: blockedIPs } = useBlockedIPs();
  const { data: rateLimitLogs } = useRateLimitLogs(100);
  const { data: securityEvents } = useSecurityEvents(100);
  const { isMFAEnabled } = useMFA();
  const { devices } = useUserDevices();

  if (!isCoordinator && !isManager) {
    return <Navigate to="/" replace />;
  }

  // Calculate stats
  const activeBlocks = blockedIPs?.length || 0;
  const recentRateLimits = rateLimitLogs?.filter(l => l.is_blocked).length || 0;
  const criticalEvents = securityEvents?.filter(e =>
    e.severity === 'critical' || e.severity === 'error'
  ).length || 0;
  const trustedDevices = devices?.filter(d => d.is_trusted).length || 0;

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter">
                <span className="gradient-text animate-pulse-glow">Cyber Resilience 10/10</span>
              </h1>
              <FavoriteButton
                path="/security"
                name="Segurança"
              />
            </div>
            <p className="text-muted-foreground mt-1">
              Zero Trust Architecture e Orquestração de Defesa Ativa IA
            </p>
          </div>
        <div className="flex items-center gap-2">
          <VoiceButton />
          <FavoritesDropdown onNavigate={(url) => navigate(url)} />
          <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
            <Command className="h-3 w-3" />K para buscar
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloqueados</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBlocks}</div>
            <p className="text-xs text-muted-foreground">Ativos no momento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
            <Activity className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRateLimits}</div>
            <p className="text-xs text-muted-foreground">Bloqueios recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Últimas 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
            <Smartphone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trustedDevices}/{devices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Confiáveis / Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={isMFAEnabled ? 'default' : 'secondary'} className={isMFAEnabled ? 'bg-green-500' : ''}>
                {isMFAEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Autenticação 2FA</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-10 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden md:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden md:inline">Sessões</span>
          </TabsTrigger>
          <TabsTrigger value="mfa" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden md:inline">MFA</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden md:inline">Eventos</span>
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden md:inline">IPs</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">Geo</span>
          </TabsTrigger>
          <TabsTrigger value="ratelimit" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Rate Limit</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Permissões</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden md:inline">Auditoria</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="grid gap-6 md:grid-cols-2">
                <CyberResilienceScore />
                <SecurityOverviewCard />
                <div className="md:col-span-2">
                  <SecurityAlertsPanel />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <AICyberAdvisor />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <ActiveDevicesPanel />
        </TabsContent>

        <TabsContent value="mfa">
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MFASettings />
              <PushNotificationSettings />
            </div>
            
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <SecurityAlertsPanel />
        </TabsContent>

        <TabsContent value="events">
          <SecurityEventsLog />
        </TabsContent>

        <TabsContent value="blocked">
          <div className="grid gap-6 lg:grid-cols-2">
            <BlockedIPsPanel />
            <IPAllowlist />
          </div>
        </TabsContent>

        <TabsContent value="geo">
          <GeoBlockingSettings />
        </TabsContent>

        <TabsContent value="ratelimit">
          <RateLimitSettings />
        </TabsContent>

        <TabsContent value="permissions">
          <div className="space-y-6">
            <PermissionManager />
            <PermissionMatrix />
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <LoginAuditLog />
        </TabsContent>
      </Tabs>
      </div>
    </MainLayout>
  );
}

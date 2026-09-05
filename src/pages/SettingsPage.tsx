import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { UserManagement } from '@/components/settings/UserManagement';
import { PasswordResetRequests } from '@/components/settings/PasswordResetRequests';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { IPAllowlist } from '@/components/settings/IPAllowlist';
import { LoginAuditLog } from '@/components/settings/LoginAuditLog';
import { TechniqueManagement } from '@/components/settings/TechniqueManagement';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import IntegrationHub from '@/components/integrations/IntegrationHub';
import { SettingsGeneralTab } from '@/components/settings/SettingsGeneralTab';
import { SettingsNotificationsTab } from '@/components/settings/SettingsNotificationsTab';
import { SettingsAlertsTab } from '@/components/settings/SettingsAlertsTab';
import { SettingsBackupTab } from '@/components/settings/SettingsBackupTab';
import { TransitionsSettings } from '@/components/settings/TransitionsSettings';

function usePersistedSettings() {
  const { user } = useAuth();
  const storageKey = `app-settings-${user?.id || 'guest'}`;
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return { notifications: true, sounds: true, autoRefresh: true };
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : { notifications: true, sounds: true, autoRefresh: true };
    } catch {
      return { notifications: true, sounds: true, autoRefresh: true };
    }
  });
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* quota exceeded */ } }, [settings, storageKey]);
  return [settings, setSettings] as const;
}

function useAlertThresholds() {
  const [thresholds, setThresholds] = useState(() => {
    try {
      const stored = localStorage.getItem('alert-thresholds');
      return stored ? JSON.parse(stored) : { lowBuffer: 30, criticalBuffer: 10, delayedJobMinutes: 60, oeeWarning: 70, oeeCritical: 50, energyPeakKw: 100, bottleneckRiskMinutes: 480, estimatedLoadLimitPercentage: 90 };
    } catch {
      return { lowBuffer: 30, criticalBuffer: 10, delayedJobMinutes: 60, oeeWarning: 70, oeeCritical: 50, energyPeakKw: 100, bottleneckRiskMinutes: 480, estimatedLoadLimitPercentage: 90 };
    }
  });

  const [entityThresholds, setEntityThresholds] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('entity-thresholds');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => { try { localStorage.setItem('alert-thresholds', JSON.stringify(thresholds)); } catch { /* quota exceeded */ } }, [thresholds]);
  useEffect(() => { try { localStorage.setItem('entity-thresholds', JSON.stringify(entityThresholds)); } catch { /* quota exceeded */ } }, [entityThresholds]);

  return [thresholds, setThresholds, entityThresholds, setEntityThresholds] as const;
}

export default function SettingsPage() {
  const [settings, setSettings] = usePersistedSettings();
  const [thresholds, setThresholds, entityThresholds, setEntityThresholds] = useAlertThresholds();

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings((prev: typeof settings) => ({ ...prev, [key]: value }));
    toast.success('Configuração salva automaticamente');
  };

  const handleThresholdChange = (key: string, value: number) => {
    setThresholds((prev: typeof thresholds) => ({ ...prev, [key]: value }));
  };
  const handleEntityThresholdChange = (entityId: string, value: number) => {
    setEntityThresholds((prev: Record<string, number>) => ({ ...prev, [entityId]: value }));
    toast.success('Limite específico aplicado!');
  };
  const handleExportData = async () => {
    toast.loading('Exportando dados...', { id: 'export' });
    try {
      const { data: jobs } = await supabase.from('jobs').select('*');
      const { data: operators } = await supabase.from('profiles').select('*');
      const { data: machines } = await supabase.from('machines').select('*');
      const exportData = { exportedAt: new Date().toISOString(), jobs, operators, machines };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success('Dados exportados com sucesso!', { id: 'export' });
    } catch { toast.error('Erro ao exportar dados', { id: 'export' }); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />
        <div>
          <h1 className="text-title gradient-text">Configurações Avançadas</h1>
          <p className="text-muted-foreground">Gerencie todas as configurações do sistema</p>
        </div>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="techniques">Técnicas</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>
          <TabsContent value="general"><SettingsGeneralTab settings={settings} onSettingChange={handleSettingChange} /></TabsContent>
          <TabsContent value="appearance"><TransitionsSettings /></TabsContent>
          <TabsContent value="techniques"><TechniqueManagement /></TabsContent>
          <TabsContent value="security" className="space-y-4"><TwoFactorSetup /><IPAllowlist /><LoginAuditLog /></TabsContent>
          <TabsContent value="notifications"><SettingsNotificationsTab settings={settings} onSettingChange={handleSettingChange} /></TabsContent>
          <TabsContent value="alerts"><SettingsAlertsTab thresholds={thresholds} entityThresholds={entityThresholds} onThresholdChange={handleThresholdChange} onEntityThresholdChange={handleEntityThresholdChange} onSave={() => toast.success('Limites de alerta salvos!')} onReset={() => { setThresholds({ lowBuffer: 30, criticalBuffer: 10, delayedJobMinutes: 60, oeeWarning: 70, oeeCritical: 50, energyPeakKw: 100, bottleneckRiskMinutes: 480, estimatedLoadLimitPercentage: 90 }); setEntityThresholds({}); toast.success('Limites restaurados para padrão'); }} /></TabsContent>
          <TabsContent value="users" className="space-y-4"><UserManagement /><PasswordResetRequests /></TabsContent>
          <TabsContent value="backup"><SettingsBackupTab onExportData={handleExportData} /></TabsContent>
          <TabsContent value="integrations"><IntegrationHub /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

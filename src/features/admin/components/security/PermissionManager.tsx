import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Users,
  Settings,
  Factory,
  FileText,
  Cog,
  Lock,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  useRolePermissions,
  AVAILABLE_PERMISSIONS,
  RESOURCE_LABELS
} from '@/features/auth';
import { useAuth, AppRole } from '@/features/auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Administrador',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: React.createElement(Shield, { className: "h-4 w-4" })
  },
  coordinator: {
    label: 'Coordenador',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    icon: React.createElement(Shield, { className: "h-4 w-4" })
  },
  manager: {
    label: 'Gerente',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: React.createElement(Users, { className: "h-4 w-4" })
  },
  operator: {
    label: 'Operador',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: React.createElement(Factory, { className: "h-4 w-4" })
  },
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  jobs: React.createElement(Factory, { className: "h-4 w-4" }),
  production: React.createElement(Factory, { className: "h-4 w-4" }),
  operators: React.createElement(Users, { className: "h-4 w-4" }),
  machines: React.createElement(Cog, { className: "h-4 w-4" }),
  reports: React.createElement(FileText, { className: "h-4 w-4" }),
  settings: React.createElement(Settings, { className: "h-4 w-4" }),
  security: React.createElement(Lock, { className: "h-4 w-4" }),
  users: React.createElement(Users, { className: "h-4 w-4" }),
  admin: React.createElement(Shield, { className: "h-4 w-4" }),
};

export function PermissionManager() {
  const { isCoordinator } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AppRole>('coordinator');
  
  const {
    permissions,
    isLoading,
    isSaving,
    fetchPermissions,
    togglePermission,
    hasPermission
  } = useRolePermissions(selectedRole);

  const [togglingPerm, setTogglingPerm] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions(selectedRole);
  }, [selectedRole, fetchPermissions]);

  // Group permissions by resource
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    const resource = perm.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const handleToggle = async (permissionStr: string) => {
    if (!isCoordinator) return;

    setTogglingPerm(permissionStr);
    await togglePermission(selectedRole, permissionStr);
    setTogglingPerm(null);
  };

  const countGrantedPermissions = (role: AppRole) => {
    // Note: Since useRolePermissions is now keyed to selectedRole,
    // this count is only accurate for the selected tab.
    // For a better UX, we'd need a multi-role hook or more complex state.
    if (role === selectedRole) return permissions.length;
    return 0; // Simplified for now
  };

  if (isLoading && permissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciador de Permissões
            </CardTitle>
            <CardDescription>
              Configure as permissões de acesso para cada função do sistema
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchPermissions(selectedRole)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => (
              <TabsTrigger key={role} value={role} className="flex gap-2">
                {ROLE_CONFIG[role].icon}
                <span className="hidden sm:inline">{ROLE_CONFIG[role].label}</span>
                {role === selectedRole && (
                  <Badge variant="secondary" className="ml-1">
                    {permissions.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => (
            <TabsContent key={role} value={role} className="space-y-6">
              {/* Role Info */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-full ${ROLE_CONFIG[role].color}`}>
                  {ROLE_CONFIG[role].icon}
                </div>
                <div>
                  <h4 className="font-medium">{ROLE_CONFIG[role].label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {permissions.length} de {AVAILABLE_PERMISSIONS.length} permissões ativas
                  </p>
                </div>
              </div>

              {/* Permission Groups */}
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div key={resource} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
                      {RESOURCE_ICONS[resource] || React.createElement(Settings, { className: "h-4 w-4" })}
                      <span className="font-medium">{RESOURCE_LABELS[resource] || resource}</span>
                    </div>
                    <div className="divide-y">
                      {perms.map((perm) => {
                        const isGranted = permissions.includes(perm.permission);
                        const isToggling = togglingPerm === perm.permission;

                        return (
                          <div
                            key={perm.permission}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{perm.label}</span>
                                {isGranted ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isToggling && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      checked={isGranted}
                                      onCheckedChange={() => handleToggle(perm.permission)}
                                      disabled={!isCoordinator || isSaving || isToggling}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isCoordinator
                                    ? `Clique para ${isGranted ? 'revogar' : 'conceder'} permissão`
                                    : 'Apenas coordenadores podem alterar permissões'
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {!isCoordinator && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning dark:text-warning">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Apenas coordenadores podem modificar permissões.
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

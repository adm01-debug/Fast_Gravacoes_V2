import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_PERMISSIONS, RESOURCE_LABELS, ACTION_LABELS } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { AppRole } from '@/features/auth';

// Categorias exibidas na matriz, derivadas do catálogo runtime.
const PERMISSION_CATEGORIES: Record<string, string[]> = {
  'Produção': ['jobs:read', 'jobs:create', 'jobs:update', 'jobs:delete'],
  'Operadores': ['operators:read', 'operators:create', 'operators:update', 'operators:delete'],
  'Máquinas': ['machines:read', 'machines:create', 'machines:update', 'machines:delete'],
  'Manutenção': ['maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete'],
  'Relatórios': ['reports:read', 'reports:export'],
  'Configurações': ['settings:read', 'settings:update'],
  'Qualidade': ['quality:read', 'quality:create', 'quality:update'],
  'Fichas Técnicas': ['technical_sheets:read', 'technical_sheets:create', 'technical_sheets:update', 'technical_sheets:delete', 'technical_sheets:approve'],
  'Estoque': ['inventory:read', 'inventory:transfer', 'inventory:adjust', 'inventory:delete'],
  'Energia': ['energy:read', 'energy:manage'],
  'Segurança': ['users:read', 'users:create', 'users:update', 'users:delete', 'users:change_role', 'audit:read'],
  'Sistema': ['alerts:read', 'alerts:resolve', 'gamification:read', 'gamification:manage', 'goals:read', 'goals:create', 'goals:update', 'goals:delete', 'spc:read', 'spc:manage', 'shifts:read', 'shifts:manage', 'bitrix:read', 'bitrix:sync', 'traceability:read', 'traceability:create'],
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  manager: 'Gerente',
  operator: 'Operador',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  coordinator: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  operator: 'bg-green-500/10 text-green-500 border-green-500/20',
};

function formatPermissionName(permission: string): string {
  const parts = permission.split(':');
  const action = parts[1];
  return ACTION_LABELS[action] || action;
}

export function PermissionMatrix() {
  const roles: AppRole[] = ['admin', 'coordinator', 'manager', 'operator'];
  const [dbPermissions, setDbPermissions] = useState<Record<AppRole, string[]> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('role, permission');
        if (cancelled) return;
        if (error) throw error;
        const grouped: Record<AppRole, string[]> = { admin: [], coordinator: [], manager: [], operator: [] };
        (data || []).forEach((row: { role: AppRole; permission: string }) => {
          if (grouped[row.role]) grouped[row.role].push(row.permission);
        });
        setDbPermissions(grouped);
      } catch (error: unknown) {
        logger.error('Error fetching permission matrix', error, 'PermissionMatrix');
        // Fallback para o mapa estático em caso de falha/erro de rede.
        if (!cancelled) setDbPermissions(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Banco autoritativo; o mapa estático (ROLE_PERMISSIONS) é só fallback offline.
  const hasPermission = (role: AppRole, permission: string): boolean => {
    const source = dbPermissions ? dbPermissions[role] : (ROLE_PERMISSIONS[role] || []);
    return source.includes(permission);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Matriz de Permissões
            </CardTitle>
            <CardDescription>
              Permissões reais por função no sistema (banco autoritativo)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !dbPermissions ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
              <div key={category}>
                <h3 className="font-semibold mb-3">{category}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Permissão</TableHead>
                      {roles.map(role => (
                        <TableHead key={role} className="text-center">
                          <Badge variant="outline" className={ROLE_COLORS[role]}>
                            {ROLE_LABELS[role]}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map(permission => (
                      <TableRow key={permission}>
                        <TableCell className="font-medium">
                          <div>
                            {formatPermissionName(permission)}
                            <div className="text-xs text-muted-foreground font-normal">
                              {RESOURCE_LABELS[permission.split(':')[0]] || permission.split(':')[0]}
                            </div>
                          </div>
                        </TableCell>
                        {roles.map(role => (
                          <TableCell key={`${role}-${permission}`} className="text-center">
                            {hasPermission(role, permission) ? (
                              <div className="flex justify-center">
                                <div className="p-1 rounded-full bg-green-500/10">
                                  <Check className="h-4 w-4 text-green-500" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="p-1 rounded-full bg-muted">
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Shield, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVAILABLE_PERMISSIONS, RESOURCE_LABELS, ACTION_LABELS, ROLE_PERMISSIONS } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { AppRole } from '@/features/auth';

// Categorias exibidas na matriz, derivadas do catálogo runtime. O grupo
// "Outras" é preenchido em runtime com permissões do banco que não fazem
// parte do catálogo estático (ex.: admin:all, ou uma permissão cadastrada
// depois do deploy) — sem ele a matriz montava uma lista fixa invisível.
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
  'Outras': [],
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
  const [extras, setExtras] = useState<string[]>([]);
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
        const allRaw = new Set<string>();
        (data || []).forEach((row: { role: AppRole; permission: string }) => {
          if (!row.permission) return;
          allRaw.add(row.permission);
          if (grouped[row.role]) grouped[row.role].push(row.permission);
        });
        // União do catálogo estático com o banco: permissões cadastradas que
        // não estão nas categorias acima aparecem no grupo "Outras".
        const known = new Set<string>(Object.values(PERMISSION_CATEGORIES).flat());
        AVAILABLE_PERMISSIONS.forEach(p => { if (!known.has(p.permission)) known.add(p.permission); });
        const extra = Array.from(allRaw).filter(perm => !known.has(perm)).sort();
        setDbPermissions(grouped);
        setExtras(extra);
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

  const categories = useMemo(() => {
    const base = Object.entries(PERMISSION_CATEGORIES).filter(([name]) => name !== 'Outras');
    return extras.length ? [...base, ['Outras', extras] as [string, string[]]] : base;
  }, [extras]);

  // Banco é a fonte primária; o mapa estático é só fallback offline. Admin é
  // tratado como acesso efetivo implícito (runtime faz bypass) — sem selo de
  // "bloqueado" para o administrador.
  const hasPermission = (role: AppRole, permission: string): boolean => {
    if (role === 'admin') return true;
    const source = dbPermissions ? dbPermissions[role] : (ROLE_PERMISSIONS[role] || []);
    return source.includes(permission);
  };

  const isImplicit = (role: AppRole, permission: string): boolean => {
    if (role !== 'admin') return false;
    // Mesma fonte do hasPermission: com fallback estatico, permissao presente
    // no mapa aparece como Check verde; ausente aparece como implicita (amber).
    const source = dbPermissions ? dbPermissions[role] : (ROLE_PERMISSIONS[role] || []);
    return !source.includes(permission);
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
            {categories.map(([category, permissions]) => (
              <div key={category}>
                <h3 className="font-semibold mb-3">{category}</h3>
                {permissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    Nenhuma permissão extra cadastrada no banco.
                  </p>
                ) : (
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
                              {isImplicit(role, permission) ? (
                                <div
                                  className="flex justify-center"
                                  title="Acesso implícito: o administrador tem acesso total no runtime (bypass), mesmo sem a permissão cadastrada no banco."
                                >
                                  <div className="p-1 rounded-full bg-amber-500/10">
                                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                                  </div>
                                </div>
                              ) : hasPermission(role, permission) ? (
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
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

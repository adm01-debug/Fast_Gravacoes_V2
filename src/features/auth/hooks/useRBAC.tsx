import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../index';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '../index';
import { ROLE_PERMISSIONS } from '../permissions';

// Route permissions mapping
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['jobs:read'],
  '/jobs': ['jobs:read'],
  '/machines': ['machines:read'],
  '/operators': ['operators:read'],
  '/reports': ['reports:read'],
  '/settings': ['settings:read'],
  '/maintenance': ['maintenance:read'],
  '/quality': ['quality:read'],
  '/traceability': ['traceability:read'],
  '/technical-sheets': ['technical_sheets:read'],
  '/operator': ['jobs:read'],
  '/gamification': ['gamification:read'],
  '/energy': ['energy:read'],
  '/spc': ['spc:read'],
  '/shifts': ['shifts:read'],
  '/bitrix': ['bitrix:read'],
  '/inventory': ['inventory:read'],
};

export interface RBACResult {
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // Route access
  canAccessRoute: (path: string) => boolean;

  // Role checks
  role: AppRole | null;
  isCoordinator: boolean;
  isManager: boolean;
  isOperator: boolean;
  isAdmin: boolean;

  // All permissions for current role
  permissions: string[];

  // Loading state
  isLoading: boolean;

  // Estado do fetch de permissoes no banco (false quando desabilitado ou
  // quando o runtime nao consulta, ex.: admin). Separado de isLoading (auth)
  // para o gate de rota aguardar o banco em vez de decidir com o mapa estatico.
  isPermissionLoading: boolean;
}

export function useRBAC(options?: { enabled?: boolean }): RBACResult {
  const enabled = options?.enabled !== false;
  const { role, isCoordinator, isManager, isOperator, isAdmin, isLoading } = useAuth();
  const [dbPermissions, setDbPermissions] = useState<string[] | null>(null);
  // Inicia true quando o fetch esta habilitado: o gate de rota aguarda a
  // resposta do banco em vez de avaliar com o mapa estatico (fallback de rede,
  // nao decisao).
  const [isPermissionLoading, setIsPermissionLoading] = useState(enabled);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLoading) {
        // Aguarda a resolucao da sessao; isPermissionLoading permanece no
        // estado inicial (true quando enabled) para o gate nao decidir cedo.
        return;
      }
      if (!role) {
        // Sem role (nao autenticado ou role indisponivel apos o boot): nao ha
        // consulta de permissoes a fazer - fecha o loading do gate para que a
        // rota redirecione para /auth ou / em vez de travar em "Carregando...".
        setDbPermissions(null);
        setIsPermissionLoading(false);
        return;
      }
      if (role === 'admin' || !enabled) {
        // Admin tem bypass total no runtime (hasPermission retorna true); e com
        // enabled=false nenhuma rota pede permissao. Ambos nao consultam o banco.
        setDbPermissions(null);
        setIsPermissionLoading(false);
        return;
      }
      setIsPermissionLoading(true);
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role', role);
        if (cancelled) return;
        if (error) throw error;
        // Banco e a fonte primaria da autorizacao (tela de permissoes tem efeito real).
        setDbPermissions((data || []).map(p => p.permission));
      } catch {
        // Fallback para o mapa estatico em caso de falha/erro de rede.
        if (!cancelled) setDbPermissions(null);
      } finally {
        if (!cancelled) setIsPermissionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, isLoading, enabled]);

  const permissions = useMemo(() => {
      if (!role) return [];
          // Banco é a fonte autoritativa: permissões revogadas na tela de
          // PermissionManager têm efeito real. O mapa estático só entra como
          // fallback quando a consulta ao banco falha (dbPermissions === null).
    const base = enabled && dbPermissions !== null ? dbPermissions : (ROLE_PERMISSIONS[role] || []);
    // Standardize all permissions to use ":" instead of "." and remove duplicates
          return Array.from(new Set(base.map(p => p.replace(/\./g, ':'))));
  }, [dbPermissions, role, enabled]);

  const resourceMatch = useMemo(() => {
    return (permission: string): boolean => {
          const [resource] = permission.replace(/\./g, ':').split(':');
      return permissions.includes(`${resource}:all`);
    };
  }, [permissions]);

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      const target = permission.replace(/\./g, ':');
      return permissions.includes(target) || resourceMatch(permission);
    };
  }, [role, permissions, resourceMatch]);

  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      return permissionList.some(p => permissions.includes(p) || resourceMatch(p));
    };
  }, [role, permissions, resourceMatch]);

  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      return permissionList.every(p => permissions.includes(p) || resourceMatch(p));
    };
  }, [role, permissions, resourceMatch]);

  const canAccessRoute = useMemo(() => {
    return (path: string): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;

      // Find matching route
      const requiredPermissions = ROUTE_PERMISSIONS[path];
      if (!requiredPermissions) return true; // No restrictions defined

      return requiredPermissions.some(p => permissions.includes(p) || resourceMatch(p));
    };
  }, [role, permissions, resourceMatch]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    role,
    isCoordinator,
    isManager,
    isOperator,
    isAdmin,
    permissions,
    isLoading,
    isPermissionLoading,
  };
}

// Component for conditional rendering based on permissions
interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isPermissionLoading } = useRBAC();

  if (isPermissionLoading) return null;

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Component for role-based rendering
interface RoleGateProps {
  roles: AppRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { role, isLoading } = useRBAC();

  if (isLoading) return null;

  const hasRole = role && roles.includes(role);

  return hasRole ? <>{children}</> : <>{fallback}</>;
}

export default useRBAC;

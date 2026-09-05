import { useMemo } from 'react';
import { useAuth } from '../index';
import type { AppRole } from '../index';

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: [
    'admin:all',
    'jobs:read', 'jobs:create', 'jobs:update', 'jobs:delete',
    'machines:read', 'machines:create', 'machines:update', 'machines:delete',
    'operators:read', 'operators:create', 'operators:update', 'operators:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:change_role',
    'reports:read', 'reports:export',
    'settings:read', 'settings:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete',
    'quality:read', 'quality:create', 'quality:update',
    'traceability:read', 'traceability:create',
    'technical_sheets:read', 'technical_sheets:create', 'technical_sheets:update', 'technical_sheets:delete',
    'technical_sheets:approve',
    'goals:read', 'goals:create', 'goals:update', 'goals:delete',
    'gamification:read', 'gamification:manage',
    'alerts:read', 'alerts:resolve',
    'energy:read', 'energy:manage',
    'spc:read', 'spc:manage',
    'shifts:read', 'shifts:manage',
    'bitrix:read', 'bitrix:sync',
    'audit:read',
    'inventory:read', 'inventory:transfer', 'inventory:adjust', 'inventory:delete',
  ],
  coordinator: [
    // Full access
    'jobs:read', 'jobs:create', 'jobs:update', 'jobs:delete',
    'machines:read', 'machines:create', 'machines:update', 'machines:delete',
    'operators:read', 'operators:create', 'operators:update', 'operators:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:change_role',
    'reports:read', 'reports:export',
    'settings:read', 'settings:update',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete',
    'quality:read', 'quality:create', 'quality:update',
    'traceability:read', 'traceability:create',
    'technical_sheets:read', 'technical_sheets:create', 'technical_sheets:update', 'technical_sheets:delete',
    'technical_sheets:approve',
    'goals:read', 'goals:create', 'goals:update', 'goals:delete',
    'gamification:read', 'gamification:manage',
    'alerts:read', 'alerts:resolve',
    'energy:read', 'energy:manage',
    'spc:read', 'spc:manage',
    'shifts:read', 'shifts:manage',
    'bitrix:read', 'bitrix:sync',
    'audit:read',
    'inventory:read', 'inventory:transfer', 'inventory:adjust', 'inventory:delete',
  ],
  manager: [
    // Most access except user management and some sensitive operations
    'jobs:read', 'jobs:create', 'jobs:update',
    'machines:read', 'machines:update',
    'operators:read',
    'users:read',
    'reports:read', 'reports:export',
    'settings:read',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'quality:read', 'quality:create', 'quality:update',
    'traceability:read', 'traceability:create',
    'technical_sheets:read', 'technical_sheets:update', 'technical_sheets:approve',
    'goals:read', 'goals:create', 'goals:update',
    'gamification:read',
    'alerts:read', 'alerts:resolve',
    'energy:read',
    'spc:read', 'spc:manage',
    'shifts:read', 'shifts:manage',
    'bitrix:read',
    'audit:read',
    'inventory:read', 'inventory:transfer', 'inventory:adjust',
  ],
  operator: [
    // Limited access - only their own data and assigned machines
    'jobs:read', 'jobs:update', // Can update job progress
    'machines:read',
    'quality:read', 'quality:create', // Can create quality inspections
    'traceability:read',
    'technical_sheets:read',
    'gamification:read', // Can view their achievements
    'alerts:read',
    'shifts:read',
    'maintenance:read', // Can view maintenance schedules
    'inventory:read',
  ],
};

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
}

export function useRBAC(): RBACResult {
  const { role, isCoordinator, isManager, isOperator, isAdmin, isLoading } = useAuth();

  const permissions = useMemo(() => {
    if (isLoading || !role) return [];
    
    const perms = ROLE_PERMISSIONS[role] || [];
    // Standardize all permissions to use ":" instead of "." and remove duplicates
    const standardized = perms.map(p => p.replace(/\./g, ':'));
    return Array.from(new Set(standardized));
  }, [role, isLoading]);

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      const target = permission.replace(/\./g, ':');
      return permissions.includes(target);
    };
  }, [role, permissions]);

  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      return permissionList.some(p => permissions.includes(p));
    };
  }, [role, permissions]);

  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;
      return permissionList.every(p => permissions.includes(p));
    };
  }, [role, permissions]);

  const canAccessRoute = useMemo(() => {
    return (path: string): boolean => {
      if (!role) return false;
      if (role === 'admin') return true;

      // Find matching route
      const requiredPermissions = ROUTE_PERMISSIONS[path];
      if (!requiredPermissions) return true; // No restrictions defined

      return requiredPermissions.some(p => permissions.includes(p));
    };
  }, [role, permissions]);

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
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useRBAC();

  if (isLoading) return null;

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

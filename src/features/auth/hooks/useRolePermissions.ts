/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { showErrorToast } from '@/lib/errorHandling';
import { type AppRole } from '../index';
import { ROLE_PERMISSIONS } from './useRBAC';

export function useRolePermissions(role: AppRole | null) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPermissions = useCallback(async (selectedRole: AppRole) => {
    if (!selectedRole) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', selectedRole);

      if (error) throw error;
      setPermissions((data || []).map(p => p.permission));
    } catch (error: unknown) {
      logger.error('Error fetching permissions', error, 'useRolePermissions');
      // Fallback to static permissions from useRBAC
      if (selectedRole && ROLE_PERMISSIONS[selectedRole]) {
        setPermissions(ROLE_PERMISSIONS[selectedRole]);
      } else {
        setPermissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role) {
      fetchPermissions(role);
    }
  }, [role, fetchPermissions]);

  const togglePermission = async (targetRole: AppRole, permissionStr: string) => {
    setIsSaving(true);
    const isEnabled = permissions.includes(permissionStr);
    try {
      if (isEnabled) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .match({ role: targetRole, permission: permissionStr });
        if (error) throw error;
        setPermissions(prev => prev.filter(p => p !== permissionStr));
      } else {
        const [resource, action = 'read'] = permissionStr.split(':');
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role: targetRole,
            permission: permissionStr,
            resource,
            action,
          });
        if (error) throw error;
        setPermissions(prev => [...prev, permissionStr]);
      }
      toast.success('Permissão atualizada');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao atualizar permissão');
    } finally {
      setIsSaving(false);
    }
  };

  const hasPermission = useCallback((permissionStr: string): boolean => {
    if (!role) return false;
    if (permissions.includes('admin:all')) return true;
    
    const [resource] = permissionStr.split(':');
    if (permissions.includes(`${resource}:all`)) return true;
    
    return permissions.includes(permissionStr);
  }, [role, permissions]);

  return {
    permissions,
    isLoading,
    isSaving,
    fetchPermissions,
    togglePermission,
    hasPermission
  };
}

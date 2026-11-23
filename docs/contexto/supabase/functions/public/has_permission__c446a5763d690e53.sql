CREATE OR REPLACE FUNCTION public.has_permission(_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT app_private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND rp.is_granted = true
        AND (
          rp.permission = _permission
          -- admin:all so contorna a revogacao para perfil admin REAL: a thread
          -- SEC do review apontou que admin:all em role comum (ex.: concession
          -- via PermissionManager) promovia a role a admin sem ter o perfil.
          OR (rp.permission = 'admin:all' AND ur.role = 'admin'::app_role)
        )
    );
$function$

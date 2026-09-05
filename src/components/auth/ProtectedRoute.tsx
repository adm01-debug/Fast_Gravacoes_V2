import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth, AppRole, useAuthenticatorAssuranceLevel } from '@/features/auth';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  coordinator: 'Coordenador',
  operator: 'Operador',
};

function AccessDeniedRedirect({
  role,
  allowedRoles,
  path,
  to,
}: {
  role: AppRole;
  allowedRoles: AppRole[];
  path: string;
  to: string;
}) {
  const notified = useRef(false);
  useEffect(() => {
    if (notified.current) return;
    notified.current = true;
    const needed = allowedRoles.map((r) => ROLE_LABEL[r] ?? r).join(', ');
    toast.error('Acesso restrito', {
      description: `Esta área requer perfil: ${needed}. Seu perfil atual (${ROLE_LABEL[role] ?? role}) não tem permissão. Fale com um administrador para solicitar acesso.`,
      duration: 8000,
    });
    logger.warn('Access denied: role not allowed', { role, allowedRoles, path }, 'ProtectedRoute');
  }, [role, allowedRoles, path]);
  return <Navigate to={to} replace />;
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const { checked: aalChecked, needsMfaChallenge } = useAuthenticatorAssuranceLevel();
  const location = useLocation();

  // Log rendering path in development
  if (import.meta.env.DEV) {
    logger.debug('Rendering path:', {
      path: location.pathname,
      hasUser: !!user,
      role,
      isLoading,
      allowedRoles
    }, 'ProtectedRoute');
  }

  if (isLoading || (user && !aalChecked)) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    logger.info('No user session, redirecting to /auth', { path: location.pathname }, 'ProtectedRoute');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // A session (AAL1) does not by itself prove MFA was completed. If the
  // account has a verified MFA factor and this session hasn't stepped up to
  // aal2, send the user back to /auth — which shows the MFA challenge for an
  // existing session — instead of rendering protected content. Without this,
  // MFA was enforced only by AuthPage's own UI flow and could be bypassed by
  // navigating straight to any protected route right after password sign-in.
  if (needsMfaChallenge) {
    logger.info('Session has not completed MFA (aal1), redirecting to /auth', { path: location.pathname }, 'ProtectedRoute');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control
  // If role is strictly admin, bypass all other checks
  if (role === 'admin') {
    return <>{children}</>;
  }

  // If role verification finished without a valid role, do not keep users stuck
  // on the permission loader. Redirect to the safest available authenticated route.
  if (allowedRoles && role === null) {
    logger.warn('Role unavailable after auth loading completed', {
      path: location.pathname,
      allowedRoles,
    }, 'ProtectedRoute');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const to = role === 'operator' ? '/operator' : '/';
    return (
      <AccessDeniedRedirect
        role={role}
        allowedRoles={allowedRoles}
        path={location.pathname}
        to={to}
      />
    );
  }


  return <>{children}</>;
}

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAVIGATION_EVENT, isNavigationEvent } from '@/lib/navigation';
import { trackNavEvent } from '@/lib/navTelemetry';

/**
 * Component that listens for custom navigation events and handles them
 * using React Router's useNavigate hook.
 *
 * This allows code outside of React components (like notification handlers)
 * to trigger navigation without causing full page reloads.
 */
export function NavigationListener() {
  const navigate = useNavigate();
  const location = useLocation();

  // Telemetria de navegação (breadcrumb no Sentry a cada pageview)
  useEffect(() => {
    trackNavEvent('pageview', { path: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      if (isNavigationEvent(event)) {
        navigate(event.detail.path);
      }
    };

    window.addEventListener(NAVIGATION_EVENT, handleNavigation);

    return () => {
      window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
    };
  }, [navigate]);

  return null;
}

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { internalDepth, recordLocation, subscribeNavHistory } from '@/lib/navHistory';

const getCanGoBack = () => internalDepth() > 0;

/**
 * Voltar seguro: navega no histórico apenas quando existe uma entrada
 * interna anterior (registrada em navHistory — `location.key !== 'default'`
 * falha quando um redirect `replace`, como o do ProtectedRoute, cria key
 * nova numa primeira entrada que não tem predecessor interno).
 * `window.history.length > 1` conta entradas de outros sites/abas e pode
 * expulsar o usuário em deep-links.
 */
export function useSmartBack(fallbackTo = '/') {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();

  const canGoBack = useSyncExternalStore(subscribeNavHistory, getCanGoBack, getCanGoBack);

  useEffect(() => {
    recordLocation(navType, location.key);
  }, [navType, location.key]);

  const goBack = useCallback(() => {
    if (internalDepth() > 0) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  }, [navigate, fallbackTo]);

  return { canGoBack, goBack };
}

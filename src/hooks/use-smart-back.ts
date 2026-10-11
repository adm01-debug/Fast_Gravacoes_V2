import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Voltar seguro: navega no histórico apenas quando a entrada atual foi
 * criada por navegação interna do app. `window.history.length > 1` conta
 * entradas de outros sites/abas e pode expulsar o usuário em deep-links;
 * o React Router marca a primeira entrada da sessão com key "default",
 * então qualquer outra key indica navegação interna.
 */
export function useSmartBack(fallbackTo = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = location.key !== 'default';

  const goBack = useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  }, [navigate, location.key, fallbackTo]);

  return { canGoBack, goBack };
}

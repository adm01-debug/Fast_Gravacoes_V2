import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHapticFeedback } from './use-haptic-feedback';
import { SoundFeedback } from '@/lib/soundFeedback';
import { useSmartBack } from './use-smart-back';
import { useDirtyGuard } from '@/contexts/DirtyFormContext';
import { trackNavBack } from '@/lib/navTelemetry';

export function useNavigationHotkeys() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trigger } = useHapticFeedback();
  const { canGoBack: hasInternalEntry, goBack } = useSmartBack();
  const { confirmIfDirty } = useDirtyGuard();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Alt + ArrowLeft or Backspace to go back
      if ((event.altKey && event.key === 'ArrowLeft')) {
        event.preventDefault();
        trigger('light');
        SoundFeedback.navBack();
        trackNavBack('hotkey', hasInternalEntry ? 'history' : 'fallback');
        confirmIfDirty(goBack);
      }

      // Alt + H to go Home
      if (event.altKey && (event.key === 'h' || event.key === 'H')) {
        event.preventDefault();
        trigger('medium');
        SoundFeedback.navForward();
        confirmIfDirty(() => navigate('/'));
      }

      // Alt + N to go Notifications
      if (event.altKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        trigger('light');
        confirmIfDirty(() => navigate('/notifications'));
      }

      // Alt + S to open Global Search (simulates Cmd+K) — não navega,
      // então não passa pelo confirmIfDirty (evitaria dialog de
      // descarte numa ação que só abre a paleta).
      if (event.altKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        trigger('light');
        SoundFeedback.click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      }
      
      // Alt + R for Refresh data
      if (event.altKey && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        trigger('medium');
        SoundFeedback.click();
        confirmIfDirty(() => window.location.reload());
      }

      // Alt + B for Back (additional shortcut)
      if (event.altKey && (event.key === 'b' || event.key === 'B')) {
        event.preventDefault();
        trigger('light');
        SoundFeedback.navBack();
        trackNavBack('hotkey', hasInternalEntry ? 'history' : 'fallback');
        confirmIfDirty(goBack);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, trigger, goBack, hasInternalEntry, confirmIfDirty]);
}

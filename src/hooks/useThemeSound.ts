/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { isSoundEnabled } from '@/lib/soundFeedback';

const SOUND_ENABLED_KEY = 'theme-sound-enabled';

type BrowserAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const createBrowserAudioContext = (): AudioContext => {
  const audioWindow = window as BrowserAudioWindow;
  const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext não suportado neste navegador.');
  }

  return new AudioContextConstructor();
};

export function useThemeSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Bumped quando outra aba/contexto altera prefs de som, para o estado
  // efetivo re-renderizar sem depender só de re-renders casuais.
  const [prefsVersion, setPrefsVersion] = useState(0);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
  }, []);

  // `storage` só dispara entre abas — cobre opt-out mudado em outra janela.
  // Escritas na MESMA aba ainda dependem de um re-render natural (navegação,
  // interação) — o indicador pode ficar uma tela atrás, nunca o áudio.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SOUND_ENABLED_KEY && e.newValue !== null) {
        setSoundEnabled(e.newValue === 'true');
      }
      if (e.key === 'user-preferences' || e.key?.startsWith('app-settings-')) {
        setPrefsVersion(v => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      try { localStorage.setItem(SOUND_ENABLED_KEY, String(newValue)); } catch { /* quota exceeded */ }
      return newValue;
    });
  }, []);

  const getAudioContext = useCallback(() => {
    const audioWindow = window as BrowserAudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;

    if (audioContextRef.current) return audioContextRef.current;

    try {
      const ctx = new AudioContextConstructor();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const playLightModeSound = useCallback(() => {
    // Opt-out unificado: a chave local `theme-sound-enabled` controla este
    // hook; `isSoundEnabled()` cobre os opt-outs global (user-preferences)
    // e por conta (app-settings-<uid>) — qualquer um desligado silencia.
    if (!soundEnabled || !isSoundEnabled()) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Create a bright, ascending chime for light mode
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.25);

      // Add a subtle shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1600, now + 0.05);

      shimmerGain.gain.setValueAtTime(0, now + 0.05);
      shimmerGain.gain.linearRampToValueAtTime(0.03, now + 0.08);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(now + 0.05);
      shimmer.stop(now + 0.2);
    } catch (e) {
      // Silently fail if audio not available
    }
  }, [getAudioContext, soundEnabled]);

  const playDarkModeSound = useCallback(() => {
    // Opt-out unificado: a chave local `theme-sound-enabled` controla este
    // hook; `isSoundEnabled()` cobre os opt-outs global (user-preferences)
    // e por conta (app-settings-<uid>) — qualquer um desligado silencia.
    if (!soundEnabled || !isSoundEnabled()) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Create a soft, descending tone for dark mode
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.2);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.06, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.3);

      // Add a subtle low hum
      const hum = ctx.createOscillator();
      const humGain = ctx.createGain();

      hum.type = 'sine';
      hum.frequency.setValueAtTime(200, now + 0.1);

      humGain.gain.setValueAtTime(0, now + 0.1);
      humGain.gain.linearRampToValueAtTime(0.02, now + 0.15);
      humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      hum.connect(humGain);
      humGain.connect(ctx.destination);

      hum.start(now + 0.1);
      hum.stop(now + 0.35);
    } catch (e) {
      // Silently fail if audio not available
    }
  }, [getAudioContext, soundEnabled]);

  // `soundEnabled` = estado EFETIVO (chave local && opt-outs global/por
  // conta) — alimenta o indicador de mudo e o que realmente toca.
  // `localSoundEnabled` = só a chave local — alimenta o rótulo/ação do
  // menu, que é consistente com a preferência que `toggleSound` escreve.
  // `prefsVersion` na dependência re-lê os opt-outs quando outra aba muda.
  const effectiveSoundEnabled = useMemo(
    () => soundEnabled && isSoundEnabled(),
    [soundEnabled, prefsVersion],
  );
  return {
    playLightModeSound,
    playDarkModeSound,
    soundEnabled: effectiveSoundEnabled,
    localSoundEnabled: soundEnabled,
    toggleSound,
  };
}

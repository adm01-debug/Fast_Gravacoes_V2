/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useCallback, useRef, useState, useEffect } from 'react';

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

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
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
    if (!soundEnabled) return;

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
    if (!soundEnabled) return;

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

  return { playLightModeSound, playDarkModeSound, soundEnabled, toggleSound };
}

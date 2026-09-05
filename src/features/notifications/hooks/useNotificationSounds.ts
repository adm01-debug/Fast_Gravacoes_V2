import { useCallback, useRef } from 'react';

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

type SoundType = 'delayed' | 'buffer' | 'bottleneck' | 'statusChange' | 'complete' | 'scan' | 'alert';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  pattern?: number[];
  volume?: number;
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  delayed: {
    frequency: 440,
    duration: 0.3,
    type: 'square',
    pattern: [0.15, 0.1, 0.15],
    volume: 0.3
  },
  buffer: {
    frequency: 330,
    duration: 0.4,
    type: 'sine',
    pattern: [0.2, 0.1, 0.2],
    volume: 0.25
  },
  bottleneck: {
    frequency: 520,
    duration: 0.5,
    type: 'sawtooth',
    pattern: [0.15, 0.08, 0.15, 0.08, 0.15],
    volume: 0.2
  },
  statusChange: {
    frequency: 600,
    duration: 0.2,
    type: 'sine',
    pattern: [0.1, 0.05, 0.1],
    volume: 0.2
  },
  complete: {
    frequency: 880,
    duration: 0.4,
    type: 'sine',
    pattern: [0.1, 0.05, 0.12, 0.05, 0.15],
    volume: 0.25
  },
  scan: {
    frequency: 1200,
    duration: 0.1,
    type: 'sine',
    volume: 0.15
  },
  alert: {
    frequency: 660,
    duration: 0.3,
    type: 'square',
    pattern: [0.12, 0.08, 0.12, 0.08, 0.2],
    volume: 0.35
  }
};

export const useNotificationSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef<boolean>(true);

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    const audioWindow = window as BrowserAudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;

    try {
      const ctx = new AudioContextConstructor();
      // Chrome suspends AudioContexts created without a user gesture.
      // Try to resume it (silently no-ops if it can't).
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType, volume: number = 0.2) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioContext]);

  const playSound = useCallback((soundType: SoundType) => {
    if (!isEnabledRef.current) return;

    const config = soundConfigs[soundType];
    if (!config) return;

    try {
      if (config.pattern) {
        let delay = 0;
        const frequencyStep = soundType === 'complete' ? 100 : 50;

        config.pattern.forEach((duration, index) => {
          setTimeout(() => {
            const freq = soundType === 'delayed'
              ? config.frequency - (index * 30)
              : config.frequency + (index * frequencyStep);
            playTone(freq, duration, config.type, config.volume || 0.2);
          }, delay * 1000);
          delay += duration + 0.05;
        });
      } else {
        playTone(config.frequency, config.duration, config.type, config.volume || 0.2);
      }
    } catch {
      // Som de notificação é opcional; ignora se a Web Audio API falhar.
    }
  }, [playTone]);

  const playDelayedAlert = useCallback(() => playSound('delayed'), [playSound]);
  const playBufferAlert = useCallback(() => playSound('buffer'), [playSound]);
  const playBottleneckAlert = useCallback(() => playSound('bottleneck'), [playSound]);
  const playStatusChangeAlert = useCallback(() => playSound('statusChange'), [playSound]);
  const playCompleteAlert = useCallback(() => playSound('complete'), [playSound]);
  const playScanSound = useCallback(() => playSound('scan'), [playSound]);
  const playAlertSound = useCallback(() => playSound('alert'), [playSound]);

  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
    localStorage.setItem('notification_sounds_enabled', String(enabled));
  }, []);

  const isEnabled = useCallback(() => {
    const stored = localStorage.getItem('notification_sounds_enabled');
    if (stored !== null) {
      isEnabledRef.current = stored === 'true';
    }
    return isEnabledRef.current;
  }, []);

  return {
    playSound,
    playDelayedAlert,
    playBufferAlert,
    playBottleneckAlert,
    playStatusChangeAlert,
    playCompleteAlert,
    playScanSound,
    playAlertSound,
    setEnabled,
    isEnabled
  };
};

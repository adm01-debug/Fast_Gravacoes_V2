import { isSoundEnabled } from '@/lib/soundFeedback';

// Sound configurations for different scan actions
export const actionSounds: Record<string, { frequencies: number[]; durations: number[]; type: OscillatorType }> = {
  start: { frequencies: [523.25, 659.25, 783.99], durations: [0.1, 0.1, 0.15], type: 'sine' },
  pause: { frequencies: [440, 349.23], durations: [0.15, 0.2], type: 'triangle' },
  resume: { frequencies: [440, 523.25], durations: [0.1, 0.15], type: 'sine' },
  finish: { frequencies: [523.25, 659.25, 783.99, 1046.5], durations: [0.08, 0.08, 0.08, 0.25], type: 'sine' },
  view: { frequencies: [880], durations: [0.15], type: 'sine' },
};

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function playNotificationSound(action: string) {
  if (!isSoundEnabled()) return;
  try {
    const windowWithWebkit = window as WebkitWindow;
    const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const soundConfig = actionSounds[action] || actionSounds.view;

    let currentTime = audioContext.currentTime;

    soundConfig.frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = soundConfig.type;
      oscillator.frequency.setValueAtTime(freq, currentTime);

      const duration = soundConfig.durations[index];
      gainNode.gain.setValueAtTime(0.25, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);

      currentTime += duration * 0.9;
    });
  } catch {
    // Som de feedback é opcional; ignora se a Web Audio API falhar.
  }
}

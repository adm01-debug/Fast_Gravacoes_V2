// Sound feedback utility for operator interactions
// Uses Web Audio API for lightweight, no-file-needed sounds

type BrowserAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const audioWindow = window as BrowserAudioWindow;
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    audioContext = ctx;
    return ctx;
  } catch {
    return null;
  }
}

function currentUserId(): string | null {
  // O client Supabase persiste a sessão em sessionStorage
  // (src/integrations/supabase/client.ts) — checa ele PRIMEIRO: um
  // auth-token velho no localStorage (setup anterior) não pode
  // sequestrar o userId da sessão ativa.
  for (const storage of [sessionStorage, localStorage]) {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && /^sb-.*-auth-token$/.test(key)) {
          const session = JSON.parse(storage.getItem(key) ?? '{}');
          const id = session?.user?.id ?? session?.currentSession?.user?.id;
          if (id) return id;
        }
      }
    } catch {
      // storage indisponível — tenta o próximo
    }
  }
  return null;
}

/**
 * Respeita o opt-out de sons: lê `soundEnabled` em `user-preferences`
 * (UserPreferencesContext) e `sounds` em `app-settings-<uid>`
 * (SettingsPage). Qualquer um desligado silencia tudo.
 */
export function isSoundEnabled(): boolean {
  try {
    const userId = currentUserId();
    // 'user-preferences' é a chave que o UserPreferencesContext grava —
    // é o opt-out explícito do usuário DESTE navegador e vale logado ou
    // anônimo. 'app-settings-<uid>' é o opt-out por conta (SettingsPage).
    // Qualquer um desligado silencia tudo.
    const prefs = localStorage.getItem('user-preferences');
    if (prefs && JSON.parse(prefs).soundEnabled === false) return false;
    if (userId) {
      const settings = JSON.parse(localStorage.getItem(`app-settings-${userId}`) ?? '{}');
      if (settings.sounds === false) return false;
    }
  } catch {
    // storage indisponível — mantém som ligado
  }
  return true;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export const SoundFeedback = {
  /** Short success beep - production started or finished */
  success() {
    playTone(880, 0.15, 'sine');
    setTimeout(() => playTone(1100, 0.2, 'sine'), 150);
  },

  /** Warning tone - pause */
  warning() {
    playTone(440, 0.3, 'triangle');
  },

  /** Error tone */
  error() {
    playTone(200, 0.4, 'sawtooth', 0.1);
  },

  /** Soft click for interactions */
  click() {
    playTone(600, 0.05, 'sine', 0.08);
  },

  /** Achievement unlocked fanfare */
  achievement() {
    playTone(523, 0.1, 'sine');
    setTimeout(() => playTone(659, 0.1, 'sine'), 100);
    setTimeout(() => playTone(784, 0.15, 'sine'), 200);
    setTimeout(() => playTone(1047, 0.3, 'sine'), 300);
  },
  
  /** Navigation forward sound */
  navForward() {
    playTone(800, 0.1, 'sine', 0.05);
    setTimeout(() => playTone(1200, 0.15, 'sine', 0.03), 50);
  },

  /** Navigation backward sound */
  navBack() {
    playTone(1200, 0.1, 'sine', 0.05);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.03), 50);
  },
};

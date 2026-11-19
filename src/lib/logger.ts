import type { Database } from '@/integrations/supabase/types';

/**
 * Structured logger — handles logging levels and production error capture.
 * Persists errors to Supabase and sends critical alerts.
 * Never logs PII (emails, tokens, passwords).
 */

const isDev = import.meta.env.DEV;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
  severity?: number; // 0-4 scale for monitoring
}


const SEVERITY_MAP: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

// Error monitoring history (limited to 50 entries in memory for internal dashboard)
const errorHistory: LogEntry[] = [];
const MAX_HISTORY = 50;

// --- Batched persistence to Supabase ---------------------------------------
// Persisting one row per log event put a network write on the hot path. We now
// buffer rows and flush them in a single batched insert (debounced), which also
// guards against runaway volume. An anti-recursion flag ensures a failure inside
// the flush never re-enters the logger.
type ErrorLogRow = Database['public']['Tables']['error_logs']['Insert'];

const persistQueue: ErrorLogRow[] = [];
const MAX_QUEUE = 100; // hard cap to bound memory if offline / DB unavailable
const FLUSH_DEBOUNCE_MS = 2000;
const FLUSH_AT_SIZE = 25;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

async function flushLogs(): Promise<void> {
  if (isFlushing || persistQueue.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  isFlushing = true;
  // Drain the queue up front so events logged during the await are not lost
  // and are not double-sent.
  const batch = persistQueue.splice(0, persistQueue.length);
  try {
    // Import dinâmico quebra o ciclo estático client → logger → client:
    // o client instrumenta fetch via logger, então o logger não pode
    // depender do client no grafo de imports.
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.from('error_logs').insert(batch);
    if (error) {
      // Do NOT route this through the logger (would recurse). Plain console only.
      console.error('Failed to persist error logs batch:', error.message);
    }
  } catch (err) {
    console.error('Failed to persist error logs batch:', err);
  } finally {
    isFlushing = false;
  }
}

function scheduleFlush(): void {
  if (persistQueue.length >= FLUSH_AT_SIZE) {
    void flushLogs();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushLogs();
    }, FLUSH_DEBOUNCE_MS);
  }
}

// Best-effort flush when the tab is hidden/closed so buffered logs aren't lost.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const finalFlush = () => { void flushLogs(); };
  window.addEventListener('pagehide', finalFlush);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') finalFlush();
  });
}

function enqueuePersist(level: LogLevel, message: string, context: string | undefined, data: unknown): void {
  const rawStack = data instanceof Error ? data.stack ?? null : (data !== undefined ? safeStringify(data) : null);
  const rawData = data instanceof Error ? { name: data.name, message: data.message } : data;
  persistQueue.push({
    message: redactString(message),
    stack: rawStack ? redactString(rawStack) : null,
    component_name: context || 'global',
    url: typeof window !== 'undefined' ? redactUrl(window.location.href) : '',
    metadata: {
      level,
      severity: SEVERITY_MAP[level],
      data: redactDeep(rawData) as never,
    },
  });
  // Bound memory: drop the oldest entries if the DB is unreachable for a while.
  if (persistQueue.length > MAX_QUEUE) {
    persistQueue.splice(0, persistQueue.length - MAX_QUEUE);
  }
  scheduleFlush();
}


function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// --- PII redaction ----------------------------------------------------------
// This module's own contract ("Never logs PII") was not actually enforced:
// error.message/stack can embed literal values (e.g. a Postgres unique-
// constraint violation echoes the offending column value back in the
// message), and `data`/`url` were persisted to error_logs and forwarded to
// the alert webhook completely unredacted. Scrub emails and JWT-shaped
// tokens from any string before it is persisted or sent externally, and
// strip query strings from URLs (which can carry tokens/emails/ids).
const isAsciiLetter = (c: string): boolean => {
  const code = c.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
};

const isAtomChar = (c: string): boolean => {
  const code = c.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    isAsciiLetter(c) ||
    c === '.' ||
    c === '_' ||
    c === '%' ||
    c === '+' ||
    c === '-'
  );
};

const isDomainChar = (c: string): boolean => {
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) || isAsciiLetter(c) || c === '.' || c === '-';
};

const isJwtChar = (c: string): boolean => {
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) || isAsciiLetter(c) || c === '_' || c === '-';
};

const isAllLetters = (value: string, from: number, to: number): boolean => {
  if (to <= from) return false;
  for (let i = from; i < to; i++) {
    if (!isAsciiLetter(value[i])) return false;
  }
  return true;
};

/**
 * Linear-time PII redaction. The previous EMAIL_RE/JWT_RE patterns used nested
 * quantifiers whose backtracking is polynomial on attacker-controlled input
 * (e.g. many '.'/'%' repetitions), which could stall the logger exactly when
 * an error was being recorded ? the moment it must not hang. This scanner
 * visits every character once and never backtracks.
 */
function redactString(value: string): string {
  let out = '';
  let i = 0;
  const n = value.length;

  while (i < n) {
    const c = value[i];

    // JWT-shaped token: 'eyJ' + three dot-separated base64url segments (10+ chars).
    if (c === 'e' && value.startsWith('eyJ', i)) {
      let cursor = i + 3;
      let firstLen = 0;
      while (cursor < n && isJwtChar(value[cursor])) {
        cursor++;
        firstLen++;
      }
      if (firstLen >= 10) {
        let remaining = 2;
        let ok = true;
        while (remaining > 0 && ok) {
          if (cursor < n && value[cursor] === '.') {
            cursor++;
            const segStart = cursor;
            while (cursor < n && isJwtChar(value[cursor])) cursor++;
            if (cursor - segStart < 10) ok = false;
            else remaining--;
          } else {
            ok = false;
          }
        }
        if (ok && remaining === 0) {
          out += '[REDACTED_TOKEN]';
          i = cursor;
          continue;
        }
      }
    }

    // Email-shaped substring: atom + '@' + domain with a dotted, 2+ letter TLD.
    // The atom scan stops at a 'eyJ' boundary so a JWT preceded by text is
    // still detected below (e.g. `token_eyJ...`), instead of being swallowed.
    if (isAtomChar(c)) {
      let end = i;
      while (end < n && isAtomChar(value[end]) && !(end > i && value.startsWith('eyJ', end))) end++;
      if (end < n && value[end] === '@') {
        let dEnd = end + 1;
        while (dEnd < n && isDomainChar(value[dEnd])) dEnd++;
        // A trailing '.' before space/EOL is punctuation, not part of the domain;
        // otherwise `user@empresa.com.` would not resolve to a dotted TLD.
        while (dEnd > end + 1 && value[dEnd - 1] === '.') dEnd--;
        let hit = false;
        for (let k = dEnd - 1; k > end; k--) {
          if (value[k] === '.' && isAllLetters(value, k + 1, dEnd)) {
            hit = true;
            break;
          }
        }
        if (hit) {
          out += '[REDACTED_EMAIL]';
          i = dEnd;
          continue;
        }
      }
      out += value.slice(i, end);
      i = end;
      continue;
    }

    out += c;
    i++;
  }

  return out;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Not a full URL (e.g. relative path) — still strip anything after '?'/'#'.
    return url.split(/[?#]/)[0];
  }
}

/** Recursively redacts PII-shaped strings anywhere in a value before it is
 * persisted/forwarded. Depth-limited to avoid pathological input. */
function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[REDACTED_DEPTH_LIMIT]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  return entry.context ? `${prefix} [${entry.context}] ${entry.message}` : `${prefix} ${entry.message}`;
}

function createEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
  const entry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
    severity: SEVERITY_MAP[level],
  };

  if (level === 'error' || level === 'critical' || level === 'warn') {
    errorHistory.unshift(entry);
    if (errorHistory.length > MAX_HISTORY) {
      errorHistory.pop();
    }

    enqueuePersist(level, message, context, data);
  }

  return entry;
}

export const logger = {
  debug(message: string, data?: unknown, context?: string) {
    if (!isDev) return;
    const entry = createEntry('debug', message, context, data);
    console.debug(formatEntry(entry), data ?? '');
  },

  info(message: string, data?: unknown, context?: string) {
    if (!isDev) return;
    const entry = createEntry('info', message, context, data);
    console.info(formatEntry(entry), data ?? '');
  },

  warn(message: string, data?: unknown, context?: string) {
    const entry = createEntry('warn', message, context, data);
    if (isDev) {
      console.warn(formatEntry(entry), data ?? '');
    }
  },

  error(message: string, error?: unknown, context?: string) {
    const entry = createEntry('error', message, context, error);
    if (isDev) {
      console.error(formatEntry(entry), error ?? '');
    } else {
      console.error(`[FATAL] ${entry.timestamp} ${message}`);
    }
  },

  critical(message: string, error?: unknown, context?: string) {
    const entry = createEntry('critical', message, context, error);
    console.error(`[CRITICAL] ${formatEntry(entry)}`, error ?? '');

    
    const WEBHOOK_URL = import.meta.env.VITE_ALERT_WEBHOOK_URL;
    if (!isDev && WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CRITICAL_ERROR',
          message: redactString(message),
          error: redactString(error instanceof Error ? error.message : String(error)),
          context,
          timestamp: entry.timestamp,
          system: 'FAST_GRAVAÇÕES_PROD'
        })
      }).catch(err => console.error('Falha ao enviar webhook de alerta', err));
    }
  },

  getErrorHistory(): LogEntry[] {
    return [...errorHistory];
  },

  clearHistory() {
    errorHistory.length = 0;
  }
};

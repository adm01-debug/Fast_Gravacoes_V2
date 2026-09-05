/**
 * Startup guard for required environment variables.
 *
 * MUST be the first import in main.tsx: ES module imports are evaluated
 * depth-first before any statement in the importing module runs, and
 * integrations/supabase/client.ts calls createClient() at import time —
 * with an undefined URL it throws the cryptic "supabaseUrl is required."
 * before any inline check in main.tsx could execute. Importing this module
 * first guarantees the clear error screen wins the race.
 */
const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  const message = `Configuração ausente: ${missing.join(", ")}. Verifique o arquivo .env (ou os secrets de CI/deploy).`;
  document.body.innerHTML = `<div style="font-family:system-ui;padding:2rem;color:#dc2626"><h1 style="font-size:1.25rem">Erro de configuração</h1><pre style="white-space:pre-wrap">${message}</pre></div>`;
  throw new Error(message);
}

export {};

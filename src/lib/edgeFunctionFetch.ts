import { supabase } from '@/integrations/supabase/client';

/**
 * fetch() wrapper for calling Supabase Edge Functions directly via their
 * `/functions/v1/<name>` URL (needed when `supabase.functions.invoke` doesn't
 * fit, e.g. query-string driven actions). Unlike a bare fetch with only the
 * `apikey` header, this forwards the current user's session access token as
 * `Authorization: Bearer <token>` so functions that check caller identity
 * (role-gated admin actions, etc.) actually receive it instead of running
 * unauthenticated.
 */
export async function edgeFunctionFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  return fetch(`${supabaseUrl}/functions/v1/${path}`, { ...init, headers });
}

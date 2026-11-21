import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to a private storage bucket under the authenticated user's
 * ownership prefix (`<uid>/...`), required by the storage RLS policies
 * (see migrations 20260712231142 / 20260712231328).
 * Returns a signed URL valid for `expiresInSeconds` (default 30 days).
 */
export async function uploadOwnedFile(
  bucket: string,
  path: string,
  file: File,
  expiresInSeconds = 60 * 60 * 24 * 30
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const ownedPath = `${user.id}/${path}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(ownedPath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: urlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ownedPath, expiresInSeconds);
  if (urlError) throw urlError;

  return data?.signedUrl ?? '';
}

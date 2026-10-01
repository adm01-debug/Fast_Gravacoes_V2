// PostgREST trunca respostas em max-rows (default 1000) SEM sinalizar erro:
// `.select()` sem .range()/.limit() devolve no máximo 1000 linhas e o resto
// some silenciosamente — KPI, ranking e export ficam errados por baixo do pano.
// Este helper pagina a query em blocos até esgotar (ou atingir maxRows).
//
// Uso:
//   const query = supabase.from('jobs').select('*').eq('status', 'finished');
//   const rows = await fetchAllRows((o, l) => query.range(o, o + l - 1));

export interface SupabasePage<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllRows<T>(
  fetchPage: (offset: number, limit: number) => PromiseLike<SupabasePage<T>>,
  options: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const { pageSize = 1000, maxRows = Infinity } = options;
  const all: T[] = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const limit = Math.min(pageSize, maxRows - offset);
    const { data, error } = await fetchPage(offset, limit);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return all;
    all.push(...data);
    if (data.length < limit) return all;
  }
  return all;
}

// PostgREST trunca respostas em max-rows (default 1000) SEM sinalizar erro:
// `.select()` sem .range()/.limit() devolve no máximo 1000 linhas e o resto
// some silenciosamente — KPI, ranking e export ficam errados por baixo do pano.
// Este helper pagina a query em blocos até esgotar (ou atingir maxRows).
//
// Uso:
//   const query = supabase.from('jobs').select('*').eq('status', 'finished').order('id');
//   const rows = await fetchAllRows((o, l) => query.range(o, o + l - 1));
//
// A query DEVE ter .order() determinístico (chave única como 'id', ou
// .order('created_at').order('id') como desempate): sem ordenação o
// PostgreSQL pode devolver as páginas em ordem diferente e linhas se
// duplicam ou somem entre páginas.

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

// Variante por cursor (keyset) para consultas em tabelas que recebem INSERTs
// durante a leitura: paginar por offset sobre a lista pode duplicar/omitir
// linhas quando um registro novo desloca as posições. A cada página o caller
// filtra pela tupla de ordenação da última linha vista, então inserções
// posteriores não afetam as páginas seguintes.
//
// Uso:
//   const rows = await fetchAllRowsByCursor(
//     (cursor, limit) => {
//       let q = supabase.from('audit_log').select('*')
//         .order('created_at', { ascending: false }).order('id', { ascending: false });
//       if (cursor) {
//         q = q.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
//       }
//       return q.limit(limit);
//     },
//     (row) => ({ created_at: row.created_at, id: row.id }),
//   );
export async function fetchAllRowsByCursor<T, C>(
  fetchPage: (cursor: C | null, limit: number) => PromiseLike<SupabasePage<T>>,
  cursorOf: (row: T) => C,
  options: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const { pageSize = 1000, maxRows = Infinity } = options;
  const all: T[] = [];
  let cursor: C | null = null;
  while (all.length < maxRows) {
    const limit = Math.min(pageSize, maxRows - all.length);
    const { data, error } = await fetchPage(cursor, limit);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return all;
    all.push(...data);
    if (data.length < limit) return all;
    cursor = cursorOf(data[data.length - 1]);
  }
  return all;
}

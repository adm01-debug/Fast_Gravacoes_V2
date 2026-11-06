// Permite que tsc typecheque os schemas de supabase/functions/_shared/ quando
// importados por testes — em Deno o specifier é a URL; em Node/vitest o alias
// de vitest.config.ts redireciona para o pacote npm equivalente.
declare module 'npm:zod' {
  export * from 'zod';
}

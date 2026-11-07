---
name: fast-grava-es-v2
description: Convenções do repositório Fast_Gravacoes_V2 (Vite + React + Supabase). Use ao criar ou alterar código, testes, migrations ou Edge Functions neste repo, para seguir o alias, a organização por features, o fluxo de commit e os comandos de verificação corretos.
---

# fast-grava-es-v2 — convenções do repositório

As regras completas estão em `AGENTS.md` (vence em caso de conflito). Esta skill só resume o que
muda a forma de escrever código aqui.

## Código

- Imports sempre com alias `@/` → `src/` (nunca caminho relativo longo).
- Feature em `src/features/<domínio>/` com `components/`, `hooks/`, `services/`, `types/` e barrel
  `index.ts`. De fora, importe pelo barrel (`@/features/auth`); de dentro da própria feature, por
  caminho profundo (o barrel cria ciclo).
- Página nova: criar em `src/pages/`, lazy-import em `src/routes/AppRoutes.tsx`, envolver em
  `ProtectedPage` (com `allowedRoles`) ou `PublicPage`, escolher skeleton de `@/components/loading`.
- Contexto global novo: só em `src/providers/AppProviders.tsx`, na posição correta (ordem importa).
- `src/integrations/supabase/client.ts` e `types.ts` são gerados — não editar à mão.
- Validação com Zod + react-hook-form; estado de servidor com TanStack Query; UI com Tailwind +
  shadcn (`cn()` de `@/lib/utils`); strings de interface em PT-BR.
- Edge Functions em `supabase/functions/<nome>/` (Deno), helpers em `_shared`; migrations em
  `supabase/migrations/`. Tabela/coluna nova precisa de RLS.
- Segredos só em env/secret do serviço; `VITE_*` é público no bundle.

## Testes

- Unit/integração: Vitest, `*.test.ts(x)` ao lado do código ou em `src/test/`. Um arquivo:
  `npx vitest run <arquivo>`. Limiares de cobertura em `vitest.config.ts` só sobem.
- E2E: Playwright em `tests/e2e/*.spec.ts` (`--project=chromium|mobile-chrome`).

## Antes de abrir PR

1. `npm run lint` · `npx tsc --noEmit` · `npm run test` nos arquivos tocados (só erro seu conta).
2. Branch `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>`; commit curto em PT-BR com prefixo
   Conventional Commits (o hook `commit-msg` rejeita o resto).
3. Diff mínimo, uma tarefa por PR; corpo da PR com causa e evidência do que foi verificado.

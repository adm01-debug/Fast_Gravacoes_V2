# Post-mortem — Backdoor `migrate-helper` (Etapa 2 do Plano Mestre 10/10)

**Data da contenção:** 10/09/2026 · **Severidade:** P0/Crítica · **Status:** contido no repositório; ações manuais pendentes

## O que aconteceu

Uma Edge Function "temporária" de migração (`supabase/functions/migrate-helper`) foi commitada
no repositório contendo:

1. **ACCESS_KEY fixa** no código (`1a2759…bbba`) — qualquer pessoa com acesso ao repo tinha a chave;
2. **CORS wildcard** (`Access-Control-Allow-Origin: *`);
3. **Endpoint `?action=credentials`** que retornava `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL`
   a quem apresentasse a chave fixa;
4. Instruções de reimplantação com `verify_jwt = false` no `index.html` (atributo `data-migrate-deploy`)
   e entrada `[functions.migrate-helper] verify_jwt = false` no `supabase/config.toml`.

## Impacto potencial

Bypass completo de RLS/RBAC: posse da service-role key permite leitura/escrita arbitrária,
inclusive em `auth.users`. Exposição equivalente a entreguar o banco.

## Contenção executada

| # | Ação | Onde |
|---|---|---|
| 1 | Remoção da entrada JWT do `config.toml` | `supabase/config.toml` (commit anterior) |
| 2 | Passo de deleção remota idempotente antes do deploy das functions | `.github/workflows/deploy.yml` (commit anterior) |
| 3 | Remoção do diretório da função | `supabase/functions/migrate-helper/` **(este commit)** |
| 4 | Remoção do atributo de reimplantação | `index.html` **(este commit)** |
| 5 | Revogação de `exec_sql` para PUBLIC/anon/authenticated | migration `20260905120000…` (verificação ao vivo **PENDENTE** — ver abaixo) |

## Estado da verificação de runtime (verdade acima de validação)

O MCP Supabase disponível nesta sessão está conectado ao projeto `fsisdfdwlbfeadwfqpir`
(sistema de visão/câmeras — tabelas `vehicles`, `ppe_zones`, `timelapse_configs`), **que não é
o banco do Fast Gravações**. Nenhuma verificação/alteração de runtime foi portanto executada
no banco correto. Itens que exigem o painel/token do projeto Fast Gravações permanecem
**PENDENTES** até confirmação do owner. Nenhuma alteração foi feita no banco do MCP
(apenas leitura e um `RAISE NOTICE` sem efeito).

## ⚠️ Ações manuais pendentes (não executáveis pelo repositório)

Estas ações exigem acesso ao painel Supabase e **não podem ser consideradas concluídas** até
confirmação do owner do projeto:

1. **Rotacionar `SUPABASE_SERVICE_ROLE_KEY`** (Settings → API) — a chave foi exposta no git e em
   potenciais respostas HTTP da função enquanto esteve implantada;
2. **Rotacionar a senha do banco** (`SUPABASE_DB_URL`) pelo mesmo motivo;
3. **Confirmar que a função não está implantada** (Dashboard → Edge Functions) e auditar logs de
   acesso dela no período em que existiu (buscar chamadas com `x-access-key`);
4. Considerar a ACCESS_KEY fixa como **comprometida** (estava no histórico Git — ver etapa 7 do
   plano: varredura de histórico).

## Lições

- Nenhuma função com `verify_jwt = false` entra no repositório sem revisão de segurança;
- Credenciais nunca em código-fonte, nem "temporariamente";
- TODO helper de migração precisa de issue com data de remoção e dono.

# Matriz de ambientes Supabase — Fast Gravações V2

> Etapa 5 do plano-mestre 10/10. Objetivo: **um único ref por ambiente, vindo de
> secrets/config — nunca embutido em código, script ou migration**.

## Estado atual (confirmado pelo owner em 11/09/2026)

| Ref | Onde aparece hoje | Papel presumido | Ação |
|---|---|---|---|
| `uoujzvpecohinketylud` | `supabase/config.toml`; `.temp/linked-project.json` (nome: *Fast Gravações - V2*) | **Produção canônica** | Configuração local alinhada; definir o mesmo ref no secret `SUPABASE_PROJECT_ID` do GitHub |
| `xxroejpvloldkmqdydar` | Migration histórica `20260512110942…`; documentação de auditorias anteriores | **Legado — não é o banco do projeto** | Nunca usar como alvo de deploy. Antes de aplicar migrations, inspecionar e substituir com segurança eventual cron histórico que ainda chame essa URL |
| `whnnzdreuwxczxelvqjh` | migration `20260508115941…` (função `trigger_send_tpm_email` — **trigger nunca criado**, função não existe no banco auditado pelo Codex) | Desconhecido (possível projeto antigo/Lovable) | Confirmar e eliminar do schema versionado na Etapa 11 |
| `fsisdfdwlbfeadwfqpir` | **Nenhum arquivo deste repo** — é o projeto ao qual o MCP "Supabase Visão V2" desta estação está conectado (sistema de câmeras/PPE, tabelas `vehicles`/`ppe_zones`) | **Outro sistema (Visão)** — NÃO usar para operações do Fast Gravações | Isolar credenciais MCP por projeto |

## Regras daqui em diante

1. **Frontend**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` por ambiente
   (`.env.production.local`, `.env.staging.local` — gitignored).
2. **CI/CD**: `SUPABASE_PROJECT_ID` como GitHub Secret (já consumido pelo `deploy.yml`).
3. **Scripts locais** (`seed-users.mjs` etc.): `SUPABASE_PROJECT_REF` no ambiente.
4. **Migrations**: proibido embutir URL absoluta de projeto. Crons que chamam Edge
   Functions devem receber a URL do ambiente no momento do agendamento (Etapa 35
   do plano-mestre), não um ref congelado em SQL.
5. **MCP/agentes**: conferir o `project_id` da conexão antes de qualquer operação —
   esta estação tem MCPs de múltiplos projetos (ver post-mortem migrate-helper).

## Pendências de decisão (owner: Joaquim)

- [x] Produção confirmada: `uoujzvpecohinketylud` (owner, 11/09/2026).
- [ ] Configurar `SUPABASE_PROJECT_ID=uoujzvpecohinketylud`, `SUPABASE_ACCESS_TOKEN` e
  `SUPABASE_DB_PASSWORD` nos repository secrets e validar o acesso do CI.
- [ ] Inspecionar o cron `auto-promote-jobs-fallback` no banco canônico antes de alterá-lo:
  a migration histórica contém URL legada e o agendamento seguro exige `CRON_SECRET` configurado.
- [ ] Extrair DDL das tabelas fantasma e reconciliar schema versionado (Etapa 11).
- [ ] Rotacionar `SUPABASE_SERVICE_ROLE_KEY` e senha do banco (post-mortem migrate-helper).

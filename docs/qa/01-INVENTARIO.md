# 01 — Inventário do sistema e registro de cobertura

> Auditoria de QA somente-leitura · 2026-11-22 · commit base `ca42441b1e05a10e1ee26b377fe473c47ae6c264` (main)
> Nada foi alterado nesta auditoria: sem commit de código, sem migration, sem escrita em banco/storage/serviço externo.
> Fontes de estado: repositório na `main`, snapshot do banco real em `origin/contexto:docs/contexto/supabase/` (coleta de 2026-11-22 ~22:40 UTC), runs reais do GitHub Actions, e navegação pública ao vivo no front de produção.

## 1. Stack, build e ambientes

| item | valor | evidência |
|---|---|---|
| Front | Vite 7 + React 18 + TypeScript + Tailwind/shadcn | `package.json:1-220` |
| Estado/dados | TanStack Query 5, Zustand 5, Zod 4 + React Hook Form | `package.json` dependencies |
| i18n | i18next + react-i18next (pt-BR) | `src/i18n/` |
| Backend | Supabase Cloud `uoujzvpecohinketylud` (Postgres 17.6, região ca-central-1) | `origin/contexto:docs/contexto/supabase/README.md` |
| Edge Functions | Deno, 33 funções em `supabase/functions/` | `origin/contexto:docs/contexto/supabase/edge-functions.md` |
| Build | `npm run build` (Vite), pacotes via npm (`npm ci --legacy-peer-deps`) | `package.json:scripts`, `.github/workflows/ci.yml:57` |
| Deploy front | Vercel, merge em `main` = produção; nenhum workflow deploya o front | `AGENTS.md`, `vercel.json` |
| Deploy banco/edges | `.github/workflows/deploy.yml` (push em `main`) | `.github/workflows/deploy.yml` |
| Ambientes declarados | produção (`.env.production`), staging (`.env.staging`), exemplo (`.env.example`) — os três são **templates com placeholders**, valores reais ficam em `*.local` (gitignored) e nos secrets | `.env.production:1-20`, `.gitignore:24-30` |
| Front de produção real | `https://fast-gravacoes-v2.vercel.app` → responde "Entrar \| FAST GRAVAÇÕES" | navegação ao vivo 2026-11-22 (EXECUTADO) |
| Host configurado no Supabase Auth | `https://fast-gravacoes-v2-juca1.vercel.app/` → responde "Login – Vercel" (protegido) | `supabase/auth.md` (site_url) + navegação ao vivo (EXECUTADO) |
| Domínio próprio | `https://fastgravacoes.com.br` (default de `APP_URL` nas edges) → **não responde** (conexão fechada) | `supabase/functions/approve-password-reset/index.ts:9` + navegação ao vivo (EXECUTADO) |

### Números do sistema

| item | qtd | fonte |
|---|---|---|
| linhas de código | 189.321 | `contexto/codigo/INDEX.md` |
| arquivos de código | 1.120 | idem |
| rotas | 58 (50 protegidas, 6 públicas, 2 redirects) | idem + `src/routes/` |
| itens de menu | 69 | idem |
| componentes | 621 | idem |
| hooks | 196 | idem |
| edge functions | 33 | `supabase/edge-functions.md` |
| tabelas (banco real) | 131 | `supabase/README.md` |
| colunas | 1.314 | idem |
| policies RLS | 327 | idem |
| funções no banco | 78 | idem |
| triggers | 97 | idem |
| índices | 379 | idem |
| cron jobs (pg_cron) | 7 ativos | `supabase/cron.md` |
| buckets de storage | 4 (todos privados) | `supabase/storage.md` |
| migrations no repo | 249 · registradas no banco | 250 | `supabase/migrations.md` |
| workflows de CI | 12 | `.github/workflows/` |
| testes | 124 arquivos | `contexto/codigo/INDEX.md` |
| tamanho do banco | 1,1 GB — `error_logs` sozinha ocupa 1,0 GB (91%) | `supabase/stats.md` |

## 2. Atores e papéis

Enum `app_role` no banco: `coordinator`, `operator`, `manager`, `admin` (`supabase/schemas.md`; papéis citados no código também incluem `user`, `assistant`, `system`, que **não existem** no enum).

| ator | como entra | o que faz | onde a permissão é decidida |
|---|---|---|---|
| visitante (sem login) | `/auth`, `/track`, `/reset-password`, `/install`, `/design-system` | rastrear pedido, logar, instalar PWA | nenhuma (rota pública) |
| operator | login + senha | registra produção, embalagem, TPM, quiosque | `ProtectedRoute` + policies por tabela |
| coordinator | login + senha | agenda, aprova, configura técnica/máquina | `app_private.has_role(uid,'coordinator')` em 100+ policies |
| manager | login + senha | relatórios, auditoria, backup, BI | `has_role(...,'manager')` |
| admin | login + senha + (policies exigem AAL2 em `user_roles`) | papéis, segurança, integrações | `has_role(...,'admin')` + `AAL2 required for user_roles ...` |
| cron/postgres | pg_cron | 7 jobs: health, purge, p95, reatribuição de embalagem, promoção de OS | `SECURITY DEFINER` |
| service_role (edges) | chave de serviço | integrações, e-mail, push, export | bypassa RLS |

Observações de cobertura: no banco real a tabela `user_roles` tem **1 linha** e `role_permissions` ~170 linhas (`supabase/stats.md`) — produção tem essencialmente um usuário com papel atribuído, o que limita o que a RLS "prova" na prática.

### Jornadas principais mapeadas

1. **Agendar OS**: `/new-job` → `NewJobPage` → `useJobMutations`/`jobsService` → `jobs` (+ 11 triggers) → Kanban/calendários.
2. **Executar produção**: `/operator` ou `/kiosk` → `OperatorView` → mudança de `jobs.status` → auditoria + promoção automática + criação de tarefa de embalagem.
3. **Embalar e expedir**: `/packaging`, `/packaging/kiosk` → `packaging_tasks`/`packaging_defects` → `/logistics` → `shipments`.
4. **Manutenção/TPM**: `/tpm`, `/machines` → `maintenance_schedules`/`tpm_executions` → alertas e e-mail.
5. **Gestão e decisão**: `/executive`, `/kpis`, `/oee`, `/bi`, `/ml-predictions`, `/abc-costing`, `/spc`.
6. **Administração**: `/operators`, `/security`, `/audit`, `/settings`, `/integrations/bitrix24`, `/master-api`.
7. **Acesso**: `/auth` → login (+MFA TOTP) → `/reset-password` (reset aprovado por gestor via `approve-password-reset`).
8. **Público**: `/track` (rastreamento por nº de OS, via RPC pública).

## 3. Registro de cobertura por camada

| camada | como foi coberta | status |
|---|---|---|
| Rotas e guards | leitura de `src/routes/`, `App.tsx`, `ProtectedRoute`, `useRBAC` | revisado |
| Interface (páginas/componentes) | amostragem ampla das 56 páginas + componentes de feature | revisado (amostral — ver limites) |
| Hooks e estado | `src/hooks`, `src/features/*/hooks`, contexts, stores | revisado (amostral) |
| Regras de negócio | código do front × edges × constraints/triggers do banco real × `contexto/regras` | revisado |
| Edge functions | 33 funções lidas + `config.toml` + registro de verify_jwt | revisado |
| Banco de dados | snapshot de catálogo (tabelas, policies, funções com corpo, triggers, índices, grants, lints, stats) | revisado por catálogo · **sem execução de SQL** |
| Integrações/webhooks | bitrix24, resend, push, erp-api, webhook-handler, technical-assistant | revisado |
| Infra/CI/deploy | 12 workflows, `vercel.json`, envs, runs reais do Actions | revisado |
| Transversais (segurança, perf, código morto) | grep dirigido + grafo de código + stats do banco | revisado |
| Testes | configuração e amostra dos 124 arquivos | revisado por leitura · **sem execução** |

### Camadas NÃO cobertas (com o erro exato)

1. **Execução de typecheck, lint e testes neste ambiente** — `npm ci --legacy-peer-deps` falha: `npm error code E403 ... 403 Forbidden (agent proxy: no rule or network setting allows this host) - GET https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/wsl-utils/-/wsl-utils-0.3.1.tgz`. O `package-lock.json` resolve parte das dependências num registry privado do Lovable que o proxy desta sessão bloqueia; a tentativa de instalar do registry público foi negada pelo classificador de permissões. Consequência: nenhum cenário foi marcado EXECUTADO por teste local. Como substituto, foi usada a **execução real do CI** no commit `ca42441b` (run 45061732975, Quality Gate ✅ verde com lint, typecheck, unit, deno, simulação, build, E2E e RLS Regression).
2. **SQL ao vivo no banco de produção** — nenhum dos MCPs Supabase desta sessão aponta para `uoujzvpecohinketylud`: verificado `GESTÃO DE CLIENTES` → `pgxfvjmuubtbowutlide`, `GESTÃO DE PRODUTOS` → `doufsxqlfjyuvxuezpln`, `ZAPP WEB V2` → base com 227 tabelas e sem `jobs`/`error_logs`, `PROMO FINANCE V2` → 286 tabelas sem as tabelas deste sistema, `PROMO CHAMPIONS` → `Management API 401: Invalid access token`. Consequência: contagens, planos de execução (EXPLAIN) e a origem exata dos registros de `error_logs` **não foram medidos** — tudo que depende disso está marcado como hipótese.
3. **Painel/deploy do Vercel** — a conta conectada (`team juca1`, `team_QyN41X0q8hrqhW80AwokbFLv`) retorna **zero projetos** em `list_projects`, então não foi possível ler variáveis de ambiente, domínios ou histórico de deploy do front. O que foi verificado do front foi por navegação pública ao vivo.
4. **Fluxos autenticados em produção** — nenhum login foi feito (auditoria somente-leitura; login em produção criaria sessão e registros em `login_audit`). Todas as telas internas foram rastreadas por código, não exercitadas.
5. **E-mail real (Resend) e push** — não foi disparado nenhum envio; apenas leitura de código e configuração.

## 4. Registro de cobertura detalhado (por item do inventário)

A varredura foi feita por dezesseis auditores independentes, um por camada, todos com a regra de citar `arquivo:linha` e de marcar como hipótese o que não pudessem comprovar. Resultado por camada:

| camada auditada | itens do inventário cobertos | achados | status |
|---|---|---|---|
| Rotas e proteção de rota | 58 rotas, 69 itens de menu, guarda de rota, 4 papéis | 9 | revisado |
| Dados fabricados na interface | 56 páginas + componentes de painel | 10 | revisado |
| Estados de carregando/erro/vazio e ações | 56 páginas (24 abertas em detalhe, demais por varredura) | 7 | revisado · amostral |
| Hooks, cache e estado | 196 hooks (os de escrita e os mais usados), contextos, provedores | 6 | revisado · amostral |
| Regras de negócio do núcleo (OS) | máquina de estados, 11 gatilhos de `jobs`, 3 esquemas de validação, 4 caminhos de escrita | 10 | revisado |
| Edge functions — parte A (15 funções) | aprovação de senha, promoção, backup, CRM, estoque, ranking, bloqueio, operadores, ERP, ponte de banco | 10 | revisado |
| Edge functions — parte B (18 funções) | CSP, alertas de rotina, limpeza, resumos, exportações, saúde, imagens, métricas, predições, notificações | 9 | revisado |
| Controle de acesso no banco | 327 policies, 131 tabelas, funções de autorização, grants, lints | 11 | revisado por catálogo |
| Integridade e performance do banco | constraints, chaves estrangeiras, 379 índices, estatísticas, rotinas, migrations | 7 | revisado por catálogo |
| Integrações e webhooks | CRM (Bitrix24), e-mail (Resend), notificações, ERP, ponte de banco, assistente de IA | 10 | revisado |
| Infraestrutura, publicação e CI | 12 workflows, `vercel.json`, `index.html`, arquivos de ambiente, service worker, travamento de dependências | 9 | revisado |
| Segurança transversal no cliente | cliente do banco, utilitários, uploads, telas públicas, registro de erro | 4 | revisado |
| Performance e carga | consultas mais caras do banco, listagens, repetição automática, pacote do site, uploads | 7 | revisado |
| Funcionalidades incompletas | 6 módulos de feature, fluxo a fluxo (entrada na UI → hook → serviço → tabela → volta) | 11 | revisado |
| Testes e observabilidade | 124 arquivos de teste, configuração de testes, portão de qualidade, monitoramento de erro | 7 | revisado por leitura |
| Autenticação, sessão e RBAC | login, segundo fator, expiração, saída, recuperação de senha, papéis ponta a ponta | 7 | revisado |

**Itens do inventário com status "não revisado":**

- `realtime.messages` e as policies de `storage.buckets` (só `storage.objects` foi auditada em profundidade) — **não revisado**: fora do alcance da varredura de acesso, que priorizou as 131 tabelas e os 4 baldes.
- Views do banco — **não aplicável**: o catálogo real registra zero views.
- Filas `pgmq` — **não aplicável**: zero filas no projeto.
- Webhooks de saída do banco — **não aplicável**: zero webhooks registrados no catálogo.
- 32 das 56 páginas não foram abertas linha a linha na camada de estados (foram cobertas por varredura dirigida) — **revisado parcialmente**, com a lista de pendências registrada na própria etapa 080 do plano.
- ~70 alertas de desempenho de policy (`policy_auth_fn_not_wrapped`) não foram auditados um a um — **revisado em bloco** (viraram o achado BD-20 e as etapas 150, 184–190).
- Duplicação de policies (perfis com quatro policies de leitura idênticas, agendamentos de manutenção com três policies amplas) — **não revisado como achado**: não altera quem acessa o quê, só o custo de auditar. Registrado aqui para não se perder.
- Quantidade de usuários com segundo fator ativo — **não verificável**: a tabela de fatores do serviço de autenticação não entra no retrato automático. Consequência: não é possível afirmar se as três regras que exigem segundo fator para mexer em papéis estão bloqueando a administração hoje.

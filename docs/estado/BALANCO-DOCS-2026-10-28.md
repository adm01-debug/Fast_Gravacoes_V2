# Balanço de planos vs. implementação — 2026-10-28

Auditoria executada por 7 agentes independentes sobre a main
(commit `23da9a4`, pós-PRs #78–#111). Cada item planejado/pendente nos
documentos foi conferido **no código**, não no status escrito no doc —
vários marcadores 🟨/✅ estavam desatualizados nos dois sentidos.

## Veredito por documento

| Documento | Itens | Implementados | Parciais | Pendentes | N/A |
|---|---|---|---|---|---|
| plano-mestre-10-10.md (blocos A–E, etapas 1–50) | 50 | 11 | 35 | 4 | 0 |
| plano-mestre-10-10.md (blocos F–J, etapas 51–100) | 50 | 11 | 34 | 5 | 0 |
| plano-graphify-50-etapas.md | 50 | 28 | 17 | 5 | 0 |
| plano-50-etapas-260924 + consolidação | 62 | 26 | 9 | 22 | 5 |
| docs/estado lotes 01–07 (backend) | 130 | 16 | 46 | 65 | 3 |
| docs/estado lotes 08–14 + metas (UX/testes) | 100 | 29 | 6 | 63 | 2 |
| auditorias legadas + ADRs + PENDENCIAS | 105 | 81 | 13 | 7 | 4 |
| **Total** | **547** | **202** | **160** | **171** | **14** |

N/A = obsoleto/fora de escopo (ex.: itens SUPERADA dos planos antigos,
Twilio/Google Maps que são só placeholders de .env.example).

Leitura correta dos números:

- **Auditorias legadas (81/105 implementados)** é o recorte mais
  representativo: os achados ALTA/CRÍTICA de jun–jul/2026 estão quase
  todos corrigidos (ERP API reescrito, RLS endurecido, CORS
  centralizado, MFA AAL2, webhooks via env, 6 workflows verdes) —
  exceção residual: o fallback `produced_quantity || quantity` em BI
  (ver seção C).
- **Lotes de `docs/estado/`** são inventários de achados de ago/2026 —
  "pendente" ali significa dívida registrada (código morto, painéis com
  dados fabricados, features sem caller), não regressão.
- **Plano-mestre** contabiliza etapas amplas: o núcleo de segurança
  (auth dual-header, exec_sql ACL, geo_blocking, RLS, CI gates) está
  implementado; os "parciais" são etapas onde existe a base mas falta o
  endurecimento final.

## O que está 100% fechado e provado na main

- Workflows: CI, Deploy, Migration repair, DB Admin, Visual Baselines
  verdes (RELATORIO_CI.md §7 — prova com links de runs).
- Conta E2E completa (papéis + fator TOTP verified) e suíte E2E verde.
- Auth dual-header nos crons versionados; has_role corrigido;
  geo_blocking reconstruída; complete_maintenance_record
  transacional+idempotente; audit chain com advisory lock.
- Pacote de navegação UX (PR #103 + correções #104/#110): Voltar
  seguro, dirty-guard, modais no histórico, breadcrumbs, restauração de
  scroll, rascunho de Novo Job, deep-links, a11y.
- Quase todos os achados ALTA/CRÍTICA de QA_AUDIT 14/06 e auditoria
  18/07 — exceção residual: `produced_quantity || quantity` em
  `FuturisticBI.tsx`/`LossesTable.tsx` trata produção não registrada
  como 100% produzida (item aberto na seção C).

## Pendências agrupadas (o que falta e por quê)

### A. Depende do Joaquim (fora do repo)

- Rotação de credenciais expostas no passado: service-role key, DB
  password, tokens Bitrix/Resend/Twilio (post-mortem 10/09).
- `verify_jwt=false` em bitrix24-sync (PENDENCIAS.md item 2).
- PITR/restore testado, monitor externo/SLOs, reviewers de Environments,
  alertas Sentry, branch protection com checks required.
- (Secrets E2E TODOS configurados — suíte autenticada verde na main e o
  job RLS Regression, que exige `E2E_OPERATOR_*`, também passa;
  PENDENCIAS item 1 marcado resolvido.)

### B. Bugs reais pequenos — corrigidos no PR #113

- CommandPalette: "Fila de Espera" navegava para `/pending-queue`
  (rota real: `/pending`) e "Central de Ajuda" para `/knowledge-base`
  (rota real: `/knowledge`) — ambos davam 404.
- useKPIs: `today` e `dayKey` usavam data UTC — entre 21h e 24h (UTC-3)
  o painel mostrava os jobs do dia seguinte. Agora usa `formatDateOnly`
  (data local), novo helper em `src/lib/dateUtils.ts`.

### C. Bugs reais registrados (próximo sprint — exigem decisão ou feature)

- NotificationsList: botões marcar-lida/excluir só aparecem para ids
  `push-*`; a página usa ids sintéticos `m-`/`p-`/`s-` de
  maintenance_alerts/machine_predictions/daily_summaries — são registros
  operacionais compartilhados (sem user_id); marcar-lida precisa do
  campo de confirmação correto por tabela (is_read/acknowledged_at —
  daily_summaries não tem nenhum: exige receipt por usuário ou decisão) e a
  exclusão deve ficar restrita a `push-*` (recibo pessoal).
- send-push-notification declara `Content-Encoding: aes128gcm` mas
  envia o payload sem criptografia — Web Push real provavelmente nunca
  funcionou (precisa de criptografia de payload ECDH+HKDF+AES-128-GCM
  conforme RFC 8291/8188 — VAPID autentica o servidor, não criptografa).
- `JobQRCode` gera URL `/track?q=` mas `QRScanner` espera JSON
  `{type:'job'}` — par gerador↔leitor incompatível.
- `PreProductionChecklistModal`: `onSkip` chama `onComplete` (pular
  registra como concluído); o mesmo vale para "Salvar Parcial"
  (onComplete com allChecked=false) e linhas antigas renderizadas como
  concluídas sem checar completed_at — decisão de domínio.
- useTPMApprovalMutations: update incondicional sem guarda de
  status/versão — dupla aprovação/TOCTOU possíveis.
- `useMFA.unenroll` sem challenge TOTP nem gravação em user_mfa_settings.
- BI de perdas: `produced_quantity || quantity` em FuturisticBI.tsx:108,
  LossesTable.tsx:87, KPIDashboard.tsx:111, MachineComparisonPage.tsx:68,
  ShiftSummaryCard.tsx:22-29 e shiftReportPdf.ts:50-55 — job sem produção
  registrada conta como 100% produzido, subestimando a taxa de perda
  (achado ALTO de jul/2026 ainda ativo).
- TPM: `correction_requested` é terminal — nenhuma ação reabre ou
  ressubmete o registro e o TPMExecutionHistory não tem branch para
  esse status; o técnico não consegue corrigir.
- Thresholds com unidade ambígua: TechniqueManagement define
  low/medium/high_threshold como percentuais (30/70/90), mas
  useLoadBalancingWithActions trata medium_threshold como capacidade
  diária em minutos e useSmartSequencingWithActions como limiar em
  minutos — com 70 a máquina bate 100% de ocupação em 70 min.
- useAutoBufferPromotion: a ação por técnica envia o techniqueId, mas
  `auto-promote-jobs` ignora o body e promove todas as técnicas —
  mutação de estado de produção fora do escopo clicado (P1).
- `useMTBFMTTR` assume 24h/dia — decisão de domínio (horas úteis).
- `useKPIs` já corrigido; `useSessionManager` exporta arquivo vazio;
  KanbanBoard escreve `jobs.status` direto (bypass do jobsService);
  botões inertes: "Novo Item" (InventoryPage), "Aplicar Sequenciamento"/
  "Mover OS" (KanbanAIAdvisor), MachineQRDialog "Enviar" (toast fake).
- WhatsApp do TPM é stub ativo: TPMNotificationSettings.tsx permite
  habilitar e testar o canal, mas useTPMNotifications.ts só grava o log
  com `status: 'success'` e tosta sucesso sem enviar nada (diferente
  dos placeholders Twilio da seção E — este é um fluxo visível que
  finge funcionar).
- PredictiveHealthCard.tsx:88 multiplica `confidence` (escala 0-100,
  conforme ml-predictions/index.ts:152-155,240-243) por 100 de novo —
  confiabilidade de 60% aparece como 6000% no TPMDashboard.
- Upload de evidência de alerta bloqueado: MaintenanceExecutionModal.tsx
  :304-313 envia para `execution-alerts/<file>` no bucket
  execution-evidence, mas a policy versionada
  (20260712231142:25-33) exige que o primeiro segmento do path seja o
  auth.uid() — todo upload desse fluxo é negado.
- inventory_movements sem escrita: a tabela tem RLS habilitado e só
  policies SELECT versionadas, mas useInventory.ts:110-115,128-134,
  159-170 faz INSERT/DELETE do browser — o fluxo de movimentação de
  estoque não consegue gravar (P1).

### D. Dívida estrutural (multi-sprint)

- ~30 painéis/cards com dados fabricados (FuturisticBI, BIAIInsights,
  VirtualSensorPanel, BlockchainIntegrityCard, MasterAPIPage,
  TechnicalTelemetryPanel, FactoryFloorMap, CyberResilienceScore...).
- ~50 itens de código morto: contexts/barrels/componentes/hooks sem
  consumidor (NotificationCenter, ToastWithUndo, FeedbackProvider,
  WebSocketContext, SearchContext, ThemeContext, SidebarNavData...).
- Arquitetura: autociclos de barrels (features importam o próprio
  barrel), ciclo logger↔supabase client, ~21 providers aninhados,
  10+ páginas >300 linhas, state machine de jobs só no client,
  sem Idempotency-Key genérico.
- Backend ausente: tabelas shifts/escalas/treinamentos, suppliers,
  curva ABC, `production_lots.produced_quantity` nunca escrito (atenção:
  `jobs.produced_quantity` é escrito — ProductionRegistrationModal e
  registerProductionOffline; o gap é só na tabela de lotes), archived_jobs
  inexistente (cron-cleanup arquiva para tabela que não existe), webhook-handler
  genérico registra `logged_only` (atenção: o endpoint
  real `bitrix24-sync?action=webhook` JÁ mapeia e grava deals em `jobs`
  via handleBitrixWebhook — mas a entrada depende de `verify_jwt=false`
  + `BITRIX24_WEBHOOK_SECRET`/`BITRIX24_WEBHOOK_TOKEN`, ver seção A),
  backup_logs e system_metrics (backup-scheduler e metrics-collector
  escrevem nelas mas não há CREATE TABLE nem tipo gerado),
  pdf-generator real, image-optimizer real, resgate de recompensa sem
  aprovação, Google OAuth bypassa lockout/device-check.
- Higiene CI/cobertura: E2E advisory no quality-gate, cobertura ~35%
  (meta 60%), sem matriz RLS completa das ~137 tabelas, sem pgTAP,
  sem SBOM/dependabot/license-scan, sem db reset/rebuild em CI, drift
  `db diff` só manual, CSP estrita existe só em Report-Only,
  tsconfig noUnusedLocals off (CLAUDE.md diz "on"), vite-plugin-pwa
  declarado mas ausente de vite.config.ts, i18n es-ES com 59 chaves
  faltando e só 32/657 arquivos traduzidos, ESLint sem regras de
  boundaries. Deploy dispara independente do ci.yml: todo push na main
  roda deploy.yml e o job de migration de produção depende só do
  security scan/testes/dry-run do próprio workflow — sem Quality Gate
  obrigatório até branch protection ser ativada (seção A).

### E. Itens fora de escopo / N/A

- Twilio/Google Maps/Analytics: só placeholders em .env.example, zero
  código por design.
- Itens SUPERADA dos planos antigos (start_time/end_time, erp-api
  dedup, policies P0/P1 em massa — inventário real mostrou só 4).

## Recomendação

1. Sprint "bugs reais" (seção C): primeiro os itens sem decisão de
   produto (NotificationsList m-/p-, QR incompatível, guarda TPM,
   useMFA.unenroll, fallback produced_quantity no BI); os que exigem
   decisão (marcar-lida de s-/daily_summaries — precisa de receipt por
   usuário ou definição de produto, checklist parcial/pular, horas
   úteis do MTBF) vão para PENDENCIAS até o Joaquim decidir.
2. Sprint "código morto + dados fabricados" (seção D, primeiras duas
   linhas): remover ou conectar de verdade — elimina ruído do painel.
3. Decisões do Joaquim (seção A) destravam: Bitrix OAuth
   (`verify_jwt=false` + `BITRIX24_CLIENT_ID`/`CLIENT_SECRET` — o
   `action=webhook` usa credenciais próprias:
   `BITRIX24_WEBHOOK_SECRET`/`BITRIX24_WEBHOOK_TOKEN`), backup
   verificado, branch protection e o restante da seção A.
4. Itens de arquitetura/backend ausente: planejar como épicos separados.

_Audit gerado por 7 sessões-agente em paralelo (workflow
`docs-implementation-audit`, run wfr-1aba65d316d14b2cb1e66a07ae69b94f)._

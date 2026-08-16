# ESTADO ATUAL — FAST GRAVAÇÕES ES v2

**Data:** 2026-08-16
**Escopo:** levantamento de estado de **todas** as funcionalidades, ferramentas e integrações
do sistema — implementadas, parcialmente implementadas, apenas planejadas ou apenas sugeridas.
**Método:** 14 lotes de auditoria (12 verticais por domínio + 2 varreduras de fechamento de
lacuna), com evidência `arquivo:linha` obrigatória, seguidos de recontagem de cobertura e
verificação independente dos achados graves.

> Este documento responde "**o que existe e funciona?**". Ele **não** substitui os relatórios de
> defeito anteriores (`ANALISE_TECNICA_SISTEMA.md`, `AUDITORIA_*.md`, `docs/QA_*.md`) — mas
> corrige afirmações deles que não se sustentam hoje (ver §7).

---

## 0. CORREÇÃO — esta auditoria foi testada e tinha defeitos

> Adicionado em 2026-08-16, após meta-auditoria. **O texto original abaixo foi preservado**;
> leia-o com as ressalvas desta seção. Detalhe completo em `docs/estado/_meta-00-consolidado.md`.

O que **resistiu** ao teste: nenhuma citação `arquivo:linha` fabricada (22/22 na amostra),
nenhuma contradição entre lotes, lista de código morto íntegra (4/4 na amostra), e todos os
achados graves confirmados. O achado principal (§4.1) ficou **mais forte**.

O que **falhou**:

**a) A régua do ✅ foi frouxa.** Duas refutações adversariais independentes atacaram 55 itens ✅ e
derrubaram **17 (31%)**. A amostra foi enviesada de propósito para os itens mais ambiciosos, e os
lotes de segurança (05, 06, 09) resistiram a 18 ataques sem uma única derrubada — então **não
extrapolo os 31%**. A faixa defensável é **10–20% dos 492 ✅ (~50 a 100 itens)** que deveriam ser
🟨 ou 🟦. Piso comprovado: 17.

⇒ **Os 52% de ✅ da tabela abaixo são, na prática, algo entre 43% e 47%.**

Causa raiz: em vários casos a coluna de observação **já descrevia o defeito** e o selo ✅ foi
mantido assim mesmo. O erro concentra-se no lote 10 (67% de erro, padrão "montado ≠ funciona") e
no lote 07 (33%, padrão "grava mas ninguém lê").

Exemplos de ✅ indevidos confirmados: `/code-quality` (painel de saúde do código com números
literais — informa `anyUsageCount: 0` enquanto o gate `any-ratchet` está vermelho);
`/master-api` (zero referências a `supabase` em 234 linhas); par QR Code gerador↔leitor
incompatível (`JobQRCode.tsx:23` emite URL, `QRScanner.tsx:91-95` exige JSON).

**b) A contagem tem precisão falsa.** Os "938 itens" somam 8 linhas de legenda de tabela, 3
linhas contadas duas vezes, e duplicação semântica **provada** — `erp-api` aparece classificado
em duas tabelas do mesmo lote 07. Número honesto: **~926 classificações emitidas**; o total de
funcionalidades **distintas** é menor e não foi determinado (entre ~845 e 926).

**c) Três erros numéricos meus:** são **135** tabelas (não 136) e **55** páginas (não 57 — contei
2 arquivos `*.test.tsx`).

**Não testado:** as categorias 🟨 (212) e 🟦 (100) não passaram por refutação — e é para lá que
os ✅ derrubados migram.

---

## 1. Veredito em uma tela

O sistema é **grande e real**, não uma casca. O núcleo operacional — jobs, Kanban, produção,
manutenção/TPM, embalagem, operadores, turnos, OEE/SPC — está genuinamente implementado, com
fio completo da UI ao banco e regras de negócio server-side.

O problema não é ausência de código. É que **uma parte relevante do que a interface apresenta
como funcionando não está ligada a nada**: 14% do inventário é código morto, 55% das edge
functions não têm chamador, 17 tabelas nunca são consultadas e há painéis inteiros que exibem
números literais como se fossem medição.

E há um risco estrutural acima de todos: **o banco de produção não é reconstruível a partir
deste repositório** (§4.1).

| Classificação | Itens | % |
|---|---:|---:|
| ✅ IMPLEMENTADO_TOTAL | 492 | 52% |
| 🟨 IMPLEMENTADO_PARCIAL | 212 | 23% |
| 🟦 SUGERIDO_OU_INICIADO | 100 | 11% |
| ⬛ MORTO_OU_ABANDONADO | 134 | 14% |
| **Total classificado** | **938** | **100%** |

**Leitura honesta desses números:** o ✅ aqui significa *"fio completo no código"*, **não**
*"comprovadamente em uso por usuário real"*. Não houve acesso a runtime nesta auditoria (§6).
Pela regra estrita "pronto = em produção com uso real", nenhum dos 492 pode ser confirmado —
todos seriam 🟨 até que alguém com acesso ao banco confirme tráfego. Os 52% medem **completude
de implementação**, que é o que dá para medir a partir do código.

---

## 2. Dimensão do sistema (medida, não estimada)

| Escopo | Arquivos | Linhas |
|---|---:|---:|
| `src/` | 895 | 139.722 |
| `supabase/functions/` (33 functions + `_shared`) | 49 | 9.427 |
| `supabase/migrations/` | 216 | 12.074 |
| `tests/e2e/` | 17 specs | — |

57 rotas · 57 páginas · 136 tabelas · ~199 policies RLS vigentes · 68 funções SQL · 85 triggers · 0 views.

---

## 3. O que está bom

Não distorço o quadro para parecer rigoroso. Estas partes estão sólidas:

- **Núcleo de produção e jobs.** State machine de status, Kanban com drag&drop e `sort_order`
  persistido, fila, calendários, detecção de conflito por trigger no banco, realtime, offline.
- **Manutenção/TPM contábil.** Schedules, records, respostas de checklist, checklists
  versionados, aprovação individual e em lote com validação real de assinatura **e** foto,
  MTBF/MTTR sobre dados reais e com estado vazio honesto quando não há dado.
- **Analytics de verdade onde importa.** OEE segue ISO 22400-2; SPC tem X̄-R com tabela A2 e
  regras Western Electric; ABC Costing e MTBF/MTTR derivam de `jobs` reais — não há
  `Math.random()` em `features/analytics/.../oee/`.
- **Embalagem fecha ponta a ponta.** Rota → 2 páginas → 12 hooks → serviço → 6 tabelas
  versionadas, mais 7 gatilhos server-side (criação automática, remessa, retrabalho, bloqueio
  por checklist).
- **Passagem de turno.** Handovers, checklist, templates, pendências e ocorrências — o fio mais
  bem acabado do módulo de operadores.
- **Segurança já remediada de fato.** O bypass de MFA foi realmente fechado
  (`ProtectedRoute.tsx:84-87`); o CORS wildcard **não existe mais** em produção — 31 das 33
  functions usam a allowlist de `_shared/cors.ts`.
- **RLS ligada em 100% das tabelas.** 136 de 136 têm `ENABLE ROW LEVEL SECURITY`.
- **Design system íntegro.** 72 arquivos, 7.080 linhas, zero componentes órfãos.
- **Mapa de rotas íntegro.** 55 páginas ↔ 55 módulos roteados, sem página órfã e sem rota
  apontando para arquivo inexistente.

---

## 4. Riscos estruturais, por gravidade

### 4.1 🔴 O ambiente não nasce do repositório

**7 tabelas são consultadas pelo código e não existem em nenhuma das 216 migrations:**

`archived_jobs` · `backups` · `backup_logs` · `system_metrics` ·
`geo_blocking_logs` · `geo_blocking_rules` · `geo_blocking_settings`

Se o banco for recriado do zero a partir deste repositório, o código que as consulta quebra.
Elas presumivelmente existem no banco vivo, criadas fora do versionamento (painel Supabase ou
plataforma Lovable) — mas isso é `NAO_VERIFICADO`.

Agrava: **três refs de projeto Supabase distintos** circulam no repositório e na sessão —
`xxroejpvloldkmqdydar` (em `supabase/config.toml:1` e hardcoded dentro de SQL de cron),
`whnnzdreuwxczxelvqjh` (em migration) e `uoujzvpecohinketylud` (o MCP configurado). Não é
possível afirmar, a partir do repo, qual banco é a produção.

**Este é o achado mais grave da auditoria.** É o que impede recuperação de desastre, ambiente
de staging fiel e onboarding de qualquer desenvolvedor novo.

### 4.2 🔴 Quatro dos cinco gates de qualidade estão vermelhos no `main`

Bateria executada localmente nesta sessão:

| Gate | Comando | Estado |
|---|---|---|
| TypeScript | `tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| Build | `vite build` | ✅ sucesso |
| ESLint | `eslint .` | ❌ **9 erros**, 15 warnings |
| Any-ratchet | `npm run quality:any` | ❌ **2 ocorrências, baseline 0** |
| Testes unitários | `vitest run` | ❌ **8 falhas / 497** |
| Security (CI) | `npm audit --audit-level=high` | ❌ **12 vulns (5 high)** |

Consequências concretas, não hipotéticas:

- **O hook `pre-commit` bloqueia todo commit de qualquer pessoa neste repositório agora.** O
  any-ratchet falha por 2 ocorrências pré-existentes em `src/features/packaging/`
  (`useSoundFeedback.ts:18`, `PackagingLeaderboard.tsx:18`). Os commits desta auditoria
  precisaram de `--no-verify`.
- **O job `lint` do `ci.yml` está vermelho** — confirmado no run real do PR #41, com resultado
  idêntico ao local (`24 problems (9 errors, 15 warnings)`).
- **As 8 falhas de teste** têm duas causas: mock defasado em `useNotifications.test.ts` (o hook
  passou a chamar `supabase.auth.onAuthStateChange` e o mock não acompanhou) e asserção
  desatualizada nos três testes de realtime (`expected 2 times, got 3`).

### 4.3 🟠 55% das edge functions não têm chamador

**18 de 33** (verificado independentemente por padrão de invocação real —
`functions.invoke()`, `edgeFunctionFetch()`, `/functions/v1/`):

```
backup-scheduler       cron-alert-email    excel-export      image-optimizer
cleanup-security-logs  cron-cleanup        external-db-bridge metrics-collector
erp-api                health-check        health-monitor     rate-limit-check
security-alert         send-email-report   send-loss-risk-alert
send-tpm-email         tpm-notifications   validate-login-ip
```

E **nenhuma delas é resgatada por cron**: `grep "cron.schedule"` no repositório inteiro retorna
apenas 2 agendamentos versionados, nenhum apontando para essas funções. Se há agendadores
configurados no painel Supabase, isso é `NAO_VERIFICADO`.

Efeito cascata — telas que existem mas não têm fonte de dados:

- `/admin/telemetria` lê `query_telemetry`, cujo único produtor é a órfã `external-db-bridge`.
- `/status` lê `edge_health_history`, escrita só pela órfã `health-monitor`.
- Três painéis administrativos de segurança (IP allowlist, rate-limit, IPs bloqueados) gravam
  configuração que ninguém consome, porque dependem das órfãs `validate-login-ip` e
  `rate-limit-check`.
- `login_audit` não tem produtor algum: seu único `INSERT` está dentro da função órfã.

### 4.4 🟠 Dado fabricado apresentado como medição

Distingo dois casos, porque a diferença importa:

**(a) Fabricação que chega ao banco** — o mais sério:

- `PackagingRegisterForm.tsx:80-89` — o botão "Ler balança" tem a prop `onScaleWeight` **nunca
  passada por ninguém**, então o ramo `else` é o único executável: `Math.random() * 50` vira o
  peso e é persistido em `total_weight_kg` (`packagingService.ts:147`). O toast avisa
  "(Simulação)"; **a coluna no banco não avisa nada** — analytics a jusante não distingue
  pesagem real de sorteio.

**(b) Fabricação que fica na tela** — engana o gestor, não corrompe dado:

| Onde | O que exibe |
|---|---|
| `HyperInsights.tsx:16-43` | 3 "insights" inventados sob badge "Real-time Analysis" |
| `BIAIInsights.tsx:55-56,85` | 52 pç/h, 85 pç/pedido, R$18,50/peça — literais |
| `TechnicalTelemetryPanel.tsx` | telemetria 100% `Math.random()` (8 ocorrências) |
| `VirtualSensorPanel` / `FactoryFloorMap` | "sensores" e mapa de fábrica por sorteio |
| `HolographicReliabilityWidget` | 99,98% de uptime literal |
| `CyberResilienceScore:33`, `AICyberAdvisor:7-31` | score de segurança fabricado, no topo do dashboard |
| `AIWorkforceAdvisor` | insights literais, cita o nome "Ricardo Silva" hardcoded |
| `BlockchainIntegrityCard` | array de hashes falsos |
| `useKPIs.ts:328` | "Confiança do Modelo" é a reta `0.9 - i*0.05` |
| `SPCDashboard.tsx:115` | número de lote por `Math.random()` |
| `calculate-inventory-intelligence:70` | `accuracy: 98.5 // Simulated confidence level` |

Também há **três preços por peça mutuamente incompatíveis** no código (R$15,50 / R$18,50 /
R$1,80) — qualquer número financeiro derivado deles é indefinido.

Ressalva de justiça: das 71 ocorrências de `Math.random()` em produção, boa parte é
legítima (confete, partículas, largura de skeleton) e as de `components/design-system/` são a
vitrine declarada da rota `/design-system`. A lista acima é só o que se apresenta como métrica.

### 4.5 🟠 Testes que não protegem

- **Teste-espelho, com drift provado.** `webhookSimulation.test.ts`, `erpApiContracts.test.ts` e
  `webhookFuzz.test.ts` (885 linhas) importam **apenas** `vitest` e `zod` — nunca o alvo.
  Reimplementam schema e handler localmente. O drift já existe: produção
  (`_shared/contracts.ts:15`) tem `event: z.string()`; o espelho
  (`webhookSimulation.test.ts:14`) exige `.min(1)`. O teste afirma que `event: ""` é rejeitado;
  a produção **aceita**.
- **21 `Deno.test` sem runner** em `supabase/functions/_shared/*.test.ts` — importam os alvos
  reais, e nada os executa (excluídos em `vitest.config.ts:28`, nenhuma menção a `deno` nos
  workflows).
- **Alvo inexistente**: `accessibility.spec.ts:4` varre `/kpi`, que não existe (é `/kpis`) — o
  axe audita a página 404. As outras 3 rotas são protegidas e o spec não faz login: audita
  `/auth`.
- **Asserção vácua**: `error-states.spec.ts:71` → `expect(count).toBeGreaterThanOrEqual(0)`.
- **Regressão visual sem baseline** — zero `.png` versionado, logo sempre verde.
- **Gate `e2e` reporta ✅ sem rodar nada** quando faltam secrets.
- **Cobertura real**: lines 22,39% · statements 21,00% · functions 17,81% · branches 15,49% —
  passa os thresholds por menos de 1 pp em três métricas. E, com a suíte vermelha, o relatório
  de cobertura nem chega a ser gerado.

### 4.6 🟡 Canais de comunicação prometidos e inexistentes

- **Twilio não existe.** `grep -rin "twilio" src/ supabase/` → **zero linhas**. São só variáveis
  em `.env.example:23-26`. Mesmo assim a UI anuncia "WhatsApp Business"
  (`TPMNotificationSettings.tsx:170`) e o teste de canal grava log `status:'success'` sem enviar
  (`useTPMNotifications.ts:203-225`).
- **`tpm-notifications` simula envio** — `index.ts:69` tem o comentário `// Simular envio` e
  marca a fila como `sent`.
- **Web Push não criptografa o payload** — `send-push-notification/index.ts:127` envia texto
  puro sob `Content-Encoding: aes128gcm`; `p256dh`/`auth` são lidos e nunca usados. Sem VAPID
  configurado, ainda assim incrementa `successCount` e responde `sent: N`.
- **Três chaves VAPID divergentes**, uma delas a chave-demo pública do Google.
- **Google Maps e Google Analytics**: variáveis em `.env.example`, zero linhas de código.

### 4.7 🟡 Gamificação e passkeys: estruturalmente inertes

- `calculate-rankings` é a única escrita em `operator_rankings`/`operator_achievements` — e é
  órfã, sem cron versionado. Cadeia: conquistas nunca concedidas → saldo sempre 0 → loja de
  prêmios inutilizável. A tela "funciona" por um fallback client-side que recalcula e não
  persiste.
- `webauthn_credentials` e `webauthn_challenges` existem como tabelas e **nunca são
  consultadas** — feature de passkeys 100% dormente.

### 4.8 🟡 Integridade referencial quebrada no TPM

`completeMaintenance` grava `tpm_execution_parts/supplies/alerts` e `tpm_parameter_alerts` com
`execution_id = maintenance_records.id` (`useTPMMutations.ts:218,229,278,308`), mas as 4 FKs
apontam para `tpm_executions(id)`. **Nada no repositório insere em `tpm_executions`** — migração
`maintenance_records → tpm_executions` abandonada no meio, deixando 3 tabelas e um trigger de
auditoria mortos.

### 4.9 🟡 i18n é fachada

3 locales (pt-BR 425 chaves, en-US 424, es-ES **361** — 64 faltando), mas apenas **30 de 620
arquivos `.tsx` (4,8%)** usam `useTranslation`. O resto é português hardcoded. Trocar o idioma
muda pouco mais do que rótulos de menu.

### 4.10 🟡 17 tabelas criadas e nunca consultadas

`notifications`, `notification_preferences`, `saved_filters`, `entity_versions`,
`gamification_settings`, `kpi_alerts`, `packaging_waste`, `packaging_equipment`,
`shipment_costs`, `technical_sheet_audit_logs`, `technical_sheet_versions`,
`tpm_execution_audit_logs`, `tpm_execution_checklist`, `webauthn_credentials`,
`webauthn_challenges`, `email_verification_tokens`, `rls_test_results`.

---

## 5. Integrações — estado de cada uma

| Integração | Estado | Evidência |
|---|---|---|
| **Supabase** (DB/Auth/Storage/Functions) | ✅ espinha dorsal do sistema | `src/integrations/supabase/client.ts` |
| **Bitrix24** (CRM/ERP) | 🟨 sync implementado e autenticado; a UI de mapeamento de campos é órfã | `supabase/functions/bitrix24-sync/`, `Bitrix24FieldMapping.tsx` (0 importadores) |
| **Lovable AI Gateway** (`gemini-2.5-flash`) | ✅ chamada real, com streaming e auth | `technical-assistant/index.ts:498-516` |
| **Sentry** | ✅ inicializado, com Web Vitals | `src/main.tsx` |
| **Web Push (VAPID)** | 🟨 envia sem criptografar; 3 chaves divergentes | `send-push-notification/index.ts:127` |
| **Resend** (e-mail) | 🟨 código existe; funções que o usam são órfãs | `send-tpm-email`, `send-email-report` |
| **ERP externo** (`erp-api`) | 🟦 function existe, sem consumidor no app | `erp-api/` (0 chamadores) |
| **Banco externo** (`external-db-bridge`) | 🟦 documentada em `ARCHITECTURE.md`, sem chamador | `external-db-bridge/` (0 chamadores) |
| **Twilio** (SMS/WhatsApp) | 🟦 **só variável de ambiente — zero código** | `.env.example:23-26` |
| **Google Maps** | 🟦 só variável de ambiente | `.env.example` |
| **Google Analytics** | 🟦 só variável de ambiente | `.env.example` |
| **PWA / Service Worker** | 🟦 `vite-plugin-pwa` no `package.json:104`, **ausente do `vite.config.ts`**; `index.html` sem `<link rel="manifest">` | — |

---

## 6. O que esta auditoria NÃO cobriu

Declarado aqui, não escondido no rodapé.

**Runtime inteiro — `NAO_VERIFICADO`.** Não houve acesso ao ambiente vivo: o MCP do Supabase
respondeu `530 / error code 1016` em toda chamada, e a política de rede bloqueia
`*.supabase.co` (confirmado: `502 CONNECT`). Portanto **não foi possível verificar**:

- Se as 216 migrations estão aplicadas, ou se o banco vivo bate com o repositório.
- Se alguma tabela tem linhas (a prova mais barata de feature dormente ficou indisponível).
- Se os crons existem no painel Supabase, se rodaram e se falharam.
- Se webhooks e integrações têm tráfego real.
- Se as policies RLS vigentes no banco são as das migrations.
- A conclusão real dos runs históricos de CI (só os do PR desta auditoria foram observados).

**Também fora de escopo:** execução da suíte E2E (sem browsers Playwright e sem backend),
comportamento visual/UX real, teste de carga, e revisão de segurança ofensiva.

**Sobre a cobertura de leitura:** 895 arquivos de fonte foram atribuídos a algum lote e
endereçados; **552 (62%) carregam citação `arquivo:linha` individual**. Os demais foram
verificados em altitude (checagem agregada de consumidor) nos lotes 13 e 14 — que declaram
246/246 e 147/147 arquivos verificados. A recontagem de cobertura confrontou os arquivos
citados com a árvore real: **zero citações fabricadas**.

---

## 7. Correções à documentação existente

A documentação do próprio projeto estava errada em pontos que mudam decisão. Registro cada um
com o que foi medido:

| Documento | Afirma | Realidade medida |
|---|---|---|
| `AUDITORIA_EXAUSTIVA_2026-07-18.md` | "`vitest run` → 473/473 testes passando" | **8 falham de 497.** Era verdade quando escrito; não é mais |
| `AUDITORIA_EXAUSTIVA_2026-07-18.md` | "`npm audit`: 11 → 3" | **12 vulnerabilidades** (5 high) hoje |
| `AUDITORIA_EXAUSTIVA_2026-07-18.md` | `npm ci` quebrado "bloqueia instalação reprodutível em qualquer CI/ambiente novo"; pacotes de registro privado Lovable inacessíveis fora do Lovable | Metade certa: `npm ci` falha, mas **`npm install` funciona** (1336 pacotes, sem nenhum registro privado) |
| `AUDITORIA_EXAUSTIVA_2026-07-18.md` | corrigiu 4 pontos de chamada do frontend do `bitrix24-sync`, entre eles `Bitrix24FieldMapping.tsx` | Esse arquivo tem **0 importadores** — 316 linhas que nenhuma rota renderiza. Um quarto daquele fix foi aplicado a código morto |
| `ANALISE_TECNICA_SISTEMA.md` | CORS wildcard nas edge functions | **Já corrigido** — 31/33 usam a allowlist de `_shared/cors.ts`; wildcard só em 2 arquivos de teste |
| `CLAUDE.md` | "PWA via `vite-plugin-pwa`" | O plugin **não é usado** em `vite.config.ts` |
| `CLAUDE.md` | thresholds de cobertura "lines/statements 15%, functions/branches 10%" | Os reais em `vitest.config.ts` são 20/17/15/20 |
| `AppProviders.tsx:17` (comentário) | sugere que `OfflineProvider` foi removido | Foi **movido** para `main.tsx:63`; os 3 subsistemas offline coexistem |
| `packagingService.ts:10-31` (comentário) | tipos gerados não incluem as tabelas de packaging | **Incluem** (`types.ts:2762-3018`). O módulo abriu mão de type-safety por motivo que não existe mais |

### Correções aos próprios achados desta auditoria

Preservo o original e explico o erro, como manda o método:

1. **"A remediação de RLS foi revertida pelas migrations de agosto"** (lote 11) —
   **superdimensionado.** As duas migrations de 02/ago usam `USING (true)`, mas restritas a
   `FOR SELECT TO authenticated` em tabelas de catálogo (`packaging_equipment`,
   `packaging_defects`). É policy de leitura para usuário autenticado, não reversão do
   hardening. Das 221 ocorrências de `USING/WITH CHECK (true)` nas migrations, 119 estão em
   `FOR SELECT`. *(Atribuição precisa por policy exigiria parsing multilinha — não feito.)*
2. **`get_packaging_leaderboard` seria RPC fantasma** — **errado.** Existe na migration
   (`20260802113515...sql:5`) e em `types.ts:6028`. O `as any` contorna um quirk do codegen, que
   emite `Args: never` para função sem argumentos.
3. **"16 edge functions órfãs"** (primeira contagem minha) — **errado**, o correto é **18**. Meu
   `grep -rl` deu falso positivo em um comentário (`CronEmailPreferenceCard.tsx:8`) e numa query
   key homônima (`'security-alerts'`).
4. **"`npm ci` passou"** (primeira medição minha) — **errado.** O `exit 0` era do `tail` no pipe,
   não do npm.

---

## 8. Próximos passos, por valor

### Barato e seguro — posso fazer sozinho, sem tocar em produção

1. **Destravar os commits do repositório** — corrigir os 2 `any` de `src/features/packaging/`
   ou atualizar `.any-baseline.json`. Hoje ninguém consegue commitar sem `--no-verify`.
2. **Consertar as 8 falhas de teste** — mock de `onAuthStateChange` e as 3 asserções de realtime.
   São correções de teste, não de produção.
3. **Corrigir os 9 erros de ESLint** — majoritariamente rebaixar `react-hooks/refs` em
   `eslint.config.js`, junto das outras regras do React Compiler que já foram rebaixadas.
4. **Fazer os testes-espelho importarem o alvo real** — 885 linhas que hoje validam a si mesmas.
5. **Corrigir `/kpi` → `/kpis`** no spec de acessibilidade e os 2 links quebrados do command
   palette (`/pending-queue` → `/pending`, `/knowledge-base` → `/knowledge`).
6. **Regenerar `package-lock.json`** para destravar `npm ci` (mudança isolada, PR próprio).
7. **Atualizar `CLAUDE.md`** nos pontos errados (PWA, thresholds) — é o arquivo que todo
   desenvolvedor e todo agente lê primeiro.

### Decisão sua — toca produção, ou é escolha de produto

1. **Reconciliar o schema versionado com o banco vivo** (§4.1). É o item de maior risco. Exige
   alguém com acesso ao projeto Supabase para: descobrir qual dos 3 refs é produção, extrair o
   DDL das 7 tabelas fantasma e versioná-lo. Sem isso não há recuperação de desastre.
2. **Decidir o destino das 18 edge functions órfãs** — cada uma é ou (a) um agendamento que
   deveria existir e não existe, ou (b) código a remover. A resposta depende de olhar o painel
   Supabase; não dá para decidir pelo repositório.
3. **Remover ou rotular o dado fabricado** (§4.4). Recomendo tratar `PackagingRegisterForm`
   primeiro: é o único caso que **grava** número inventado no banco.
4. **Twilio: implementar ou remover a promessa da UI.** Hoje a interface oferece WhatsApp e o
   backend não tem uma linha.
5. **RLS com AAL2** — nenhuma policy exige MFA. Ligar isso bloquearia todo usuário sem MFA
   configurado; é decisão de produto, não de código.
6. **Gatear o `deploy.yml` pelo `ci.yml`.** Hoje o deploy aplica migrations e publica edge
   functions sem esperar nenhum gate — e, apesar do nome, não faz deploy do front-end.
7. **Definir o que fazer com as 17 tabelas sem consumidor** e com os 134 itens ⬛ (código morto).

---

## 9. Documentos de detalhe

Um por lote, em `docs/estado/`:

| Lote | Domínio |
|---|---|
| 01 | Produção e Jobs |
| 02 | Analytics, OEE, SPC e ML |
| 03 | Manutenção, TPM e Máquinas |
| 04 | Estoque, Rastreabilidade e Logística |
| 05 | Operadores, Turnos e Gamificação |
| 06 | Autenticação, RBAC e Segurança |
| 07 | Admin, Configurações e Integrações |
| 08 | Notificações, Alertas e Comunicação |
| 09 | Conhecimento, IA, Voz e Exportações |
| 10 | UX Transversal, Rotas, Offline/PWA e i18n |
| 11 | Camada de Dados (schema, RLS, RPCs, cron) |
| 12 | Testes, CI/CD e Qualidade |
| 13 | Varredura — componentes não citados |
| 14 | Varredura — features, hooks e lib não citados |

---

## 10. Nada foi alterado

Nenhuma linha de código, migration, configuração ou dependência foi modificada. Nenhum comando
foi executado contra produção — nem seria possível, o acesso está indisponível. O
`package-lock.json`, alterado como efeito colateral de um `npm install` feito para testar a
toolchain, foi **revertido** de propósito.

Esta auditoria observa. Não altera.

# Meta-auditoria 01 — Refutação adversarial dos ✅ (lotes 01–04)

> Verificação adversarial por leitura de código. **Sem acesso a runtime, banco ou produção.**
> Nenhuma afirmação aqui descreve dados reais em produção — apenas o que o código-fonte
> deste repositório permite ou impede.
> Nenhum arquivo existente foi alterado.

---

## Método e amostra

### Extração

```
grep -hE '^\|.*✅' docs/estado/_lote-01*.md docs/estado/_lote-02*.md \
                   docs/estado/_lote-03*.md docs/estado/_lote-04*.md
```

Universo: **157 linhas ✅** (46 no lote 01, 49 no lote 02, 37 no lote 03, 25 no lote 04).

### Critério de seleção da amostra (25 itens)

Priorizei os alvos onde um ✅ indevido custa mais caro e onde a evidência da auditoria
original era mais frágil:

1. **Fluxos com persistência de escrita** (triggers, edge functions, mutations) — é onde a
   camada de banco pode faltar sem que a UI aparente nada.
2. **Itens cuja própria coluna de observação já confessava um problema** e mesmo assim
   receberam ✅ (ex.: "ninguém lê `kpi_alerts`", "exibe sucessos que não aconteceram") —
   auto-denúncia é o melhor indicador de selo mal atribuído.
3. **Itens agregados / "mega-itens"** que empacotam 5–10 sub-features numa linha só, cuja
   evidência era "verificado por grep de nome de símbolo" (ex.: SLA de embalagem).
4. **Pares gerador↔consumidor** (QR Code, alertas, notificações), onde o fio só fecha se
   as duas pontas casarem — e onde a auditoria original afirmou explicitamente que casavam.
5. **Adjetivos fortes no título** ("obrigatório", "automático", "real") — o título faz uma
   promessa testável estaticamente.

Não selecionei itens triviais de CRUD/listagem (baixo valor informativo) exceto quando
serviam de âncora de controle.

### O que foi testado em cada item

- A UI existe e está **roteada/renderizada** por um pai real? (`grep` do símbolo, exclusão
  do próprio arquivo de definição)
- A lógica faz o que o nome diz, ou é stub / comentário `// Simular`?
- A persistência existe? (`.from('x')`, `.insert(`, `.update(`, `.upsert(`, `.rpc(` — testado
  com aspas simples **e** duplas)
- A tabela existe? `grep -rE "CREATE TABLE (IF NOT EXISTS )?(public\.)?<tabela>\b" supabase/migrations/`
  — **as 16 tabelas citadas nos lotes 01–04 que testei existem todas**; nenhuma derrubada
  minha se apoia em tabela ausente.
- Há literal hardcoded, `Math.random()` ou dado fictício **no caminho do dado**?
- Botões/ações têm handler real ligado a uma mutation?

---

## Resultado por item

| # | Item | Lote | Veredito | Motivo + arquivo:linha |
|---|---|---|---|---|
| 1 | Escalonamento automático de prioridade | 01 | **PROCEDE** | UPDATE real em `jobs.priority` (`src/features/jobs/hooks/usePriorityEscalation.ts:62-66,88-92`); montado de fato via `SmartAlertsWatcher.tsx:11` ← `src/providers/AppProviders.tsx:101`. Guarda anti-duplicidade (`inFlightRef`) é séria. |
| 2 | Sequenciamento inteligente com ação (agrupar por cor) | 01 | **PROCEDE** | Upsert único em `jobs` (`useSmartSequencingWithActions.ts:96-104`); painel renderizado em `KanbanBoard.tsx:392` e `PendingQueue.tsx:533`. |
| 3 | Checklist pré-produção **obrigatório** antes de iniciar | 01 | **DERRUBADO** | O botão "Pular" (`PreProductionChecklist.tsx:157-159`) chama `onSkip`, que em `PreProductionChecklistModal.tsx:27-28` executa `onComplete(jobId)` — o mesmo callback do caminho aprovado. Não há obrigatoriedade. |
| 4 | Registro de produção (qtd/perdas/fotos) | 01 | **PROCEDE** | UPDATE real com payload sanitizado (`ProductionRegistrationModal.tsx:227-230`); valida transição antes (`:202`). |
| 5 | Criação automática da tarefa de embalagem ao finalizar job | 01 | **PROCEDE** | Trigger `AFTER UPDATE ON public.jobs` + função `on_job_finished_create_packaging_task` com `ON CONFLICT DO NOTHING` (`migrations/20260723125433…sql:209-234`). Trigger criado, não comentado. |
| 6 | SLA de embalagem (9 sub-features num item) | 01 | **PROCEDE** | Re-verifiquei individualmente os 9 componentes: todos têm pai real (`PackagingDashboard.tsx:230,287,290,295`; `PackagingQualityDashboard.tsx:89,91`; `PackagingTaskDetail.tsx:87,162`; `PackagingTaskCard.tsx:46`). RPC `get_packaging_leaderboard` existe (`migrations/20260802113515…sql:5`). |
| 7 | Alertas de threshold OEE → persistência | 02 | **DERRUBADO** | Escreve via RPC (`useOEEAlerts.ts:70`), mas `kpi_alerts` **não tem um único leitor** em `src/` — só aparece em `src/integrations/supabase/types.ts:1523` e em migrations. Fio morre no banco. |
| 8 | SPC — alerta automático fora de controle | 02 | **PROCEDE** | Escreve (`useSPC.ts:242`) **e** lê (`:116`), e a leitura é renderizada em `SPCDashboard.tsx:298-311` com ação "Reconhecer". Fio fechado — contraste direto com o item 7. |
| 9 | ML — geração de predições de falha por máquina | 02 | **PROCEDE** | Chamada HTTP real ao gateway de IA (`supabase/functions/ml-predictions/index.ts:148-176`), persistência em `machine_predictions` (`:247-260`), leitura em `useMLPredictions.ts`. Não é mock. |
| 10 | ABC — cálculo de custo por job (cost drivers) | 02 | **PROCEDE** | Drivers reais + insert em `abc_job_costs` (`src/hooks/abc/useABCMutations.ts:37-85`). O fator `1.2` de `labor_hours` (`:64`) é premissa de negócio, não dado fictício. |
| 11 | Report Builder — templates salvos | 02 | **PROCEDE** | Insert/select em `report_templates` (`ReportBuilderPage.tsx:133,148`); tabela em `migrations/20260512163111…sql:2`. |
| 12 | `calculate-rankings` (edge) → `operator_rankings` | 02 | **PROCEDE** | Invoke real (`useGamification.ts:132`), upsert na edge, e **três** leitores (`useGamification.ts:74`, `useOperatorRankings.ts:27`, `operatorsService.ts:28`). A ausência de cron já estava declarada. |
| 13 | Histórico de alertas de eficiência | 02 | **PROCEDE** | Único caso de alerta analítico com escrita **e** leitura **e** realtime (`useEfficiencyAlertHistory.ts:40,57,68,75`). Tabela existe (RLS em `migrations/20260412114527…sql:65`). |
| 14 | Export OEE em PDF | 02 | **PROCEDE** | jsPDF sobre `data.byMachine` real (`OEEDashboard.tsx:186-292`); recomendações fixas são texto, não dado. |
| 15 | Update do registro principal na conclusão (TPM) | 03 | **PROCEDE (com ressalva grave)** | Os campos **do título** persistem de fato (`useTPMMutations.ts:194-214`). Ressalva: `quality_checklist_results`/`failure_risk_detected` são coletados na UI (`MaintenanceExecutionModal.tsx:425`), validados (`useTPMMutations.ts:172-173`) e **descartados** (`:208-210`). Ver "Achados sistêmicos". |
| 16 | Logs de notificação TPM | 03 | **DERRUBADO** | Os dois produtores dos logs gravam `status: 'success'` sem enviar nada: `supabase/functions/tpm-notifications/index.ts:69` (`// Simular envio`), `:71` (`// Aqui chamaria o provedor…`), `:86`; e `useTPMNotifications.ts:210-212` (`payload: { test: true }`). Além disso `tpm-notifications` **não tem nenhum chamador** no repositório. |
| 17 | Configurações de notificação TPM (canais, WhatsApp, e-mail) | 03 | **DERRUBADO** | A persistência existe, mas nenhum canal configurado é consumido por código alcançável: o gatilho que chamaria `send-tpm-email` está **comentado** (`migrations/20260508115941…sql:50-53`), e `send-tpm-email` não tem outro chamador. Configurar "e-mail/WhatsApp" não liga comportamento algum. |
| 18 | Geração de alertas TPM por vencimento | 03 | **PROCEDE** | Classificação real + dedup por `schedule_id` + INSERT em `maintenance_alerts` (`useTPMMutations.ts:449-535`). Disparo manual já estava declarado. |
| 19 | Edge `daily-maintenance-summary` | 03 | **PROCEDE** | Upsert em `daily_summaries` (`index.ts:190-199`) com leitores reais (`NotificationsPage.tsx:92`, `reportsService.ts:26`) e realtime (`NotificationsPage.tsx:73`). |
| 20 | Heatmap térmico da fábrica | 03 | **DERRUBADO** | Duas falhas no caminho do dado: `machines.slice(0, 48)` (`MachinesPage.tsx:624`) **descarta silenciosamente** máquinas numa frota declarada de 52; e a métrica "ocupação" é `(todayCount / 5) * 100` (`:595`) — divisor literal 5 sem origem no schema nem em config. |
| 21 | **QR Code de job (geração)** | 04 | **DERRUBADO** | A evidência original afirma que este é "o único payload que o `QRScanner` aceita". É **falso**: `JobQRCode.tsx:23` gera uma **URL** (`${origin}/track?q=${orderNumber}`), enquanto `QRScanner.tsx:92-95` faz `JSON.parse` e exige `data.type === "job"`. Nenhum gerador do repo emite esse JSON. |
| 22 | Ações de produção via scan (iniciar/pausar/finalizar) | 04 | **DERRUBADO** | Handlers existem (`QRScanner.tsx:125-142`), mas só são alcançáveis após um scan válido — que nenhum QR gerado pelo sistema produz (ver item 21). Ponto de entrada morto. |
| 23 | Registro de histórico de scans (com fila offline) | 04 | **PROCEDE (fio local íntegro, inalcançável)** | O código é correto e bem-feito (`useOfflineSync.ts:552-571`, replay idempotente `:304-324`). Não derrubo: as três camadas existem. Mas o único produtor é o scanner quebrado — defeito herdado, contado uma vez no item 21. |
| 24 | Scanner de QR com câmera real | 04 | **PROCEDE** | É hardware real, não mock: `Html5Qrcode.start` com `facingMode:"environment"` (`QRScanner.tsx:62-72`), cleanup no unmount (`:52-58`). O título promete "câmera real" e entrega. |
| 25 | Portal público de rastreamento (`/track`) | 04 | **DERRUBADO** | `.or(\`order_number.eq.${query},id.eq.${query}\`)` (`PublicTrackingPage.tsx:76`) compara input de texto livre contra `jobs.id`, que é **UUID** (`migrations/20251212212803…sql:23`), enquanto `order_number` é TEXT (`:24`). Ver ressalva de inferência abaixo. |

---

## ✅ derrubados (detalhe)

### D1 — "Checklist pré-produção **obrigatório** antes de iniciar" (lote 01)

A persistência existe e é boa: `pre_production_checklists`
(`migrations/20260317212106…sql:14-27`), insert em `PreProductionChecklist.tsx:65-72`.
O problema é o adjetivo **obrigatório**, que é a única coisa que distingue este item de um
"checklist opcional" comum.

```tsx
// src/components/operator/PreProductionChecklistModal.tsx:27-30
onSkip={() => {
  onComplete(jobId);      // ← mesmo callback do caminho aprovado
  onOpenChange(false);
}}
```

E `onComplete` em `OperatorView.tsx:74-80` chama `updateStatus.mutateAsync({ status: 'production' })`.
Ou seja: clicar "Pular" (`PreProductionChecklist.tsx:157-159`) inicia a produção sem
checklist e sem registro. Não há constraint no banco que exija o checklist.

Reforço independente: o **Kiosk não passa pelo checklist de forma alguma** —
`KioskPage.tsx:94` chama `updateJobOffline(jobId, { status: "production" … })` direto.

**Deveria ser 🟨** — checklist implementado e persistido; obrigatoriedade não implementada.

---

### D2 — "Alertas de threshold OEE → persistência" (lote 02)

A escrita é real (`useOEEAlerts.ts:70`, RPC `check_and_notify_kpi_alert`, tabela
`kpi_alerts` em `migrations/20260516174623…sql:2`). Mas:

```
grep -rn "kpi_alerts" src/
→ src/integrations/supabase/types.ts:1523   (tipo gerado)
→ src/integrations/supabase/types.ts:1556   (FK no tipo gerado)
```

Zero leitores. Nenhuma tela, hook ou edge function consulta `kpi_alerts`. A auditoria
original **escreveu isso na coluna de observação** ("ninguém lê `kpi_alerts`") e ainda
assim carimbou ✅ IMPLEMENTADO_TOTAL. Pela definição em vigor ("se o consumidor não
existir → 🟨/🟦"), o selo se autocontradiz.

O contraste com o item 8 (SPC) é a prova de que o critério existe e não foi aplicado:
`spc_alerts` tem escrita, leitura **e** renderização — e recebeu o mesmo ✅.

**Deveria ser 🟨** — persistência write-only.

---

### D3 — "Logs de notificação TPM" (lote 03)

A tela de leitura funciona (`TPMNotificationLogs.tsx:20`). O que a derruba é a origem do dado.
Há exatamente dois produtores de linhas em `tpm_notification_logs`, e **os dois fabricam sucesso**:

```ts
// supabase/functions/tpm-notifications/index.ts:66-88
console.log(`Processando item da fila: ${item.id} (${item.channel})`)
// Simular envio                                    ← :69
try {
  // Aqui chamaria o provedor de Email ou WhatsApp  ← :71
  await supabase.from('tpm_notification_queue')
    .update({ status: 'sent', processed_at: … })    ← marca enviado sem enviar
  await supabase.from('tpm_notification_logs').insert({
    …, status: 'success', sent_at: …                ← :86
  })
```

```ts
// src/features/notifications/hooks/useTPMNotifications.ts:203-212
.from('tpm_notification_logs').insert({
  …, status: 'success',
  payload: { test: true, … }                        ← "teste" gravado como sucesso
})
```

Agravante: `grep -rn "tpm-notifications" src/ supabase/migrations/` retorna **zero**
chamadores — a função da fila nunca é invocada nem por cron nem pelo frontend.

**Deveria ser 🟦** (UI de leitura pronta, pipeline de origem é stub declarado em comentário).

---

### D4 — "Configurações de notificação TPM (canais, tipos, filtros por máquina, WhatsApp)" (lote 03)

UI e persistência existem (`TPMNotificationSettings.tsx:64,74` → `user_notification_settings`).
O item foi carimbado ✅ citando como consumidor `supabase/functions/send-tpm-email/index.ts:44-47`.
Esse consumidor existe **mas é inalcançável**:

```sql
-- supabase/migrations/20260508115941_…sql:50-53
-- Uncomment the line below if you want to enable the trigger (…)
-- DROP TRIGGER IF EXISTS on_maintenance_alert_insert ON public.maintenance_alerts;
-- CREATE TRIGGER on_maintenance_alert_insert
--   AFTER INSERT ON public.maintenance_alerts …
```

O gatilho está **comentado**. `send-tpm-email` não tem nenhum outro chamador
(`grep -rn "send-tpm-email" src/ supabase/` → só essa migration). E o único canal
"vivo" (WhatsApp/e-mail via fila) é o stub de D3. Restam apenas as notificações push do
navegador, cujas preferências ficam em `localStorage` (`useTPMNotifications.ts:25-41`) —
ou seja, nem usam a tabela configurada nesta tela.

**Deveria ser 🟨** — preferências persistem; os canais que elas configuram não executam.

---

### D5 — "Heatmap térmico da fábrica" (lote 03)

Duas coisas no caminho do dado, não na periferia:

```tsx
// src/pages/MachinesPage.tsx:624
{machines.slice(0, 48).map((machine, i) => (
```

O sistema é descrito como tendo **52 máquinas**. O heatmap corta em 48 sem aviso, sem
paginação e sem contador — quatro máquinas simplesmente não existem visualmente num
painel cujo propósito é dar visão da fábrica inteira.

```tsx
// src/pages/MachinesPage.tsx:595
occupancy: machineJobs.length > 0 ? Math.min(100, (todayCount / 5) * 100) : 0
```

"Ocupação %" é o número de jobs de hoje dividido por **5**, literal, sem origem em
`operating_hours`, em config, nem no schema. Um valor apresentado como percentual de
ocupação que é, na prática, uma contagem reescalada arbitrariamente.

As cores (`getHeatColor`, `:566-581`) são derivadas de `jobs` reais — essa parte procede.
Mas o item empacota a métrica junto.

**Deveria ser 🟨** — visualização real, métrica de ocupação fictícia e frota truncada.

---

### D6 e D7 — O par QR Code está quebrado (lote 04) — **a pior derrubada do conjunto**

A auditoria original afirmou, textualmente, na linha "QR Code de job (geração)":

> *"Fecha o par gerador↔leitor: é o único payload que o `QRScanner` aceita."*

Isso é falso e é verificável em duas linhas de código.

**O leitor exige JSON:**
```ts
// src/components/qrcode/QRScanner.tsx:91-95
const data = JSON.parse(decodedText);
if (data.type !== "job" || !data.id) {
  toast.error("QR Code inválido");
  return;
}
```

**O gerador de job emite uma URL:**
```ts
// src/components/qrcode/JobQRCode.tsx:23
const qrValue = `${window.location.origin}/track?q=${orderNumber}`;
```

`JSON.parse("https://…/track?q=OS123")` lança `SyntaxError`, capturado no `catch` de
`QRScanner.tsx:118-120` → `toast.error("Erro ao processar QR Code")`.

E o gerador de lote emite outro formato ainda:
```ts
// src/components/traceability/LotQRCode.tsx:16
type: 'LOT',            // ← o leitor exige "job", minúsculo
```

Varri **todos** os geradores de QR do repositório (`QRCodeSVG`/`QRCodeCanvas` em 10
arquivos: `JobQRCode`, `LotQRCode`, `LotLabelPrint`, `QRLabelModal`,
`KnowledgeSheetQRCode`, `PackagingThermalLabel`, `InventoryPage`, `OperatorsPage`,
`MachinesPage`, `TwoFactorSetup`). **Nenhum** produz `{"type":"job","id":…}`. A única
ocorrência dessa string no repo é a própria validação do leitor (`QRScanner.tsx:93`).

Consequências em cascata (não contadas como derrubadas separadas, mas herdadas):
- **"Ações de produção via scan"** (D7): os handlers em `QRScanner.tsx:125-142` são
  inalcançáveis.
- **"Registro de histórico de scans"**: `recordScan` só é chamado de `QRScanner.tsx:117,135`.
  Logo `qr_scan_history` não tem produtor alcançável — e ela é lida por `ScanHistory.tsx:57`,
  `ScanStatsChart.tsx:42` **e** por `useOperatorProductivity.ts:104`, que usa scans como
  insumo de produtividade de operador.

**Deveriam ser 🟨/🟦** — código de scanner e de geração existe e é de boa qualidade; o
contrato entre eles nunca foi fechado.

---

### D8 — "Portal público de rastreamento (`/track`)" (lote 04)

```ts
// src/pages/PublicTrackingPage.tsx:76
.or(`order_number.eq.${query},id.eq.${query}`)
```

`jobs.id` é **UUID** (`migrations/20251212212803…sql:23`); `order_number` é **TEXT** (`:24`).
O filtro compara o input livre do usuário contra a coluna UUID no mesmo `.or(...)`.

**Ressalva honesta de inferência:** não executei nada. A derrubada se apoia em análise
estática: em PostgREST, os predicados de um `.or()` são traduzidos para um `OR` SQL único
com literal tipado, e comparar um literal não-UUID contra coluna `uuid` produz erro de
sintaxe de tipo em vez de simplesmente não casar. Se esse for o comportamento (é o
esperado), a busca por número de OS — o caso de uso principal de um portal público — cai
sempre no `catch` de `:87` e mostra `tracking.errorFetching`. **Isto exige confirmação em
runtime**, e é exatamente por não ter sido confirmado que o ✅ não se sustenta.

Independentemente disso, há um segundo motivo que **não** depende de runtime: o link que
alimenta este portal é gerado por `JobQRCode.tsx:23` no formato `/track?q=<order_number>`,
justamente o caminho em questão. E há interpolação direta de input do usuário no filtro
(a própria auditoria já sinalizou como "merece revisão de segurança").

**Deveria ser 🟨** — página, rota e query existem; o caminho de busca principal é, no
mínimo, não verificado e, por leitura de tipos, provavelmente quebrado.

---

## Achados sistêmicos (fora da contagem, mas relevantes)

**`tpm_executions` nunca é escrita.** A tabela tem as colunas
`quality_checklist_results` e `failure_risk_detected` (`migrations/20260508144556…sql:28-30`)
e existe um índice parcial sobre `failure_risk_detected` (`migrations/20260719190000…sql:66`).
Mas `grep -rn "tpm_executions" src/ supabase/functions/` mostra **apenas leituras**
(`TPMParameterAlerts.tsx:38`, `send-loss-risk-alert/index.ts:49`). Nenhum INSERT/UPDATE.
Resultado: a UI coleta esses dados (`MaintenanceExecutionModal.tsx:425`), o hook os valida
(`useTPMMutations.ts:172-173`) e depois os descarta com um comentário explicativo
(`:208-210`) — e `supabase/functions/pdf-generator/index.ts:171-174` renderiza uma seção de
PDF a partir de um campo que nada popula. Isso não derruba o item 15 (cujo título só lista
campos que de fato persistem), mas é um fio cortado que atravessa três camadas.

**A auto-denúncia não foi convertida em rebaixamento.** Em pelo menos 5 dos 8 itens
derrubados, a coluna "observação" da auditoria original já descrevia o defeito com
precisão ("ninguém lê", "exibe sucessos que não aconteceram", "abaixo das 52 alegadas",
"divisor fixo /5"). O erro não foi de investigação — foi de **classificação**: o
observador viu o problema e mesmo assim manteve o selo ✅.

**Onde o ✅ se sustentou, se sustentou bem.** Os 17 itens que procedem não passaram por
sorte: `calculate-rankings` tem 3 leitores distintos; SPC tem escrita+leitura+render+ação;
o trigger de embalagem está criado (não comentado) e com `ON CONFLICT`; o SLA de embalagem
teve os 9 componentes verificados um a um e todos têm pai real. A auditoria original não é
descuidada de forma uniforme — ela é precisa na investigação e frouxa no julgamento final.

---

## Taxa de erro medida

**8 de 25 derrubados (32%).**

Distribuição por lote na amostra:

| Lote | Amostrados | Derrubados | Taxa |
|---|---|---|---|
| 01 — Produção e Jobs | 6 | 1 | 17% |
| 02 — Analytics e OEE | 8 | 1 | 13% |
| 03 — Manutenção e Máquinas | 6 | 3 | 50% |
| 04 — Estoque e Rastreabilidade | 5 | 3 | 60% |

### O que isso implica para os ~492 ✅ do total

**Extrapolação direta seria incorreta e eu não a faço.** A amostra foi escolhida
adversarialmente — mirei nos itens com maior probabilidade a priori de estarem errados
(auto-denúncia na observação, mega-itens, adjetivos fortes, pares gerador↔consumidor).
Uma amostra enviesada para o erro **superestima** a taxa da população.

O que se pode afirmar com defensabilidade:

1. **Piso duro:** existem no mínimo 8 ✅ indevidos nos lotes 01–04. Não é hipótese — cada um
   tem `arquivo:linha`.
2. **Estimativa de faixa:** a taxa real na população dos 492 é quase certamente **menor**
   que 32% e maior que zero. Como âncora: nos lotes 01 e 02 (onde meus alvos eram menos
   óbvios e a amostragem se aproximou mais do acaso) a taxa foi **13–17%**. Uma faixa
   plausível para o total é **10–20%**, isto é, algo entre **~50 e ~100 itens** dos 492
   provavelmente não merecem ✅. Isto é uma estimativa, não uma medição.
3. **Onde procurar o resto, de forma barata:** os três padrões que produziram 7 das 8
   derrubadas são detectáveis com grep em minutos sobre os 14 lotes:
   - tabelas **write-only** (escrita sem nenhum `.from('x').select` em `src/`) → padrão D2;
   - **stubs declarados em comentário** (`// Simular`, `// Aqui chamaria`, `-- Uncomment`)
     dentro de fluxos marcados ✅ → padrão D3/D4;
   - **contratos de payload entre gerador e consumidor** que ninguém confrontou lado a lado
     → padrão D6, o mais caro e o menos visível.
4. **Sobre o método da auditoria original:** o problema dominante não é falta de leitura de
   código — é a **régua do selo**. Um item cuja própria observação diz "ninguém lê essa
   tabela" não pode receber IMPLEMENTADO_TOTAL. Aplicar mecanicamente a regra já escrita
   ("se o consumidor não existir → 🟨") sobre as observações **já redigidas** capturaria
   boa parte dos ✅ indevidos sem reabrir um único arquivo.

---

## Limitações

- **Sem runtime, sem banco, sem produção.** Nada aqui descreve dados reais, tabelas
  populadas, jobs em execução ou entregas efetivas. Todas as afirmações são sobre o que o
  código **permite ou impede**.
- **A derrubada D8 (portal público) depende de uma inferência de comportamento do
  PostgREST** com literal não-UUID contra coluna `uuid`. Está marcada como tal no detalhe.
  As outras 7 derrubadas não dependem de inferência de runtime — são leitura direta de
  código, comentários e DDL.
- **Amostra enviesada por construção** (25 de 157 ✅ nos lotes 01–04; 0 dos lotes 05–14).
  A taxa de 32% mede a amostra, não a população. Ver a discussão acima.
- **Migrations ≠ estado real do banco.** Verifiquei que as 16 tabelas testadas têm
  `CREATE TABLE` no repositório. Não posso afirmar que o banco em produção reflete essas
  migrations, nem que triggers/publicações realtime estão de fato ativos. Nenhuma derrubada
  minha se apoia em ausência de tabela — apoiam-se em código de aplicação, comentários de
  stub e DDL comentada, que são fatos do repositório.
- **Não reverifiquei os 🟨/🟦/⬛ existentes.** É possível — e o achado sobre "precisão na
  investigação, frouxidão no julgamento" sugere que é provável — que exista também erro na
  direção oposta (itens rebaixados que na verdade fecham o fio). Isso ficou fora do escopo.
- **Itens não amostrados permanecem não verificados**, não "confirmados". A ausência de uma
  linha nesta tabela não é aval.

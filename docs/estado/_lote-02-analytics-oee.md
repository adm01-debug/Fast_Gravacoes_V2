# Lote 02 — Analytics, OEE e ML

> Auditoria estática do repositório em 2026-08-16. **Sem acesso a runtime/banco/produção.**
> Nenhuma afirmação abaixo indica "está em uso real" — toda a camada de execução é **NAO_VERIFICADO**.
> Os `.md` do repo (`ANALISE_TECNICA_SISTEMA.md`, `AUDITORIA_*.md`) foram tratados como hipótese, não como fonte.

## Cobertura

### Lidos integralmente
- `supabase/functions/ml-predictions/index.ts` (294 linhas)
- `supabase/functions/calculate-rankings/index.ts` (325 linhas)
- `supabase/functions/calculate-inventory-intelligence/index.ts` (82 linhas)
- `supabase/functions/metrics-collector/index.ts` (72 linhas)
- `src/features/production/hooks/useOEE.ts` (569 linhas)
- `src/features/production/hooks/useOEEAlerts.ts`
- `src/features/analytics/hooks/useMLPredictions.ts`
- `src/features/analytics/hooks/useExecutiveDashboard.ts` (325 linhas)
- `src/features/analytics/hooks/useSPC.ts`
- `src/hooks/useABCCosts.ts` + `src/hooks/abc/useABCMutations.ts`

### Lidos parcialmente (trechos relevantes + grep dirigido)
- `src/pages/OEEDashboard.tsx`, `ExecutiveDashboard.tsx`, `KPIDashboard.tsx`, `BIDashboard.tsx`, `SPCDashboard.tsx`, `ReportBuilderPage.tsx`, `MLPredictionsDashboard.tsx`, `EfficiencyDashboard.tsx`, `DigitalTwin.tsx`, `SimulationDashboard.tsx`, `MachineComparisonPage.tsx`
- `src/features/analytics/hooks/useKPIs.ts`, `useEnergy.ts`, `useBottleneckPrediction.ts`, `useEfficiencyAlertHistory.ts`, `useLoadBalancing*.ts`
- `src/features/analytics/components/bi/*` (BIAIInsights, AIInsights, BIPredictiveROI, FuturisticBI, BIComparisonView)
- `src/features/analytics/components/oee/*` (HyperInsights, PredictiveAlerts, StudioHealthMonitor, OEERecommendations, OEERankingGap, OEELossesChart)
- `src/components/dashboard/*`, `src/components/ml/*`, `src/components/abc/*` (grep de importadores + leitura dos suspeitos)
- `supabase/functions/send-email-report/index.ts`, `excel-export/index.ts`, `pdf-generator/index.ts`
- `supabase/migrations/*.sql` — apenas grep por `CREATE TABLE` analíticas, `cron.schedule`, políticas RLS das tabelas do domínio

### Fora do escopo / não lidos
- Corpo completo de `src/features/analytics/components/efficiency/*`, `energy/EnergyChartTabs.tsx`, `spc/SPCControlChart.tsx`, `QualityHistogram.tsx`, `bi/drilldown/DrillDownDialog.tsx`, `bi/delays/DelaysAnalysis.tsx`, `bi/losses/LossesTable.tsx` — verificado apenas importador + fonte de dados (props vindas de hooks reais).
- `src/lib/pdfExport.ts`, `excelExport.ts`, `oeeExport.ts`, `spcExport.ts` (camada de export compartilhada — lote de infraestrutura).
- Gamificação/operadores (`useGamification`, `OperatorLeaderboard`) — só o fio que toca `calculate-rankings`.
- Edge functions fora do meu lote (`erp-api`, `bitrix24-sync`, `technical-assistant`, `health-*`, `tpm-*`).
- Todo o conteúdo de `supabase/migrations/` que não cria/altera tabelas analíticas.

---

## Inventário de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| **Cálculo de OEE (A×P×Q) por máquina/técnica/turno/estúdio/material** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/OEEDashboard.tsx:139`; lógica `src/features/production/hooks/useOEE.ts:223-248` e `:413` (`calculateRealOEE`); fonte de dados `useSchedulingData` → tabela `jobs` (`src/features/production/hooks/useOEE.ts:180`) | OEE é **derivado em runtime do client**, não persistido. Não existe tabela `oee_*` em `supabase/migrations/` (grep `CREATE TABLE.*oee_` = 0 resultados). Cada cliente recalcula. |
| Comparação com período anterior (OEE/A/P/Q) | ✅ IMPLEMENTADO_TOTAL | `src/features/production/hooks/useOEE.ts:514-558`; consumido em `src/components/dashboard/OEELoadTrendWidget.tsx:44` | — |
| Tendência diária e heatmap OEE (30d) | ✅ IMPLEMENTADO_TOTAL | `src/features/production/hooks/useOEE.ts:428-472`; UI `src/pages/OEEDashboard.tsx:84,88` (OEETrendChart / OEEHeatmap) | — |
| Alertas de threshold OEE → persistência | ✅ IMPLEMENTADO_TOTAL | Hook `src/features/production/hooks/useOEEAlerts.ts:70-76` (RPC `check_and_notify_kpi_alert`); DB `supabase/migrations/20260516174623_...sql:2` (tabela `kpi_alerts`) e `:23-33` (função) | Escrita OK, mas **ninguém lê `kpi_alerts`** (ver linha "Leitura de kpi_alerts" abaixo). |
| Leitura/consulta da tabela `kpi_alerts` | ⬛ MORTO_OU_ABANDONADO | Tabela `supabase/migrations/20260516174623_...sql:2`. Prova de ausência: `grep -rn "kpi_alerts" src --include=*.ts --include=*.tsx` retorna **só** `src/integrations/supabase/types.ts:1523,1556` (tipo gerado) | Tabela write-only. Nenhuma tela consulta os alertas persistidos. |
| Auditoria de cálculo OEE (OEECalculationAudit) | ✅ IMPLEMENTADO_TOTAL | `src/pages/OEEDashboard.tsx:65` (lazy import) + `:1` consumo via `showAudit`; componente `src/features/analytics/components/oee/OEECalculationAudit.tsx` | Recebe os mesmos dados do `useOEE`; não persiste. |
| Simulador OEE (sliders availability/performance/quality) | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/OEEDashboard.tsx:130` (`simValues` em `useState`) | Estado puramente local; nenhum cenário é salvo nem comparado com dados reais. |
| Presets de filtro do OEE Dashboard | ✅ IMPLEMENTADO_TOTAL | `src/pages/OEEDashboard.tsx:132` (`useDashboardPresets('oee')`), `:141-155` aplicar/salvar | Persistência via `@/features/admin` (fora do lote — não reverificada). |
| Export OEE em CSV | ✅ IMPLEMENTADO_TOTAL | `src/pages/OEEDashboard.tsx:162-185` (gera Blob e dispara download) | — |
| Export OEE em PDF | ✅ IMPLEMENTADO_TOTAL | `src/pages/OEEDashboard.tsx:186-292` (jsPDF + autoTable com dados reais de `data.byMachine`) | Recomendações do PDF são texto fixo condicionado a thresholds (`:281-284`). |
| **Export OEE em Excel** | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/OEEDashboard.tsx:298` chama `downloadReport(reportFormat)`, que é stub: `src/features/production/hooks/useOEE.ts:563-566` só faz `logger.debug` | Nada é baixado, **mas `src/pages/OEEDashboard.tsx:300` exibe `toast.success('Relatório exportado com sucesso!')`** — feedback falso ao usuário. |
| Consumíveis / desgaste por estúdio (StudioHealthMonitor) | 🟦 SUGERIDO_OU_INICIADO | `src/features/production/hooks/useOEE.ts:349-360` — `consumables` é sempre `[]` (comentário admite que não há fonte de dados); UI `src/features/analytics/components/oee/StudioHealthMonitor.tsx:65-67` mostra "Sem dados de consumíveis" | Precisa de fonte real (inventory/telemetria). Honesto: não fabrica número. |
| Health score por estúdio | 🟨 IMPLEMENTADO_PARCIAL | `src/features/production/hooks/useOEE.ts:356` — `healthScore = OEE` arredondado | "Saúde" é apenas um alias de OEE; não incorpora manutenção, falhas nem consumíveis. Rótulo induz a erro. |
| **"AI Hyper Insights" (aba Insights do OEE)** | ⬛ MORTO_OU_ABANDONADO (dado 100% fictício) | Array literal estático `src/features/analytics/components/oee/HyperInsights.tsx:16-43`; renderizado sem props em `src/pages/OEEDashboard.tsx:880`. Nenhum hook/consulta no arquivo (`grep -c "useQuery\|supabase" HyperInsights.tsx` = 0) | Textos inventados ("OEE 12% superior", "refugo +2,1% nas últimas 4 horas", "setup +18min"), badge "Real-time Analysis" (`:59`) e "Inteligência FAST 10/10". Não há caminho de execução que produza esses números. |
| Alertas preditivos de manutenção na tela OEE (PredictiveAlerts) | 🟨 IMPLEMENTADO_PARCIAL | Dados reais: `src/features/production/hooks/useOEE.ts:485-508`; UI `src/pages/OEEDashboard.tsx:539` | Não é predição — é regra de threshold sobre o período atual. Botões "Agendar Manutenção" e "Ignorar" (`src/features/analytics/components/oee/PredictiveAlerts.tsx:65-71`) **não têm `onClick`** — decorativos. |
| Recomendações OEE (OEERecommendations) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/components/oee/OEERecommendations.tsx:21-62` | Texto fixo por faixa de threshold ("bicos injetores", "esteiras") — vocabulário não corresponde a gravação/serigrafia/laser. Sem persistência nem ação. |
| Ranking / gap vs meta por máquina e técnica | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/components/oee/OEERankingGap.tsx:21-48` (props de `MachineOEE`/`TechniqueOEE` reais) | — |
| Pareto de perdas / drill-down de perdas | ✅ IMPLEMENTADO_TOTAL | `src/pages/OEEDashboard.tsx:140` (`useProductionLosses`) → `ParetoLossesChart`/`OEELossDrilldown` (`:89,90`) | Categorização por substring em `notes` (`src/features/analytics/components/oee/OEELossesChart.tsx:44-47`) — frágil. |
| **KPIs gerais (jobs, peças, perdas, ocupação, produtividade)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/KPIDashboard.tsx:76`; lógica `src/features/analytics/hooks/useKPIs.ts:161-392`; fonte `jobs`/`machines`/`techniques` via `useSchedulingData` | — |
| Metas de KPI editáveis | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/KPIDashboard.tsx:74` (`useState<Partial<KPITargets>>({})`), consumido em `src/features/analytics/hooks/useKPIs.ts:167` | Metas vivem só em `useState` — **não persistem** (sem tabela, sem localStorage). Perdem-se ao recarregar. |
| **Previsão de volume/perda 7 dias (KPIPrediction)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/hooks/useKPIs.ts:319-329` | É média simples repetida 7×, com `confidence: 0.9 - (i*0.05)` — **confiança inventada**, não estatística. Rotulado como "previsão". |
| Receita estimada / custo de perdas nos KPIs | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/hooks/useKPIs.ts:390`: `estimatedRevenue: completedPieces * 2.5, costOfLosses: lostPieces * 1.8` | **Preços hardcoded** (R$2,50 e R$1,80/peça), sem origem em `abc_*` nem em configuração. |
| Detecção de anomalias (perda/atraso/ocupação) | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useKPIs.ts:332-368` (deriva de dados reais) | Heurística de threshold — nome "anomalia" é generoso, mas o dado é real. |
| Export de KPIs (CSV/PDF) | ✅ IMPLEMENTADO_TOTAL | `src/pages/KPIDashboard.tsx:191,194` (`handleExport`) | — |
| **Dashboard Executivo (KPIs, tendências, top operadores)** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/ExecutiveDashboard.tsx:61`; hook `src/features/analytics/hooks/useExecutiveDashboard.ts:64-188`; fonte `jobs`, `machines`, `techniques`, `profiles` (`:196-210`) | Campos `averageCycleTime`, `maintenanceCompleted`, `maintenancePending`, `averageDowntime` retornam **0 fixo** (`:170,174,175,176`) apesar de `maintenance_records` já ser buscado em `:207` e descartado. |
| OEE por máquina no Dashboard Executivo | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/hooks/useExecutiveDashboard.ts:160` — `oee: machineMetrics?.oee_score \|\| 0` lendo `machine_health_metrics` (`:208`) | **Fio quebrado**: `grep -rn "machine_health_metrics" src` mostra apenas leituras (`reportsService.ts:6`, `machinesService.ts:34`, aqui). Nenhum `insert/upsert` em código ou edge function ⇒ a coluna sempre volta 0. |
| Eficiência do "top operador" | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/hooks/useExecutiveDashboard.ts:311`: `(stats.produced / (stats.jobs * 100)) * 100` | Denominador **fabricado**: assume 100 peças por job. Não usa `jobs.quantity`. |
| Meta global do Dashboard Executivo | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/ExecutiveDashboard.tsx:78` (`useState(85)`), salvar em `:131-140` | Só estado local + `toast.success`; nada persistido. |
| Drill-down dos cards do Dashboard Executivo | 🟦 SUGERIDO_OU_INICIADO | `src/pages/ExecutiveDashboard.tsx:349`, `:454`, `:513` — `onClick={() => toast.info('Drill-down: ...')}` | Só mostra um toast; nenhuma navegação/dialog implementada. |
| Export PDF / Excel do Dashboard Executivo | ✅ IMPLEMENTADO_TOTAL | `src/pages/ExecutiveDashboard.tsx:330,333` (`handleExportPDF`/`handleExportExcel`) | — |
| **BI Dashboard (métricas de período, distribuição, utilização)** | ✅ IMPLEMENTADO_TOTAL | `src/pages/BIDashboard.tsx:8-12` (useKPIs + useOEE + useSchedulingData + useOperators) → `FuturisticBI`/`BINormalView` (`:18,19`) | — |
| Drill-down de jobs no BI | ✅ IMPLEMENTADO_TOTAL | `src/pages/BIDashboard.tsx:20` (`DrillDownDialog`); dados de `biMetrics.periodJobsList` (`src/features/analytics/components/bi/FuturisticBI.tsx:57-70`) | — |
| Export BI (CSV/PDF) | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/components/bi/FuturisticBI.tsx:20` (`useBIExport`), `:71-73` | — |
| Indicador "última atualização" do BI | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/components/bi/FuturisticBI.tsx:48-53`: `setInterval(... if (Math.random() > 0.8) setLastUpdated(new Date()) ...)` | **`Math.random()` decidindo o timestamp exibido** — não reflete refetch real de dados. |
| **"Core Inteligência / Neural Analytics 4.0" (BIAIInsights)** | 🟨 IMPLEMENTADO_PARCIAL (dado fictício dominante) | `src/features/analytics/components/bi/BIAIInsights.tsx:55` `avgPiecesPerHour = 52`; `:56` `toDoJobs * 85`; `:85` `periodLostPieces * 18.5`; textos fixos `:75,90` ("drenando 12% da performance", "Studio Alfa") | Não há IA nem modelo: são `if` sobre 2 métricas + **constantes inventadas** (52 pç/h, 85 pç/pedido, R$18,50/peça). Renderizado em `src/features/analytics/components/bi/FuturisticBI.tsx:30`. |
| "Simulador Preditivo" do BI | 🟦 SUGERIDO_OU_INICIADO | `src/features/analytics/components/bi/BIAIInsights.tsx:39-47` — `setTimeout(2000)` retornando `oee * 1.12` e `pieces * 3.2` | Fake loading + multiplicadores mágicos. Nenhum modelo, nenhuma persistência. |
| "Projeção ROI IA" (BIPredictiveROI) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/components/bi/BIPredictiveROI.tsx:15` `avgPieceValue = 15.5 // Custom business logic value`; `:20` economia = 50% fixo | Valor unitário hardcoded (e **diferente** dos R$18,50 do BIAIInsights e dos R$1,80 do useKPIs) — três preços incompatíveis no mesmo domínio. |
| "Insights Gerados por IA" (AIInsights) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/components/bi/AIInsights.tsx:12-59`, usado em `src/pages/BIDashboard.tsx:39` | Regras `if/else` sobre métricas reais (sem números inventados), mas o rótulo "Gerados por IA" (`:69`) é enganoso. |
| Vista de comparação BI (BIComparisonView) | ⬛ MORTO_OU_ABANDONADO | Componente `src/features/analytics/components/bi/BIComparisonView.tsx`. Prova: `grep -rn "\bBIComparisonView\b" src` → **apenas** `src/features/analytics/index.ts:18` (reexport). Nenhuma página importa | Exportado no barrel e nunca consumido. |
| **SPC — parâmetros de controle (CRUD)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/SPCDashboard.tsx:16` (`SPCCreateParameterModal`), `:73-79`; hook `src/features/analytics/hooks/useSPC.ts:145-166`; DB `supabase/migrations/20251220142711_...sql:6` (`spc_control_parameters`) | — |
| SPC — registro de medições + cálculo de média/amplitude/σ | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useSPC.ts:168-226`; DB `supabase/migrations/20251220142711_...sql:27` (`spc_measurements`) | — |
| SPC — alerta automático fora de controle | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useSPC.ts:228-239` (insert em `spc_alerts`); DB `...20251220142711_...sql:47` | — |
| SPC — cálculo de limites de controle (X̄-R, tabela A2) | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useSPC.ts:264-311` (A2 real por tamanho de amostra), grava em `spc_control_parameters` | — |
| SPC — índices Cp/Cpk | 🟨 IMPLEMENTADO_PARCIAL | Cálculo `src/features/analytics/hooks/useSPC.ts:325-352`; consumido em `src/pages/SPCDashboard.tsx:48-51` | Calculado **em memória** a cada render. A tabela `spc_capability_history` (`supabase/migrations/20251220142711_...sql:65`) só é lida (`useSPC.ts:130-143`) e **nunca escrita** — histórico de capabilidade nunca é populado. |
| SPC — Western Electric / Run Rules | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useSPC.ts:357-397`; UI `src/pages/SPCDashboard.tsx:53-61` | Regra 3 tem off-by-one (`countTrend >= 6` para "7 pontos"), mas roda sobre dados reais. |
| SPC — gráfico de controle e histograma | ✅ IMPLEMENTADO_TOTAL | `src/pages/SPCDashboard.tsx:17,18`; dados de `chartData` (`:37-45`) | — |
| SPC — export de relatório PDF | ✅ IMPLEMENTADO_TOTAL | `src/pages/SPCDashboard.tsx:19` (`exportSPCReport`), `:93-104` | Implementação de `src/lib/spcExport.ts` não lida (fora do lote). |
| **SPC — "Plano de Ação IA"** | 🟦 SUGERIDO_OU_INICIADO | `src/pages/SPCDashboard.tsx:102-118`: monta `context` (`:106`) e **descarta**; `setTimeout(2000)` → toast com `#${Math.floor(Math.random()*9000)}` (`:115`) | Comentário no próprio código: "let's simulate a sophisticated response" (`:112`). **Número de lote aleatório apresentado como recomendação.** Nunca chama `technical-assistant`. |
| **ML — geração de predições de falha por máquina** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/MLPredictionsDashboard.tsx` via `src/features/analytics/hooks/useMLPredictions.ts:104-112` (`functions.invoke('ml-predictions')`); edge `supabase/functions/ml-predictions/index.ts:139-176`; persistência `:247-260` em `machine_predictions` (DB: `supabase/migrations/20251214173607_...sql:2`) | Ver "Achados" — **o que o ML realmente faz**. |
| ML — listagem/priorização de predições ativas | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useMLPredictions.ts:53-70` (SELECT `machine_predictions` where `is_active`) | — |
| ML — reconhecimento (acknowledge) de predição | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useMLPredictions.ts:143-160` (UPDATE `acknowledged_by/at`) | — |
| **ML — histórico/acurácia de predições (`prediction_history`)** | ⬛ MORTO_OU_ABANDONADO | Leitura `src/features/analytics/hooks/useMLPredictions.ts:78-88`; tabela `supabase/migrations/20251214173607_...sql:20`. Prova de ausência de escritor: `grep -rn "prediction_history" src supabase --include=*.ts --include=*.tsx --include=*.sql` → só a leitura acima, o tipo gerado e **políticas RLS**; zero `insert`/`update` | Campos `was_accurate`, `actual_failure_date` nunca são preenchidos ⇒ a UI de acurácia sempre mostra lista vazia. Não há loop de feedback do modelo. |
| ML — widget de análise preditiva no dashboard | ✅ IMPLEMENTADO_TOTAL | `src/components/dashboard/PredictiveAnalyticsWidget.tsx:11` (`useMLPredictions`) | — |
| ML — distribuição de risco (gráfico) | ✅ IMPLEMENTADO_TOTAL | `src/components/ml/MLRiskDistributionChart.tsx:20-27` (conta predições reais) | Comentário `:29` admite "Calculate trend (simulated...)" — o "trend" é só o % de alto risco atual, não série histórica. |
| ML — preferências de notificação | ✅ IMPLEMENTADO_TOTAL | `src/components/ml/MLNotificationSettings.tsx:28-40` + `saveMLNotificationPreferences`; realtime em `src/features/notifications/hooks/useMLPredictionNotifications.ts:194` | Persistência em localStorage (não banco) — aceitável para preferência de device. |
| **Curva/Custeio ABC — pools, atividades, taxas** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ABCCostingDashboard.tsx`; hook `src/hooks/useABCCosts.ts:9-62` → `src/hooks/abc/useABCData.ts`; DB `supabase/migrations/20251214172445_...sql:2,14,26,39` (`abc_activities`, `abc_cost_pools`, `abc_activity_rates`, `abc_job_costs`) | — |
| ABC — cálculo de custo por job (cost drivers) | ✅ IMPLEMENTADO_TOTAL | `src/hooks/abc/useABCMutations.ts:22-93` (drivers `machine_hours`/`setup_count`/`quantity`/`labor_hours`, insert em `abc_job_costs`) | `labor_hours = durationHours * 1.2` (`:63`) — fator 1,2 hardcoded sem configuração. |
| ABC — cálculo em lote de todos os jobs | ✅ IMPLEMENTADO_TOTAL | `src/hooks/abc/useABCMutations.ts:95-125` (batches de 5) | — |
| ABC — gráficos de breakdown/técnica/taxas | ✅ IMPLEMENTADO_TOTAL | `src/components/abc/ABCCostBreakdownChart.tsx`, `ABCTechniqueChart.tsx`, `ABCActivityRatesCard.tsx` — todos importados por `src/pages/ABCCostingDashboard.tsx` | — |
| "AI Financial Advisor" (ABC) | 🟨 IMPLEMENTADO_PARCIAL | `src/components/abc/AIFinancialAdvisor.tsx:11-68` | Regras `if` sobre dados reais de `useABCCosts`, **exceto** `:43` — "Redução de 10% no setup pode baixar o custo unitário em ~3.5%" é número inventado. Rótulo "IA sugere" (`:33`). |
| **Report Builder — preview e export (CSV/PDF/XLSX)** | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/ReportBuilderPage.tsx:305`; query `:103-127`; export `:176-278`; tabelas whitelisted `:54-60` | — |
| Report Builder — templates salvos | ✅ IMPLEMENTADO_TOTAL | Salvar `src/pages/ReportBuilderPage.tsx:142-169` (insert em `report_templates`); listar `:129-140`; aplicar `:477-485` | — |
| **Report Builder — agendamento por e-mail ("Agendamento SLA")** | 🟦 SUGERIDO_OU_INICIADO | `src/pages/ReportBuilderPage.tsx:503-520` — `<Select disabled>` (`:508`) e `<Button ... disabled>` (`:518`) | UI de fachada. Não há tabela de agendamento nem chamada à edge function que já existe (`send-email-report`). |
| MTBF / MTTR / disponibilidade por máquina | ✅ IMPLEMENTADO_TOTAL | `src/features/production/hooks/useMTBFMTTR.ts:59-105` (SELECT `maintenance_records` + `machines`); consumidores: `src/pages/MachinesPage.tsx:57`, `src/features/maintenance/components/MTBFMTTRWidget.tsx:45`, `TPMReports.tsx:26`, `src/components/machines/MachineReliabilityTab.tsx:23`, `src/components/kanban/DroppableColumn.tsx:79` | Score de confiabilidade usa faixas hardcoded (`:44-54`), mas os dados são reais. |
| Previsão de gargalos (14 dias) | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useBottleneckPrediction.ts:33-80+`; UI `src/pages/EfficiencyDashboard.tsx:32` | Capacidade diária fixa `DAILY_CAPACITY_MINUTES = 11*60` (`:22`) — não lê `operating_hours` da config, diferente do `useOEE.ts:186`. Thresholds em variáveis de módulo mutáveis (`:23-24`) — estado global fora do React. |
| Balanceamento de carga + aplicar sugestões | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useLoadBalancingWithActions.ts`; consumidores `src/components/dashboard/LoadBalancingWidget.tsx:143`, `src/components/planning/PlanningEfficiencyDashboard.tsx:31`, `src/pages/PendingQueue.tsx:116` | — |
| Histórico de alertas de eficiência | ✅ IMPLEMENTADO_TOTAL | Leitura `src/features/analytics/hooks/useEfficiencyAlertHistory.ts:35-50`; escrita `src/features/notifications/hooks/useEfficiencyNotifications.ts:94,155` (`recordAlert.mutate`); DB `efficiency_alert_history` | Fio completo (único caso de alerta analítico com leitura E escrita). |
| Dashboard de energia + score/pegada de carbono | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/hooks/useEnergy.ts:68-78` (tabela `energy_consumption`); `:207` `carbonFootprintKg = totalConsumption * 0.088`; `:214` `energyScore` | Fator de emissão 0,088 kgCO₂/kWh hardcoded sem fonte/config; `energyScore` é fórmula proprietária de bônus/penalidade sem documentação. Dados de consumo são reais. |
| "AI Energy Advisor" | 🟨 IMPLEMENTADO_PARCIAL | `src/features/analytics/components/energy/AIEnergyAdvisor.tsx:10-64` | Regras `if` sobre stats reais, mas `:39` ("reduzir a fatura em ~4%") e `:49` (1 árvore = 15 kg CO₂) são constantes inventadas. |
| Comparação de máquinas (radar/bar) | ✅ IMPLEMENTADO_TOTAL | `src/pages/MachineComparisonPage.tsx:31-32` (`useSchedulingData` + `useOEE`), `:60+` | — |
| Digital Twin — KPIs no cabeçalho | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/DigitalTwin.tsx:28`: `kpiData?.productivityByTechnique?.[0]?.occupancyRate \|\| 92.4` | **Fallback fictício 92,4%** exibido como OEE quando não há dado. Botões "Resetar Simulação"/"Iniciar What-If" (`:53-60`) **sem `onClick`** (grep `onClick` no arquivo = 0 resultados). |
| Simulation Dashboard (fuzz de webhooks) | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/SimulationDashboard.tsx:10,27`; lib `src/lib/simulation.ts:28-38` (cenários fixos), `:44-53` payloads mutados com `Math.random()` | É um harness de teste de webhook, não simulação de produção. O `Math.random()` é intencional (fuzzing), mas o dashboard é rotulado como analítico. |
| Widget `QuickActions` do dashboard | ⬛ MORTO_OU_ABANDONADO | `src/components/dashboard/QuickActions.tsx:7,14`. Prova: `grep -rn "QuickActions" src` só retorna `JobQuickActions` (`src/components/jobs/JobQuickActions.tsx`) e `MobileQuickActions` (`src/components/navigation/MobileQuickActions.tsx`) — **nenhum importador de `dashboard/QuickActions`** | Array `actions` estático, sem consumidor. |
| Export de dashboard como PNG/PDF (html2canvas) | ✅ IMPLEMENTADO_TOTAL | `src/components/dashboard/DashboardExport.tsx:17-47` | — |
| Botões "Histórico" e "Otimizar" do Efficiency Dashboard | 🟦 SUGERIDO_OU_INICIADO | `src/pages/EfficiencyDashboard.tsx:66,68` — `<Button>` sem `onClick` | Decorativos. |

---

## Integrações e automações do domínio

| Integração / automação | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| **`ml-predictions` (edge) → Lovable AI Gateway (Gemini 2.5 Flash)** | ✅ IMPLEMENTADO_TOTAL | Chamada `supabase/functions/ml-predictions/index.ts:139-176`; caller frontend `src/features/analytics/hooks/useMLPredictions.ts:105` e `src/features/maintenance/hooks/useTPMMutations.ts:502`; grava em `machine_predictions` (`:247`) | Depende de `LOVABLE_API_KEY` (`:19`). RBAC coordinator/manager/admin (`:55`). Lote máx. 10 máquinas (`:90`). **NAO_VERIFICADO se a chave está provisionada.** |
| Fallback determinístico do `ml-predictions` | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/ml-predictions/index.ts:216-231` | Se o JSON da IA não parsear: `risk_score = daysOverdue*5 + correctiveCount*10 + lossRate`, `confidence: 60` **fixo**. Fórmula sem calibração, gravada com o mesmo `model_version: "v1.0-lovable-ai"` (`:257`) — impossível distinguir depois o que veio da IA e o que veio da heurística. |
| **`calculate-rankings` (edge) → `operator_rankings` + `operator_achievements`** | ✅ IMPLEMENTADO_TOTAL | Edge `supabase/functions/calculate-rankings/index.ts:154-220` (upsert) e `:287-297` (achievements); caller `src/hooks/useGamification.ts:132`; leitura `src/components/dashboard/LeaderboardWidget.tsx:11`, `src/components/operators/OperatorLeaderboard.tsx:12`; DB `supabase/migrations/20260512174926_...sql:26` | Fórmula de pontos com pesos arbitrários (`:164-169`: `produced + eff*10 + qual*5 + jobs*2`). **Nenhum agendamento**: `grep "cron.schedule" supabase/migrations` retorna só `auto-promote-jobs` e `rollup-cron-p95-daily` ⇒ só roda por acionamento manual na UI. |
| **`calculate-inventory-intelligence` (edge)** | 🟨 IMPLEMENTADO_PARCIAL | Edge `supabase/functions/calculate-inventory-intelligence/index.ts:46-65` (grava `daily_usage_avg`); caller `src/features/inventory/hooks/useInventory.ts:68` | Só calcula média simples de 30 dias. **Retorna `accuracy: 98.5 // Simulated confidence level` (`:70`)** — métrica de acurácia inventada devolvida ao frontend. Sem cron. |
| **`metrics-collector` (edge) → `system_metrics`** | ⬛ MORTO_OU_ABANDONADO | Edge `supabase/functions/metrics-collector/index.ts:60-63`. Prova de ausência de caller: `grep -rn "metrics-collector" src supabase/migrations` → só comentário em `supabase/migrations/20260614000001_metrics_distinct_counts.sql:1,46`. Prova de ausência de leitor: `grep -rn "system_metrics" src --include=*.ts --include=*.tsx` → **zero resultados** | Função protegida por cron secret (`:6`) mas **sem cron agendado** e sem invocação no frontend. Escreve numa tabela que ninguém consulta. |
| **`send-email-report` (edge) → Resend** | ⬛ MORTO_OU_ABANDONADO | Edge completa e funcional: `supabase/functions/send-email-report/index.ts:335-378` (Resend) e `:367` (log em `daily_summaries`). Prova de ausência de caller: `grep -rn "send-email-report" src supabase/migrations` → **zero resultados** | Nenhuma tela invoca. A única UI que faria sentido (`ReportBuilderPage` "Agendamento SLA") está desabilitada (`src/pages/ReportBuilderPage.tsx:508,518`). Sem `RESEND_API_KEY` retorna preview (`:389-401`). |
| **`excel-export` (edge)** | ⬛ MORTO_OU_ABANDONADO | Edge `supabase/functions/excel-export/index.ts:6-18` (whitelist de 10 tabelas), RBAC `:49-60`. Prova: `grep -rn "excel-export" src` → **zero resultados**; só aparece em `AUDITORIA_EXAUSTIVA_2026-07-18.md` e `docs/QA_*.md` | Todos os exports Excel do app são client-side (`downloadWorkbook` em `src/pages/ReportBuilderPage.tsx:276`). A edge function está órfã. |
| **`pdf-generator` (edge)** | 🟨 IMPLEMENTADO_PARCIAL | Edge `supabase/functions/pdf-generator/index.ts:1-20`; caller único `src/features/maintenance/components/ExecutionDetailsModal.tsx:165` | O próprio arquivo declara (`:4-8`): "esta função **NÃO gera PDFs binários** hoje: monta um relatório em texto plano". Responde `text/plain`. Nome da função engana. |
| `check_and_notify_kpi_alert` (RPC) | 🟨 IMPLEMENTADO_PARCIAL | Definida `supabase/migrations/20260516174623_...sql:23-33`; chamada `src/features/production/hooks/useOEEAlerts.ts:70` | Escreve em `kpi_alerts`, tabela sem nenhum leitor (ver inventário). |
| `count_active_operators_since` / `count_running_machines` (RPCs) | 🟨 IMPLEMENTADO_PARCIAL | `supabase/migrations/20260614000001_metrics_distinct_counts.sql:46`; usadas só em `supabase/functions/metrics-collector/index.ts:36,51` | Ficam órfãs junto com o `metrics-collector`. |
| Realtime de predições ML | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useMLPredictionNotifications.ts:194` (canal em `machine_predictions`) | — |
| Realtime de alertas de eficiência | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useEfficiencyAlertHistory.ts:68`; `src/features/notifications/components/InAppNotificationWatcher.tsx:73`; `NotificationIntegrator.tsx:125` | — |
| Realtime de manutenção (base do MTBF) | ✅ IMPLEMENTADO_TOTAL | `src/features/production/hooks/useMTBFMTTR.ts:85` | — |
| Indicador de conexão realtime | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/hooks/useRealtimeConnection.ts:40`; UI `src/components/dashboard/RealtimeIndicator.tsx:11` | `Math.random()` aqui é só sufixo de ID de canal (uso legítimo). |
| Bitrix24 — mapeamento de campos (dentro de `features/analytics`) | ✅ IMPLEMENTADO_TOTAL | `src/features/analytics/components/bitrix24/Bitrix24MappingDialog.tsx:12`; consumido em `src/pages/Bitrix24ConfigPage.tsx:130` | Componente mal alocado no módulo analytics; funcional. Edge `bitrix24-sync` fora do lote. |

---

## Achados relevantes

### DADO FICTÍCIO (o mais grave primeiro)

- **`HyperInsights` — 3 "insights de IA" 100% inventados renderizados como análise em tempo real.** `src/features/analytics/components/oee/HyperInsights.tsx:16-43` é um array literal com números fabricados ("OEE 12% superior", "aumento de 2,1% no refugo nas últimas 4 horas", "setup +18min por lote"), exibido com badge "Real-time Analysis" (`:59`) em `src/pages/OEEDashboard.tsx:880`. O componente não importa nenhum hook nem o cliente Supabase.
- **`BIAIInsights` — "Core Inteligência / Neural Analytics 4.0" com constantes de negócio inventadas.** `src/features/analytics/components/bi/BIAIInsights.tsx:55` (`avgPiecesPerHour = 52`), `:56` (85 peças por pedido), `:85` (R$ 18,50 por peça perdida). Textos fixos citam "Studio Alfa" e "12% da performance" (`:75`) — entidades que não existem no modelo de dados.
- **"Simulador Preditivo" fake.** `src/features/analytics/components/bi/BIAIInsights.tsx:39-47`: `setTimeout` de 2s simulando processamento, devolvendo `OEE × 1.12` e `peças × 3.2` como "receita".
- **"Plano de Ação IA" do SPC gera número de lote aleatório.** `src/pages/SPCDashboard.tsx:115`: `Revisão do lote de tinta #${Math.floor(Math.random() * 9000)}`. O contexto real (Cp/Cpk/violações) é montado em `:106` e **descartado**. Comentário no código: "let's simulate a sophisticated response" (`:112`).
- **`calculate-inventory-intelligence` devolve acurácia inventada.** `supabase/functions/calculate-inventory-intelligence/index.ts:70`: `accuracy: 98.5 // Simulated confidence level` — a função só calcula média aritmética de 30 dias.
- **Três preços por peça incompatíveis no mesmo domínio:** R$ 15,50 (`BIPredictiveROI.tsx:15`), R$ 18,50 (`BIAIInsights.tsx:85`), R$ 1,80 de custo de perda e R$ 2,50 de receita (`useKPIs.ts:390`). Nenhum vem de `abc_activity_rates`.
- **Digital Twin exibe OEE 92,4% como fallback.** `src/pages/DigitalTwin.tsx:28` — quando não há dado, mostra um número bonito em vez de vazio.
- **`FuturisticBI` decide por `Math.random()` quando atualizar o rótulo "última atualização".** `src/features/analytics/components/bi/FuturisticBI.tsx:48-53`.
- **"Confiança" de previsão fabricada.** `src/features/analytics/hooks/useKPIs.ts:328`: `confidence: 0.9 - (i * 0.05)`, decaimento linear arbitrário sobre uma previsão que é a média do período repetida 7 vezes.
- **Eficiência de operador com denominador inventado.** `src/features/analytics/hooks/useExecutiveDashboard.ts:311` assume 100 peças por job em vez de usar `jobs.quantity`.

### O que o "ML" REALMENTE calcula (`supabase/functions/ml-predictions/index.ts`)

1. Agrega, **sem modelo**, 4 números por máquina a partir de `jobs`/`maintenance_*`: total de jobs, peças produzidas, peças perdidas → `loss_rate`, contagem de manutenções corretivas e **dias de atraso da manutenção preventiva** (`:106-117`).
2. Serializa esse JSON e pede a um **LLM (Gemini 2.5 Flash via Lovable AI Gateway)** que devolva `risk_score`, `confidence`, `predicted_days_to_failure`, fatores e recomendações (`:139-176`). Ou seja: **não há modelo treinado, features, validação cruzada nem histórico** — é um LLM opinando sobre 10 números.
3. `confidence` e `risk_score` são **o que o LLM escreveu**, apenas clampados em 0-100 (`:252-253`). Não é probabilidade calibrada.
4. Se o parse falhar, cai numa fórmula linear inventada: `risk_score = dias_atraso*5 + corretivas*10 + loss_rate`, `confidence: 60` (`:216-219`) — e grava com o **mesmo `model_version`** da via IA (`:257`), tornando as duas origens indistinguíveis a posteriori.
5. **Não há loop de feedback**: `prediction_history` (`was_accurate`, `actual_failure_date`) nunca recebe escrita em lugar nenhum do repositório. O sistema nunca aprende se acertou.

### Fios quebrados / órfãos

- 4 edge functions do lote **sem nenhum caller**: `metrics-collector`, `send-email-report`, `excel-export` (e `calculate-rankings` sem cron, só manual).
- 3 tabelas analíticas **sem escritor**: `prediction_history`, `spc_capability_history`, `machine_health_metrics` (esta última faz o OEE por máquina do Dashboard Executivo ser sempre 0).
- 2 tabelas **sem leitor**: `kpi_alerts` (write-only via RPC), `system_metrics` (escrita por função órfã).
- Componentes sem consumidor: `BIComparisonView` (só reexportado no barrel), `src/components/dashboard/QuickActions.tsx`.
- Export Excel do OEE dá **toast de sucesso sem baixar nada** (`src/pages/OEEDashboard.tsx:298` → stub em `useOEE.ts:563`).
- Botões decorativos sem handler: "Agendar Manutenção"/"Ignorar" (`PredictiveAlerts.tsx:65-71`), "Resetar Simulação"/"Iniciar What-If" (`DigitalTwin.tsx:53-60`), "Histórico"/"Otimizar" (`EfficiencyDashboard.tsx:66,68`), agendamento de relatório (`ReportBuilderPage.tsx:508,518`).
- Drill-downs do Dashboard Executivo são `toast.info` (`ExecutiveDashboard.tsx:349,454,513`).
- Metas (KPI e global executivo) **não persistem** — `useState` puro (`KPIDashboard.tsx:74`, `ExecutiveDashboard.tsx:78`).

### O que está genuinamente sólido

- **OEE** (`useOEE.ts`) — cálculo ISO 22400-2 com agregação correta antes das razões (`:410-417`), timezone São Paulo, e um comentário explícito recusando fabricar `produced_quantity` quando nula (`:236-240`).
- **SPC** — parâmetros, medições, limites X̄-R com tabela A2 real, alertas e Western Electric Rules, tudo com persistência real.
- **ABC Costing** — fio UI → mutation → 4 tabelas `abc_*`, com cost drivers reais.
- **MTBF/MTTR** — dados de `maintenance_records`, 5 consumidores distintos.
- **Report Builder** — CSV/PDF/XLSX reais + templates persistidos.
- **Rankings de operadores** — único fio edge-function → tabela → UI completo do lote.
- `metrics-collector` (`:41,55`) grava `null` em vez de `0` quando uma RPC falha, com comentário explícito "never persist a fake 0 that looks like real data" — bom padrão, ironicamente numa função órfã.

---

## Limitações

- **Runtime: NAO_VERIFICADO.** Não há acesso a banco, produção ou logs nesta sessão. Não posso afirmar que qualquer tabela tem linhas, que qualquer edge function foi deployada, nem que `LOVABLE_API_KEY`/`RESEND_API_KEY`/`CRON_SECRET` estão provisionadas.
- **Cron externo não verificável.** As funções sem `cron.schedule` nas migrations (`metrics-collector`, `calculate-rankings`, `send-email-report`) poderiam ser acionadas por scheduler do Supabase Dashboard, GitHub Actions ou n8n — nada disso está no repositório. Classifiquei como órfãs pela ausência de evidência no código.
- **`supabase/config.toml` não existe** no repo, então não pude confirmar quais funções estão de fato configuradas para deploy.
- Componentes marcados ✅ com base em "importador existe + props vêm de hook real" **não** tiveram seu corpo lido integralmente (lista na seção Cobertura). Um dado fictício embutido no meio de um desses arquivos pode ter escapado.
- Não executei build, testes nem lint — a classificação é estritamente estática.
- Migrations foram varridas por grep dirigido, não lidas linha a linha (são 100+ arquivos); tabelas analíticas criadas com nomes fora dos padrões que busquei (`oee_`, `kpi_`, `metrics_`, `spc_`, `abc_`, `prediction`, `ranking`) podem não ter sido encontradas.
- Não avaliei RLS/segurança das tabelas do domínio além de constatar a existência das políticas — isso é escopo de outro lote.

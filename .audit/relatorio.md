# Auditoria — 2026-11-09T14:14:56.828Z

**79 achados** · crítica 0 · alta 0 · média 76 · baixa 3
Comparado ao baseline: **0 novo(s)**.

## Por checagem

| Checagem | Achados | Limite |
|---|---|---|
| Políticas RLS de escrita com USING/WITH CHECK (true) | 0 | Lê só o que as migrations declaram. Políticas criadas por SQL dinâmico (EXECUTE/format) ou em loops não são vistas; a migration 20261106011000 já barra isso no banco ao vivo. |
| Tabelas em public criadas sem ENABLE ROW LEVEL SECURITY | 0 | Não vê RLS ativado por SQL dinâmico/loop. |
| Edge function sem entrada em supabase/config.toml | 0 | Só confere a presença da seção [functions.x]. |
| Edge function sem nenhum chamador no repositório | 14 | Cron configurado no painel do Supabase ou webhook externo não aparece aqui — por isso é "média". |
| Edge function com CORS "*" fixo no código | 0 | Só vê literal no código; o helper _shared/cors.ts pode restringir por env. |
| Edge function sem verificação de autenticação/segredo aparente | 2 | Heurística: procura getUser/Authorization/segredo/HMAC/helper de auth. verify_jwt=true sozinho aceita qualquer JWT (inclusive a anon key). |
| Página em src/pages que nada importa (sem rota) | 0 | Importação dinâmica montada por template string não é vista. |
| Tabela/RPC usada no código que não existe no banco (types.ts + migrations) | 4 | types.ts é gerado; se estiver velho, aparece como "média". |
| Botão que não faz nada (sem onClick/type/asChild ou com onClick vazio) | 32 | Heurística de AST: ignora botões dentro de Trigger/Close/asChild/form. Pode haver falso positivo se o handler vier por contexto. |
| catch que engole o erro sem log nem comentário | 0 | Só pega bloco literalmente vazio. |
| Dados inventados no código de produção (mock/fake/Math.random) | 19 | Exclui testes e design-system/demos. Math.random para id/atraso é ignorado. |
| TODO/FIXME/"em breve"/"não implementado" no código | 6 | Texto de interface "em breve" conta como funcionalidade prometida e não entregue. |
| @ts-ignore / @ts-nocheck em código de produção | 0 | Conta só os de produção. |
| Segredos/credenciais versionados no repositório | 2 | Padrões conhecidos (JWT, sk_live, Resend, Twilio, chave privada, URL de banco, webhook Bitrix). O valor NUNCA é impresso. |
| Regras declaradas em scripts/audit/regras.json | 0 | Só verifica texto (presença/ausência). Prova que a proteção continua escrita, não que está correta. |

## MEDIA (76)

- Botão inerte (sem onClick/type/asChild) — `src/components/calendar/OptimizationAssistant.tsx:120` · `<Button size="sm" variant="ghost" className="h-7 text-[10px] p-0 text-primary hover:bg-transparent mt-1">`
- Botão inerte (sem onClick/type/asChild) — `src/components/dashboard/AlertScheduleModal.tsx:157` · `<Button size="sm" variant="ghost" className="h-6 text-xs group-hover:bg-primary group-hover:text-primary-foreground">Analisar Otimização</Button>`
- Botão inerte (sem onClick/type/asChild) — `src/components/dashboard/PredictiveAnalyticsWidget.tsx:95` · `<Button variant="ghost" size="sm" className="w-full h-6 text-[10px] text-muted-foreground hover:text-primary">`
- Botão inerte (sem onClick/type/asChild) — `src/components/kiosk/KioskMode.tsx:384` · `<Button variant="outline" size="sm">`
- Botão inerte (sem onClick/type/asChild) — `src/components/scheduling/StuckJobsPanel.tsx:72` · `<Button`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatArea.tsx:280` · `<Button`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatArea.tsx:326` · `<Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-tighter gap-1.5 text-muted-foreground hover:text-primary transition-co`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatArea.tsx:329` · `<Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-tighter gap-1.5 text-muted-foreground hover:text-primary transition-co`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatMessage.tsx:111` · `<button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground" title="Compartilhar diagnóstico"><Share2 className="h-3.5 w-3.5" /><`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatMessage.tsx:129` · `<Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5 bg-primary/5 border-primary/20 text-primary hover:bg-`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/ChatMessage.tsx:133` · `<Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5 shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/TechnicalArtifacts.tsx:133` · `<button className="p-1 rounded bg-muted opacity-0 group-hover:opacity-100 hover:text-primary transition-all">`
- Botão inerte (sem onClick/type/asChild) — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:200` · `<Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-8 border-primary/20 hover:bg-primary/10">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/bi/BIAIInsights.tsx:212` · `<Button size="sm" variant="outline" className="h-8 text-[10px] w-full border-primary/20 hover:bg-primary/20 hover:border-primary/40 group/btn transition-all">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:43` · `<Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Configurar indicador"><Settings2 className="h-3 w-3" /></Button>`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:83` · `<Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Configurar indicador"><Settings2 className="h-3 w-3" /></Button>`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/bi/executive/KPIOverviewTab.tsx:121` · `<Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Configurar indicador"><Settings2 className="h-3 w-3" /></Button>`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/efficiency/BalancingTab.tsx:71` · `<Button variant="outline" size="sm" className="w-full text-xs">Aplicar</Button>`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/efficiency/SequencingTab.tsx:54` · `<Button variant="outline" size="sm" className="w-full gap-2">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/oee/HyperInsights.tsx:88` · `<button className="flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:gap-2 transition-all">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/oee/OEERecommendations.tsx:100` · `<Button variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/oee/PredictiveAlerts.tsx:65` · `<Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-primary/20 hover:bg-primary/10">`
- Botão inerte (sem onClick/type/asChild) — `src/features/analytics/components/oee/PredictiveAlerts.tsx:68` · `<Button variant="ghost" size="sm" className="h-7 text-[10px]">`
- Botão inerte (sem onClick/type/asChild) — `src/features/inventory/components/inventory-page/BatchQRLabelModal.tsx:79` · `<Button variant="ghost" size="icon" className="h-7 w-7"><Maximize2 className="h-3.5 w-3.5" /></Button>`
- Botão inerte (sem onClick/type/asChild) — `src/pages/DigitalTwin.tsx:53` · `<Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">`
- Botão inerte (sem onClick/type/asChild) — `src/pages/DigitalTwin.tsx:57` · `<Button className="gap-2 shadow-glow-primary">`
- Botão inerte (sem onClick/type/asChild) — `src/pages/DigitalTwin.tsx:132` · `<Button variant="outline" size="sm" className="w-full text-[10px] font-bold uppercase h-8 border-primary/30">`
- Botão inerte (sem onClick/type/asChild) — `src/pages/EfficiencyDashboard.tsx:65` · `<Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm"><History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Histórico</Button>`
- Botão inerte (sem onClick/type/asChild) — `src/pages/EfficiencyDashboard.tsx:67` · `<Button size="sm" className="gap-1.5 sm:gap-2 gradient-primary text-xs sm:text-sm"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Otimizar</Button>`
- Botão inerte (sem onClick/type/asChild) — `src/pages/LogisticsPage.tsx:219` · `<Button variant="outline" size="icon">`
- Botão inerte (sem onClick/type/asChild) — `src/pages/MasterAPIPage.tsx:157` · `<Button variant="link" className="text-xs font-bold gap-1 text-primary p-0">`
- Botão inerte (sem onClick/type/asChild) — `src/pages/ShiftHandoverPage.tsx:377` · `<Button variant="outline" size="sm">`
- Math.random() usado como dado — `src/components/digital-twin/FactoryFloorMap.tsx:91` · `load: hasJob ? Math.floor(Math.random() * 20) + 80 : 0,`
- Math.random() usado como dado — `src/components/digital-twin/FactoryFloorMap.tsx:92` · `temp: hasJob ? Math.floor(Math.random() * 20) + 45 : 30,`
- Math.random() usado como dado — `src/components/digital-twin/FactoryFloorMap.tsx:93` · `efficiency: hasJob ? Math.floor(Math.random() * 10) + 90 : 0,`
- Math.random() usado como dado — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:14` · `temp: 180 + Math.random() * 10,`
- Math.random() usado como dado — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:15` · `pressure: 5.0 + Math.random() * 0.8,`
- Math.random() usado como dado — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:16` · `speed: 40 + Math.random() * 15,`
- Math.random() usado como dado — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:17` · `efficiency: 90 + Math.random() * 8,`
- Math.random() usado como dado — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx:30` · `temp: 180 + Math.random() * 10,`
- … +36 em findings.json

## BAIXA (3)

- Marcador "XXX" — `src/components/design-system/sections/modals/SheetExamples.tsx:93` · `<div className="space-y-2"><Label>Número do Pedido</Label><Input placeholder="ORD-2024-XXX" /></div>`
- Arquivo .env versionado (só variáveis VITE_ públicas) — `.env.production:1` · `.env.production está no git`
- Arquivo .env versionado (só variáveis VITE_ públicas) — `.env.staging:1` · `.env.staging está no git`

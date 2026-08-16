# Lote 13 — Varredura dos componentes não citados

> Auditoria estática do repositório `/home/user/fast-grava-es-v2`.
> **Sem acesso a runtime, banco ou produção.** Nada aqui descreve comportamento observado em execução — tudo derivado de leitura de código e `grep`. Comportamento em execução: **NAO_VERIFICADO**.
> Os `.md` do repositório (`CLAUDE.md`, `ANALISE_TECNICA_SISTEMA.md`, lotes 01–12) foram tratados como **hipótese**, não fonte.
> Escopo fechado: os **246 arquivos** de `src/components/` listados em `/tmp/sweepA.txt` que nenhum dos 12 lotes anteriores citou como evidência.

Legenda: ✅ íntegro · 🟨 fachada / dado fictício · 🟦 limitação declarada ou dado simulado em contexto de vitrine · ⬛ código órfão (sem chamador)

---

## Método e cobertura

**246/246 arquivos verificados** (29.245 linhas). A verificação foi feita em **altitude**, não linha a linha, com leitura integral reservada aos arquivos que os filtros automáticos sinalizaram.

| Etapa | O que rodou | Alvo |
|---|---|---|
| 1. Órfãos por caminho | `grep -rlE "['\"][^'\"]*/<basename>['\"]" src/ tests/` para cada um dos 246, excluindo o próprio arquivo | todos |
| 2. Órfãos por símbolo | `grep -rn "\b<NomeExportado>\b" src/` fora do diretório de origem, para os candidatos da etapa 1 | confirmação |
| 3. Barris | inspeção de `index.ts`/`index.tsx` para detectar reexportação morta | `loading/`, `accessibility/`, `sections/animations/` |
| 4. Dado fictício | `Math.random()` em cada um dos 246 | todos |
| 5. Marcadores | `TODO\|FIXME\|XXX:\|em breve\|coming soon\|não implementad\|mock` (case-insensitive) | todos |
| 6. Fachada de ação | `onClick={() => {}}`, `onClick={undefined}`, `disabled` literal, `=> {}` vazio, `href="#"` | todos |
| 7. Fachada de dado | componentes com `toast` mas sem `supabase`/`useMutation`/`mutate`/`invalidateQueries`/`navigate` | 118 fora de `ui/` e `design-system/` |
| 8. Fonte de dados | conferência de `interface *Props` / hook de dados nos componentes de estatística e widgets de dashboard | ~25 arquivos |

**Leitura integral (linha a linha):** 12 arquivos — os sinalizados pelas etapas 2, 4, 6 e 7.

Distribuição dos 246: `ui/` 58 arquivos (5.960 linhas) · `design-system/` 70 arquivos (7.013 linhas) · demais 118 arquivos (16.272 linhas).

**Não coberto:** verificação de renderização, props em runtime, cobertura de teste por arquivo, e se um componente com importador é de fato alcançável por alguma rota (a cadeia foi seguida até a página, não até a rota).

---

## `src/components/ui` — verificação agregada

Critério: existe pelo menos 1 importador **fora** de `src/components/ui/`?
Comando por arquivo: `grep -rl "components/ui/<base>\"|components/ui/<base>'" src/ --include=*.tsx --include=*.ts | grep -v "^src/components/ui/"`.
Não há barril em `src/components/ui/` (`ls src/components/ui/index.*` → nada), logo o caminho é a única via de import.

### Primitivos SEM nenhum importador (10 arquivos, 1.353 linhas) ⬛

Para cada um foi feita a dupla prova: (a) zero referências ao caminho em **todo** `src/` e `tests/`; (b) zero usos do símbolo exportado fora de `src/components/ui/`.

| Arquivo | Export | Prova |
|---|---|---|
| `src/components/ui/accordion.tsx:52` | `Accordion, AccordionItem, AccordionTrigger, AccordionContent` | `grep -rn "ui/accordion" src/` → 0 · `grep -rn "\bAccordion\b" src/ \| grep -v "^src/components/ui/"` → 0 |
| `src/components/ui/aspect-ratio.tsx:5` | `AspectRatio` | `grep -rn "ui/aspect-ratio" src/` → 0 · símbolo → 0 |
| `src/components/ui/carousel.tsx:229` | `Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext` | `grep -rn "ui/carousel" src/` → 0 · símbolo → 0 |
| `src/components/ui/drawer.tsx:76` | `Drawer*` | `grep -rn "ui/drawer" src/` → 0 · símbolo → 2 ocorrências, ambas texto literal em vitrine (`design-system/sections/overview/OverviewCategoriesGrid.tsx:13`, `design-system/sections/modals/SheetExamples.tsx:17`), nenhum import |
| `src/components/ui/input-otp.tsx:61` | `InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator` | `grep -rn "ui/input-otp" src/` → 0 · símbolo → 0 |
| `src/components/ui/resizable.tsx:37` | `ResizablePanelGroup, ResizablePanel, ResizableHandle` | `grep -rn "ui/resizable" src/` → 0 · símbolo → 0 |
| `src/components/ui/responsive-table.tsx:54` | `ResponsiveTable` (genérico) | `grep -rn "ui/responsive-table" src/` → 0 · símbolo → 0 |
| `src/components/ui/sidebar.tsx:613` | `Sidebar*` (613 linhas — o maior do lote) | `grep -rn "ui/sidebar" src/` → 0 · `SidebarProvider` → 4 ocorrências, todas do **outro** `SidebarProvider` em `src/contexts/SidebarContext.tsx:15`, importado em `src/providers/AppProviders.tsx:30` |
| `src/components/ui/stepper.tsx:17` | `Stepper` | `grep -rn "ui/stepper" src/` → 0 · símbolo → 1 ocorrência, comentário `{/* Visual Stepper */}` em `src/pages/PublicTrackingPage.tsx:200` (stepper feito à mão, não importa o primitivo) |
| `src/components/ui/toggle-group.tsx:49` | `ToggleGroup, ToggleGroupItem` | `grep -rn "ui/toggle-group" src/` → 0 · símbolo → 0 |

### Conclusão sobre os 48 restantes ✅

Todos os outros 48 primitivos de `src/components/ui/` têm ≥1 importador fora do diretório. Faixa observada: de 1 importador (`collapsible`, `empty-state`, `form`, `hover-card`, `micro-interactions`, `navigation-menu`, `pagination`, `radio-group`, `sonner`, `toast`, `toaster`) até 329 (`card.tsx`), 291 (`button.tsx`) e 288 (`badge.tsx`). Nenhum sinal de fachada foi encontrado neles pelas etapas 4–6, com a única exceção registrada abaixo (`sidebar.tsx:537`, que já é órfão).

---

## Componentes órfãos (⬛)

Além dos 10 primitivos de `ui/` acima, a varredura por caminho + símbolo nos 188 arquivos restantes encontrou **3** órfãos. Todo o resto dos 188 tem ao menos 1 importador por caminho.

| Componente | Arquivo:linha | Prova de ausência de chamador (grep executado) |
|---|---|---|
| `Bitrix24FieldMapping` (316 linhas, consome `bitrix24-sync?action=mapping` e `?action=fields` via `edgeFunctionFetch`) | `src/components/integrations/Bitrix24FieldMapping.tsx:46` | `grep -rn "Bitrix24FieldMapping" src/ tests/` → 2 hits: a própria definição (`:46`) e `src/features/admin/services/integrationsService.ts:14` (`getBitrix24FieldMappings()`, nome de método, não import). Nenhum `import`. |
| `navGroups` / `adminNavItems` / `NavItem` / `NavGroup` (79 linhas — **duplicata defasada** da config de navegação viva) | `src/components/layout/SidebarNavData.tsx:10,17,25,74` | `grep -rlE "['\"][^'\"]*/SidebarNavData['\"]" src/ tests/` → 0. O consumidor real (`src/components/layout/AppSidebar.tsx:32`) importa de `./sidebar/sidebarNavConfig`. |
| barril `sections/animations` (6 reexports) | `src/components/design-system/sections/animations/index.ts:1-6` | `grep -rn "sections/animations" src/ \| grep -v "sections/animations/"` → 0. `AnimationsSection.tsx:4-9` importa os 6 arquivos **direto** (`./animations/EntryAnimations`, etc.), ignorando o barril. |

### Divergência associada ao órfão `SidebarNavData.tsx`

Não é só código morto: é uma cópia que **diverge** da config viva, o que torna qualquer manutenção nela invisível.

`diff <(grep -oE "href: '[^']*'" src/components/layout/SidebarNavData.tsx) <(grep -oE "href: '[^']*'" src/components/layout/sidebar/sidebarNavConfig.ts)`

- `SidebarNavData.tsx` = 38 rotas · `sidebar/sidebarNavConfig.ts` = 43 rotas
- Presentes só no arquivo **vivo** (6): `/report-builder`, `/packaging`, `/inventory`, `/digital-twin`, `/master-api`, `/admin/telemetria`
- Presente só no arquivo **morto** (1): `/logistics`

---

## Dado fictício e fachada (🟨/🟦)

| Item | Classificação | Evidência arquivo:linha | Observação |
|---|---|---|---|
| "Salvar Thresholds" confirma persistência que não existe | 🟨 | `src/components/settings/SettingsGeneralTab.tsx:25-28` (`saveThresholds` → `setBottleneckThresholds(...)` + `toast.success('Limites de gargalo atualizados')`), botão em `:124-126` | `setBottleneckThresholds` só reatribui variáveis de módulo: `src/features/analytics/hooks/useBottleneckPrediction.ts:23-24` (`let CRITICAL_THRESHOLD = 90; let WARNING_THRESHOLD = 75;`) e `:28-31`. Sem `localStorage`, sem Supabase — o valor se perde no reload e não é compartilhado entre usuários. Runtime: NAO_VERIFICADO. |
| Cards de status de infraestrutura com texto fixo | 🟨 | `src/components/settings/SettingsGeneralTab.tsx:136` (`Lovable Cloud` / `Conectado`) e `:144` (`Autenticação` / `Ativa e segura`) | Literais em JSX, sem nenhuma sonda de saúde, sem props, sem hook. Exibidos como se fossem estado real do backend. |
| Badge de status das Core Web Vitals é constante, não derivado da métrica | 🟨 | `src/components/design-system/sections/code-quality/CodeQualityPerformanceTab.tsx:42-44` | `status: 'Bom'` (FCP), `'Precisa Melhorar'` (LCP), `'Precisa Melhorar'` (TTI) são strings fixas no array; o `value` ao lado vem de `performanceMetrics` via prop. Qualquer valor real de FCP continuará exibindo "Bom". A barra usa `100 - (value / divisor)` com `divisor` também fixo (30/40/50). Componente renderizado por `src/pages/CodeQualityDashboard.tsx:105`. |
| KPIs de produção gerados por `Math.random()` na vitrine | 🟦 | `src/components/design-system/hooks/DataHooksDemos.tsx:12` (seed fixo `jobs: 45, pending: 12, inProgress: 8, completed: 25`) e `:21-24` (`Math.floor(Math.random() * 50) + 30`, etc.) | É demo declarado (função `simulate`, `setTimeout` de 1s) dentro de `HooksExamplesSection` → `src/pages/DesignSystemPage.tsx:7,272`. Números têm forma de KPI real de produção; a página `/design-system` é pública (ver Lote 10). Não é fachada de produto, mas é dado fictício visível. |
| `Math.random()` decorativo (partículas / confete) | 🟦 | `src/components/design-system/sections/OverviewSection.tsx:49-57`; `src/components/design-system/sections/overview/OverviewStatCard.tsx:63,97-107` | Posição, tamanho, blur, cor e ângulo de elementos puramente visuais + frequência de áudio. Nenhuma métrica envolvida. |
| `Math.random()` em largura de skeleton | 🟦 | `src/components/ui/sidebar.tsx:537` (`${Math.floor(Math.random() * 40) + 50}%`, comentário `// Random width between 50 to 90%.`) | Cosmético e memoizado. Arquivo já classificado ⬛ (órfão), então sem alcance. |
| Feed "em Tempo Real" sem backfill histórico | 🟦 | `src/components/dashboard/ActivityFeedWidget.tsx:45` (`useState<FeedEvent[]>([])`) e `:47-113` (só `supabase.channel(...).on('postgres_changes', ...)`, nenhum `select` inicial) | A lista começa vazia a cada montagem e só cresce com eventos que chegam durante a sessão. **Declarado honestamente** no empty state: `:134` "Aguardando atividades..." / "Mudanças aparecerão aqui em tempo real". Não é fachada. |
| Atalho documentado sem ação | 🟦 | `src/components/shortcuts/KeyboardShortcuts.tsx:60` (`{ keys: ["Escape"], description: "Fechar Modal/Dialog", action: () => {} }`) | Único no-op da lista; os outros 11 atalhos (`:47-63`) chamam `navigate`/`setTheme`/`setIsHelpOpen` e são despachados em `:111` sob o listener de `:133`. `Escape` é tratado nativamente pelo Radix, então o no-op é coerente — mas a entrada aparece na tela de ajuda como se fosse um binding próprio. |
| `href="#"` e `disabled` literal | 🟦 | `src/components/design-system/sections/navigation/BreadcrumbExamples.tsx:16,20,26`; `sections/tables/InteractiveTables.tsx:103`; `sections/ButtonsSection.tsx:89`; `sections/forms/FormsSelectionControls.tsx:29,48,49,78,104,121`; `sections/forms/FormsTextInputs.tsx:19,48`; `sections/loading/ButtonLoadingSection.tsx:24,45` | Todos dentro de `design-system/` demonstrando os próprios estados do componente. Intencional. Nenhum caso equivalente fora de `design-system/` nos 246. |

**Nenhum outro dado fictício encontrado.** As etapas 4 e 5 não produziram hits reais fora do que está na tabela: as ~35 ocorrências de `TODO` foram todas a palavra portuguesa "Todos/Todo" em labels de filtro (`Todos os tipos`, `Todos operadores`, `Todo período`) e o ícone `ListTodo` do lucide. Zero `FIXME`, zero `mock`/`dummy`/`sample`, zero "em breve"/"coming soon" nos 246 arquivos.

---

## Componentes íntegros (✅) — resumo agregado

**233 dos 246** não apresentaram órfandade, dado fictício nem fachada sob os oito filtros aplicados. Agrupados por evidência do que os torna íntegros:

- **48 primitivos de `src/components/ui/`** — ≥1 importador externo cada (contagens na seção agregada acima).
- **~67 arquivos de `src/components/design-system/`** — todos alcançados por `src/pages/DesignSystemPage.tsx:7-33+` ou `src/pages/CodeQualityDashboard.tsx:10-11`. Conteúdo é vitrine declarada; literais e `disabled` fixos são o objeto da demonstração, não afirmações sobre o sistema.
- **Widgets de dashboard** — todos ligados a hook de dados real, verificado import a import: `EnergyWidget.tsx:1,17` (`useEnergy`), `OccupancyChart.tsx:5,31` (`useOperatorDashboardData`), `SmartSequencingWidget.tsx:16,85` (`useSmartSequencingWithActions`), `ShiftHandoverWidget.tsx:1,15-16` (`useShiftHandovers`/`useShiftPendingTasks`), `CompactTimeline.tsx:5,11` (`useSchedulingData`), `LiveMachineStatusPanel.tsx:6,8,12-14` (5 hooks), `ActivityFeedWidget.tsx:5,50` (realtime Supabase).
- **Componentes de estatística** — todos puramente prop-driven, sem literal interno: `KnowledgeBaseStats.tsx:5,10`, `PendingQueueStats.tsx:4,14`, `OperatorsStats.tsx:5,12`, `AlertStatsGrid.tsx:7,20`, `ScanHistoryCharts.tsx:27,32`, `OperatorProductivityStatCard.tsx:3,12`, `StatsCard.tsx:10,180`, `MLPredictionCard.tsx:6`, `EfficiencyChart.tsx:7-16` (deriva de `OperatorProductivityMetrics`, inclusive com empty state honesto em `:18-32`).
- **Settings** — delegam persistência a contexto/hook em vez de fingir: `TransitionsSettings.tsx:22` (`useTransitionConfig`), `AutoThemeToggle.tsx:6,15` (`useAutoTheme`), `SettingsAlertsTab.tsx:23,28,129` (recebe `onSave` do pai).
- **Infra transversal** — `NetworkStatusToaster.tsx:25-31` (listeners `online`/`offline` reais + checagem inicial de `navigator.onLine`), `FavoritesManager.tsx:25,45-46` (`localStorage` real com `try/catch` de quota), `KeyboardShortcuts.tsx:111,133` (listener real).
- **Restante de `calendar/`, `alerts/`, `abc/`, `jobs/`, `operator(s)/`, `qrcode/`, `shift/`, `navigation/`, `layout/`, `offline/`, `knowledge/`, `traceability/`, `logistics/`, `mobile/`, `onboarding/`, `kanban/`, `icons/`, `inventory/`, `planning/`, `ml/`, `accessibility/`** — importador confirmado e nenhum hit nas etapas 4–7.

---

## Limitações

1. **Runtime = NAO_VERIFICADO.** Nada foi executado: sem `npm run dev`, sem `npm run test`, sem banco, sem produção. Toda afirmação é sobre o texto do código.
2. **"Tem importador" ≠ "é alcançável pelo usuário".** A cadeia foi seguida até a página que importa (ex.: `DesignSystemPage`), não até confirmar que a rota está registrada, liberada por RBAC e renderizada. Um componente pode ter importador e ainda assim estar atrás de uma flag ou branch morto.
3. **Detecção de órfão por `grep` textual.** Imports totalmente dinâmicos (`import(\`@/components/${nome}\`)`) ou reexportações por glob escapariam. Não foram encontrados padrões desse tipo nos 246, mas a busca é sintática, não semântica — não houve análise de AST nem `ts-prune`/`knip`.
4. **A verificação foi em altitude por desenho.** 234 dos 246 arquivos não foram lidos linha a linha; foram submetidos a oito filtros automáticos. Uma fachada que não use `Math.random`, marcadores textuais, `onClick` vazio, `disabled` literal nem o padrão "toast sem efeito" pode ter passado — por exemplo, um cálculo sutilmente errado sobre dado real.
5. **Escopo fechado nos 246.** Arquivos de `src/components/` já citados em lotes anteriores não foram reauditados; divergências entre este lote e os anteriores não foram reconciliadas.
6. **Contagens de importador** vêm de `grep -rl` sobre `src/` e `tests/`; não incluem `supabase/functions/**` (Deno, escopo de outro lote) nem `scripts/`.

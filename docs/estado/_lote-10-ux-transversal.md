# Lote 10 — UX Transversal, Rotas, Offline/PWA e i18n

> Auditoria estática do repositório `/home/user/fast-grava-es-v2` (SPA Vite + React 18 + TS).
> **Sem acesso a runtime, banco ou produção.** Nenhuma afirmação aqui descreve comportamento observado em execução — tudo é derivado de leitura de código e grep. Comportamento em execução: **NAO_VERIFICADO**.
> Os arquivos `.md` do repositório (`CLAUDE.md`, `ANALISE_TECNICA_SISTEMA.md`) foram tratados como **hipótese**, não como fonte de verdade; divergências encontradas estão em "Achados relevantes".

## Cobertura

| Área do escopo | Arquivos inspecionados | Profundidade |
|---|---|---|
| Composição / entrada | `src/main.tsx`, `src/App.tsx`, `src/providers/AppProviders.tsx`, `src/providers/ProviderComposer.tsx` | linha a linha |
| Rotas | `src/routes/AppRoutes.tsx` (258 linhas, 57 `<Route>`) | linha a linha |
| Contexts | `src/contexts/*.tsx` (13 arquivos) | exports + consumidores por grep |
| Design system | `src/components/design-system/**` (72 arquivos, 7.080 linhas) | inventário de importadores (não linha a linha) |
| `src/components/ui/**` (shadcn) | — | **em altitude**, apenas onde há fio com providers (`error-boundary`, `celebration`, `toaster`, `sonner`, `tooltip`) |
| navigation / layout / loading / error / offline / accessibility / mobile / kiosk / onboarding / shortcuts / icons | todos os arquivos | exports + consumidores |
| Hooks | `src/hooks/**` (56 arquivos incluindo subpastas `abc/`, `shift-handover/`, `technical-sheets/`, `utils/`) | grep de cada símbolo exportado |
| lib transversal | `offlineStorage.ts`, `errorHandling.ts`, `logger.ts`, `sanitize.ts`, `validation.ts`, `envGuard.ts` | contagem de importadores |
| i18n / schemas / types / constants | `src/i18n/**`, `src/schemas/**`, `src/types/**`, `src/constants/**` | linha a linha (arquivos pequenos) |
| PWA / build | `vite.config.ts`, `index.html`, `public/sw.js`, `public/manifest.json`, `package.json` | linha a linha |

**Não coberto:** `src/features/**` (outros lotes), `supabase/**`, testes e2e, `src/components/ui/**` primitivo item a item.

---

## Mapa completo de rotas

Fonte única: `src/routes/AppRoutes.tsx`. `allowedRoles` ausente = **qualquer usuário autenticado**.
`AppRole` = `admin | manager | coordinator | operator` (`src/components/auth/ProtectedRoute.tsx:9-13`); **`role === 'admin'` faz bypass de todos os `allowedRoles`** (`src/components/auth/ProtectedRoute.tsx:89-91`) — por isso nenhuma rota lista `admin` explicitamente.

| Rota | Página | Roles | Status |
|---|---|---|---|
| `/auth` | `AuthPage` (`AppRoutes.tsx:170`) | público | ✅ |
| `/reset-password` | `ResetPasswordPage` (`AppRoutes.tsx:171`) | público | ✅ |
| `/design-system` | `DesignSystemPage` (`AppRoutes.tsx:172`) | **público (sem auth)** | 🟨 vitrine interna de 7k linhas exposta anonimamente |
| `/install` | `InstallAppPage` (`AppRoutes.tsx:173`) | público | 🟨 depende de manifest não linkado (ver achados) |
| `/track` | `PublicTrackingPage` (`AppRoutes.tsx:174`) | público | ✅ |
| `/` | `Index` (`AppRoutes.tsx:177`) | autenticado (qualquer) | ✅ |
| `/calendar/daily` | `DailyCalendar` (`AppRoutes.tsx:180`) | coordinator, manager | ✅ |
| `/calendar/weekly` | `WeeklyCalendar` (`AppRoutes.tsx:181`) | coordinator, manager | ✅ |
| `/calendar/monthly` | `MonthlyCalendar` (`AppRoutes.tsx:182`) | coordinator, manager | ✅ |
| `/pending` | `PendingQueue` (`AppRoutes.tsx:185`) | coordinator | ✅ |
| `/alerts` | `AlertsDashboard` (`AppRoutes.tsx:186`) | autenticado | ✅ |
| `/kanban` | `KanbanBoard` (`AppRoutes.tsx:187`) | coordinator, manager, operator | ✅ |
| `/new-job` | `NewJobPage` (`AppRoutes.tsx:188`) | coordinator, manager | ✅ |
| `/packaging` | `PackagingDashboard` (`AppRoutes.tsx:189`) | coordinator, manager, operator | ✅ |
| `/packaging/kiosk` | `PackagingKioskPage` (`AppRoutes.tsx:190`) | coordinator, manager, operator | ✅ |
| `/kpis` | `KPIDashboard` (`AppRoutes.tsx:193`) | coordinator, manager | ✅ |
| `/efficiency` | `EfficiencyDashboard` (`AppRoutes.tsx:194`) | coordinator, manager | ✅ |
| `/oee` | `OEEDashboard` (`AppRoutes.tsx:195`) | coordinator, manager | ✅ |
| `/spc` | `SPCDashboard` (`AppRoutes.tsx:196`) | coordinator, manager | ✅ |
| `/executive` | `ExecutiveDashboard` (`AppRoutes.tsx:197`) | manager, coordinator | ✅ |
| `/bi` | `BIDashboard` (`AppRoutes.tsx:198`) | manager, coordinator | ✅ |
| `/report-builder` | `ReportBuilderPage` (`AppRoutes.tsx:199`) | manager, coordinator | ✅ |
| `/abc-costing` | `ABCCostingDashboard` (`AppRoutes.tsx:202`) | coordinator, manager | ✅ |
| `/abc` | → `Navigate` p/ `/abc-costing` (`AppRoutes.tsx:203`) | — (alias) | ✅ |
| `/tpm` | `TPMDashboard` (`AppRoutes.tsx:206`) | coordinator, manager | ✅ |
| `/ml-predictions` | `MLPredictionsDashboard` (`AppRoutes.tsx:207`) | coordinator, manager | ✅ |
| `/digital-twin` | `DigitalTwin` (`AppRoutes.tsx:208`) | coordinator, manager | ✅ |
| `/operator` | `OperatorView` (`AppRoutes.tsx:211`) | autenticado | ✅ |
| `/operators` | `OperatorsPage` (`AppRoutes.tsx:212`) | coordinator, manager | ✅ |
| `/operator-productivity` | `OperatorProductivityPage` (`AppRoutes.tsx:213`) | coordinator, manager | ✅ |
| `/operator-history` | `OperatorHistoryPage` (`AppRoutes.tsx:214`) | coordinator, manager | ✅ |
| `/operators/productivity` | → `Navigate` p/ `/operator-productivity` (`AppRoutes.tsx:215`) | — (alias) | ✅ |
| `/machines` | `MachinesPage` (`AppRoutes.tsx:218`) | coordinator, manager | ✅ |
| `/machines/compare` | `MachineComparisonPage` (`AppRoutes.tsx:219`) | coordinator, manager | ✅ |
| `/energy` | `EnergyDashboard` (`AppRoutes.tsx:220`) | coordinator, manager | ✅ |
| `/inventory` | `InventoryPage` (`AppRoutes.tsx:221`) | coordinator, manager | ✅ |
| `/traceability` | `TraceabilityPage` (`AppRoutes.tsx:224`) | coordinator, manager | ✅ |
| `/logistics` | `LogisticsPage` (`AppRoutes.tsx:225`) | coordinator, manager | ✅ |
| `/assistant` | `TechnicalAssistantPage` (`AppRoutes.tsx:228`) | autenticado | ✅ |
| `/knowledge` | `TechnicalKnowledgeBase` (`AppRoutes.tsx:229`) | autenticado | ✅ |
| `/documents` | `DocumentsPage` (`AppRoutes.tsx:230`) | autenticado | ✅ |
| `/scanner` | `QRScannerPage` (`AppRoutes.tsx:233`) | autenticado | ✅ |
| `/shift-handover` | `ShiftHandoverPage` (`AppRoutes.tsx:234`) | autenticado | ✅ |
| `/gamification` | `GamificationPage` (`AppRoutes.tsx:235`) | autenticado | ✅ |
| `/notifications` | `NotificationsPage` (`AppRoutes.tsx:236`) | autenticado | ✅ |
| `/integrations/bitrix24` | `Bitrix24ConfigPage` (`AppRoutes.tsx:239`) | coordinator | ✅ |
| `/settings` | `SettingsPage` (`AppRoutes.tsx:240`) | coordinator, manager | ✅ |
| `/security` | `SecurityDashboard` (`AppRoutes.tsx:241`) | coordinator, manager | ✅ |
| `/audit` | `AuditTrailPage` (`AppRoutes.tsx:242`) | coordinator, manager | ✅ |
| `/master-api` | `MasterAPIPage` (`AppRoutes.tsx:243`) | coordinator, manager | ✅ |
| `/code-quality` | `CodeQualityDashboard` (`AppRoutes.tsx:244`) | coordinator, manager | ✅ |
| `/admin/telemetria` | `AdminTelemetriaPage` (`AppRoutes.tsx:245`) | coordinator, manager | ✅ |
| `/admin/monitoring` | `SystemMonitoringPage` (`AppRoutes.tsx:246`) | coordinator, manager | ✅ |
| `/status` | `SystemStatusPage` (`AppRoutes.tsx:247`) | autenticado | ✅ |
| `/simulation` | `SimulationDashboard` (`AppRoutes.tsx:248`) | coordinator, manager | ✅ |
| `/kiosk` | `KioskPage` (`AppRoutes.tsx:251`) | autenticado | ✅ |
| `*` | `NotFound` (`AppRoutes.tsx:254`) | público | ✅ |

**Total: 57 rotas** (55 páginas lazy + 2 aliases `Navigate`; o wildcard reusa `NotFound`).

### Presets de transição por rota

`ROUTE_TRANSITIONS` (`AppRoutes.tsx:92-97`) define `fade` para `/kiosk`, `/track`, `/auth`, `/reset-password`. Todas as demais caem no default de `PageTransition`. ✅

---

## Páginas órfãs e rotas quebradas

### Páginas órfãs (arquivo em `src/pages/` sem rota)
**Nenhuma.** Verificação:
```
ls src/pages/*.tsx | grep -v '\.test\.' → 55 arquivos
grep -oP 'lazy\(\(\) => import\("@/pages/\K[^"]+' src/routes/AppRoutes.tsx | sort -u → 55 módulos
comm -23 pages routed → vazio
comm -13 pages routed → vazio
```

### Rotas quebradas (rota apontando para arquivo inexistente)
**Nenhuma.** Todos os 55 `lazy(() => import("@/pages/X"))` resolvem para arquivo existente.

### Links de navegação apontando para rotas inexistentes — **2 encontrados**
| Origem | Alvo | Rota real | Efeito |
|---|---|---|---|
| `src/components/navigation/CommandPaletteCommands.tsx:47` — comando "Fila de Espera" | `/pending-queue` | `/pending` | cai no `*` → `NotFound` |
| `src/components/navigation/CommandPaletteCommands.tsx:65` — comando "Central de Ajuda" | `/knowledge-base` | `/knowledge` | cai no `*` → `NotFound` |

Todos os demais destinos de `SidebarNavData.tsx`, `MobileNavigation.tsx`, `MobileQuickActions.tsx` resolvem para rotas existentes.

### Rotas sem nenhum ponto de entrada na navegação (só acessíveis por URL direta)
`/abc-costing` (só via alias `/abc` no sidebar), `/admin/monitoring`, `/admin/telemetria`, `/digital-twin`, `/inventory`, `/kiosk`, `/master-api`, `/new-job` (existe em `MobileQuickActions` mas não no sidebar desktop), `/operator-productivity` (só via alias), `/packaging`, `/packaging/kiosk`, `/report-builder`, `/security` (só no command palette), `/simulation`, `/status`.
Comparação: `SidebarNavData.tsx` expõe 38 caminhos; existem 57 rotas.

### Páginas sem `MainLayout` (shell da aplicação) — 13 de 55
`AlertsDashboard`, `AuthPage`, `InstallAppPage`, `KioskPage`, `MLPredictionsDashboard`, `NotFound`, `OEEDashboard`, `PackagingDashboard`, `PackagingKioskPage`, `PublicTrackingPage`, `ResetPasswordPage`, `ShiftHandoverPage`, `SystemStatusPage`.
Para `/auth`, `/track`, `/kiosk`, `/install`, `*` isso é intencional; para `/alerts`, `/oee`, `/ml-predictions`, `/packaging`, `/packaging/kiosk`, `/shift-handover`, `/status` é **inconsistência de chrome** (sem sidebar, breadcrumbs, skip-links, banner offline, nav mobile).

---

## Inventário de funcionalidades transversais

### Composição / bootstrap

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| Guard de env obrigatório antes de qualquer import | ✅ | `src/lib/envGuard.ts:11-20`; importado 1º em `src/main.tsx:2` | Exige `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (confirma a divergência com `.env.example` citada no CLAUDE.md) |
| Sentry init condicional a DSN + PROD | ✅ | `src/main.tsx:19-30` | Sem DSN, `captureMessage` vira no-op |
| Web Vitals → Sentry (CLS/FID/LCP/TTFB/INP) | ✅ | `src/main.tsx:33-46` | Só reporta se `SENTRY_ENABLED` |
| Registro manual de Service Worker | 🟨 | `src/main.tsx:51-59` (`/sw.js`, só em PROD) | Registro existe; ver bloco PWA — falta `<link rel="manifest">` |
| `ProviderComposer` (reduceRight) | ✅ | `src/providers/ProviderComposer.tsx:10-18`; usado em `AppProviders.tsx:84` | — |
| Árvore de 21 providers | ✅ montada | `src/providers/AppProviders.tsx:57-79` | montada; **9 delas sem consumidor** (tabela abaixo) |
| `Observers` (NavigationListener + watchers autenticados) | ✅ | `src/providers/AppProviders.tsx:91-107`, `116` | — |
| `NavigationListener` (navegação via CustomEvent) | ✅ | `src/components/navigation/NavigationListener.tsx:12-30`; montado em `AppProviders.tsx:97` | — |
| `GlobalErrorBoundary` no topo | ✅ | `src/App.tsx:10`, `src/components/error/GlobalErrorBoundary.tsx` | Único arquivo em `components/error/` |
| `ErrorBoundary` genérico dentro de `AppProviders` | ✅ | `src/providers/AppProviders.tsx:18,112` (`@/components/ui/error-boundary`) | Boundary duplicado (Global + este) — redundante mas funcional |
| `SectionErrorBoundary` por seção | ✅ | `src/components/layout/MainLayout.tsx:11`; usado em 6+ páginas (`Index.tsx:18`, `OEEDashboard.tsx:61`, …) | — |
| React Query client central | ✅ | `src/lib/queryConfig.ts` via `AppProviders.tsx:37,39,113` | — |

### Rotas / navegação

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| Lazy loading de 100% das páginas | ✅ | `AppRoutes.tsx:21-75` | — |
| RBAC por rota via `ProtectedRoute` | ✅ | `AppRoutes.tsx:120`; `ProtectedRoute.tsx:43-118` | Bypass total para `admin` (`:89-91`) |
| Enforcement de MFA/AAL2 na rota | ✅ | `ProtectedRoute.tsx:83-86` | — |
| Toast de acesso negado + redirect por role | ✅ | `ProtectedRoute.tsx:15-36`, `104-113` | — |
| Skeletons por tipo de página (8 variantes) | ✅ | `AppRoutes.tsx:9-18`; `components/loading/SkeletonLibrary.tsx` | — |
| `PageTransition` + `AnimatePresence` | ✅ | `AppRoutes.tsx:121,142,167`; `components/layout/PageTransition.tsx:33` | Consome `useTransitionConfig` |
| Direção de transição por profundidade de path | ✅ | `AppRoutes.tsx:78-89,156-159` | — |
| Prefetch de rotas críticas + relacionadas | ✅ | `src/hooks/useRoutePrefetch.ts:5-36,45-60`; chamado em `AppRoutes.tsx:153` | — |
| Aliases de rota legada (`/abc`, `/operators/productivity`) | ✅ | `AppRoutes.tsx:203,215` | — |
| `Breadcrumbs` (derivado de `useLocation`) | ✅ | `components/navigation/Breadcrumbs.tsx:1,22-24`; montado `MainLayout.tsx:183` | **Não usa** `BreadcrumbContext` |
| `BackButton` | ✅ | `components/navigation/BackButton.tsx:54`; `MainLayout.tsx:178` | — |
| `TopProgressBar` | ✅ | `MainLayout.tsx:31,84` | — |
| `SwipeIndicator` | ✅ | `MainLayout.tsx:30,101` | — |
| `FavoritesManager` (FavoriteButton + FavoritesDropdown) | ✅ | usado em 10 páginas (`Index.tsx:21`, `KanbanBoard.tsx:27`, …) | — |
| `QuickFavoritesBar` | ✅ | `MainLayout.tsx:22,108` | — |
| Command Palette (Cmd+K) | 🟨 | `components/navigation/CommandPaletteAdvanced.tsx`; montado em `ProductDesignProvider.tsx:51` | 2 comandos apontam p/ rotas inexistentes (`CommandPaletteCommands.tsx:47,65`) |
| `useCommandEntities` (busca entidades no palette) | ✅ | `CommandPaletteAdvanced.tsx:22,82` | — |
| `GlobalSearch` / `CompactSearch` | ⬛ | `components/navigation/GlobalSearch.tsx:33,264` | `grep -rn "GlobalSearch\|CompactSearch" src` → só o próprio arquivo. Nenhum importador |
| `SearchContext` / `useSearchContext` | ⬛ | `src/contexts/SearchContext.tsx:14,34`; montado `AppProviders.tsx:64` | `grep "useSearchContext"` → 0 fora do arquivo. Provider monta estado que ninguém lê |
| `BreadcrumbContext` / `useBreadcrumbContext` | ⬛ | `src/contexts/BreadcrumbContext.tsx:18,43`; montado `AppProviders.tsx:61` | `grep "useBreadcrumbContext"` → 0. `Breadcrumbs.tsx` deriva da URL |
| `SidebarContext` / `useSidebarContext` | ⬛ | `src/contexts/SidebarContext.tsx:15,37`; montado `AppProviders.tsx:65` | `grep "useSidebarContext"` → 0. Sidebar usa estado próprio |

### Design system

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| Catálogo `/design-system` (30 seções + 5 demos de hooks) | ✅ | `src/pages/DesignSystemPage.tsx`; `components/design-system/sections/**` (72 arquivos, 7.080 linhas) | Todo arquivo do diretório tem ≥1 importador — **nenhum componente órfão** |
| Rota do design system pública | 🟨 | `AppRoutes.tsx:172` (`PublicPage`, sem `ProtectedRoute`) | Vitrine interna acessível sem login |
| `ProductDesignProvider` (onboarding+palette+shortcuts+toast+AI) | ✅ | `components/design-system/ProductDesignProvider.tsx:27-67`; montado `AppProviders.tsx:41-55,76` | `enableAIAssistant` **não é passado** em `AppProviders.tsx:47-51` → assume default `true` (`ProductDesignProvider.tsx:33`), montando `FloatingAIAssistant` global |
| shadcn/ui como camada primitiva | ✅ | `components.json`; `src/components/ui/**` | Auditado em altitude |
| `CelebrationProvider` (`ui/celebration`) | 🟨 | `src/components/ui/celebration.tsx:177`; montado `AppProviders.tsx:77` | `useCelebration` (`:165`), `AchievementBadge` (`:218`), `ProgressMilestone` (`:270`), `Confetti` (`:42`), `CelebrationToast` (`:107`) → **0 consumidores fora do arquivo** |
| `FeedbackProvider` (showSuccess/Error/…) | ⬛ | `components/feedback/FeedbackProvider.tsx:120`; montado `AppProviders.tsx:78` | `grep "useFeedback"` → 0 fora do arquivo. Provider renderiza `FeedbackToast` que nunca é acionado |
| `CelebrationMoment` / `MiniCelebration` | ⬛ | `components/feedback/CelebrationMoment.tsx:117,238,275` | `grep "CelebrationMoment\|MiniCelebration\|useCelebration"` → 0 importadores |
| `ResponsiveContainer` / `ResponsiveGrid` / `ResponsiveStack` / `HideOn` / `ShowOn` / `MobileOnly` / `DesktopOnly` / `TabletUp` | ⬛ | `components/layout/ResponsiveContainer.tsx:33,91,143,186,221,245,252,259` (265 linhas) | `grep "layout/ResponsiveContainer"` → 0 importadores. (O `ResponsiveContainer` que aparece no código é o do Recharts) |

### Loading

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `SkeletonLibrary` (23 skeletons, incl. 8 page-level) | ✅ | `components/loading/index.ts:5-27`; consumidos em `AppRoutes.tsx:9-18` | — |
| `ContentTransition` | ✅ | `components/loading/ContentTransition.tsx`; 5 consumidores | — |
| `StaggeredList` | ✅ | `components/loading/ContentTransition.tsx`; 4 consumidores | — |
| `FadeTransition` / `ScaleFade` / `SlideTransition` / `LoadingOverlay` | ⬛ | exportados em `components/loading/index.ts:41-48` | 0 consumidores fora do barrel |
| `LoadingSpinner.tsx` inteiro (`Spinner`, `DotsLoader`, `PulseLoader`, `ProgressLoader`, `PageLoader`, `InlineLoader`, `ButtonLoader`, `ShimmerSkeleton`, `AvatarSkeleton`, `TextSkeleton`) | ⬛ | `components/loading/index.ts:30-41` | `grep` de cada símbolo fora de `src/components/loading/` → **0 em todos** |

### Offline / PWA

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `vite-plugin-pwa` | ⬛ | declarado em `package.json:104`; **ausente de `vite.config.ts:29-41`** | Dependência instalada e nunca usada. CLAUDE.md afirma "PWA via vite-plugin-pwa" — **falso hoje** |
| Service Worker manual | 🟨 | `public/sw.js` (177 linhas); registrado em `src/main.tsx:51-59` | Cache `fast-grava-v2` de 4 assets estáticos (`sw.js:4-9`); não faz precache do bundle |
| `manifest.json` | 🟨 | `public/manifest.json` (74 linhas); referenciado em `public/sw.js:7` | **`index.html` não tem `<link rel="manifest">`** (grep "manifest" em `index.html` → 0). Sem isso o browser não descobre o manifest |
| Página `/install` + `beforeinstallprompt` | 🟨 | `src/pages/InstallAppPage.tsx:64-70` | Handler correto, mas o evento depende do manifest linkado (acima) |
| `offline.html` de fallback | ✅ | `public/offline.html` (54 linhas); usado em `public/sw.js:2,38-40` | — |
| Meta tags PWA (theme-color, apple-touch-icon, …) | ✅ | `index.html` (bloco "PWA Meta Tags") | — |
| **Subsistema offline #1** — `OfflineProvider` / `useOffline` | 🟨 | definido `src/hooks/useLocalStorage.ts:57-157`; montado em `src/main.tsx:15,63` | **Continua montado** — a nota `// OfflineProvider removed (redundant)` em `AppProviders.tsx:17` só significa que saiu de `AppProviders`, não do app. `syncNow` é um stub que **apenas loga erro** (`useLocalStorage.ts:110-118`); `addPendingAction` (`:135`) não tem chamador. Consumido só por `OfflineBanner` (`:170`) e `ConnectionStatus` (`:212`), ambos usados em `src/pages/Index.tsx:208,244` |
| **Subsistema offline #2** — `OfflineSyncProvider` / `useOfflineSync` | 🟨 | provider `src/contexts/OfflineSyncContext.tsx:12-37`; montado `AppProviders.tsx:71`; hook `src/hooks/useOfflineSync.ts` (646 linhas) | **Fio quebrado:** `useOfflineSyncContext` (`OfflineSyncContext.tsx:39`) tem **0 consumidores**. Os 4 consumidores reais (`components/qrcode/QRScanner.tsx:34`, `offline/OfflineStatusBanner.tsx:37`, `offline/OfflineSyncIndicator.tsx:38`, `offline/OfflineReadyIndicator.tsx:36`) chamam `useOfflineSync()` **direto**, criando instâncias independentes. O provider só serve para rodar `cacheData()` a cada 5 min (`OfflineSyncContext.tsx:19-29`) |
| **Subsistema offline #3** — `NetworkStatusProvider` / `useNetworkStatus` | ✅ | `src/hooks/useNetworkStatus.tsx:34,52`; montado `AppProviders.tsx:72`; consumido por `NetworkStatusIndicator` (`:196`) em `MainLayout.tsx:117,145` | Única das três com provider→consumer efetivamente ligado |
| **Veredito sobre a redundância alegada** | — | ver 3 linhas acima | **A alegação da auditoria anterior é VERDADEIRA e continua verdadeira hoje.** Os 3 subsistemas coexistem; 2 estão montados em `AppProviders` e 1 em `main.tsx`. O código já reconhece o problema em `useLocalStorage.ts:81-88` (comentário sobre 2-3 toasts empilhados) |
| `lib/offlineStorage.ts` (IndexedDB + background sync) | ✅ | `src/lib/offlineStorage.ts` (298 linhas); 4 importadores (`useOfflineSync.ts:5`, `OfflineStatusBanner.tsx:18`, `OfflineReadyIndicator.tsx:21`, `features/auth/components/AuthProvider.tsx:10`) | — |
| `NetworkStatusToaster` | ✅ | `components/offline/NetworkStatusToaster.tsx`; montado `src/App.tsx:14` | — |
| `OfflineStatusBanner` | ✅ | `MainLayout.tsx:7,99` | — |
| `OfflineReadyIndicator` | ✅ | `MainLayout.tsx:23,120,148` | — |
| `OfflineSyncIndicator` | ✅ | `src/pages/OperatorView.tsx:26,106` | Usado em 1 página só |
| `OfflineOverlay` / `NetworkStatusIcon` | ⬛ | `src/hooks/useNetworkStatus.tsx:278,340` | `grep` fora do arquivo → 0 |

### Acessibilidade

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `AccessibilityProvider` (live regions polite/assertive) | 🟨 | `components/accessibility/AccessibilityProvider.tsx:22-57`; montado `src/main.tsx:14,62` | Provider montado, mas `useLiveAnnounce` (`:9`) tem **0 consumidores** → nenhum anúncio é emitido |
| `SkipLinks` (3 links de atalho) | ✅ | `components/accessibility/index.tsx:22`; montado `MainLayout.tsx:8,82` | Aponta para `#main-content`, `#main-navigation`, `#search-input` |
| `MainContent` (landmark com `tabIndex=-1`) | ✅ | `components/accessibility/index.tsx:64`; `MainLayout.tsx:165,208` | — |
| `LiveRegion` (componente) | ⬛ | `components/accessibility/index.tsx:83` | 0 importadores |
| `FocusTrap` | ⬛ | `components/accessibility/FocusTrap.tsx:11` | `grep "FocusTrap"` → 0 fora do arquivo. (O hook `use-focus-trap.tsx` é usado, mas por `AppSidebar.tsx:27` — arquivo diferente) |
| `AccessibleIconButton` / `VisuallyHidden` | ⬛ | `components/accessibility/AccessibleIconButton.tsx:19,9` | 0 importadores |
| `usePrefersReducedMotion` (accessibility/hooks.ts) | ⬛ | `components/accessibility/hooks.ts:3` | 0 importadores — existe **duplicata viva** em `src/hooks/use-device.tsx:198` |
| `useKeyboardNavigation` / `useAnnounce` (accessibility/hooks.ts) | ⬛ | `components/accessibility/hooks.ts:25,51` | 0 importadores |
| Testes a11y (axe) no e2e | 🟦 | `tests/e2e/` (fora do escopo deste lote) | Declarado no CLAUDE.md; não verificado aqui |

### i18n

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| Init i18next + LanguageDetector | ✅ | `src/i18n/index.ts:36-70`; importado `src/main.tsx:11` | `lng: 'pt-BR'`, detecção `localStorage → navigator → htmlTag`, chave `fastgrava-language` |
| **3 locales** | ✅ | `src/i18n/locales/pt-BR.json` (463 linhas), `en-US.json` (462), `es-ES.json` (394) | Registrados com 6 aliases (`pt`,`pt-BR`,`en`,`en-US`,`es`,`es-ES`) em `i18n/index.ts:10-28` |
| **Contagem de chaves-folha** | 🟨 | pt-BR **389**, en-US **388**, es-ES **330** | es-ES está **59 chaves atrás** do pt-BR; en-US 1 chave atrás → traduções incompletas |
| `LanguageSwitcher` na UI | ✅ | `components/layout/LanguageSwitcher.tsx`; montado em `AppSidebar.tsx:28,240` e `pages/AuthPage.tsx:22,229` | — |
| **Cobertura real de `t()`** | 🟨 | `grep -rl "useTranslation" src` → **31 arquivos** de **620 `.tsx`** (≈5%) | O resto da UI é **português hardcoded**. Amostra: `pages/ABCCostingDashboard.tsx:89` `>Orçamento Mensal<`, `:105` `>Custo Alocado<`, `:121` `>Custo Unitário Médio<`; `pages/AdminTelemetriaPage.tsx:348` `>Total Queries<`, `:481` `>Nenhum dado de performance capturado ainda.<`; `pages/AuditTrailPage.tsx:97` `>Total de Eventos (Período)<`; `pages/AlertsDashboard.tsx:115` `>Monitoramento de jobs atrasados…<`. Só em `src/pages/*.tsx` há 79 ocorrências de literais como `Nenhum/Carregando/Salvar/Cancelar/Filtros/Buscar/Atualizar`. **Trocar de idioma altera ~5% da interface** |
| `TranslationKey` type | 🟨 | `src/i18n/index.ts:76` | `keyof typeof ptBR.common \| …dashboard \| …jobs` — tipo derivado, mas nenhum consumidor faz `grep` positivo |
| `react.useSuspense: false` | ✅ | `src/i18n/index.ts:63-65` | — |

### Mobile / quiosque / gestos

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `MobileNavigation` (bottom nav) | ✅ | `MainLayout.tsx:24,217` | Usa `useTranslation` (um dos 31) |
| `MobileQuickActions` (FAB) | ✅ | `MainLayout.tsx:25,224` | — |
| `MobileHeader` | ✅ | `pages/InstallAppPage.tsx:115`, `pages/NotFound.tsx:78` | Só 2 consumidores |
| `SwipeActions` (swipe em cards) | ✅ | `components/mobile/SwipeActions.tsx:22`; usado em `operator/OperatorReadyJobCard.tsx:22`, `operator/OperatorProductionCard.tsx:23` | — |
| `SwipeActionPresets` | ⬛ | `components/mobile/SwipeActions.tsx:131` | 0 consumidores |
| `PullToRefresh` / `MobilePullToRefresh` | ⬛ | `components/mobile/PullToRefresh.tsx:13,151` | 0 importadores. O hook `use-pull-to-refresh.tsx` é importado **apenas** por este componente morto (`PullToRefresh.tsx:4`) → par morto |
| `use-swipe-gesture` | ✅ | 3 importadores | — |
| `use-haptic-feedback` | ✅ | 10 importadores | — |
| `use-device` / `useDeviceDetection` | ✅ | 13 / 6 consumidores | — |
| `use-scroll-direction` | ✅ | `components/navigation/MobileNavigation.tsx:31` | — |
| `KioskMode` | ✅ | `components/kiosk/KioskMode.tsx:54`; usado em `pages/KioskPage.tsx:3,155` | — |
| `KioskModeButton` | ⬛ | `components/kiosk/KioskMode.tsx:383` | 0 consumidores |

### Onboarding / atalhos

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `OnboardingTour` + `useOnboarding` | ✅ | `components/onboarding/OnboardingTour.tsx`; montado `ProductDesignProvider.tsx:2,43-48` | — |
| `SystemOnboarding` | ✅ | `MainLayout.tsx:27,239`; `restartOnboarding` consumido em `settings/SettingsGeneralTab.tsx:8` | — |
| `KeyboardShortcutsProvider` (atalhos vim-like) | 🟨 | `components/shortcuts/KeyboardShortcuts.tsx:36`; montado `ProductDesignProvider.tsx:63` | Atalhos default funcionam via listener próprio (`:133-134`). Mas a API pública do contexto — `useKeyboardShortcuts` (`:28`), `registerShortcut`, `unregisterShortcut` — tem **0 consumidores** → nenhuma página registra atalhos próprios |
| `useCalendarHotkeys` | ✅ | 6 consumidores | — |
| `use-navigation-hotkeys` | ✅ | `MainLayout.tsx:37` | — |
| `ToastContainer` (toast com undo) | ✅ | `ProductDesignProvider.tsx:5,54` | — |
| Toasters globais (`Toaster` shadcn + `Sonner`) | ✅ | `src/App.tsx:12,13` | Dois sistemas de toast coexistindo |

### Tema / preferências

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `next-themes` com `defaultTheme="dark"` | ✅ | `AppProviders.tsx:83` | — |
| `ThemeToggle` + som de troca de tema | ✅ | `components/layout/ThemeToggle.tsx:47` (`useThemeSound`) | — |
| `useAutoTheme` (tema automático por horário) | ✅ | consumido por `components/settings/AutoThemeToggle.tsx:15` | — |
| `ThemeContext` / `useThemeContext` (wrapper de next-themes) | ⬛ | `src/contexts/ThemeContext.tsx:14,32`; montado `AppProviders.tsx:58` | `grep "useThemeContext"` → 0. Wrapper redundante que ainda assina `useNextTheme()` no topo da árvore |
| `UserPreferencesContext` / `useUserPreferences` | ⬛ | `src/contexts/UserPreferencesContext.tsx:31,66`; montado `AppProviders.tsx:60` | 0 consumidores |
| `TransitionConfigContext` / `useTransitionConfig` | ✅ | `src/contexts/TransitionConfigContext.tsx:27,67`; consumido `PageTransition.tsx:33` e `settings/TransitionsSettings.tsx:29` | — |
| `FeatureFlagsContext` / `useFeatureFlags` | ✅ | `src/contexts/FeatureFlagsContext.tsx:25,50`; 2 consumidores | — |
| `settingsSchema` (Zod de preferências) | ⬛ | `src/schemas/settingsSchema.ts:3-12` | `grep "settingsSchema\|SettingsData"` → 0 fora de `src/schemas/` |

### Outros contexts globais

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `NotificationsContext` / `useNotificationsContext` | ✅ | `src/contexts/NotificationsContext.tsx:25,66`; 8 consumidores | — |
| `ConfirmationContext` / `useConfirmation` | ✅ | `src/contexts/ConfirmationContext.tsx:20,52`; 2 consumidores | — |
| `PermissionsContext` / `usePermissionsContext` | ⬛ | `src/contexts/PermissionsContext.tsx:8,19`; montado `AppProviders.tsx:70` | 0 consumidores. RBAC real acontece por `useRolePermissions`/`useAuth` diretos |
| `ReauthContext` / `useReauth` / `withReauth` | ⬛ | `src/contexts/ReauthContext.tsx:43,211,220`; montado `AppProviders.tsx:69` | `grep "useReauth"` → 0; `grep "withReauth"` → 0 fora do arquivo |
| `WebSocketContext` / `useWebSocketContext` | ⬛ | `src/contexts/WebSocketContext.tsx:25,101`; montado `AppProviders.tsx:73` | 0 consumidores. Provider **roda 2 `setInterval`** (30s e 5s, `:38-46,49-58`) e um canal de presença permanentemente, alimentando estado que ninguém lê |

### lib transversal

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `lib/logger.ts` | ✅ | ~59 importadores | — |
| `lib/errorHandling.ts` | ✅ | ~62 importadores | — |
| `lib/sanitize.ts` | ✅ | ~14 importadores | — |
| `lib/offlineStorage.ts` | ✅ | 4 importadores | — |
| `lib/validation.ts` (`safeParse`, `safeParseArray`) | ⬛ | `grep "lib/validation"` → único importador é `src/test/validation.test.ts:3` | Testado mas nunca usado em código de produção |
| `lib/envGuard.ts` | ✅ | `src/main.tsx:2` | — |
| `lib/transitions.ts` (`TransitionPreset`) | ✅ | `AppRoutes.tsx:7` | — |
| `lib/navigation.ts` (`NAVIGATION_EVENT`) | ✅ | `NavigationListener.tsx:3` | — |

### types / constants / schemas

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `src/types/job.ts` | ✅ | 6 importadores diretos de `@/types/job` | — |
| `src/types/scheduling.ts` | ✅ | 13 importadores | — |
| `src/types/recharts-lib.d.ts` | ✅ | declaração de tipo (ambient) | — |
| `src/constants/biConstants.ts` | ✅ | `features/analytics/components/bi/FuturisticBI.tsx:32`, `pages/BIDashboard.tsx:45` | — |
| `src/constants/index.ts` (`JOB_STATUSES`, etc., 104 linhas) | ⬛ | `grep "@/constants"` → só `@/constants/biConstants`; `grep "JOB_STATUSES"` → 0 fora do arquivo | Barrel de constantes canônicas nunca importado |
| `src/schemas/index.ts` (barrel de 7 schemas) | ⬛ | `grep "@/schemas"` → 0 | Barrel morto; os schemas reais são importados direto de `features/*/types/*.schema` |

### Build / PWA / HTML

| Funcionalidade | Classificação | Evidência | O que falta / observação |
|---|---|---|---|
| `manualChunks` com 18 grupos de vendor | ✅ | `vite.config.ts:59-135` | Comentário explícito sobre TDZ em recharts (`:76-78`) |
| Headers de segurança em dev/preview | ✅ | `vite.config.ts:8-15,19-26` | Só dev/preview; produção depende de `public/_headers` |
| CSP via `<meta http-equiv>` | 🟨 | `index.html` (bloco "Security Headers") | `'unsafe-inline'` + `'unsafe-eval'` em `script-src`, com justificativa inline |
| `rollup-plugin-visualizer` em PROD | ✅ | `vite.config.ts:33-40` | Gera `dist/bundle-report.html` |
| `componentTagger` (Lovable) em dev | ✅ | `vite.config.ts:31` | — |
| Drop de `console.log/debug/info` em PROD | ✅ | `vite.config.ts:44-48` | — |
| `<link rel="manifest">` | ⬛ ausente | `index.html` — grep "manifest" → 0 ocorrências | Ver bloco PWA |
| Preconnect Supabase | 🟨 | `index.html` — preconnect/dns-prefetch para `whnnzdreuwxczxelvqjh.supabase.co` | Host **hardcoded** no HTML; o CSP usa wildcard `https://*.supabase.co`. Se o projeto ativo for outro, o preconnect é inútil (não verificável sem runtime) |
| `<html lang="pt-BR">` fixo | 🟨 | `index.html:2` | Não acompanha a troca de idioma do i18next |
| Atributo `data-migrate-deploy` no `<body>` | 🟦 | `index.html` (`<body data-migrate-deploy="Faça deploy da edge function migrate-helper…">`) | Bilhete de TODO deixado no HTML de produção |

---

## Hooks e componentes sem consumidor

### Hooks 100% mortos (0 consumidores em todo o `src/`)

| Hook | Evidência | Grep executado |
|---|---|---|
| `useBulkActions` (172 linhas) | `src/hooks/useBulkActions.ts:17` | `grep -rn "\buseBulkActions\b" src` → só a definição |
| `useDirtyStateGuard` (22 linhas) | `src/hooks/use-dirty-state-guard.ts:9` | `grep -rn "\buseDirtyStateGuard\b" src` → só a definição |
| `useClickOutside` | `src/hooks/useClickOutside.ts:6` | `grep` → definição + reexport no barrel morto `src/hooks/utils/index.ts:4` |
| `useMediaQuery` | `src/hooks/useMediaQuery.ts:11` | `grep` → definição + `src/hooks/utils/index.ts:5` |
| `useInfiniteScroll` | `src/hooks/useInfiniteScroll.ts:22` | `grep` → definição + `src/hooks/utils/index.ts:6` |
| `useThrottle` / `useThrottleCallback` | `src/hooks/useThrottle.ts:6` | `grep` → definição + `src/hooks/utils/index.ts:2` + comentário em `useDebounce.ts:125-126` |

### Barrel morto
`src/hooks/utils/index.ts` (6 reexports) — `grep -rn "hooks/utils'" src` e `grep -rn 'hooks/utils"' src` → **0 importadores**. É o único "consumidor" de 4 dos hooks acima, portanto não os salva.
(`src/hooks/utils/focus.ts` e `src/hooks/utils/inventoryExport.ts` **são** usados: `components/accessibility/FocusTrap.tsx:2` — mas o próprio `FocusTrap` é morto — e `pages/InventoryPage.tsx:471`.)

### Hooks vivos apenas via re-export (não são mortos)
`src/hooks/abc/*` (`useABCData`, `useABCMutations`, `useABCCalculations`) → alcançados por `src/hooks/useABCCosts.ts:4`.
`src/hooks/shift-handover/*` → alcançados por `src/hooks/useShiftHandover.ts:3-24`.
`src/hooks/technical-sheets/*` → alcançados por `src/hooks/useTechnicalSheets.ts:2-18`.

### Componentes 100% mortos (arquivo inteiro sem importador)

| Arquivo | Exports mortos | Grep |
|---|---|---|
| `src/components/navigation/GlobalSearch.tsx` | `GlobalSearch:33`, `CompactSearch:264` | `grep -rn "GlobalSearch\|CompactSearch" src` → só o arquivo |
| `src/components/mobile/PullToRefresh.tsx` | `PullToRefresh:13`, `MobilePullToRefresh:151` | `grep -rn "PullToRefresh" src` → arquivo + o hook que ele importa |
| `src/components/accessibility/FocusTrap.tsx` | `FocusTrap:11` | `grep -rn "\bFocusTrap\b" src` → só o arquivo |
| `src/components/accessibility/AccessibleIconButton.tsx` | `VisuallyHidden:9`, `AccessibleIconButton:19` | `grep` → só o arquivo |
| `src/components/accessibility/hooks.ts` | `usePrefersReducedMotion:3`, `useKeyboardNavigation:25`, `useAnnounce:51` | `grep` fora de `components/accessibility/` → 0 |
| `src/components/layout/ResponsiveContainer.tsx` (265 linhas) | 8 exports (`:33,91,143,186,221,245,252,259`) | `grep -rn "layout/ResponsiveContainer" src` → 0 |
| `src/components/feedback/CelebrationMoment.tsx` | `CelebrationMoment:117`, `useCelebration:238`, `MiniCelebration:275` | `grep` → só o arquivo |
| `src/components/loading/LoadingSpinner.tsx` | 10 exports (via barrel `loading/index.ts:30-41`) | `grep` de cada símbolo fora de `src/components/loading/` → 0 em todos |
| `src/schemas/index.ts` + `src/schemas/settingsSchema.ts` | barrel + `settingsSchema` | `grep -rn "@/schemas" src` → 0 |
| `src/constants/index.ts` (104 linhas) | `JOB_STATUSES` e demais | `grep -rn "JOB_STATUSES" src` fora do arquivo → 0 |
| `src/lib/validation.ts` | `safeParse`, `safeParseArray` | único importador é `src/test/validation.test.ts:3` |

### Exports parciais mortos (arquivo vivo, export sem consumidor)

| Export | Evidência |
|---|---|
| `KioskModeButton` | `components/kiosk/KioskMode.tsx:383` — 0 consumidores (o `KioskMode:54` é usado) |
| `SwipeActionPresets` | `components/mobile/SwipeActions.tsx:131` — 0 consumidores |
| `OfflineOverlay`, `NetworkStatusIcon` | `hooks/useNetworkStatus.tsx:278,340` — 0 consumidores |
| `FadeTransition`, `ScaleFade`, `SlideTransition`, `LoadingOverlay` | `components/loading/ContentTransition.tsx` via `loading/index.ts:41-48` — 0 |
| `Confetti`, `CelebrationToast`, `useCelebration`, `AchievementBadge`, `ProgressMilestone` | `components/ui/celebration.tsx:42,107,165,218,270` — 0 |
| `LiveRegion` | `components/accessibility/index.tsx:83` — 0 |
| `useLiveAnnounce` | `components/accessibility/AccessibilityProvider.tsx:9` — 0 |
| `useKeyboardShortcuts`, `registerShortcut`, `unregisterShortcut` | `components/shortcuts/KeyboardShortcuts.tsx:28,23,24` — 0 |
| `useFeedback` | `components/feedback/FeedbackProvider.tsx:108` — 0 |

### Providers montados sem nenhum consumidor do seu contexto (9)

Todos em `src/providers/AppProviders.tsx:57-79` (exceto onde indicado):

| Provider | Linha de montagem | Hook | Consumidores |
|---|---|---|---|
| `BreadcrumbProvider` | `:61` | `useBreadcrumbContext` | 0 |
| `SearchProvider` | `:64` | `useSearchContext` | 0 |
| `SidebarProvider` | `:65` | `useSidebarContext` | 0 |
| `ThemeContextProvider` | `:58` | `useThemeContext` | 0 |
| `UserPreferencesProvider` | `:60` | `useUserPreferences` | 0 |
| `ReauthProvider` | `:69` | `useReauth` / `withReauth` | 0 |
| `PermissionsProvider` | `:70` | `usePermissionsContext` | 0 |
| `WebSocketProvider` | `:73` | `useWebSocketContext` | 0 — **e roda 2 intervals + canal de presença** (`WebSocketContext.tsx:38-58`) |
| `FeedbackProvider` | `:78` | `useFeedback` | 0 |
| `CelebrationProvider` | `:77` | `useCelebration` | 0 (do `ui/celebration.tsx:165`) |
| `OfflineSyncProvider` | `:71` | `useOfflineSyncContext` | 0 (mas o provider faz trabalho útil: `cacheData` periódico) |

### Componentes do design system sem importador
**Nenhum.** Varredura de 72 arquivos em `src/components/design-system/**`: todos têm ≥1 importador (as `sections/*` são importadas por `src/pages/DesignSystemPage.tsx`, as `sections/*/*` pelas seções-pai, `ProductDesignProvider` por `AppProviders.tsx:13`).
Ressalva: a cadeia inteira (7.080 linhas) pende de uma única rota **pública**, `/design-system` (`AppRoutes.tsx:172`).

---

## Achados relevantes

1. **`vite-plugin-pwa` está no `package.json:104` e ausente de `vite.config.ts`.** O CLAUDE.md afirma "PWA via `vite-plugin-pwa`" — isso **não é verdade no código atual**. O PWA é 100% manual: `public/sw.js` + registro em `src/main.tsx:51-59`.

2. **`index.html` não referencia `public/manifest.json`.** Sem `<link rel="manifest">`, navegadores não descobrem o manifest, o que compromete `beforeinstallprompt` — exatamente o evento que `src/pages/InstallAppPage.tsx:64` escuta. A rota `/install` existe, o handler existe, o manifest existe (74 linhas) — só falta a tag. **Impacto em runtime: NAO_VERIFICADO**, mas o fio está quebrado estaticamente.

3. **A redundância de 3 subsistemas offline alegada pela auditoria anterior CONFIRMA-SE hoje.** `OfflineProvider` (`main.tsx:63`), `OfflineSyncProvider` (`AppProviders.tsx:71`) e `NetworkStatusProvider` (`AppProviders.tsx:72`) coexistem. O comentário `// OfflineProvider removed (redundant)` em `AppProviders.tsx:17` é **enganoso**: o provider foi movido para `main.tsx`, não removido. O próprio código admite o problema em `useLocalStorage.ts:81-88`.

4. **`OfflineSyncProvider` é um fio quebrado.** `useOfflineSyncContext` tem 0 consumidores; os 4 componentes offline chamam `useOfflineSync()` direto, cada um com sua própria fila/estado. O provider serve apenas como agendador de `cacheData()`.

5. **9 providers globais montados sem nenhum leitor** — `Breadcrumb`, `Search`, `Sidebar`, `Theme`, `UserPreferences`, `Reauth`, `Permissions`, `WebSocket`, `Feedback` (+`Celebration`). `WebSocketProvider` é o mais custoso: mantém 2 `setInterval` e um canal de presença Supabase permanentemente para um estado que ninguém consulta (`WebSocketContext.tsx:38-58`).

6. **2 comandos do Command Palette apontam para rotas inexistentes:** `/pending-queue` (`CommandPaletteCommands.tsx:47`) e `/knowledge-base` (`CommandPaletteCommands.tsx:65`). As rotas reais são `/pending` e `/knowledge`. Ambos caem no wildcard `NotFound`.

7. **i18n é uma casca.** 3 locales, 389 chaves em pt-BR, mas apenas **31 de 620 arquivos `.tsx` (≈5%)** usam `useTranslation`. O restante é português hardcoded em JSX. Além disso es-ES tem 330 chaves contra 389 do pt-BR (**59 faltando**) e `index.html:2` fixa `lang="pt-BR"` sem sincronizar com a troca de idioma.

8. **A rota `/design-system` é pública** (`AppRoutes.tsx:172` usa `PublicPage`, não `ProtectedPage`), expondo o catálogo interno de 7.080 linhas — incluindo `CodeQualityPerformanceTab`/`CodeQualityTestsTab` — sem autenticação.

9. **API de atalhos de teclado nunca foi adotada.** `KeyboardShortcutsProvider` funciona para os atalhos default (listener em `KeyboardShortcuts.tsx:133`), mas `registerShortcut`/`unregisterShortcut`/`useKeyboardShortcuts` têm 0 consumidores — nenhuma página registra atalhos contextuais.

10. **`AccessibilityProvider` está montado mas é mudo.** `useLiveAnnounce` (`AccessibilityProvider.tsx:9`) tem 0 consumidores, então as duas live regions (`:48-53`) nunca recebem mensagem. Metade de `components/accessibility/` (`FocusTrap`, `AccessibleIconButton`, `hooks.ts`, `LiveRegion`) está morta.

11. **`enableAIAssistant` não é passado em `AppProviders.tsx:47-51`**, então o default `true` (`ProductDesignProvider.tsx:33`) monta `FloatingAIAssistant` em toda a aplicação — provavelmente não intencional, dado que as outras 4 flags são explicitadas.

12. **13 de 55 páginas não usam `MainLayout`**, e para 7 delas (`/alerts`, `/oee`, `/ml-predictions`, `/packaging`, `/packaging/kiosk`, `/shift-handover`, `/status`) isso parece não-intencional: essas páginas perdem sidebar, breadcrumbs, skip-links, banner offline e navegação mobile.

13. **Barrels canônicos mortos:** `src/constants/index.ts` (104 linhas de `JOB_STATUSES` etc.), `src/schemas/index.ts`, `src/hooks/utils/index.ts`. Cada um define a "forma correta" de importar algo que ninguém importa assim — sinal de refatoração abandonada no meio.

14. **`src/lib/validation.ts` só é exercitado pelo seu próprio teste** (`src/test/validation.test.ts:3`). Cobertura de teste sem uso em produção.

15. **`index.html` carrega um bilhete de TODO em produção**: `<body data-migrate-deploy="Faça deploy da edge function migrate-helper com verify_jwt = false no supabase/config.toml">`, e faz `preconnect`/`dns-prefetch` para um host Supabase hardcoded (`whnnzdreuwxczxelvqjh.supabase.co`) que pode não ser o projeto ativo.

16. **Nota positiva:** o mapa de rotas está **íntegro** — 55 páginas, 55 rotas, zero órfãs, zero quebradas, zero duplicatas. Aliases legados (`/abc`, `/operators/productivity`) estão corretamente implementados como `Navigate replace`. O RBAC por rota é consistente e o bypass de `admin` é explícito e documentado no código.

---

## Limitações

- **Sem runtime.** Nada aqui foi observado em execução. Toda conclusão sobre "não funciona" refere-se ao **fio estático quebrado** (ausência de importador/consumidor/tag), não a comportamento observado. Runtime: **NAO_VERIFICADO**.
- **Sem banco/produção.** Não foi possível verificar RLS, dados, sessões, ou se `/design-system` está de fato acessível na URL pública.
- **Detecção de "morto" por grep de símbolo.** Falsos negativos são possíveis para: acesso dinâmico (`obj['useX']`), reexports em cadeia não rastreados, uso exclusivo em testes e2e (`tests/e2e/**`, não varrido), ou referências em `supabase/functions/**`. Todos os greps usados estão citados nas linhas correspondentes.
- **`src/components/ui/**` (shadcn) foi tratado em altitude**, conforme instrução. Componentes primitivos individuais não foram auditados quanto a consumidores.
- **`src/features/**` fora do escopo** — quando um consumidor está em `features/`, ele foi contado, mas o conteúdo de `features/` não foi auditado.
- **Contagem de chaves i18n** feita por travessia recursiva de folhas do JSON; não valida se as chaves existentes são de fato usadas por algum `t()`.
- **A afirmação "7k linhas" do design system** foi verificada: 7.080 linhas em 72 arquivos.
- **Contagem de hooks:** o escopo cita "56 arquivos"; a varredura encontrou 56 arquivos `.ts/.tsx` em `src/hooks/**` incluindo subpastas e 1 arquivo de teste (`useOfflineSync.test.ts`), que foi excluído das análises de consumidor.

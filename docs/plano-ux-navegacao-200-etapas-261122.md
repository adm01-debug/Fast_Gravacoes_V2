# Plano de UX de Navegação e Transição entre Telas — 200 Etapas

- **Data**: 2026-11-22
- **Base**: `main` @ `75dc924` (branch de trabalho desta sessão: `claude/chore-plano-190-etapas-261122-1418`, que até aqui só adiciona `docs/plano-190-etapas-261122.md`)
- **Escopo**: navegação, botão Voltar, histórico, breadcrumbs, feedback visual, consistência de padrões, acessibilidade, fluxos multi-etapas, testes/métricas e integração com busca, modais e multi-aba
- **Propósito**: transformar a base de navegação **já existente** (`BackButton`, `useSmartBack`, `Breadcrumbs`, `DialogHistoryGuard`, `ScrollRestoration`, `useModalParam`, `DirtyFormContext`, `navTelemetry`) num padrão **adotado em todas as 58 rotas e nos 3 contextos de uso** (desktop, tablet/mobile, kiosk), fechando as lacunas de adoção, acessibilidade e medição.

## Aviso de calibragem (leia antes de executar)

O briefing que originou este plano descrevia o sistema como **sem botão Voltar global, sem breadcrumbs, sem ScrollRestoration e sem sincronização de modais com o histórico**. Isso **não corresponde** ao código em `main` @ `75dc924`. Verificado nesta sessão:

- O Voltar global **existe** e é renderizado no cabeçalho do layout: `src/components/layout/MainLayout.tsx:224-251` monta `<BackButton>` (228) e `<Breadcrumbs>` (233).
- `src/components/navigation/BackButton.tsx:33-105` já integra `useSmartBack`, `useDirtyGuard`, sentinela de dialog e telemetria.
- `src/hooks/use-smart-back.ts:16-46` já faz fallback de deep-link com `replace` e consome a sentinela do dialog.
- `src/hooks/use-modal-param.ts:24-103` já põe modais na URL (`?modal=`) com PUSH/REPLACE normalizados; `src/hooks/use-modal-param.test.tsx` cobre o caso.
- `src/components/navigation/ScrollRestoration.tsx:66-169` já restaura scroll em POP.
- `src/components/navigation/DialogHistoryGuard.tsx:1-19` já faz o back fechar dialog em vez de sair da página.
- `tests/e2e/navigation.spec.ts` já tem 9 testes de Voltar/breadcrumb/dirty-guard/deep-link; `tests/e2e/accessibility.spec.ts:7-18` já roda sweep axe-core por rota.

Portanto **as etapas abaixo não recriam o que existe**: elas atacam o que está de fato aberto — **adoção** (o `PageHeader` padrão existe e é usado em 1 de 58 páginas), **cobertura** (14 rotas sem título, kiosk e rotas públicas fora do padrão), **estado em URL** (5 arquivos usam `useSearchParams` contra 50 arquivos com `<Tabs>`), **estados de erro** (nenhum consumo de `isError` em UI), **acessibilidade** (`aria-current` ausente na sidebar, 2 `window.confirm`, ícones sem rótulo no kiosk) e **medição** (telemetria só emite breadcrumbs do Sentry em produção).

## Como usar

- **Uma etapa = uma PR.** Branch `claude/<tipo>-<slug>-<AAMMDD-HHMM>`; commit `<tipo>(<escopo>): <assunto>`.
- Prefixos: `feat:` (comportamento novo), `fix:` (defeito), `refactor:` (sem mudança de comportamento), `chore:` (config/infra fora de CI), `test:` (testes), `docs:` (documentação). Não existe `infra:` no commitlint.
- Etapas marcadas **[DONO]** envolvem workflow/CI, segredo, custo, arquitetura ou decisão de produto: a PR fica **aberta** e o dono é chamado (item 8 do Fluxo Git).
- Antes de cada PR: `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json`, `npm run lint`, e `npx vitest run <arquivo>` do que tocou.
- Etapas da mesma categoria que tocam o mesmo arquivo devem ir em ordem numérica, para não gerar conflito de PR.

## Diagnóstico do estado atual da navegação

**O que existe e funciona.** O cabeçalho global em `src/components/layout/MainLayout.tsx:224-251` entrega Voltar + breadcrumb em toda rota protegida que não seja `/`, `/auth`, `/reset-password`, `/install` ou `/track` (lista de exclusão em 224). O Voltar (`src/components/navigation/BackButton.tsx:47-66`) é o ponto de saída mais maduro do sistema: dispara háptico e som, registra telemetria (`trackNavBack`), checa a sentinela de dialog antes de confirmar descarte e só então chama `goBack()`. O `useSmartBack` (`src/hooks/use-smart-back.ts:27-43`) decide entre `navigate(-1)` e `navigate(fallbackTo, { replace: true })` com base em `internalDepth()` de `src/lib/navHistory.ts`, o que evita expulsar o usuário do app num deep-link. Os mesmos três cuidados (sentinela, dirty-guard, telemetria) estão replicados no swipe (`MainLayout.tsx:112-123`), nos atalhos (`src/hooks/use-navigation-hotkeys.ts:30-36,72-78`), no breadcrumb (`src/components/navigation/Breadcrumbs.tsx:112-116`) e no header mobile (`src/components/navigation/MobileNavigation.tsx:377-385`). Modais entram no histórico via `?modal=` (`src/hooks/use-modal-param.ts:35-64`) e dialogs comuns ganham sentinela (`src/components/navigation/DialogHistoryGuard.tsx:33-39`). O scroll volta ao lugar no POP (`src/components/navigation/ScrollRestoration.tsx:121-164`) e o foco vai para o `h1` depois da troca de rota (`MainLayout.tsx:75-109`).

**O que falta.** O padrão de cabeçalho de página existe (`src/components/layout/PageHeader.tsx:19-41`) e é usado em **uma** página — `src/pages/NewJobPage.tsx`; as outras 57 montam título à mão, e 10 páginas de produção **não têm `h1` nenhum** (`AuthPage`, `BIDashboard`, `DailyCalendar`, `KioskPage`, `MfaEnrollmentPage`, `MonthlyCalendar`, `ResetPasswordPage`, `TechnicalAssistantPage`, `WeeklyCalendar`, e `NewJobPage` só o tem via `PageHeader`), o que quebra o anúncio de foco de `MainLayout.tsx:98`. O `BreadcrumbContext` (`src/contexts/BreadcrumbContext.tsx:18-32`) está montado em `src/providers/AppProviders.tsx:80` e **nenhuma página alimenta `setItems`/`push`**: breadcrumb de registro (job, máquina, operador) nunca aparece. A sidebar não marca a página atual para leitor de tela — `src/components/layout/sidebar/NavButton.tsx:38-64` tem `aria-label` mas nenhum `aria-current`, que hoje só existe em `MobileNavigation.tsx:132`, `Breadcrumbs.tsx:270`, `ui/pagination.tsx:37`, `ui/stepper.tsx:38` e `NewJobPage.tsx:256`. Estado de tela não vive na URL: `useSearchParams` aparece em 5 arquivos (`use-modal-param.ts`, `InventoryPage`, `TechnicalKnowledgeBase`, `PublicTrackingPage`, `DailyCalendar`) contra **50 arquivos com `<Tabs>`**, dos quais só `InventoryPage` liga aba/filtro à URL — então Voltar perde aba e filtro em quase todo o app. Falha de query não tem tela: **nenhum componente consome `isError`** (os 4 hits de `isError` em `src/` são testes e `src/lib/errorHandling.ts:274`), e o `QueryClient` não tem `onError` global, então erro de rede vira lista vazia. Dois toasters coexistem (`src/App.tsx:12-13`). `TopProgressBar` (`src/components/navigation/TopProgressBar.tsx:14-18`) anima por um `setTimeout(500)` fixo, sem relação com o carregamento real. Faltam: `MotionConfig` (nenhum uso), View Transitions (`startViewTransition` não aparece), `BroadcastChannel` (nenhum uso — multi-aba não sincroniza nem logout), preferência de tamanho de fonte (`src/contexts/UserPreferencesContext.tsx:4-10` tem `compactMode`, não `fontSize`), e adoção de `src/components/ui/stepper.tsx` e `src/components/mobile/PullToRefresh.tsx`, ambos órfãos. No kiosk, a saída é um `ghost size="sm" opacity-50` (`src/pages/KioskPage.tsx:132`) e dois botões-ícone não têm rótulo (`src/components/kiosk/KioskMode.tsx:144,147`). 14 rotas não têm título em `src/hooks/usePageTitle.ts:10-52` (`/calendar/monthly`, `/packaging`, `/packaging/kiosk`, `/report-builder`, `/digital-twin`, `/inventory`, `/logistics`, `/mfa-enrollment`, `/master-api`, `/admin/monitoring`, `/status`, `/simulation`, `/audit`, `/track`) e `src/pages/NotFound.tsx:58` ainda escreve `document.title` à mão. O atalho `/jobs` do PWA (`public/manifest.json:71`) aponta para uma rota que **não existe** em `src/routes/AppRoutes.tsx` — abre 404. O item "Voltar" do menu mobile ainda é um link com `href: '#'` (`src/components/navigation/MobileNavigation.tsx:377`), origem do alerta `menu_sem_destino` do índice de contexto. Nenhuma rota tem ErrorBoundary própria: `ProtectedPage`/`PublicPage` (`src/routes/AppRoutes.tsx:107-148`) só envolvem `Suspense`.

**Atritos principais.** (1) O usuário aprende o Voltar no desktop e não o encontra no mobile — `BackButton.tsx:70-72` retorna `null` em mobile e delega ao header mobile, que só aparece em certas condições. (2) Voltar depois de filtrar/trocar de aba devolve a tela "crua", porque o filtro estava em `useState`. (3) Em erro de carregamento o usuário vê "vazio" e conclui que não há trabalho — pior no `PackagingKioskPage`, onde isso lê "Fila zerada". (4) No kiosk, sair é quase invisível e os ícones não são anunciáveis. (5) `/operator` está na lista de exclusão do Voltar (`BackButton.tsx:43`) e do cabeçalho (`MainLayout.tsx:224`), mas **não** é raiz para o perfil que entra por `/kiosk` → o operador fica sem caminho de volta padronizado.

## Princípios e padrões adotados

1. **Um Voltar, uma semântica.** Existe exatamente um componente de Voltar (`BackButton`) e um hook de decisão (`useSmartBack`). Todo ponto de saída (botão, swipe, atalho, breadcrumb, header mobile) chama o mesmo hook — nunca `navigate(-1)` direto.
2. **Ícone e posição fixos.** `ArrowLeft` do lucide (padrão do resto do app: `NotFound.tsx:201`, `OEELossDrilldown.tsx:272`, `KioskPage.tsx:132`), à esquerda do título, antes do breadcrumb, altura mínima 44px.
3. **History primeiro, rota-pai depois.** `navigate(-1)` quando há entrada interna; sem ela, `replace` para a **rota-pai declarada** (derivada de `sidebarNavConfig`), não para `/`.
4. **Modal fecha antes de voltar.** Sentinela (`DialogHistoryGuard`) e `?modal=` garantem que o primeiro Voltar fecha o dialog; o segundo sai da página.
5. **Dirty-guard em todo ponto de saída.** `confirmIfDirty` envolve a navegação, nunca o fechamento de dialog (confirmar descarte num back que só fecha o dialog é enganoso — ver comentário em `BackButton.tsx:51-54`).
6. **Estado de tela mora na URL.** Aba, filtro, página de tabela, item selecionado e modal são `searchParams`. `useState` só para estado efêmero (hover, foco, draft de input).
7. **Deep link é contrato.** Toda URL colável reabre a mesma tela: aba certa, filtro certo, modal certo, item destacado (`useDeepLinkFocus` com `?focus=`).
8. **Hierarquia visual única por página**: um `h1` (via `PageHeader`), `h2` por seção, breadcrumb acima do título, ações à direita.
9. **Movimento é opcional.** Toda animação respeita `prefers-reduced-motion` por `MotionConfig` global + `TransitionConfigContext`, que já calcula `effectiveConfig` (`src/contexts/TransitionConfigContext.tsx:46-58`).
10. **Loading honesto.** Skeleton com a forma da tela, progresso ligado ao carregamento real (não timer fixo), e **erro é tela**, com "Tentar de novo" e "Voltar".
11. **Alvo de toque ≥ 44×44 px** em tudo que navega, e ≥ 56px no kiosk (luva, tablet em pé).
12. **Leitor de tela sabe onde está**: `aria-current="page"` na navegação, título único por rota, foco no `h1` após troca, `aria-live` para mudança assíncrona.
13. **Nada de ação destrutiva sem desfazer ou confirmar** com texto que nomeia o objeto e a consequência; `window.confirm` é proibido.
14. **Multi-aba é um só app**: logout, alerta crítico e troca de turno propagam por `BroadcastChannel`.
15. **Toda melhoria tem medida**: evento em `navTelemetry` + teste e2e ou axe que prova o comportamento.

**Referências usadas no plano**: Material Design 3 — *Navigation* e *Back handling / predictive back*; Apple HIG — *Navigation bars*, *Modality*; Nielsen — heurística 3 *User control and freedom* e 1 *Visibility of system status*; WCAG 2.2 — 2.4.1 *Bypass Blocks*, 2.4.2 *Page Titled*, 2.4.3 *Focus Order*, 2.4.7 *Focus Visible*, 2.4.8 *Location* (AAA), 2.5.8 *Target Size (Minimum)*, 3.2.3 *Consistent Navigation*, 3.3.4 *Error Prevention*; ARIA APG — padrões *Breadcrumb*, *Dialog (Modal)*, *Tabs*, *Disclosure*.

## Matriz de priorização impacto × esforço

| Faixa | O que entra | Etapas | Impacto × Esforço |
|---|---|---|---|
| **Ganho rápido** (fazer primeiro) | Rótulos e títulos faltantes, `aria-current`, remoção dos 2 `window.confirm`, atalho PWA quebrado, saída do kiosk visível, ícone do Voltar unificado, `MotionConfig`, unificar toaster, 44px no que navega | 1, 2, 10, 11, 12, 16, 22, 29, 46, 47, 50, 53, 57, 58, 60, 62, 66, 81, 82, 83, 84, 86, 90, 95, 97, 99, 103, 110, 171, 186 | Alto × Baixo |
| **Estruturante** (base para o resto) | `useBackNavigation` com rota-pai, adoção do `PageHeader` em ondas, estado em URL (abas/filtros), erro por rota, `isError` nas páginas, breadcrumb dinâmico, stepper único, auto-save, `BroadcastChannel`, KPIs | 3, 4, 5, 6, 7, 13, 14, 15, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 48, 49, 51, 52, 61, 63, 116–130, 146–152, 172–180 | Alto × Médio/Alto |
| **Incremental** (polimento consistente) | Micro-interações, hierarquia tipográfica, contraste, feedback de ação, swipe, leitor de tela, fonte ajustável, testes por fluxo | 8, 9, 21, 28, 40–45, 54–56, 59, 64, 65, 67–80, 85, 87–89, 91–94, 96, 98, 100–102, 104–109, 111–115, 131–145, 153–170, 181–185, 187–195 | Médio × Médio |
| **Opcional** (só com folga ou pedido do dono) | View Transitions API, predictive back, gesto de avançar, telemetria de rage click com amostragem, tour contextual por perfil | 41, 42, 43, 44, 45, 108, 109, 143, 144, 145, 168, 169, 170, 196, 197, 198, 199, 200 | Médio/Baixo × Alto |

## As 200 etapas

## Categoria 1 — Navegação e controle de fluxo (etapas 1 a 45)

Voltar, histórico, breadcrumbs, feedback visual, transições e carregamento.

### 1. Unificar o ícone do Voltar em `ArrowLeft`

- **Descrição**: `src/components/navigation/BackButton.tsx:7,92` usa `ChevronLeft`, enquanto todos os outros Voltar do app usam `ArrowLeft`: `src/pages/NotFound.tsx:201`, `src/pages/KioskPage.tsx:132`, `src/features/analytics/components/oee/OEELossDrilldown.tsx:272`, `src/components/design-system/sections/error-states/HttpErrorStates.tsx:30`, `src/components/navigation/MobileNavigation.tsx:377`. Dois ícones para a mesma ação quebram o reconhecimento.
- **Exemplo prático**: Em `BackButton.tsx`, trocar o import de `ChevronLeft` por `ArrowLeft` e o uso na linha 92. Manter o círculo de fundo e o `translate-x` no hover. `ChevronLeft` fica reservado para avanço/recuo dentro de uma lista (paginação, carrossel).
- **Benefícios**: O operador aprende um único símbolo de 'voltar' e o reconhece em qualquer tela, inclusive no kiosk.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Material Design 3 — Navigation (back affordance); Nielsen 4 (consistência)
- **Verificação**: Teste visual: `npx playwright test tests/e2e/visual-regression.spec.ts` com baseline atualizado; `grep -rn "ChevronLeft" src/components/navigation/BackButton.tsx` sem resultado.

### 2. Criar o mapa de hierarquia de rotas (`src/lib/routeHierarchy.ts`)

- **Descrição**: `useSmartBack` cai sempre em `/` quando não há histórico interno (`src/hooks/use-smart-back.ts:41`) e `BackButton` tem `fallbackTo = '/'` fixo (`BackButton.tsx:33`). Em deep-link de `/machines/compare` o usuário vai para o Dashboard, não para `/machines`. Não existe hoje nenhum mapa pai→filho.
- **Exemplo prático**: Novo `src/lib/routeHierarchy.ts` derivando o pai de cada rota de `src/components/layout/sidebar/sidebarNavConfig.ts` (grupos `home`, `planning`, `analytics`, `operations`, `team`, `intelligence`, `system`) mais um mapa de exceções explícitas:

```ts
export const ROUTE_PARENT: Record<string, string> = {
  '/machines/compare': '/machines',
  '/packaging/kiosk': '/packaging',
  '/calendar/monthly': '/calendar/daily',
  '/kiosk': '/operator',
  '/operator-history': '/operators',
};
export function parentOf(pathname: string): string {
  if (ROUTE_PARENT[pathname]) return ROUTE_PARENT[pathname];
  const i = pathname.lastIndexOf('/');
  return i > 0 ? pathname.slice(0, i) : '/';
}
```
- **Benefícios**: Deep-link vindo de notificação, QR ou link compartilhado passa a devolver o usuário ao contexto certo, não ao Dashboard.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Material Design 3 — Up navigation vs Back; Apple HIG — Navigation bars (hierarchical back)
- **Verificação**: `npx vitest run src/lib/routeHierarchy.test.ts` cobrindo exceções e derivação por prefixo; toda rota de `AppRoutes.tsx` deve resolver um pai existente.

### 3. Criar `useBackNavigation` como hook único de saída

- **Descrição**: Hoje cinco pontos repetem a mesma sequência (telemetria → sentinela → dirty-guard → goBack): `BackButton.tsx:47-66`, `MainLayout.tsx:112-123`, `use-navigation-hotkeys.ts:30-36` e `:72-78`, `Breadcrumbs.tsx:112-116`, `MobileNavigation.tsx:377-385`. Qualquer regra nova tem de ser editada em cinco lugares.
- **Exemplo prático**: Novo `src/hooks/use-back-navigation.ts` que encapsula a sequência e recebe a origem:

```ts
export function useBackNavigation(fallbackTo?: string) {
  const { pathname } = useLocation();
  const parent = fallbackTo ?? parentOf(pathname);
  const { canGoBack, goBack } = useSmartBack(parent);
  const { confirmIfDirty } = useDirtyGuard();
  const back = useCallback((via: NavBackVia) => {
    trackNavBack(via, canGoBack ? 'history' : 'fallback');
    if (hasActiveDialogSentinel()) return goBack();
    confirmIfDirty(() => { if (!canGoBack) trackDeepLinkExit(pathname); goBack(); });
  }, [canGoBack, goBack, confirmIfDirty, pathname]);
  return { canGoBack, back, parent };
}
```
- **Benefícios**: Uma regra de navegação muda em um arquivo; o risco de um ponto de saída ficar sem dirty-guard desaparece.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 3 (user control and freedom); ARIA APG — Dialog (modal) back semantics
- **Verificação**: `npx vitest run src/hooks/use-back-navigation.test.tsx` com casos: histórico interno, deep-link, dialog aberto, formulário sujo.

### 4. Migrar os 5 pontos de saída para `useBackNavigation`

- **Descrição**: Depois da etapa 3, remover a lógica duplicada de `BackButton.tsx:47-66`, `MainLayout.tsx:112-123`, `use-navigation-hotkeys.ts:30-36,72-78`, `Breadcrumbs.tsx:112-116` e `MobileNavigation.tsx:377-385`.
- **Exemplo prático**: Em cada arquivo: substituir o corpo do handler por `back('button' | 'swipe' | 'hotkey' | 'breadcrumb' | 'mobile-header')`. Não alterar nenhum comportamento observável nesta PR — é `refactor:`, com os testes de `tests/e2e/navigation.spec.ts` como rede.
- **Benefícios**: Reduz o custo de toda etapa seguinte de navegação e elimina divergência silenciosa entre pontos de saída.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 4 (consistência e padrões)
- **Verificação**: `npx playwright test tests/e2e/navigation.spec.ts` verde sem alterar o spec; diff não deve conter mudança de texto de UI.

### 5. Voltar com destino de rota-pai no `BackButton`

- **Descrição**: Com `routeHierarchy` pronto, `BackButton` deixa de usar `fallbackTo='/'` (`BackButton.tsx:33`) e passa a usar `parentOf(pathname)`.
- **Exemplo prático**: Alterar a assinatura para `fallbackTo?: string` sem default e deixar `useBackNavigation` resolver o pai. Manter a prop para casos em que a página sabe melhor (ex.: modal de execução de TPM voltando para `/tpm`).
- **Benefícios**: Elimina o salto para o Dashboard em deep-links — o caminho mental 'subir um nível' passa a valer.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Material Design 3 — Up navigation; WCAG 2.4.8 Location
- **Verificação**: E2e: `page.goto('/machines/compare')` direto → clicar Voltar → URL `/machines` (hoje iria para `/`).

### 6. Mostrar o Voltar em `/operator`

- **Descrição**: `/operator` está excluído do Voltar (`BackButton.tsx:43`) e do cabeçalho global (`MainLayout.tsx:224`), mas não é raiz para quem chega de `/kiosk` ou de uma notificação. `src/pages/OperatorView.tsx` roda dentro do `MainLayout` completo, então o cabeçalho existe — só não aparece.
- **Exemplo prático**: Tirar `/operator` da lista de exclusão das duas linhas e, em vez disso, esconder o Voltar quando `!canGoBack && parentOf(pathname) === pathname` (verdadeira raiz). Assim `/` continua sem Voltar e `/operator` ganha quando há de onde voltar.
- **Benefícios**: O operador que entra num job por notificação consegue voltar ao painel sem usar o gesto do sistema.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 3 (user control and freedom)
- **Verificação**: E2e: navegar `/operator` → `/kiosk` → Voltar → `/operator`; e `page.goto('/operator')` direto não deve mostrar o botão.

### 7. Voltar padronizado no `KioskPage`

- **Descrição**: `src/pages/KioskPage.tsx:132` usa `Button variant="ghost" size="sm"` com `opacity-50` e texto 'Sair do Kiosk', navegando com `navigate("/operator")` direto — sem dirty-guard, sem telemetria, com alvo abaixo de 44px e contraste reduzido de propósito.
- **Exemplo prático**: Substituir por `<BackButton fallbackTo="/operator" />` com uma variante `size="kiosk"` (altura 56px, rótulo 'Sair do Kiosk'). Em tablet o botão fica no canto superior esquerdo, fora do alcance acidental do polegar que opera a fila.
- **Benefícios**: Operador em pé, de luva, encontra a saída; a saída passa a respeitar formulário aberto e entra na telemetria.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.5.8 Target Size; Nielsen 1 (visibilidade do estado)
- **Verificação**: `npx playwright test` no fluxo kiosk: botão com `aria-label` e caixa ≥ 44×44 via `boundingBox()`; axe sem violação de contraste na rota `/kiosk`.

### 8. Voltar no `PackagingKioskPage`

- **Descrição**: `src/pages/PackagingKioskPage.tsx` é rota de kiosk (`/packaging/kiosk`) sem cabeçalho global e, conforme `AppRoutes.tsx`, sem Voltar próprio. NÃO VERIFICADO se há outro caminho de saída nessa página além do gesto do sistema.
- **Exemplo prático**: Antes de implementar, ler a página inteira; se não houver saída, adicionar `<BackButton fallbackTo="/packaging" />` na mesma posição do `KioskPage` (canto superior esquerdo, 56px).
- **Benefícios**: Tablet de embalagem deixa de precisar de gesto do sistema (que o modo standalone do PWA pode não oferecer).
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Apple HIG — Navigation bars; Material Design 3 — Back handling
- **Verificação**: Abrir `/packaging/kiosk` em viewport de tablet no Playwright e provar que existe controle de saída visível e rotulado.

### 9. Voltar nas rotas públicas `/track` e `/install`

- **Descrição**: As rotas públicas estão fora do cabeçalho global (`MainLayout.tsx:224`) e do `BackButton` (`BackButton.tsx:43`). `src/pages/PublicTrackingPage.tsx` usa `useSearchParams`, logo recebe links externos — e não tem como voltar à consulta anterior.
- **Exemplo prático**: Em `/track`, adicionar um Voltar local que limpa os `searchParams` da consulta (volta ao formulário de busca) em vez de sair do site. Em `/install`, um link 'Ir para o sistema' apontando para `/`.
- **Benefícios**: Cliente/transportadora que erra o código não precisa reescrever a URL; menos abandono na página pública.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 3; WCAG 3.2.3 Consistent Navigation
- **Verificação**: E2e sem login: `/track?codigo=X` → Voltar → formulário vazio, URL sem `codigo`.

### 10. Trocar o item 'Voltar' do menu mobile de link para botão

- **Descrição**: `src/components/navigation/MobileNavigation.tsx:377` passa `item={{ id: 'back', icon: ArrowLeft, label: 'Voltar', href: '#' }}` — é a origem do alerta `menu_sem_destino: "Voltar -> #"` do índice de contexto. `href="#"` é um link que não leva a lugar nenhum e é anunciado como link pelo leitor de tela.
- **Exemplo prático**: Permitir `href?: string` em `MobileNavButton` e renderizar `<button type="button">` quando `href` for ausente. O `onClick` já existe (378-384) e já chama a sequência correta.
- **Benefícios**: Leitor de tela anuncia 'botão Voltar' (não 'link'), teclado não recebe um destino falso, e o alerta do índice de contexto some.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: ARIA APG — buttons vs links; WCAG 2.4.4 Link Purpose
- **Verificação**: Axe na viewport mobile sem a violação de link vazio; `getByRole('button', { name: 'Voltar' })` resolve no Playwright.

### 11. Completar `usePageTitle` com as 14 rotas sem título

- **Descrição**: `src/hooks/usePageTitle.ts:10-52` cobre 41 rotas. Faltam: `/calendar/monthly`, `/packaging`, `/packaging/kiosk`, `/report-builder`, `/digital-twin`, `/inventory`, `/logistics`, `/mfa-enrollment`, `/master-api`, `/admin/monitoring`, `/status`, `/simulation`, `/audit`, `/track`. Sem entrada, o título cai no genérico `FAST GRAVAÇÕES` (linha 68) — o histórico do navegador e a lista de abas ficam ambíguos.
- **Exemplo prático**: Adicionar as 14 chaves ao `ROUTE_TITLES` com os mesmos rótulos já usados em `Breadcrumbs.tsx:38-101` (ex.: `'/digital-twin': 'Gêmeo Digital'`, `'/report-builder': 'Construtor de Relatórios'`), e extrair esses rótulos para um módulo único na etapa 12.
- **Benefícios**: Histórico do navegador e multi-aba ficam legíveis; critério 2.4.2 do WCAG passa em todas as rotas.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.4.2 Page Titled
- **Verificação**: E2e: percorrer as 58 rotas e afirmar `expect(await page.title()).not.toBe('FAST GRAVAÇÕES')` nas protegidas.

### 12. Extrair os rótulos de rota para `src/lib/routeLabels.ts`

- **Descrição**: O mesmo dicionário de rótulos existe duplicado em `Breadcrumbs.tsx:38-101` (64 entradas por segmento) e `usePageTitle.ts:10-52` (41 entradas por path). Rota nova entra em um e esquece o outro — foi o que gerou as 14 rotas sem título.
- **Exemplo prático**: Criar `src/lib/routeLabels.ts` exportando `SEGMENT_LABELS` e `PATH_TITLES`, importar nos dois arquivos, e adicionar um teste que garante que todo `path=` de `AppRoutes.tsx` tem entrada em `PATH_TITLES`.
- **Benefícios**: Rota nova não entra mais sem título nem com slug cru no breadcrumb; o teste impede regressão.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 2.4.2; Nielsen 4
- **Verificação**: `npx vitest run src/lib/routeLabels.test.ts` lendo `AppRoutes.tsx` e falhando em rota sem rótulo.

### 13. Alimentar o `BreadcrumbContext` nas páginas de detalhe

- **Descrição**: `src/contexts/BreadcrumbContext.tsx:18-32` expõe `setItems/push/pop/clear`, está montado em `src/providers/AppProviders.tsx:80` e é lido em `Breadcrumbs.tsx:109` — mas **nenhum arquivo chama `setItems` ou `push`**. Breadcrumb de registro (job, máquina, operador) nunca aparece; a trilha mostra apenas segmentos de URL.
- **Exemplo prático**: Criar `useBreadcrumbTrail(items)` que faz `setItems` na montagem e `clear` no unmount, e usá-lo nas páginas/modais que abrem um registro — começando por `src/pages/KanbanBoard.tsx` (job), `src/pages/MachinesPage` e `src/pages/OperatorHistoryPage`:

```tsx
useBreadcrumbTrail([
  { label: 'Jobs', href: '/kanban' },
  { label: job.code },
]);
```
- **Benefícios**: O usuário sabe em que registro está e sobe um nível com um clique, sem depender do histórico.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: ARIA APG — Breadcrumb; WCAG 2.4.8 Location
- **Verificação**: E2e: abrir um job e afirmar que `nav[aria-label="Trilha de navegação"]` contém o código do job e que o último item tem `aria-current="page"`.

### 14. Adotar `PageHeader` nas páginas de analytics (onda 1)

- **Descrição**: `src/components/layout/PageHeader.tsx:19-41` é o padrão (breadcrumb + h1 + descrição + ações) e é usado só em `src/pages/NewJobPage.tsx`. Cada página monta seu próprio título com classes próprias.
- **Exemplo prático**: Onda 1 — `BIDashboard`, `OEEDashboard`, `KPIsPage`, `EfficiencyPage`, `SPCPage`, `ABCCostingPage`, `ReportBuilderPage`, `MLPredictionsPage`: substituir o bloco de título por `<PageHeader title=... description=... actions={...} showBreadcrumbs={false} />` (o breadcrumb já vem do `MainLayout`), removendo h1/h2 ad-hoc.
- **Benefícios**: Mesma posição de título e ações em toda a área de análise; o foco pós-navegação (`MainLayout.tsx:98`) passa a achar um `h1` em todas elas.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 1.3.1 Info and Relationships; Nielsen 4
- **Verificação**: `npx playwright test` afirmando `page.getByRole('heading', { level: 1 })` único e visível em cada uma das 8 rotas.

### 15. Adotar `PageHeader` nas páginas de operação (onda 2)

- **Descrição**: Mesmo padrão da etapa 14 para o núcleo operacional.
- **Exemplo prático**: Onda 2 — `KanbanBoard`, `PendingQueue`, `AlertsPage`, `PackagingDashboard`, `InventoryPage`, `LogisticsPage`, `TraceabilityPage`, `ShiftHandoverPage`. Atenção ao `KanbanBoard`, que tem barra de ações em massa: ela vai em `actions`.
- **Benefícios**: A área onde o operador passa o turno inteiro ganha previsibilidade de leitura e de posição das ações.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 4; WCAG 1.3.1
- **Verificação**: Igual à etapa 14, nas 8 rotas da onda; `grep -c "<h1"` igual a 0 nos arquivos migrados (o h1 vem do `PageHeader`).

### 16. Adotar `PageHeader` nas páginas de time, inteligência e sistema (onda 3)

- **Descrição**: Fecha a adoção nas páginas restantes com cabeçalho próprio.
- **Exemplo prático**: Onda 3 — `OperatorsPage`, `OperatorProductivityPage`, `OperatorHistoryPage`, `GamificationPage`, `DocumentsPage`, `TechnicalKnowledgeBase`, `SettingsPage`, `SecurityPage`, `AuditTrailPage`, `SystemStatusPage`, `AdminMonitoringPage`, `MasterApiPage`, `DigitalTwinPage`, `SimulationPage`.
- **Benefícios**: Fim da variação de cabeçalho; qualquer melhoria futura de cabeçalho (ex.: botão de ajuda contextual) entra em um arquivo.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 4
- **Verificação**: Teste que percorre `src/pages/*.tsx` e falha se um arquivo declarar `<h1` fora de `PageHeader` (lista de exceções explícita para kiosk e rotas públicas).

### 17. Dar `h1` às 10 páginas sem título visível

- **Descrição**: Páginas sem nenhum `<h1`: `AuthPage`, `BIDashboard`, `DailyCalendar`, `KioskPage`, `MfaEnrollmentPage`, `MonthlyCalendar`, `ResetPasswordPage`, `TechnicalAssistantPage`, `WeeklyCalendar` (e `NewJobPage`, que só o tem via `PageHeader`). O foco pós-navegação procura `#main-content-scroll h1` (`MainLayout.tsx:98`): sem `h1` ele retenta 10 vezes e desiste (104-105), e o leitor de tela não anuncia a tela nova.
- **Exemplo prático**: Nas páginas dentro do layout, usar `PageHeader`. Em `AuthPage`, `ResetPasswordPage`, `KioskPage` e `MfaEnrollmentPage` (fora do layout), adicionar um `h1` real — visível, ou `sr-only` quando o design não previr título (ex.: kiosk em tela cheia).
- **Benefícios**: Leitor de tela anuncia cada tela; o retry de foco deixa de rodar 2s em vão em 10 rotas.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 1.3.1, 2.4.6 Headings and Labels, 2.4.3 Focus Order
- **Verificação**: Axe por rota (`tests/e2e/accessibility.spec.ts`) com a regra `page-has-heading-one` habilitada.

### 18. `aria-current="page"` na sidebar

- **Descrição**: `src/components/layout/sidebar/NavButton.tsx:38-64` já recebe `isActive` e aplica estilo (46-50), mas não emite `aria-current`. Quem usa leitor de tela não sabe qual item é a página atual. Hoje `aria-current` só existe em `MobileNavigation.tsx:132`, `Breadcrumbs.tsx:270`, `ui/pagination.tsx:37`, `ui/stepper.tsx:38` e `NewJobPage.tsx:256`.
- **Exemplo prático**: No `Link` da linha 39, adicionar `aria-current={isActive ? 'page' : undefined}`. Fazer o mesmo no cabeçalho de grupo de `src/components/layout/sidebar/NavGroupComponent.tsx` com `aria-current="true"` quando o grupo contém a rota ativa.
- **Benefícios**: Critério 3.2.3 e 2.4.8 passam na navegação principal; o usuário de teclado confirma onde está sem contar itens.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.4.8 Location, 3.2.3 Consistent Navigation; ARIA APG — Navigation
- **Verificação**: E2e: em `/alerts`, `page.locator('nav [aria-current="page"]')` tem exatamente 1 elemento e seu texto é 'Alertas'.

### 19. Ligar o `TopProgressBar` ao carregamento real

- **Descrição**: `src/components/navigation/TopProgressBar.tsx:14-18` liga o loading por 500ms fixos a cada troca de `pathname`. Numa rota lazy lenta a barra termina antes da página aparecer; numa rota em cache ela aparece sem necessidade. É progresso falso.
- **Exemplo prático**: Expor um contador de navegações pendentes a partir do `Suspense` das rotas (`AppRoutes.tsx:107-148`): um `NavigationProgressProvider` com `start()` no `PageTransition` de entrada e `stop()` no `useEffect` do componente carregado, e a barra lendo esse contador. Alternativa menor: manter o timer, mas só exibir após 150ms (evita flash em rota em cache) e manter até o `h1` do destino existir.
- **Benefícios**: A barra passa a informar; hoje ela mente nas duas direções. Reduz a sensação de travamento em rota lazy fria.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 1 (visibility of system status); Material Design 3 — Progress indicators
- **Verificação**: Teste com rota lazy atrasada via `page.route()` + delay: a barra deve permanecer visível até o `h1` aparecer.

### 20. Trocar os 2 `window.confirm` restantes por `useConfirm`

- **Descrição**: `src/pages/KanbanBoard.tsx:447` e `src/pages/PendingQueue.tsx:481` usam `window.confirm('Excluir permanentemente estes jobs?')`. O diálogo nativo não é estilizável, não respeita o tema, não é traduzível, bloqueia a thread e escapa do `DialogHistoryGuard` (o back não o fecha).
- **Exemplo prático**: Usar o `ConfirmationContext`/`useConfirm` já existente (ver uso em `src/components/jobs/JobDetailsModal.tsx:131`), com texto que nomeia o objeto e a quantidade: 'Excluir 3 jobs permanentemente? Esta ação não tem volta.' e botão destrutivo rotulado 'Excluir 3 jobs'.
- **Benefícios**: Confirmação de ação irreversível fica consistente, traduzível e acessível; o back fecha o diálogo.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 3.3.4 Error Prevention; ARIA APG — Alert Dialog
- **Verificação**: `grep -rn "window.confirm" src` sem resultado; e2e que abre a confirmação, aperta Escape e prova que nada foi excluído.

### 21. Padronizar o texto de confirmação de saída do dirty-guard

- **Descrição**: `src/contexts/DirtyFormContext.tsx:27-90` centraliza o guard, mas o texto do diálogo precisa seguir o padrão de nomear a perda. NÃO VERIFICADO o texto atual exibido — ler `DirtyFormContext.tsx` inteiro antes de alterar.
- **Exemplo prático**: Padrão: título 'Sair sem salvar?', corpo 'As alterações feitas em <nome do formulário> serão perdidas.', ações 'Continuar editando' (default, foco inicial) e 'Sair sem salvar' (destrutiva). O nome do formulário vem de um parâmetro de `useDirtyForm`.
- **Benefícios**: O usuário entende exatamente o que perde; o botão seguro recebe o foco, reduzindo perda acidental.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 3.3.4; Apple HIG — Modality (destructive actions)
- **Verificação**: `npx vitest run` no teste do contexto afirmando foco inicial no botão seguro; e2e de `/new-job` já existente em `navigation.spec.ts:79-113`.

### 22. Aplicar `useDirtyForm` em todos os formulários de criação/edição

- **Descrição**: O guard existe e é respeitado por todos os pontos de saída, mas só vale onde o formulário o registra. Confirmado em `src/pages/NewJobPage.tsx:121`. NÃO VERIFICADO quais outros formulários registram.
- **Exemplo prático**: Levantar os formulários com `react-hook-form` (`formState.isDirty`) e registrar o guard em cada um; nos modais, registrar só quando o modal está aberto. Prioridade: cadastro/edição de máquina, operador, técnica, override de SLA de embalagem, checklist pré-produção e execução de TPM.
- **Benefícios**: Perda de trabalho digitado deixa de depender de qual tela o usuário está usando.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 3.3.4; Nielsen 5 (error prevention)
- **Verificação**: E2e por formulário: preencher um campo, clicar Voltar, esperar o diálogo; cancelar e conferir que o campo continua preenchido.

### 23. Pôr a aba ativa na URL (`?tab=`) — infraestrutura

- **Descrição**: 50 arquivos usam `<Tabs>` e só `src/pages/InventoryPage.tsx` liga aba à URL. Em todos os outros, Voltar/recarregar devolve a primeira aba e o link compartilhado não reabre a mesma visão.
- **Exemplo prático**: Criar `src/hooks/use-tab-param.ts` seguindo o padrão de `use-modal-param.ts` (REPLACE para não poluir o histórico com troca de aba):

```ts
export function useTabParam(def: string, key = 'tab') {
  const [sp, setSp] = useSearchParams();
  const value = sp.get(key) ?? def;
  const set = (v: string) => setSp(p => { const n = new URLSearchParams(p); v === def ? n.delete(key) : n.set(key, v); return n; }, { replace: true });
  return [value, set] as const;
}
```
- **Benefícios**: Base para todas as etapas de deep-link de aba; decide de uma vez a semântica (REPLACE, não PUSH) para o Voltar não ficar preso trocando de aba.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Material Design 3 — Tabs; ARIA APG — Tabs
- **Verificação**: `npx vitest run src/hooks/use-tab-param.test.tsx`: default não escreve na URL; troca usa REPLACE; leitura de URL inicial respeita o parâmetro.

### 24. Adotar `?tab=` nas páginas de maior tráfego (onda 1)

- **Descrição**: Aplicar a etapa 23 onde o custo de perder a aba é maior.
- **Exemplo prático**: Onda 1 — `src/pages/SettingsPage`, `src/pages/SecurityPage`, `src/pages/BIDashboard`, `src/pages/OEEDashboard`, `src/components/jobs/JobDetailsModal` (abas de qualidade/custos/instruções/rastreabilidade, ver `src/components/jobs/JobQualityTab.tsx` e irmãos). Nos modais, compor com `?modal=` já existente.
- **Benefícios**: Link para 'a aba de rastreabilidade do job X' passa a existir; Voltar devolve a aba em que a pessoa estava.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: ARIA APG — Tabs; Nielsen 3
- **Verificação**: E2e: abrir aba 3, recarregar, conferir aba 3 ativa; copiar URL numa nova página e conferir a mesma aba.

### 25. Adotar `?tab=` nas páginas restantes (onda 2)

- **Descrição**: Completa a cobertura das ~50 telas com `<Tabs>`.
- **Exemplo prático**: Varrer `grep -rln "<Tabs" src` e migrar as restantes, deixando fora as abas puramente decorativas dentro de um card (onde a URL não ajuda). Documentar a exceção no PR.
- **Benefícios**: Consistência: o usuário aprende que a URL sempre reflete o que está vendo.
- **Impacto** Médio · **Esforço** Alto · **Prioridade** P2 · **Referência**: WCAG 3.2.3; Nielsen 4
- **Verificação**: Teste de lint custom (ou vitest) que falha se um arquivo novo usar `<Tabs` com `useState` para `value`.

### 26. Pôr filtros de lista na URL — infraestrutura

- **Descrição**: Filtro, busca e ordenação vivem em `useState` nas listas (`KanbanBoard`, `PendingQueue`, `AlertsPage`, `OperatorsPage`, `DocumentsPage`). Voltar de um detalhe para a lista devolve a lista sem filtro — o usuário refaz o trabalho.
- **Exemplo prático**: Criar `src/hooks/use-filter-params.ts` que serializa um objeto de filtros em `searchParams` com REPLACE e debounce de 300ms para campos de texto, e desserializa com Zod (já é dependência do projeto) para não quebrar com URL inválida.
- **Benefícios**: Resolve o atrito nº 2 do diagnóstico: Voltar para a lista preserva o recorte de trabalho.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 3 (user control and freedom); WCAG 2.4.8
- **Verificação**: `npx vitest run src/hooks/use-filter-params.test.tsx`: round-trip de filtros, URL inválida cai no default sem lançar.

### 27. Adotar filtros na URL em `KanbanBoard` e `PendingQueue`

- **Descrição**: As duas telas de fila são o caminho crítico do coordenador e as que mais sofrem com Voltar.
- **Exemplo prático**: Migrar os estados de filtro (técnica, máquina, prioridade, busca, ordenação) para `useFilterParams`. Manter o `window.confirm` já substituído na etapa 20 e o `?modal=` para o detalhe do job.
- **Benefícios**: Coordenador volta do detalhe do job para a fila exatamente como a deixou — ganho direto de tempo por turno.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3; Material Design 3 — Navigation state preservation
- **Verificação**: E2e: filtrar por técnica, abrir job, Voltar, afirmar que o filtro continua aplicado e a contagem de cards é a mesma.

### 28. Adotar filtros na URL nas demais listas

- **Descrição**: Completa `AlertsPage`, `OperatorsPage`, `DocumentsPage`, `TraceabilityPage`, `InventoryPage` (que já tem `?items=`, ver `src/pages/InventoryPage.tsx:63-86`), `LogisticsPage`, `AuditTrailPage`.
- **Exemplo prático**: Mesmo hook da etapa 26; em `InventoryPage` apenas somar os filtros ao esquema já existente, sem mexer na normalização de `?modal=`.
- **Benefícios**: Recorte de trabalho compartilhável por link em toda lista — útil para passagem de turno.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 3
- **Verificação**: E2e por lista (um caso cada) com o mesmo roteiro da etapa 27.

### 29. Paginação de tabela na URL (`?page=`)

- **Descrição**: `src/components/qrcode/ScanHistory.tsx:50,219` guarda `currentPage` e `itemsPerPage` em `useState`. Voltar de um item para a página 7 da tabela devolve a página 1.
- **Exemplo prático**: Adicionar `?page=` e `?per=` via `useFilterParams`, com REPLACE. `src/components/ui/pagination.tsx:37` já emite `aria-current`, então a semântica de leitor de tela não muda.
- **Benefícios**: Em tabela longa (histórico de scan, auditoria) o usuário não perde a posição ao inspecionar um item.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: ARIA APG — Pagination; Nielsen 3
- **Verificação**: E2e: ir à página 3, abrir item, Voltar, conferir página 3.

### 30. ErrorBoundary por rota com Voltar e 'Tentar de novo'

- **Descrição**: `ProtectedPage` e `PublicPage` (`src/routes/AppRoutes.tsx:107-148`) envolvem só `PageTransition` + `Suspense`. Erro de render numa página sobe para o `GlobalErrorBoundary` (`src/App.tsx:10`) e derruba o app inteiro, perdendo a navegação — o usuário fica sem sidebar e sem Voltar.
- **Exemplo prático**: Envolver o `Suspense` com `SectionErrorBoundary` (já existe: `src/components/ui/section-error-boundary.tsx`) ou uma `RouteErrorBoundary` nova que renderize dentro do layout: título do erro, 'Tentar de novo' (remount por `key`) e 'Voltar' (`useBackNavigation`).
- **Benefícios**: Uma página quebrada deixa de derrubar o sistema; o operador volta ao trabalho em um clique em vez de recarregar.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 9 (ajudar a reconhecer e recuperar de erros); Material Design 3 — Error states
- **Verificação**: Teste: componente que lança em render por trás de uma rota de teste → boundary aparece, sidebar continua, 'Voltar' funciona.

### 31. Estado de erro de query nas páginas (consumir `isError`)

- **Descrição**: **Nenhum componente consome `isError`**: os 4 hits em `src/` são testes (`useInventory.test.ts:164`, `useTraceability.test.ts:168`, `errorHandling.test.ts`) e `src/lib/errorHandling.ts:274`. Falha de rede vira lista vazia. Em `src/pages/PackagingKioskPage.tsx` isso aparece como 'Fila zerada' — o pior erro possível, porque é uma mentira plausível.
- **Exemplo prático**: Criar `<QueryState query={q} empty={<Vazio/>}>` que trata `isPending` (skeleton), `isError` (mensagem + 'Tentar de novo' chamando `refetch`) e vazio real, e adotá-lo começando por `PackagingKioskPage`, `KanbanBoard`, `PendingQueue` e `AlertsPage`.
- **Benefícios**: Acaba a confusão entre 'não há trabalho' e 'não consegui carregar' — risco operacional direto na embalagem.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 1 e 9; Material Design 3 — Empty vs error states
- **Verificação**: Teste com `page.route()` abortando a chamada: a tela deve mostrar erro e um botão que refaz a chamada (contagem de requests sobe).

### 32. `onError` global no QueryClient

- **Descrição**: `src/lib/queryConfig.ts` configura o cliente sem handler global de erro (NÃO VERIFICADO linha exata — ler o arquivo antes). Sem isso, toda query precisa lembrar de avisar.
- **Exemplo prático**: Adicionar `QueryCache({ onError })` que emite toast (sonner) de falha e registra em `navTelemetry`/Sentry, com deduplicação por `queryKey` para não empilhar 10 toasts na mesma falha de rede.
- **Benefícios**: O usuário sempre sabe que algo falhou, mesmo em tela que ainda não adotou o `QueryState`.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; Material Design 3 — Snackbars
- **Verificação**: Teste: duas queries falhando com a mesma chave geram um toast; `trackNavEvent` chamado uma vez.

### 33. Unificar os dois toasters em um

- **Descrição**: `src/App.tsx:12-13` monta `<Toaster />` (shadcn `use-toast`) e `<Sonner />` ao mesmo tempo, mais `<NetworkStatusToaster />` (14). Sonner é usado em ~143 arquivos e `use-toast` em ~10 (NÃO VERIFICADO a contagem exata nesta sessão). Duas filas visuais podem sobrepor avisos e usam posições/animações diferentes.
- **Exemplo prático**: Migrar os poucos consumidores de `use-toast` para sonner, remover `<Toaster />` de `App.tsx:12` e manter `src/hooks/use-toast.ts` apenas como re-export fino durante uma versão, para não quebrar imports.
- **Benefícios**: Uma fila, uma posição, uma animação; menos bundle e fim de avisos empilhados em lugares diferentes.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Material Design 3 — Snackbars (uma por vez); Nielsen 4
- **Verificação**: `grep -rln "@/hooks/use-toast" src` restringe-se ao re-export; e2e provoca duas notificações e confirma empilhamento numa única região.

### 34. Stepper único: adotar `src/components/ui/stepper.tsx`

- **Descrição**: `src/components/ui/stepper.tsx` existe, já emite `aria-current="step"` (linha 38) e **não é importado por ninguém**. Em paralelo, `src/pages/NewJobPage.tsx:245-270` tem um stepper escrito à mão com a mesma semântica.
- **Exemplo prático**: Substituir o bloco de `NewJobPage` pelo `Stepper`, preservando `nav aria-label="Etapas do cadastro"`, e usar o mesmo componente nas etapas 116-120 (MFA, TPM, checklist).
- **Benefícios**: Um só padrão de progresso em fluxo multi-etapas; o código órfão passa a ser usado em vez de apagado.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: ARIA APG — steps (aria-current="step"); Material Design 3 — Stepper
- **Verificação**: `npx vitest run` no teste do stepper com `aria-current` na etapa certa; visual regression de `/new-job`.

### 35. `MotionConfig` global com `reducedMotion="user"`

- **Descrição**: Não existe `MotionConfig` no projeto (nenhum hit). `src/index.css:464-475` tem a media query de `prefers-reduced-motion` e `src/contexts/TransitionConfigContext.tsx:46-58` calcula `effectiveConfig`, mas cada `motion.div` ainda anima por conta própria — `useReducedMotion` só aparece em 3 arquivos (`ui/micro-interactions.tsx`, `ui/celebration.tsx`, `calendar/AgendaView.tsx`).
- **Exemplo prático**: Em `src/providers/AppProviders.tsx`, envolver a árvore com `<MotionConfig reducedMotion="user">` (framer-motion já é dependência). Os `transform`/`opacity` passam a ser suprimidos pelo próprio framer quando o sistema pede menos movimento, sem tocar em cada componente.
- **Benefícios**: Operador com sensibilidade a movimento (ou tablet lento) para de ver 20 animações por navegação; ganho de desempenho percebido no kiosk.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.3.3 Animation from Interactions; Material Design 3 — Motion (reduced)
- **Verificação**: E2e com `page.emulateMedia({ reducedMotion: 'reduce' })`: medir que a transição de rota termina em < 50ms e que `AnimatePresence` não atrasa o `h1`.

### 36. Transição de rota com direção correta no POP

- **Descrição**: `AppRoutes.tsx` já calcula direção (`direction` state, `popDirectionFor` de `src/lib/navHistory.ts`) e passa para `PageTransition`. NÃO VERIFICADO se a direção está correta em POP de modal (`?modal=`), onde a mudança é só de query.
- **Exemplo prático**: Ler `AnimatedRoutes` inteiro; se a troca de query disparar transição de página, suprimi-la quando `location.pathname` não muda — mesma regra que o `ScrollRestoration.tsx:111-116` já aplica para scroll.
- **Benefícios**: Abrir/fechar modal deixa de animar a página inteira; a transição passa a significar 'troquei de tela'.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Material Design 3 — Motion (meaningful transitions); Nielsen 1
- **Verificação**: E2e: abrir `?modal=batch-qr` e medir que o container da página não recebe a classe/estilo de transição.

### 37. Esqueleto de carregamento com a forma da tela em todas as rotas

- **Descrição**: `AppRoutes.tsx` já tem skeletons por tipo (`DashboardPageSkeleton`, `CalendarPageSkeleton`, `KanbanPageSkeleton`, `ListPageSkeleton`, `KPIPageSkeleton`, `EfficiencyPageSkeleton`, `AuthPageSkeleton`, `TablePageSkeleton`) e fallback por rota (126/147). NÃO VERIFICADO quais rotas usam qual skeleton nem se alguma usa um genérico.
- **Exemplo prático**: Auditar a tabela de rotas e garantir que cada rota usa o skeleton da sua forma (lista, tabela, dashboard, calendário). Onde não houver, criar o skeleton — não usar spinner.
- **Benefícios**: Reduz a sensação de salto de layout e o CLS percebido entre skeleton e conteúdo.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 1; Material Design 3 — Loading patterns
- **Verificação**: Visual regression do skeleton de cada rota e comparação de altura do primeiro bloco com a tela carregada (diferença < 15%).

### 38. Prefetch de rota no hover/foco já existente, estendido ao mobile

- **Descrição**: `src/lib/prefetch.ts:5-13` e `src/hooks/useRoutePrefetch.ts` existem, e `NavButton.tsx:34-36,39` já faz prefetch em `mouseenter`/`focus`. Em tablet não há hover: o prefetch nunca acontece e a primeira navegação paga o chunk inteiro.
- **Exemplo prático**: No `MobileNavigation`, disparar `prefetchRoute` em `touchstart` (antes do clique) e, no `AppSidebar` mobile, ao abrir o grupo. Limitar a 2 prefetches simultâneos para não competir com a query da tela atual.
- **Benefícios**: Navegação em tablet fica perceptivelmente mais rápida justamente onde a CPU é mais fraca.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Material Design 3 — Perceived performance
- **Verificação**: Medir no Playwright (tablet) o tempo entre clique e `h1` visível antes/depois; esperar queda > 20% em rota fria.

### 39. Avisar quando o chunk da rota falhar ao carregar

- **Descrição**: `src/lib/lazyWithRetry.ts:67` implementa retry de import. NÃO VERIFICADO o comportamento quando todas as tentativas falham (tela branca? boundary?).
- **Exemplo prático**: Ler o arquivo; se o fallback final não tiver UI, renderizar um estado 'Não consegui carregar esta tela' com 'Tentar de novo' e 'Voltar', e registrar em `navTelemetry` (sinal de deploy novo com chunk antigo em cache).
- **Benefícios**: Depois de um deploy, usuário com aba antiga recebe instrução em vez de tela branca.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 9; Material Design 3 — Error states
- **Verificação**: Teste com `page.route()` bloqueando o chunk: a UI de falha aparece e o evento é emitido.

### 40. Transição com View Transitions API, com fallback — **[DONO]**

- **Descrição**: Nenhum uso de `document.startViewTransition` no projeto. A API dá continuidade visual real (elemento compartilhado entre telas) com custo de CPU menor que animar a árvore inteira com framer-motion. Decisão de arquitetura visual: muda como as transições são feitas em todo o app.
- **Exemplo prático**: Experimento atrás de feature flag (`src/contexts/FeatureFlagsContext.tsx` já existe): em `AnimatedRoutes`, quando `document.startViewTransition` existir e `prefers-reduced-motion` não estiver ativo, envolver a troca de rota nela e desligar o `PageTransition`; caso contrário manter o caminho atual. `view-transition-name` no card do job e no `h1` da página de detalhe.
- **Benefícios**: Transição mais fluida e mais barata no tablet; base para 'card da fila cresce e se torna a tela do job'.
- **Impacto** Médio · **Esforço** Alto · **Prioridade** P3 · **Referência**: Material Design 3 — Shared axis / container transform; Chrome View Transitions
- **Verificação**: Medir FPS e tempo de transição no tablet com e sem a flag; e2e deve passar nos dois caminhos.

### 41. Predictive back no PWA Android — **[DONO]**

- **Descrição**: Depende da etapa 41 e de `manifest.json`. Hoje `public/manifest.json:9` fixa `orientation: portrait-primary` e o app é `display: standalone`. Predictive back exige opt-in e muda a sensação do gesto do sistema.
- **Exemplo prático**: Avaliar com o dono se vale: requer `view-transition` e teste em tablet real. Entregar como flag desligada, com roteiro de teste manual no `docs/operacoes/RUNBOOK.md`.
- **Benefícios**: Gesto de voltar com pré-visualização reduz erro de saída acidental do app em tablet.
- **Impacto** Baixo · **Esforço** Alto · **Prioridade** P3 · **Referência**: Material Design 3 — Predictive back
- **Verificação**: Teste manual documentado em tablet Android; sem CI.

### 42. Gesto de avançar (swipe à esquerda) — avaliar e decidir

- **Descrição**: `MainLayout.tsx:112-123` implementa swipe-right = voltar. Não há swipe-left = avançar. O conflito com drag-and-drop do Kanban é real e já é um risco declarado.
- **Exemplo prático**: Antes de implementar, medir a demanda com a telemetria da etapa 146. Se implementar, exigir início do gesto na borda esquerda (< 24px) e desabilitar nas rotas com drag (`/kanban`, `/pending`).
- **Benefícios**: Pode reduzir cliques no fluxo fila → job → fila, mas o risco de conflito é maior que o ganho sem dados.
- **Impacto** Baixo · **Esforço** Médio · **Prioridade** P3 · **Referência**: Apple HIG — Gestures; Material Design 3 — Swipe
- **Verificação**: Só avançar com dado da etapa 146 mostrando uso real de voltar por swipe > 15% das voltas.

### 43. Zona de borda para o swipe-back (evitar conflito com drag)

- **Descrição**: `MainLayout.tsx:112-123` aplica `useSwipeGesture` no `<main>` inteiro com `threshold: 80`. Em `/kanban` o mesmo movimento horizontal é usado para arrastar card entre colunas — o swipe pode roubar o gesto.
- **Exemplo prático**: Passar uma opção `edgeOnly: 24` ao `useSwipeGesture` (só inicia se `touchstart.clientX < 24`) e desligar o swipe nas rotas com drag ativo, lendo um registro simples (`useDragSurface()`) que o Kanban declara enquanto há arraste.
- **Benefícios**: Operador deixa de 'voltar' sem querer ao mover um card — hoje é perda silenciosa de contexto no meio do trabalho.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Apple HIG — Gestures (edge swipe); Material Design 3 — Gesture conflicts
- **Verificação**: E2e mobile: arrastar card de coluna no `/kanban` e afirmar que a URL não muda; swipe da borda em `/alerts` volta.

### 44. Indicador de swipe coerente com a decisão de borda

- **Descrição**: `src/components/navigation/SwipeIndicator.tsx:13-25` mostra o indicador em qualquer swipe-right fora de `/`, `/operator` e `/auth` — inclusive quando o swipe não vai disparar nada (ex.: rota com drag, depois da etapa 44).
- **Exemplo prático**: Fazer o indicador ler a mesma decisão do gesto (hook compartilhado), e mostrar o rótulo do destino ('Voltar para Máquinas') em vez de só a seta, usando `parentOf`.
- **Benefícios**: O usuário vê para onde o gesto leva antes de completá-lo — reduz desistência e saída acidental.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Material Design 3 — Predictive back affordance; Nielsen 1
- **Verificação**: E2e mobile: iniciar swipe em `/machines/compare` e afirmar que o indicador contém 'Máquinas'.

### 45. Corrigir o atalho `/jobs` do PWA, que abre 404

- **Descrição**: `public/manifest.json:71` declara um shortcut com `"url": "/jobs"`, e **não existe rota `/jobs`** em `src/routes/AppRoutes.tsx` (a lista de `path=` vai de `/` a `/track` e não inclui `/jobs`). Quem instala o app e usa o atalho cai no `NotFound`.
- **Exemplo prático**: Apontar o shortcut para `/kanban` (a tela de jobs real) ou adicionar um redirect `/jobs` → `/kanban` em `AppRoutes.tsx`, no mesmo padrão dos redirects já existentes (`/abc` → `/abc-costing`, `/operators/productivity` → `/operator-productivity`). Preferir o redirect: links antigos salvos por usuários também passam a funcionar.
- **Benefícios**: Atalho de tela inicial do tablet deixa de levar a erro — hoje é a primeira impressão de quem instala o PWA.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen 1; W3C Web App Manifest — shortcuts
- **Verificação**: E2e: `page.goto('/jobs')` deve terminar em `/kanban` com `h1` da tela de jobs, não no `NotFound`.

## Categoria 2 — Consistência e padrões de UI/UX (etapas 46 a 80)

Padronização de componentes, micro-interações, hierarquia visual, contraste e feedback de ações.

### 46. Documentar o padrão de navegação no design system

- **Descrição**: `/design-system` é rota pública (`src/routes/AppRoutes.tsx`) e tem seções prontas (`src/components/design-system/sections/`), incluindo `BackToOverviewButton.tsx:13` e `error-states/HttpErrorStates.tsx:30` — mas nenhuma seção de navegação. Sem página de referência, cada agente/PR reinventa o cabeçalho.
- **Exemplo prático**: Nova seção `NavigationSection.tsx` com: `BackButton` (variantes desktop/kiosk), `PageHeader`, `Breadcrumbs`, `Stepper`, estados de erro de rota e a regra 'history primeiro, rota-pai depois'. Linkar as regras às linhas de código reais.
- **Benefícios**: Toda PR futura tem uma referência única; revisão fica objetiva.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 4; Material Design 3 — Design tokens e documentação
- **Verificação**: Rota `/design-system` renderiza a seção; axe sem violação nela.

### 47. Corrigir o contraste de `--muted-foreground`

- **Descrição**: `src/index.css:60` define `--muted-foreground: 20 10% 50%` sobre `--background: 30 20% 97%` (linha 37) — relação ~3,8:1, abaixo do mínimo 4,5:1 para texto normal. Esse token colore descrições, legendas e o próprio `BackButton` (`BackButton.tsx:83`).
- **Exemplo prático**: Escurecer para ~`20 12% 40%` no tema claro e verificar o par no tema escuro. Rodar o cálculo de contraste antes/depois e registrar no PR; não mexer em outros tokens na mesma PR.
- **Benefícios**: Texto secundário legível em tablet com reflexo de luz de fábrica — é onde ficam as instruções de navegação.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 1.4.3 Contrast (Minimum)
- **Verificação**: Axe com a regra `color-contrast` ativa nas rotas do sweep de `tests/e2e/accessibility.spec.ts`.

### 48. Corrigir o contraste de texto branco sobre `--primary`

- **Descrição**: `src/index.css:50-51` define `--primary: 24 95% 53%` com `--primary-foreground: 0 0% 100%` — branco sobre laranja fica em torno de 2,9:1. Afeta todo botão primário, inclusive 'Novo Agendamento' na sidebar (`AppSidebar.tsx:211-214`) e a `gradient-primary`.
- **Exemplo prático**: Duas saídas: escurecer `--primary` para ~`24 95% 42%` mantendo o laranja da marca, ou trocar `--primary-foreground` para um marrom muito escuro. Decisão visual: levar a proposta com as duas amostras.
- **Benefícios**: Rótulo de ação primária legível — hoje o botão mais importante do app é o de pior contraste.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 1.4.3
- **Verificação**: Axe `color-contrast` nas rotas com botão primário; captura visual lado a lado no PR.

### 49. Piso de tamanho de fonte: eliminar `text-[8px]` e `text-[9px]`

- **Descrição**: Medido nesta sessão: **969 ocorrências** de `text-[8px]`, `text-[9px]` ou `text-[10px]` em `src` (`grep -ro 'text-\[\(8\|9\|10\)px\]' src | wc -l`). A sidebar usa `text-[10px]` com `tracking-[0.2em]` nos rótulos de navegação (`NavButton.tsx:56`) e nos títulos de grupo (`AppSidebar.tsx:254`) — rótulo de navegação com 8–10px em tablet é ilegível de pé.
- **Exemplo prático**: Faseado: (a) criar as classes utilitárias `text-nav`, `text-meta` e `text-badge` em `src/index.css` com mínimos de 12px/11px/11px; (b) substituir primeiro nos componentes de navegação (`NavButton`, `NavGroupComponent`, `MobileNavigation`, `Breadcrumbs`); (c) demais usos em PRs por área.
- **Benefícios**: Navegação legível sem aproximar o rosto do tablet; menos erro de toque por leitura errada do rótulo.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 1.4.4 Resize Text; Material Design 3 — Type scale
- **Verificação**: `grep -ro 'text-\[8px\]\|text-\[9px\]' src/components/navigation src/components/layout | wc -l` igual a 0; visual regression da sidebar.

### 50. Alvo de toque de 44px em tudo que navega

- **Descrição**: Medido: **172** usos de `size="icon"` em `src`. O `MainLayout` já força `h-11 w-11` nos ícones do topo (`MainLayout.tsx:175,203`) e o `NavButton` usa `h-11` (`NavButton.tsx:44`) — mas o padrão não está no componente, está repetido na chamada. Onde esquecerem, o alvo cai para o default do `Button`.
- **Exemplo prático**: Alterar `src/components/ui/button.tsx` para que `size="icon"` tenha `min-h-11 min-w-11` por padrão, e `size="sm"` nunca fique abaixo de 36px de altura com `min-h-9`. Revisar visualmente as telas densas (Kanban, tabelas) na mesma PR.
- **Benefícios**: Erro de toque em tablet cai de forma transversal, sem precisar auditar 172 pontos.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.5.8 Target Size (Minimum); Apple HIG — 44pt
- **Verificação**: Script de teste que mede `boundingBox()` de todo `button` visível nas rotas do sweep e falha abaixo de 44×44 (exceções declaradas).

### 51. Padronizar foco visível em todos os controles de navegação

- **Descrição**: `src/components/navigation/CommandPaletteAdvanced.tsx:133` usa `focus:ring-0`, removendo o anel de foco. `NavButton.tsx:45` usa `focus-visible:ring-2`, e `AppSidebar.tsx:211` usa `focus:ring-2` (dispara também em clique de mouse). Três comportamentos diferentes.
- **Exemplo prático**: Padronizar `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1` via classe utilitária `focus-nav` em `src/index.css`, remover o `focus:ring-0` da paleta e trocar `focus:` por `focus-visible:` nos pontos de navegação.
- **Benefícios**: Usuário de teclado vê sempre onde está; usuário de mouse não vê anel desnecessário.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured
- **Verificação**: E2e: `Tab` pela sidebar e afirmar que o elemento focado tem `outline`/`box-shadow` != none em cada parada.

### 52. Rotular os botões-ícone sem nome accessível

- **Descrição**: Medido: de 172 `size="icon"`, **150 linhas** não têm `aria-label` na mesma linha (heurística de uma linha — parte pode ter o atributo em linha vizinha, logo o número real é menor). Casos confirmados: `src/components/kiosk/KioskMode.tsx:144` (atualizar) e `:147` (tela cheia) não têm rótulo algum; `:138-143` usa só `title`, que não cobre toque.
- **Exemplo prático**: Varredura por área, começando pelo kiosk e pela navegação: adicionar `aria-label` descritivo ('Atualizar fila', 'Entrar em tela cheia'). Onde há `title`, manter os dois (title para mouse, aria-label para leitor).
- **Benefícios**: Operador com leitor de tela consegue operar o kiosk; hoje ouve 'botão' sem mais nada.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: WCAG 4.1.2 Name, Role, Value; 2.5.3 Label in Name
- **Verificação**: Axe com a regra `button-name` nas rotas do sweep, incluindo `/kiosk` e `/packaging/kiosk`.

### 53. Tornar os cartões clicáveis acessíveis por teclado

- **Descrição**: Medido na mesma linha: **9** `onClick` em `<div>`/`<span>` (JSX multi-linha esconde outros, então o total é maior). Casos conhecidos pela auditoria da sessão anterior: `ShiftHandoverPage.tsx:316`, `OperatorView.tsx:149`, `CalendarTimeline.tsx:52`, `AgendaView.tsx:61`, `OperatorProductionCard.tsx:27`, `OperatorReadyJobCard.tsx:23`, `PendingJobsView.tsx:201`, `BINormalView.tsx:50,147,163`, `BIStatCard.tsx:27`, `ExecutiveChartsRow1.tsx:12,71`, `ExecutiveNorthStar.tsx:15` (lista herdada; confirmar linha a linha antes de editar).
- **Exemplo prático**: Para cada caso: se a ação é navegar, usar `<Link>`; se é abrir modal, usar `<button type="button">` com `className` do card. Onde o card contém outros botões, manter o `div` e adicionar um botão-overlay invisível com `aria-label`, nunca `role="button"` + `tabIndex` manual.
- **Benefícios**: Operador que usa teclado/leitor consegue abrir job e ver KPI; hoje esses caminhos simplesmente não existem sem mouse.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: WCAG 2.1.1 Keyboard; ARIA APG — button pattern
- **Verificação**: Axe + e2e: `Tab` até o primeiro card da fila e `Enter` abre o job.

### 54. Hierarquia de títulos consistente por página

- **Descrição**: Com o `PageHeader` adotado (etapas 14-16), o `h1` fica garantido, mas as seções internas usam níveis variados. NÃO VERIFICADO a distribuição de `h2`/`h3` por página.
- **Exemplo prático**: Definir no design system: `h1` só no `PageHeader`; cada card de seção abre com `h2`; subitens com `h3`. Migrar área por área, começando pelas telas de analytics (muitos cards).
- **Benefícios**: Leitor de tela navega por títulos (atalho mais usado); hoje a lista de títulos de uma página de BI é inútil.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 1.3.1, 2.4.6; ARIA APG — headings
- **Verificação**: Axe com `heading-order` nas rotas do sweep.

### 55. Padronizar a posição das ações primárias da página

- **Descrição**: Com o `PageHeader`, `actions` fica à direita do título (`PageHeader.tsx:38`). Hoje as páginas colocam a ação principal em lugares diferentes (topo, rodapé do card, flutuante).
- **Exemplo prático**: Regra: ação primária da página em `actions`; ações de item ficam no item; ação em massa aparece numa barra contextual que surge com a seleção (padrão do `KanbanBoard`). Documentar na seção do design system (etapa 46).
- **Benefícios**: O usuário procura a ação sempre no mesmo canto — menos varredura visual por tela.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 4; Material Design 3 — Top app bar actions
- **Verificação**: Visual regression das páginas migradas; checklist no template de PR.

### 56. Padronizar os estados de um botão (hover/active/disabled/loading)

- **Descrição**: `src/components/ui/button.tsx:4` importa framer-motion e cada chamada adiciona suas próprias classes (`active:scale-95` em `BackButton.tsx:85`, `active:scale-[0.98]` em `NavButton.tsx:45`, `hover:pl-4` em `NavButton.tsx:44`). Três escalas de 'pressionado' diferentes.
- **Exemplo prático**: Centralizar no `buttonVariants`: um único `active:scale-[0.98]`, um único `hover` por variante, e um estado `loading` com spinner + `aria-busy` + `disabled`. Remover as classes duplicadas nos chamadores de navegação.
- **Benefícios**: O app passa a 'responder igual' em qualquer botão — o sinal mais forte de produto acabado.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Material Design 3 — States; Nielsen 4
- **Verificação**: `npx vitest run` nos testes do botão para `aria-busy` e `disabled` em loading; visual regression.

### 57. Feedback de ação em menos de 100ms em todo botão que navega

- **Descrição**: `NavButton.tsx:29-32` e `BackButton.tsx:48-49` já disparam háptico e som. Outros pontos de navegação (cards, breadcrumb, paleta) não dão retorno imediato — em tablet lento o usuário toca duas vezes.
- **Exemplo prático**: Padronizar `onPointerDown` com `trigger('light')` nos controles de navegação via um `useNavFeedback()`, e aplicar `active:` visual no mesmo pointer-down (não no click).
- **Benefícios**: Duplo toque acidental cai; o operador sabe que o toque foi registrado antes da tela mudar.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; Material Design 3 — Touch ripple timing
- **Verificação**: E2e medindo o intervalo entre `pointerdown` e a primeira mudança visual (< 100ms) via `page.evaluate` + `performance`.

### 58. Indicador de 'carregando esta ação' nos botões de submit

- **Descrição**: NÃO VERIFICADO o padrão atual de submit nos formulários. Sem estado de loading no próprio botão, o usuário reenvia.
- **Exemplo prático**: Usar o estado `loading` da etapa 56 em todo submit, ligado ao `isPending` da mutation do TanStack Query, com o rótulo mudando ('Salvando…') e `aria-busy="true"`.
- **Benefícios**: Evita job duplicado por duplo clique — risco operacional real na fila de produção.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; WCAG 4.1.3 Status Messages
- **Verificação**: E2e com mutation atrasada: segundo clique não dispara segunda chamada (contagem de requests = 1).

### 59. Toast de confirmação com ação de desfazer onde fizer sentido

- **Descrição**: Sonner suporta ação no toast. Ações reversíveis (mover card, arquivar alerta, marcar lido) hoje confirmam sem oferecer desfazer. NÃO VERIFICADO quais fluxos já têm desfazer.
- **Exemplo prático**: Padronizar `toast.success('Job movido para Produção', { action: { label: 'Desfazer', onClick: undo } })` com janela de 8s, e implementar `undo` via mutation inversa nos 5 fluxos mais usados.
- **Benefícios**: Reduz medo de errar — o usuário age mais rápido quando sabe que pode voltar atrás.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3 (user control and freedom); Material Design 3 — Snackbar with action
- **Verificação**: E2e: mover card, clicar Desfazer, afirmar que o card voltou à coluna de origem.

### 60. Posição e duração únicas para toasts

- **Descrição**: Dois toasters (`src/App.tsx:12-13`) mais o `NetworkStatusToaster` (14) podem ocupar regiões diferentes. Depois da etapa 33 sobra um, mas a duração e a posição precisam ser definidas num lugar.
- **Exemplo prático**: Configurar `<Sonner position="bottom-right" duration={5000} closeButton />` (no kiosk, `position="top-center"` e 8s, porque o operador não olha o canto) via prop derivada de `useDevice`.
- **Benefícios**: Aviso aparece onde o olho já está; no kiosk deixa de passar despercebido.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Material Design 3 — Snackbar placement; Nielsen 1
- **Verificação**: Visual regression com um toast forçado em desktop e em viewport de tablet.

### 61. Diferenciar visualmente link interno de ação

- **Descrição**: No app, botões e links são visualmente intercambiáveis (ex.: `IntegrationHub.tsx:61` usa texto '← Voltar para Integrações'). O usuário não sabe se vai navegar ou executar.
- **Exemplo prático**: Regra: navegação = `<Link>` com sublinhado no hover e cursor de link; ação = `Button`. Corrigir os casos de texto-seta manual para usar `BackButton`/`Link` com ícone `ArrowLeft`.
- **Benefícios**: Previsibilidade: o usuário sabe antes de clicar se vai sair da tela.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 4; WCAG 2.4.4
- **Verificação**: Revisão visual + `grep -rn "← " src --include=*.tsx` sem resultados fora do design system.

### 62. Micro-interação de entrada só no conteúdo, não no chrome

- **Descrição**: `AppSidebar.tsx` anima o indicador de grupo com `layoutId` (`motion.div` em 227-234) e usa `StaggeredList` para os grupos. A sidebar reanimar a cada navegação custa CPU no tablet e distrai.
- **Exemplo prático**: Manter a animação do indicador (é informação), remover o stagger de entrada dos grupos depois da primeira montagem (`initial={false}`), e deixar transição de conteúdo apenas no `<main>`.
- **Benefícios**: Navegação parece mais rápida e o olho vai para o conteúdo novo, não para o menu.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Material Design 3 — Motion (persistent vs transient surfaces)
- **Verificação**: Medir FPS durante 5 navegações seguidas em viewport de tablet antes/depois.

### 63. Padronizar a animação de abertura de modal

- **Descrição**: 70 arquivos usam Radix `Dialog`, 9 `Sheet` e 15 `AlertDialog` (contagem herdada da auditoria; NÃO VERIFICADO nesta sessão). Cada um pode trazer sua própria classe de animação.
- **Exemplo prático**: Centralizar a animação em `src/components/ui/dialog.tsx`/`sheet.tsx`/`alert-dialog.tsx` (fade + scale 0.98 → 1, 180ms), remover overrides nos chamadores, e respeitar `MotionConfig` da etapa 36.
- **Benefícios**: Modal abre igual em todo o sistema; menos código e menos variação percebida como bug.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Material Design 3 — Dialog motion; Apple HIG — Modality
- **Verificação**: Visual regression de 3 modais representativos (Dialog, Sheet, AlertDialog).

### 64. Esqueleto no lugar de spinner dentro de cards

- **Descrição**: `src/pages/KioskPage.tsx:120-126` usa spinner de página inteira. Spinner não informa forma nem progresso.
- **Exemplo prático**: Trocar por skeleton com a forma da fila do kiosk (3 cards grandes). Varrer os spinners restantes e substituir onde há forma previsível; manter spinner só em ação pontual (botão).
- **Benefícios**: Reduz a percepção de espera e o salto de layout quando os dados chegam.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 1; Material Design 3 — Loading
- **Verificação**: Visual regression do estado de loading de `/kiosk`.

### 65. Mensagem de estado vazio com próxima ação

- **Descrição**: `src/pages/PackagingKioskPage.tsx:18,67-70` mostra 'Fila zerada' — texto correto quando a fila está vazia, enganoso quando a query falhou (etapa 31). O padrão de vazio precisa de ação.
- **Exemplo prático**: Padronizar `<EmptyState title descrição action />`: 'Nenhum job na fila' + 'Atualizar' + horário da última atualização. Usar em todas as listas.
- **Benefícios**: O operador sabe se é para esperar ou agir, e vê há quanto tempo o dado é.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; Material Design 3 — Empty states
- **Verificação**: E2e com fila vazia real: estado vazio traz botão de atualizar e timestamp.

### 66. Carimbo de atualização nas telas de operação

- **Descrição**: `src/pages/PackagingKioskPage.tsx` mostra data sem relógio/atualização automática (região da linha 48, herdado da auditoria; confirmar). Num kiosk que fica horas aberto, dado velho parece dado atual.
- **Exemplo prático**: Adicionar 'Atualizado às HH:MM' derivado de `dataUpdatedAt` do TanStack Query, com cor de atenção depois de 5 min, em `/kiosk`, `/packaging/kiosk`, `/operator` e `/pending`.
- **Benefícios**: Elimina decisão tomada sobre informação velha — o risco mais caro do kiosk.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen 1; WCAG 4.1.3 Status Messages
- **Verificação**: E2e com `clock` do Playwright avançando 6 min: o carimbo muda de cor e o texto reflete o tempo.

### 67. Badge de contagem com rótulo acessível

- **Descrição**: `MainLayout.tsx:177-181,205-209` mostra contagem de não lidas num `Badge` visual, com o nome acessível vindo do `aria-label` do `Link` (174/202) — correto. Já `NavButton.tsx:57-62` mostra `item.badge` sem nenhum texto alternativo.
- **Exemplo prático**: No `NavButton`, compor o `aria-label` do botão com a contagem: `aria-label={badge ? `${label} (${badge} pendentes)` : label}` e marcar o badge visual com `aria-hidden`.
- **Benefícios**: Leitor de tela anuncia a carga de trabalho pendente por área, igual ao que o olho vê.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 1.1.1 Non-text Content; 4.1.2
- **Verificação**: Axe + e2e: `getByRole('link', { name: /Alertas \(\d+ pendentes\)/ })` resolve quando há alertas.

### 68. Padronizar a densidade: usar o `compactMode` que já existe

- **Descrição**: `src/contexts/UserPreferencesContext.tsx:10` tem `compactMode: boolean`. NÃO VERIFICADO quantos componentes o respeitam.
- **Exemplo prático**: Levantar os consumidores; se forem poucos, aplicar o modo nos elementos de navegação e listas (altura de linha, padding de card) via classe no `<body>` e tokens CSS, em vez de prop por componente.
- **Benefícios**: Coordenador no monitor grande vê mais linhas; operador no tablet mantém alvo grande. Uma preferência, efeito global.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Material Design 3 — Density; Nielsen 7 (flexibilidade)
- **Verificação**: Teste visual nos dois modos; `npx vitest run` no contexto de preferências.

### 69. Unificar as 4 classes de ErrorBoundary

- **Descrição**: Existem quatro: `src/components/ui/error-boundary.tsx` (reload na 80, `href` na 84), `src/components/error/GlobalErrorBoundary.tsx` (17,40,45), `src/components/ui/section-error-boundary.tsx:26` e `src/components/auth/AuthErrorBoundary.tsx`. Mensagens e ações divergem; duas forçam reload, o que descarta o estado do app.
- **Exemplo prático**: Manter `GlobalErrorBoundary` (app), `SectionErrorBoundary` (bloco) e a nova `RouteErrorBoundary` (etapa 30); transformar `ui/error-boundary.tsx` em re-export e remover `window.location.reload()` em favor de remount por `key`. `AuthErrorBoundary` fica por ter contexto próprio (sessão).
- **Benefícios**: Erro passa a ter uma linguagem só, e 'Tentar de novo' deixa de significar 'perca tudo o que estava na tela'.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 9; Material Design 3 — Error states
- **Verificação**: Teste por boundary com componente que lança; afirmar que não há `location.reload` no caminho de retry.

### 70. Texto de erro orientado a ação, em PT-BR

- **Descrição**: NÃO VERIFICADO os textos atuais de cada boundary. Mensagem técnica ('Something went wrong') não ajuda operador.
- **Exemplo prático**: Padrão de três linhas: o que aconteceu ('Não consegui carregar a fila'), o que fazer ('Tentar de novo' / 'Voltar para Embalagem'), e o código curto para suporte (id do evento do Sentry). Todos os textos via i18next (`pt-BR`).
- **Benefícios**: O operador resolve sozinho ou passa um código útil ao suporte, em vez de 'deu erro'.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 9; WCAG 3.3.1 Error Identification
- **Verificação**: `npx vitest run` nos boundaries afirmando presença das 3 partes; revisão de i18n sem string literal solta.

### 71. `aria-live` para mudanças assíncronas de conteúdo

- **Descrição**: `src/components/accessibility/index.tsx` exporta `SkipLinks`/`MainContent` e, pela auditoria, há `useLiveAnnounce` e `AccessibilityProvider` sem consumidor (montado em `src/main.tsx:80`; NÃO VERIFICADO nesta sessão).
- **Exemplo prático**: Ler o módulo; ligar `useLiveAnnounce` aos eventos que mudam a tela sem navegação: filtro aplicado ('23 jobs'), item movido, sincronização offline concluída, fila atualizada no kiosk.
- **Benefícios**: Quem usa leitor de tela acompanha o que mudou sem ter de varrer a página de novo.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 4.1.3 Status Messages; ARIA — live regions
- **Verificação**: E2e lendo o conteúdo da região `aria-live` após aplicar filtro.

### 72. Ordem de leitura e DOM coerentes no cabeçalho global

- **Descrição**: `MainLayout.tsx:155-212` posiciona as barras de ação com `fixed` fora do fluxo do `<main>`, enquanto o cabeçalho da página (224-251) vem depois no DOM. Para o teclado, a ordem pode não corresponder ao que se vê.
- **Exemplo prático**: Verificar a ordem de tabulação real e reordenar o DOM (ou usar `tabindex` só onde inevitável) para: skip links → Voltar → breadcrumb → título → ações da página → ações globais.
- **Benefícios**: Teclado percorre a tela na ordem em que ela é lida — hoje salta para o canto superior direito.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 2.4.3 Focus Order
- **Verificação**: E2e que coleta a sequência de `document.activeElement` em 10 `Tab` e compara com a ordem esperada.

### 73. `lang` dinâmico no `<html>`

- **Descrição**: `src/components/.../LanguageSwitcher.tsx:22` troca o idioma do i18next, mas `document.documentElement.lang` nunca é atualizado (nenhum hit de `documentElement.lang` em `src`). O `index.html` fixa um valor e o leitor de tela usa a pronúncia errada se o usuário trocar.
- **Exemplo prático**: No handler de troca de idioma (ou num efeito no provider de i18n), setar `document.documentElement.lang = i18n.language`. `public/manifest.json` já declara `"lang": "pt-BR"`.
- **Benefícios**: Pronúncia correta no leitor de tela e tradução automática correta do navegador.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 3.1.1 Language of Page, 3.1.2 Language of Parts
- **Verificação**: Axe com `html-has-lang`; e2e troca idioma e lê `document.documentElement.lang`.

### 74. Skip links fora do `MainLayout`

- **Descrição**: `<SkipLinks />` só é montado em `MainLayout.tsx:132`. As rotas que não usam o layout — `/auth`, `/reset-password`, `/kiosk`, `/packaging/kiosk`, `/track`, `/install`, `/design-system` — ficam sem 'pular para o conteúdo'.
- **Exemplo prático**: Mover `SkipLinks` para dentro de `PublicPage`/`ProtectedPage` em `src/routes/AppRoutes.tsx:107-148` (ou para o `App`), garantindo o par `#main-content`/`#main-content-scroll` em cada tela, e manter um único alvo por rota.
- **Benefícios**: Critério 2.4.1 passa no app inteiro; no kiosk o teclado chega à fila sem percorrer o chrome.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.4.1 Bypass Blocks
- **Verificação**: Axe `bypass` nas 7 rotas fora do layout; e2e aperta `Tab` + `Enter` e confere foco no conteúdo.

### 75. Rever o `Escape` registrado sem ação

- **Descrição**: `src/components/shortcuts/KeyboardShortcuts.tsx:60` registra `Escape` sem executar nada (herdado da auditoria; confirmar a linha antes de editar). Atalho declarado e inerte vira expectativa frustrada — e pode mascarar o `Escape` do Radix.
- **Exemplo prático**: Remover o registro inerte, ou dar-lhe a ação esperada: fechar a sobreposição mais acima (dialog → sheet → paleta → painel de ajuda) consultando o `DialogHistoryGuard`.
- **Benefícios**: `Escape` passa a significar sempre 'fechar o que está na frente'.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: ARIA APG — Dialog (Escape); Nielsen 3
- **Verificação**: E2e: abrir modal dentro de paleta e provar que dois `Escape` fecham na ordem certa.

### 76. Publicar a lista de atalhos e mantê-la verdadeira

- **Descrição**: `KeyboardShortcuts.tsx:32-33` documenta 'Alt + ←' e 'Alt + B' — ambos existem (`use-navigation-hotkeys.ts:30,72`). Mas `Alt+H`, `Alt+N`, `Alt+S` e `Alt+R` (39-69) precisam estar na mesma lista, e `Alt+R` recarrega a página inteira (68), o que merece aviso.
- **Exemplo prático**: Gerar a lista de atalhos a partir de um único mapa usado pelo hook e pelo diálogo de ajuda, para não divergirem. Trocar `Alt+R` por `refetch` das queries da rota em vez de `window.location.reload()`.
- **Benefícios**: Atalho documentado é atalho usado; recarregar sem perder o estado evita perda de trabalho.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 2.1.4 Character Key Shortcuts; Nielsen 7
- **Verificação**: `npx vitest run` comparando o mapa exportado com as teclas tratadas no hook; e2e de `?` já existe (`navigation.spec.ts:126`).

### 77. Consistência do rótulo entre sidebar, breadcrumb e título

- **Descrição**: Hoje o mesmo destino tem nomes diferentes: sidebar 'KPIs e Ocupação' (`sidebarNavConfig.ts`), título 'KPIs' (`usePageTitle.ts:21`), breadcrumb 'KPIs' (`Breadcrumbs.tsx:54`). Para 'Produção 10/10' (`sidebarNavConfig.ts`) o breadcrumb diz 'Fábrica Autônoma' (`Breadcrumbs.tsx:71`).
- **Exemplo prático**: Com `routeLabels.ts` (etapa 12) como fonte única, derivar os três de lá, permitindo um rótulo curto (breadcrumb) e um longo (sidebar) explicitamente declarados, nunca divergentes por acidente.
- **Benefícios**: O usuário encontra no título a mesma palavra que clicou no menu — base de confiança na navegação.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.5.3 Label in Name; 3.2.3 Consistent Navigation
- **Verificação**: Teste que compara, para cada rota, o rótulo da sidebar com o título e o breadcrumb e falha em divergência não declarada.

### 78. Tratar o `GlobalSearch` órfão: adotar ou remover

- **Descrição**: `src/components/navigation/GlobalSearch.tsx` tem ~317 linhas e, pela auditoria, está órfão, enquanto `CommandPaletteAdvanced` é o buscador ativo (montado globalmente via `ProductDesignProvider`, ver comentário em `MainLayout.tsx:287`). Código morto de busca confunde quem for mexer em busca (categoria 6).
- **Exemplo prático**: Confirmar a ausência de importadores; se confirmada, remover o arquivo na mesma PR em que a paleta receber a melhoria de retorno ao contexto (etapa 171), citando a evidência no corpo do PR.
- **Benefícios**: Menos bundle e uma só porta de busca para evoluir.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 4; dívida técnica
- **Verificação**: `grep -rn "GlobalSearch" src` apenas no próprio arquivo antes de remover; build e `npm run lint` verdes depois.

### 79. Tratar o `PullToRefresh` órfão: adotar nas telas de operação

- **Descrição**: `src/components/mobile/PullToRefresh.tsx` e `src/hooks/use-pull-to-refresh.tsx` existem e só se referenciam entre si — nenhum consumidor. Em tablet, 'arrastar para atualizar' é o gesto esperado para fila.
- **Exemplo prático**: Adotar em `/operator`, `/pending`, `/packaging` e `/kiosk`, ligado ao `refetch` das queries da rota, com o cuidado de não conflitar com o scroll do `<main>` (`MainLayout.tsx:140-147`) nem com o swipe-back (etapa 44).
- **Benefícios**: Operador atualiza a fila sem procurar botão; o componente já escrito passa a dar retorno.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Material Design 3 — Pull to refresh; Apple HIG — Refresh content
- **Verificação**: E2e mobile: gesto de pull dispara uma chamada de rede e mostra o indicador.

### 80. Checklist de navegação no template de PR — **[DONO]**

- **Descrição**: As regras das etapas 46-80 só se mantêm se a revisão as cobrar. Alterar `.github/PULL_REQUEST_TEMPLATE` mexe em configuração do repositório.
- **Exemplo prático**: Adicionar ao template: 'página tem `h1` via `PageHeader`?', 'aba/filtro na URL?', 'erro e vazio tratados?', '`aria-label` nos ícones?', 'alvo ≥ 44px?', 'respeita `prefers-reduced-motion`?'. PR fica aberta para o dono por tocar em `.github/`.
- **Benefícios**: Cada PR futura chega com as decisões de UX já conferidas — custo zero de revisão depois.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 4; processo
- **Verificação**: PR aberta com o diff do template; o dono aprova (item 8 do Fluxo Git).

## Categoria 3 — Acessibilidade e inclusão (etapas 81 a 115)

Multi-dispositivo, gestos com alternativa, leitor de tela, contraste e fonte ajustável.

### 81. Preferência de tamanho de fonte no app

- **Descrição**: `src/contexts/UserPreferencesContext.tsx:4-10` tem `language`, `dateFormat`, `dashboardLayout`, `notificationsEnabled`, `soundEnabled` e `compactMode` — **não tem `fontSize`**. Operador com presbiopia depende do zoom do navegador, que no PWA em tela cheia é difícil de alcançar.
- **Exemplo prático**: Adicionar `fontSize: 'normal' | 'grande' | 'extra'` à interface e aplicar como `font-size` no `:root` (16px / 18px / 20px). Como o Tailwind usa `rem`, toda a interface escala sem tocar em componente. Controle em `/settings` com três botões grandes e pré-visualização.
- **Benefícios**: Inclusão direta do operador mais velho — e o ajuste vale no kiosk, onde o zoom do navegador não está disponível.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 1.4.4 Resize Text; Material Design 3 — Accessibility (font scaling)
- **Verificação**: E2e: trocar para 'extra' e afirmar que `getComputedStyle(document.documentElement).fontSize` mudou e que nenhum texto de navegação é cortado (sem `overflow` horizontal).

### 82. Garantir layout usável em zoom 200%

- **Descrição**: Com 969 usos de tamanho fixo em px (`text-[8|9|10px]`) e a sidebar com `tracking-[0.2em]`, o risco de corte em zoom é alto. O `MainLayout` usa `h-dvh` com `overflow-hidden` (`MainLayout.tsx:130`), o que pode esconder conteúdo em zoom.
- **Exemplo prático**: Testar as rotas do sweep em 200% e corrigir os pontos de corte: trocar px por `rem` nas classes utilitárias criadas na etapa 49, permitir quebra de linha em rótulos e deixar o cabeçalho global quebrar em duas linhas em telas estreitas.
- **Benefícios**: Quem usa zoom deixa de perder os controles de navegação — hoje eles ficam na área cortada.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 1.4.4, 1.4.10 Reflow
- **Verificação**: E2e com `page.setViewportSize` equivalente a 200% (640×512 CSS) nas rotas do sweep: sem `scrollWidth > clientWidth` no `<body>`.

### 83. Navegação por teclado completa na sidebar colapsada

- **Descrição**: `AppSidebar.tsx:100` usa `useFocusTrap` e `NavButton.tsx:67-77` troca o rótulo por tooltip quando colapsada. Com tooltip no `TooltipTrigger`, o nome accessível vem do `aria-label` (42) — correto. NÃO VERIFICADO se a sidebar colapsada é alcançável e operável só por teclado em desktop.
- **Exemplo prático**: Testar `Tab`/`Shift+Tab`/`Enter` com a sidebar colapsada e expandida; garantir que o botão de colapsar tem `aria-expanded` e que o estado é anunciado.
- **Benefícios**: Usuário de teclado opera o menu nos dois estados — hoje o estado colapsado é desenhado para mouse.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.1.1; ARIA APG — Disclosure
- **Verificação**: E2e: colapsar por teclado, navegar até o 3º item e `Enter`; axe sem violação.

### 84. Foco preso corretamente em modais empilhados

- **Descrição**: `DialogHistoryGuard.tsx:19` já distingue dialogs abertos de fechando (`data-state`), e `useFocusTrap` existe (`src/hooks/use-focus-trap.tsx`). Com modal dentro de modal (ex.: confirmação sobre `JobDetailsModal`), o foco precisa voltar ao modal de baixo ao fechar o de cima. NÃO VERIFICADO esse caso.
- **Exemplo prático**: Testar e, se necessário, garantir que o Radix recebe `onCloseAutoFocus` devolvendo o foco ao gatilho correto, e que a sentinela do guard não interfere.
- **Benefícios**: Leitor de tela não 'cai' para o início da página ao fechar uma confirmação — hoje é o erro mais comum em pilha de modal.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: ARIA APG — Dialog (Modal) focus management; WCAG 2.4.3
- **Verificação**: E2e: abrir job → confirmar exclusão → Escape → afirmar `activeElement` dentro do modal do job.

### 85. Anunciar a mudança de rota para leitores de tela

- **Descrição**: `MainLayout.tsx:75-109` move o foco para o `h1`, o que já anuncia a tela nova — mas só quando existe `h1` (etapa 17) e quando o foco não está em uso. Em navegação por paleta de comandos ou notificação, o anúncio pode não acontecer.
- **Exemplo prático**: Complementar com uma região `aria-live="polite"` que recebe 'Entrou em <título da página>' a cada troca de `pathname`, usando `PATH_TITLES` da etapa 12. Suprimir quando o foco já foi para o `h1` para não anunciar duas vezes.
- **Benefícios**: Quem não vê a tela sabe que a navegação aconteceu e para onde foi.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 4.1.3 Status Messages; WCAG 2.4.2
- **Verificação**: E2e lendo a região live após navegar pela paleta; axe sem `aria-live` duplicado.

### 86. Landmarks completos e únicos em cada rota

- **Descrição**: `MainLayout.tsx:140` tem `<main id="main-content-scroll">`, 155 e 193 usam `role="toolbar"`, 225 usa `<header>` e `AppSidebar` tem `<nav>` (220). Fora do layout (kiosk, auth, track) não há landmarks.
- **Exemplo prático**: Garantir em cada rota: um `main`, um `nav` principal com `aria-label`, `header` da página, e nenhum landmark duplicado sem rótulo. Nas rotas de kiosk, envolver a fila num `main` e dar `aria-label` à barra de ações.
- **Benefícios**: Leitor de tela pula direto para o conteúdo em qualquer tela, inclusive no kiosk.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 1.3.1, 2.4.1; ARIA — landmark roles
- **Verificação**: Axe com `landmark-one-main` e `region` nas rotas do sweep.

### 87. Rótulos de formulário associados em todos os formulários de navegação

- **Descrição**: Busca da paleta, busca do `NotFound` (`src/pages/NotFound.tsx:41,67-78`) e campos de filtro podem usar placeholder como rótulo. NÃO VERIFICADO caso a caso.
- **Exemplo prático**: Auditar campos de busca/filtro e garantir `<Label>` associado (visível ou `sr-only`), `aria-describedby` para dica, e `type="search"` onde couber.
- **Benefícios**: Campo de busca anunciado corretamente — a busca é a principal via alternativa de navegação (categoria 6).
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 1.3.1, 3.3.2 Labels or Instructions
- **Verificação**: Axe `label` nas rotas com filtro; e2e com leitor simulado lendo o nome accessível do campo.

### 88. Mensagem de erro de campo ligada ao campo

- **Descrição**: O projeto usa Zod + react-hook-form. NÃO VERIFICADO se as mensagens usam `aria-invalid`/`aria-describedby` nos campos.
- **Exemplo prático**: Garantir no `src/components/ui/form.tsx` (shadcn) que `FormMessage` é referenciada por `aria-describedby` e que o campo recebe `aria-invalid`. Em `NewJobPage`, a validação por etapa (`navigation.spec.ts:114-124` já testa o avanço) deve mover o foco para o primeiro campo inválido.
- **Benefícios**: Quem não vê o texto vermelho descobre o erro e vai direto ao campo — hoje o avanço bloqueado parece 'o botão não funciona'.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 3.3.1 Error Identification, 3.3.3 Error Suggestion
- **Verificação**: E2e: tentar avançar com campo vazio → foco no campo → `aria-invalid="true"` e mensagem lida por `aria-describedby`.

### 89. Alvos de 56px e espaçamento no kiosk

- **Descrição**: `src/pages/PackagingKioskPage.tsx` já usa `h-14` (56px) nos alvos — bom. `src/pages/KioskPage.tsx:132` usa `size="sm"`, e `src/components/kiosk/KioskMode.tsx:138-150` usa `size="icon"` padrão.
- **Exemplo prático**: Criar `size="kiosk"` no `buttonVariants` (56px, `px-6`, fonte 16px) e aplicar em todo controle das rotas de kiosk, com espaçamento mínimo de 12px entre alvos para uso com luva.
- **Benefícios**: Menos toque errado com luva — erro de toque no kiosk custa registro de produção errado.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.5.8; Apple HIG — 44pt mínimo, mais em contexto industrial
- **Verificação**: E2e no viewport do tablet medindo `boundingBox()` de todos os controles de `/kiosk` e `/packaging/kiosk`.

### 90. Orientação livre no PWA para tablet em pé e deitado

- **Descrição**: `public/manifest.json:9` fixa `"orientation": "portrait-primary"`. Em tablet montado na horizontal na linha de produção, o app instalado pode travar na vertical ou girar o conteúdo.
- **Exemplo prático**: Trocar para `"any"` e garantir que as telas de kiosk funcionam nas duas orientações (grid que reflui). Decisão de produto leve, mas mexe no manifest instalado: avisar no PR.
- **Benefícios**: O tablet pode ser montado como a linha precisa, não como o manifest decidiu.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: WCAG 1.3.4 Orientation
- **Verificação**: E2e nas duas orientações (`setViewportSize` 1280×800 e 800×1280) nas rotas de kiosk sem `scrollWidth > clientWidth`.

### 91. Modo de alto contraste

- **Descrição**: O app tem tema claro/escuro (`src/contexts/ThemeContext.tsx`, `ThemeToggle`). Não há modo de alto contraste, e em chão de fábrica com reflexo o tema claro atual (contraste 3,8:1 em texto secundário, etapa 47) é insuficiente.
- **Exemplo prático**: Adicionar um terceiro tema `high-contrast` com `--muted-foreground` ≥ 7:1, bordas sólidas de 2px e remoção de `opacity` em texto. Respeitar também `@media (prefers-contrast: more)`.
- **Benefícios**: Leitura confiável em tablet sob luz direta — reduz erro de leitura de fila.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 1.4.6 Contrast (Enhanced); CSS prefers-contrast
- **Verificação**: Axe com `color-contrast-enhanced` no tema de alto contraste.

### 92. Não depender só de cor para estado de job

- **Descrição**: O Kanban e a fila usam cor para prioridade/atraso. NÃO VERIFICADO se há ícone ou texto redundante em todos os estados.
- **Exemplo prático**: Auditar os badges de estado e garantir ícone + texto junto da cor (ex.: 'Atrasado' com ícone de alerta). Vale também para o indicador 'Sistema Online' (`MainLayout.tsx:239-245`), que hoje é um ponto verde + texto — este já está correto.
- **Benefícios**: Operador com daltonismo (8% dos homens) distingue atrasado de no prazo.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 1.4.1 Use of Color
- **Verificação**: Revisão com simulação de deuteranopia + e2e afirmando texto junto do badge.

### 93. Alternativa textual para os gráficos de BI

- **Descrição**: As telas de BI/OEE/executivo são gráficos. NÃO VERIFICADO se há tabela ou resumo textual equivalente.
- **Exemplo prático**: Para cada gráfico, oferecer um `<details>` 'Ver dados' com tabela acessível (`caption`, `th scope`), e `aria-label` no container do gráfico com o resumo ('OEE médio de 78% nos últimos 7 dias').
- **Benefícios**: Gerente que usa leitor de tela consegue ler o indicador; o mesmo resumo serve de texto para exportação.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 1.1.1 Non-text Content
- **Verificação**: Axe nas rotas de BI + e2e abrindo o `<details>` e lendo a tabela.

### 94. Tabelas com cabeçalho associado e navegação por teclado

- **Descrição**: Há tabelas em auditoria, inventário, histórico de scan e relatórios. NÃO VERIFICADO o uso de `scope`/`caption`.
- **Exemplo prático**: Padronizar em `src/components/ui/table.tsx`: `caption` obrigatório (pode ser `sr-only`), `th scope="col"`/`"row"`, e `aria-sort` nas colunas ordenáveis (ligado ao estado de ordenação da URL, etapa 26).
- **Benefícios**: Leitor de tela anuncia 'coluna Máquina, linha 4' — navegação em tabela deixa de ser adivinhação.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 1.3.1; ARIA APG — Table/Grid
- **Verificação**: Axe `th-has-data-cells`/`scope-attr-valid` nas rotas com tabela.

### 95. Gesto de swipe com alternativa por botão

- **Descrição**: O swipe-back (`MainLayout.tsx:112-123`) é o único caminho de voltar no mobile quando o header mobile não está visível — e `BackButton` retorna `null` em mobile (`BackButton.tsx:70-72`). Gesto sem alternativa exclui quem tem limitação motora.
- **Exemplo prático**: Garantir que o Voltar do `MobileNavigation` (377-385) está sempre acessível na viewport mobile (não dentro de um menu que precisa ser aberto). Se não estiver, mostrar o `BackButton` também em mobile, no cabeçalho da página.
- **Benefícios**: Critério 2.5.1 atendido: toda função com gesto tem equivalente de um ponteiro.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.5.1 Pointer Gestures, 2.5.7 Dragging Movements
- **Verificação**: E2e mobile em 5 rotas: `getByRole('button', { name: /Voltar/ })` visível sem abrir menu.

### 96. Alternativa ao arraste no Kanban

- **Descrição**: Mover card entre colunas é drag-and-drop. WCAG 2.2 exige alternativa de ponteiro único para arraste.
- **Exemplo prático**: Adicionar no menu de cada card 'Mover para…' com a lista de colunas (e atalho de teclado), usando a mesma mutation do drag. Combina com a etapa 44 (zona de borda).
- **Benefícios**: Operador com tremor ou usando só teclado consegue tocar a fila — hoje não consegue.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: WCAG 2.5.7 Dragging Movements; 2.1.1
- **Verificação**: E2e sem arraste: abrir menu do card, escolher coluna, afirmar a mudança; axe na rota.

### 97. Tempo suficiente em avisos e sessões

- **Descrição**: Toast com 5s (etapa 57) pode ser curto para leitura em fábrica; e há expiração de sessão/reauth (`src/contexts/ReauthContext.tsx`). NÃO VERIFICADO se há aviso antes de expirar.
- **Exemplo prático**: Toast persistente para erro (sem auto-dismiss) e, na reauth, aviso 60s antes com opção de estender. Avisos críticos do kiosk sem auto-dismiss.
- **Benefícios**: O operador não perde a informação por piscar rápido nem é expulso no meio de um registro.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 2.2.1 Timing Adjustable; 2.2.6 Timeouts
- **Verificação**: E2e com `clock` conferindo que o toast de erro permanece e que o aviso de sessão aparece antes da expiração.

### 98. Atalhos de teclado desativáveis

- **Descrição**: `use-navigation-hotkeys.ts:30-78` registra `Alt+←`, `Alt+B`, `Alt+H`, `Alt+N`, `Alt+S`, `Alt+R`. Com modificador, o risco de conflito é menor, mas o usuário não pode desligar.
- **Exemplo prático**: Adicionar `shortcutsEnabled` às preferências (`UserPreferencesContext`) e respeitar no hook. Documentar na ajuda (`?`).
- **Benefícios**: Quem usa software assistivo com atalhos próprios não fica preso aos nossos.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: WCAG 2.1.4 Character Key Shortcuts
- **Verificação**: `npx vitest run` no hook com a preferência desligada: nenhuma navegação ocorre.

### 99. Rótulo de ícone no `MobileQuickActions` e no FAB

- **Descrição**: `src/components/navigation/MobileQuickActions.tsx` é o FAB mobile (montado em `MainLayout.tsx:272-276`). NÃO VERIFICADO se os ícones têm `aria-label`.
- **Exemplo prático**: Auditar e rotular cada ação do FAB, e garantir `aria-expanded` no gatilho e foco preso enquanto aberto.
- **Benefícios**: Atalho principal do mobile deixa de ser invisível para leitor de tela.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 4.1.2; ARIA APG — Disclosure
- **Verificação**: Axe na viewport mobile; e2e abrindo o FAB por teclado.

### 100. Som e háptico como complemento, nunca única pista

- **Descrição**: `SoundFeedback.navBack()` (`BackButton.tsx:49`) e háptico (`NavButton.tsx:30`) dão retorno. `soundEnabled` existe nas preferências. Em ambiente ruidoso o som não chega, e háptico não existe em desktop.
- **Exemplo prático**: Garantir que todo retorno sonoro/háptico tem par visual (etapa 53) e respeitar `soundEnabled`/`prefers-reduced-motion` também no háptico.
- **Benefícios**: Retorno de ação funciona para todos os perfis e ambientes.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: WCAG 1.4.2 Audio Control; Nielsen 1
- **Verificação**: `npx vitest run` no `use-haptic-feedback` respeitando a preferência; revisão visual.

### 101. Legendas e textos sem depender de tooltip

- **Descrição**: `NavButton.tsx:67-77` usa tooltip como único rótulo na sidebar colapsada; tooltip não abre no toque e desaparece rápido.
- **Exemplo prático**: Em tablet, nunca colapsar a sidebar (ou mostrar rótulo abaixo do ícone); no desktop, manter tooltip apenas como complemento ao `aria-label` (que já existe na linha 42).
- **Benefícios**: Operador em tablet não precisa descobrir o que cada ícone faz por tentativa e erro.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 1.4.13 Content on Hover or Focus; 2.5.3
- **Verificação**: E2e no tablet: a sidebar expandida mostra rótulos de texto em todos os itens.

### 102. Conteúdo não obscurecido pelo foco no cabeçalho fixo

- **Descrição**: `MainLayout.tsx:155,193` fixam barras com `z-40` no topo. Ao tabular por elementos no início do conteúdo, o elemento focado pode ficar atrás dessas barras.
- **Exemplo prático**: Adicionar `scroll-margin-top` equivalente à altura da barra nos elementos focáveis do conteúdo (ou `scroll-padding-top` no container `#main-content-scroll`).
- **Benefícios**: O usuário de teclado vê o que está focado — hoje pode focar algo escondido atrás da barra.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.4.11 Focus Not Obscured (Minimum)
- **Verificação**: E2e: tabular do skip link até o 3º elemento e comparar `boundingBox()` com a área da barra fixa.

### 103. Textos de navegação traduzidos via i18next, sem literal

- **Descrição**: `BackButton.tsx:88,94,98` usa literais em PT-BR; `AppSidebar.tsx:157` usa `t('common.back', 'Voltar')`. Padrão misto impede trocar idioma de verdade.
- **Exemplo prático**: Migrar os literais dos componentes de navegação para `t()` com namespace `navigation`, mantendo PT-BR como default, e garantir que o `aria-label` também é traduzido.
- **Benefícios**: Base para um segundo idioma (há `LanguageSwitcher`) sem revisitar a navegação.
- **Impacto** Baixo · **Esforço** Baixo · **Prioridade** P3 · **Referência**: WCAG 3.1.2; i18n
- **Verificação**: `npx vitest run` com i18n em modo estrito falhando em chave ausente.

### 104. Leitura correta de números e horários pelo leitor de tela

- **Descrição**: Códigos de job, horários e percentuais aparecem com formatação visual. NÃO VERIFICADO se há `aria-label` com a forma falada.
- **Exemplo prático**: Nos pontos de navegação (cards de fila, breadcrumb de job), adicionar `aria-label` legível ('job 1 2 3 4', '14 horas e 30') onde a leitura automática ficar ruim, sem duplicar o texto visível.
- **Benefícios**: Reduz erro de identificação de job por audição.
- **Impacto** Baixo · **Esforço** Médio · **Prioridade** P3 · **Referência**: WCAG 1.3.1; ARIA — accessible name
- **Verificação**: Revisão com leitor de tela real documentada no PR (teste manual).

### 105. Modo de uma mão no tablet

- **Descrição**: No tablet de 10", os controles de navegação estão no topo (`MainLayout.tsx:155,193,224`), fora do alcance do polegar de quem segura o aparelho.
- **Exemplo prático**: Nas rotas de operação em viewport de tablet, espelhar os controles essenciais (Voltar, atualizar, buscar) numa barra inferior — reaproveitando o `MobileNavigation`, que já existe e já trata o Voltar (377-385).
- **Benefícios**: Menos troca de mão durante o trabalho; menos aparelho derrubado.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Apple HIG — Reachability; Material Design 3 — Bottom app bar
- **Verificação**: E2e no viewport de tablet: barra inferior visível nas rotas de operação com os 3 controles.

### 106. Rever o `AccessibilityProvider` sem consumidor

- **Descrição**: Pela auditoria, `AccessibilityProvider` é montado em `src/main.tsx:80` e `useLiveAnnounce` não tem consumidor (NÃO VERIFICADO nesta sessão). Provider sem uso dá falsa sensação de cobertura.
- **Exemplo prático**: Ler `src/components/accessibility/index.tsx` e `src/main.tsx`; ligar o provider aos usos das etapas 77 e 85, ou removê-lo se não houver utilidade. Não deixar montado sem função.
- **Benefícios**: A infraestrutura de acessibilidade passa a existir de fato, não só no provider tree.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 4.1.3; dívida técnica
- **Verificação**: `grep -rn "useLiveAnnounce" src` com pelo menos um consumidor real; teste do anúncio.

### 107. Sweep axe estendido às rotas de kiosk e públicas

- **Descrição**: `tests/e2e/accessibility.spec.ts:7-18` roda o sweep por uma lista de rotas. NÃO VERIFICADO se a lista inclui `/kiosk`, `/packaging/kiosk`, `/track`, `/install` e `/mfa-enrollment` — justamente as que estão fora do `MainLayout` e, portanto, sem skip links.
- **Exemplo prático**: Ler a lista e completá-la; essas rotas exigem login diferente (kiosk) ou nenhum (track/install), então o spec precisa de setup por grupo.
- **Benefícios**: O sweep passa a cobrir as telas de maior risco (operação sem supervisão).
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.2 AA (verificação); processo de teste
- **Verificação**: `npx playwright test tests/e2e/accessibility.spec.ts` com as rotas novas na lista e sem violação crítica.

### 108. Regra de lint para `aria-label` em botão-ícone

- **Descrição**: Depois da etapa 52, nada impede um novo `size="icon"` sem rótulo. `eslint-plugin-jsx-a11y` provavelmente já está no projeto (NÃO VERIFICADO).
- **Exemplo prático**: Ativar/configurar a regra que exige conteúdo accessível em botão (`jsx-a11y/control-has-associated-label`) com a opção para o `Button` do shadcn, e tratar as exceções com comentário justificado.
- **Benefícios**: A dívida de 150 linhas não volta a crescer.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 4.1.2; processo
- **Verificação**: `npm run lint` falhando num botão-ícone sem rótulo adicionado de propósito num branch de teste.

### 109. Regra de lint contra `onClick` em elemento não interativo

- **Descrição**: Medido: 9 casos em uma linha (o total real é maior com JSX multi-linha). Sem regra, o padrão volta.
- **Exemplo prático**: Ativar `jsx-a11y/no-noninteractive-element-interactions` e `click-events-have-key-events` com baseline (igual ao `scripts/check-any-baseline.mjs` já usado no `pre-commit`), para não travar a `main` e ainda impedir novos casos.
- **Benefícios**: Dívida congelada e decrescente, sem bloquear o time.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 2.1.1; processo
- **Verificação**: Baseline criada e `npm run lint` falhando num caso novo.

### 110. Verificação de contraste automatizada nos tokens

- **Descrição**: As etapas 47 e 48 corrigem dois tokens. Nada impede um token novo entrar fora da faixa.
- **Exemplo prático**: Script `scripts/check-contrast.mjs` que lê os pares de tokens de `src/index.css` (background/foreground, primary/primary-foreground, muted/muted-foreground, card, popover, destructive) e falha abaixo de 4,5:1 (3:1 para texto grande).
- **Benefícios**: Contraste deixa de depender de alguém lembrar de checar.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: WCAG 1.4.3; processo
- **Verificação**: `node scripts/check-contrast.mjs` verde depois das etapas 47-48 e vermelho com um token proposital fora da faixa.

### 111. Rótulo acessível no indicador de rede e offline

- **Descrição**: `NetworkStatusIndicator` (`MainLayout.tsx:167,195`) e `OfflineReadyIndicator` (170,198) são ícones de estado. `src/components/kiosk/KioskMode.tsx:131-135` mostra `Wifi`/`WifiOff` sem texto nem rótulo.
- **Exemplo prático**: Adicionar `role="status"` + `aria-label` ('Conectado' / 'Sem conexão — trabalhando offline') e texto visível no kiosk, onde a informação é crítica.
- **Benefícios**: Operador sabe que está offline antes de registrar produção que pode não subir.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 4.1.3; 1.4.1
- **Verificação**: Axe nas rotas de kiosk; e2e com `context.setOffline(true)` lendo a região de status.

### 112. Foco inicial correto ao abrir modal de job

- **Descrição**: ARIA APG pede foco no primeiro elemento útil (ou no título) ao abrir dialog. Com 70 usos de Dialog, o comportamento provavelmente varia. NÃO VERIFICADO.
- **Exemplo prático**: Padronizar no `src/components/ui/dialog.tsx`: foco no título (`tabindex=-1`) por padrão, e `autoFocus` explícito só onde houver campo principal (busca, quantidade).
- **Benefícios**: O usuário de leitor de tela entende qual modal abriu antes de ouvir campos.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: ARIA APG — Dialog (Modal); WCAG 2.4.3
- **Verificação**: E2e abrindo 3 modais e afirmando `activeElement` no título ou no campo declarado.

### 113. Nome accessível distinto para controles repetidos

- **Descrição**: Em lista de jobs, vários botões 'Abrir' / ícones iguais. NÃO VERIFICADO se os nomes incluem o item.
- **Exemplo prático**: Compor o nome com o item: `aria-label={`Abrir job ${job.code}`}`. Vale para botões de linha em tabelas (auditoria, inventário).
- **Benefícios**: Navegação por lista de controles do leitor de tela deixa de ser 'Abrir, Abrir, Abrir'.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 2.4.6; 4.1.2
- **Verificação**: Axe + e2e afirmando nomes únicos entre os botões visíveis de uma lista.

### 114. Documentar o perfil de acessibilidade do sistema

- **Descrição**: `ANALISE_TECNICA_SISTEMA.md` registra dívidas conhecidas (RLS permissiva, CORS wildcard). Não há registro do estado de acessibilidade, então cada agente reinvestiga.
- **Exemplo prático**: Criar `docs/agentes/acessibilidade.md` com: o que já existe (`SkipLinks`, foco no `h1`, `aria-current` nos pontos listados, sweep axe), o que está aberto (lista desta categoria com números de etapa) e como verificar. Atualizar no mesmo PR de cada etapa concluída, como manda o AGENTS.md.
- **Benefícios**: Para o dono: um lugar que diz o nível real de acessibilidade. Para agentes: zero reinvestigação.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Processo; WCAG 2.2 (declaração de conformidade)
- **Verificação**: Arquivo criado e citado em `AGENTS.md` na seção de 'ler quando'.

### 115. Perfil de operador: navegação reduzida e sem distração

- **Descrição**: `sidebarNavConfig.ts:13-15` define `ALL_ROLES`, `STAFF_ONLY` e `COORD_ONLY`, e a sidebar filtra por papel. Mesmo assim, o operador vê o `AssistantButton` (`MainLayout.tsx:279-283`), o `QuickFavoritesBar` (156-160), o `SystemOnboarding` (288-290) e duas barras de ações — muito ruído para quem só precisa da fila.
- **Exemplo prático**: Criar um modo 'operação' derivado do papel: no perfil `operator`, montar só Voltar, breadcrumb, notificações e o conteúdo; esconder favoritos, assistente e indicadores secundários. Implementar como condição no `MainLayout`, lendo `useAuth` (já disponível via `AppSidebar.tsx:46`), não como rota nova.
- **Benefícios**: Menos elementos para o operador percorrer com leitor de tela ou teclado e menos chance de sair da tela de trabalho por engano.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 8 (design minimalista); WCAG 2.4.1
- **Verificação**: E2e logado como operador: afirmar ausência dos widgets secundários e presença do Voltar; contar paradas de `Tab` até o conteúdo (deve cair).

## Categoria 4 — Otimização de fluxos complexos (etapas 116 a 145)

Barra de progresso, salvar e retomar, loops de voltar e ações irreversíveis.

### 116. Stepper com progresso explícito no `MfaEnrollmentPage`

- **Descrição**: `src/pages/MfaEnrollmentPage.tsx` não tem nenhuma ocorrência de `step`/`Step` (`grep -n "step\|Step"` sem resultado) e não tem `h1`. O cadastro de MFA tem fases naturais (gerar segredo → escanear QR → confirmar código → guardar códigos de recuperação) e o usuário não sabe quantas faltam nem pode voltar uma.
- **Exemplo prático**: Ler a página, mapear as fases reais e adotar o `Stepper` da etapa 34 com `PageHeader` ('Ativar verificação em duas etapas'), mais Voltar por etapa que não perde o segredo já gerado.
- **Benefícios**: Abandono no meio do cadastro de MFA cai — e MFA abandonado é risco de segurança que já está no roteiro do dono.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Material Design 3 — Stepper; Nielsen 1
- **Verificação**: E2e do fluxo até a etapa de confirmação, voltando uma etapa e conferindo que o QR é o mesmo.

### 117. Stepper na execução de manutenção (TPM)

- **Descrição**: `src/features/maintenance/components/MaintenanceExecutionModal.tsx` não tem ocorrência de `step` (`grep` sem resultado) — a execução acontece num modal único. Em TPM o técnico executa uma sequência (checar → medir → trocar → registrar) e precisa saber onde parou.
- **Exemplo prático**: Ler o modal, mapear o fluxo real e, se houver sequência, adotar o `Stepper` com salvamento parcial por etapa (etapa 122). Modal grande com `?modal=` (etapa 128) para poder voltar sem perder.
- **Benefícios**: Manutenção interrompida por chamado urgente pode ser retomada — hoje reinicia.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Material Design 3 — Stepper; Nielsen 3
- **Verificação**: E2e: avançar 2 etapas, fechar o modal, reabrir e conferir a etapa e os dados preservados.

### 118. Checklist pré-produção: 'pular' e 'salvar parcial' não podem contar como concluído

- **Descrição**: `src/components/operator/PreProductionChecklist.tsx` e `PreProductionChecklistModal.tsx` — pela auditoria anterior, pular ou salvar parcial é tratado como conclusão. NÃO VERIFICADO nesta sessão; ler os dois arquivos antes de qualquer mudança. Se confirmado, é um problema de dado, não só de UX: o job segue como 'verificado' sem ter sido.
- **Exemplo prático**: Separar três estados — `pendente`, `parcial`, `concluido` — na UI e no payload, com o stepper mostrando quantos itens faltam e o botão principal desabilitado (com motivo) até o mínimo obrigatório. 'Salvar e continuar depois' é ação secundária explícita.
- **Benefícios**: Integridade do registro de qualidade e rastreabilidade; o operador sabe que ficou pendente.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 1 e 5; WCAG 3.3.4 Error Prevention
- **Verificação**: Teste unitário do payload nos três casos + e2e confirmando que 'pular' deixa o job em `parcial`.

### 119. Barra de progresso de etapa com contagem e tempo restante

- **Descrição**: `NewJobPage.tsx:245-270` mostra o stepper, sem indicação de progresso numérico. Em fluxo de 4+ etapas, 'Etapa 2 de 4' reduz abandono.
- **Exemplo prático**: No `Stepper` (etapa 34), adicionar `aria-label="Etapa 2 de 4"` e um texto visível pequeno; nos fluxos longos, estimar o que falta pelo número de campos obrigatórios restantes.
- **Benefícios**: Expectativa calibrada = menos abandono no meio.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; Material Design 3 — Progress
- **Verificação**: E2e lendo o rótulo em cada etapa; axe sem violação.

### 120. Auto-save de rascunho em todos os formulários longos

- **Descrição**: `NewJobPage.tsx:51,67,129,155,225` já salva rascunho em `localStorage` por usuário (`fg-new-job-draft:<userId>`) e limpa ao concluir (225) e ao cancelar (129). É o único formulário com isso.
- **Exemplo prático**: Extrair o mecanismo para `useFormDraft(key, values)` com debounce de 1s e versionamento do esquema (para descartar rascunho de formato antigo), e aplicar nos formulários de máquina, operador, técnica, override de SLA e relatório customizado.
- **Benefícios**: Trabalho digitado sobrevive a queda de rede, recarga e troca de turno — ganho direto em tablet instável.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3; Material Design 3 — Save states
- **Verificação**: `npx vitest run src/hooks/use-form-draft.test.ts`: grava com debounce, restaura, descarta versão antiga.

### 121. Aviso visível de 'rascunho restaurado' com opção de descartar

- **Descrição**: `NewJobPage.tsx:67` lê o rascunho na montagem. NÃO VERIFICADO se há aviso ao usuário de que os campos vieram de um rascunho. Restaurar silenciosamente faz o usuário enviar dado antigo sem perceber.
- **Exemplo prático**: Mostrar uma faixa no topo do formulário: 'Rascunho de 14:32 restaurado — Descartar', com a ação limpando o `localStorage` e o form.
- **Benefícios**: Evita job criado com dados de ontem; o usuário controla o que restaura.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen 1 e 3; WCAG 3.3.4
- **Verificação**: E2e: salvar rascunho, recarregar, afirmar a faixa e que 'Descartar' limpa os campos.

### 122. Rascunho por usuário e limpeza no logout, verificada

- **Descrição**: `NewJobPage.tsx:51` usa `DRAFT_KEY_BASE` + userId, e a auditoria indica limpeza no logout em `src/features/auth/.../AuthProvider.tsx:57-62` (NÃO VERIFICADO nesta sessão). Em tablet compartilhado entre turnos, rascunho de um operador aparecendo para outro é problema de privacidade e de dado.
- **Exemplo prático**: Ler o `AuthProvider`, confirmar a limpeza e estendê-la a todas as chaves de rascunho criadas pela etapa 120 (prefixo comum `fg-draft:`), além de limpar `command_recent`/`command_favorites` se forem por usuário.
- **Benefícios**: Tablet compartilhado deixa de misturar o trabalho de dois operadores.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Privacidade; Nielsen 3
- **Verificação**: Teste: logar A, criar rascunho, deslogar, logar B e afirmar formulário vazio.

### 123. Modais longos com `?modal=` para poder voltar sem perder

- **Descrição**: `use-modal-param.ts` já existe e, pelo teste `use-modal-param.test.tsx:30-37`, é usado em `/inventory` (`batch-qr`, `ai-prediction`). Os modais longos de trabalho (detalhe de job, execução de TPM, registro de produção) ainda não estão na URL — fechar sem querer perde tudo.
- **Exemplo prático**: Adotar `useModalParam` nos modais longos: `JobDetailsModal`, `MaintenanceExecutionModal`, `ProductionRegistrationModal` (`KioskPage.tsx:131`), `PreProductionChecklistModal`. Combinar com dirty-guard (etapa 22) para o back pedir confirmação quando houver dado digitado.
- **Benefícios**: Voltar fecha o modal em vez de sair da página; o link do modal é compartilhável para passagem de turno.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: ARIA APG — Dialog; Material Design 3 — Back handling
- **Verificação**: E2e por modal: abrir, Voltar (fecha), Voltar de novo (sai da página); deep-link reabre o modal.

### 124. Deep link para o item dentro do modal (`?id=`)

- **Descrição**: `useDeepLinkFocus` (`src/hooks/use-deeplink-focus.ts:9-45`) já trata `?focus=<id>` em listas, e `InventoryPage.tsx:63` já usa `?items=id1,id2`. Falta a combinação 'abrir o modal do job X direto'.
- **Exemplo prático**: Padronizar `?modal=job&id=<jobId>`: o modal lê o `id` e carrega o registro; se o id não existir, mostrar erro dentro do modal com 'Voltar para a fila', não fechar silenciosamente.
- **Benefícios**: Notificação e QR podem abrir exatamente o registro — base das etapas 181-185.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Material Design 3 — Deep links; Nielsen 1
- **Verificação**: E2e: `page.goto('/kanban?modal=job&id=<id>')` abre o modal com o job certo; id inválido mostra erro.

### 125. Confirmação específica para ação irreversível, nomeando o objeto

- **Descrição**: Depois da etapa 20, as exclusões em massa usam `useConfirm`. O texto genérico ('Tem certeza?') não previne erro.
- **Exemplo prático**: Padrão: título com o verbo e o objeto ('Excluir 3 jobs?'), corpo com a consequência e o que não volta, e — para exclusões grandes (> 10 itens) — exigir digitar a quantidade antes de habilitar o botão.
- **Benefícios**: Exclusão acidental em massa deixa de ser um clique de distância.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 3.3.4 Error Prevention; Nielsen 5
- **Verificação**: E2e: confirmação de 12 itens exige digitar '12'; botão desabilitado até então.

### 126. Desfazer para as ações reversíveis do Kanban e da fila

- **Descrição**: Complemento da etapa 55 aplicado ao fluxo crítico: mover card, mudar prioridade, atribuir máquina.
- **Exemplo prático**: Implementar `undo` por mutation inversa com janela de 8s e bloqueio do undo se outro usuário já alterou o registro (comparar `updated_at`), avisando 'alteração feita por outra pessoa'.
- **Benefícios**: Operador age rápido sem medo; conflito entre dois operadores fica explícito em vez de sobrescrever.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3; Material Design 3 — Snackbar with action
- **Verificação**: E2e com dois contextos do Playwright: A move, B move, undo de A é bloqueado com aviso.

### 127. Detectar e cortar loops de voltar

- **Descrição**: `useSmartBack` já usa `replace` no fallback para evitar o ciclo voltar→home→back→página (comentário em `use-smart-back.ts:39-41`), e o `DialogHistoryGuard` tem supressão de re-arme (`suppressUntilClosedRef`, linhas 46-50). Falta medir se ainda ocorrem loops reais — e um redirect de rota (`/abc` → `/abc-costing`) pode criar par de entradas.
- **Exemplo prático**: Fazer os dois redirects de `AppRoutes.tsx` usarem `<Navigate replace />` (confirmar se já usam) e instrumentar `navHistory` para emitir `nav.loop` quando a mesma rota aparecer 3 vezes em 5 entradas.
- **Benefícios**: Fim do 'voltar não sai daqui' — o pior defeito possível de navegação, porque o usuário perde a confiança no botão.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 3; Material Design 3 — Back stack hygiene
- **Verificação**: E2e: `/abc` → Voltar deve sair para a origem, não voltar a `/abc-costing`; evento `nav.loop` ausente no fluxo normal.

### 128. Voltar depois de criar: ir para o registro criado, não para o formulário

- **Descrição**: `NewJobPage.tsx:225` limpa o rascunho ao concluir. NÃO VERIFICADO para onde navega depois do envio. Se voltar para o formulário vazio, o usuário pode criar duplicado ao apertar Voltar.
- **Exemplo prático**: Depois do envio: `navigate(`/kanban?modal=job&id=${novoId}`, { replace: true })` — `replace` remove o formulário do histórico, então Voltar vai para a fila, não para um formulário que recriaria o job.
- **Benefícios**: Elimina duplicidade de job criada por Voltar — erro de dado com custo de produção.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Material Design 3 — Post-action navigation; Nielsen 5
- **Verificação**: E2e: criar job, apertar Voltar, afirmar que a URL é a fila e que nenhum job novo foi criado.

### 129. Confirmação de saída com 'salvar e sair' como terceira opção

- **Descrição**: O dirty-guard oferece sair ou continuar (`DirtyFormContext.tsx:36`). Para formulário válido, forçar a escolha entre perder ou ficar é desnecessário.
- **Exemplo prático**: Quando `formState.isValid`, oferecer três ações: 'Salvar e sair' (submete e navega), 'Sair sem salvar', 'Continuar editando'. Quando inválido, duas (e o motivo).
- **Benefícios**: O usuário sai sem perder trabalho — o caso mais frequente quando chega um chamado urgente.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3; Material Design 3 — Save-on-exit
- **Verificação**: E2e com formulário válido: 'Salvar e sair' cria o registro e navega; com inválido a opção não aparece.

### 130. Retomar fluxo interrompido a partir da tela inicial

- **Descrição**: Com rascunhos salvos (etapa 120), nada avisa o usuário na próxima entrada de que há trabalho em aberto.
- **Exemplo prático**: No Dashboard (`src/pages/Index.tsx`), um card 'Continuar onde parou' listando rascunhos e fluxos parciais (checklist `parcial` da etapa 118), cada um com link direto para a etapa em que ficou.
- **Benefícios**: Fluxo interrompido por turno ou chamado é retomado em um clique em vez de recomeçado.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 6 (reconhecer em vez de lembrar)
- **Verificação**: E2e: criar rascunho, voltar ao Dashboard, clicar no card e cair na etapa correta.

### 131. Validação por etapa com foco no primeiro erro

- **Descrição**: `tests/e2e/navigation.spec.ts:114-124` já cobre 'wizard avança só com campos obrigatórios válidos' em `/new-job`. Falta o retorno: quando bloqueia, o usuário precisa saber qual campo.
- **Exemplo prático**: No handler de 'Avançar', se inválido: `setFocus(primeiroCampoInvalido)` do react-hook-form, rolar até ele e anunciar por `aria-live` quantos campos faltam.
- **Benefícios**: Fim do 'o botão não funciona' — a razão número um de abandono em formulário longo.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 3.3.1, 3.3.3; Nielsen 9
- **Verificação**: E2e: tentar avançar vazio e afirmar `activeElement` no primeiro campo obrigatório.

### 132. Permitir voltar etapas sem perder o preenchido

- **Descrição**: O stepper de `NewJobPage.tsx:245-270` marca etapas concluídas com `Check` (258). NÃO VERIFICADO se clicar numa etapa anterior é possível e se preserva os dados.
- **Exemplo prático**: Tornar as etapas já concluídas clicáveis (botões, com `aria-current="step"` na atual) e preservar todos os valores no estado do form (um só `useForm` para o fluxo, não um por etapa).
- **Benefícios**: Correção de um campo anterior deixa de custar o fluxo inteiro.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Material Design 3 — Stepper (non-linear); ARIA APG — steps
- **Verificação**: E2e: na etapa 3, voltar à 1, alterar um campo, avançar e conferir que os dados das etapas 2 e 3 continuam.

### 133. Resumo antes de confirmar em fluxos de múltiplas etapas

- **Descrição**: NÃO VERIFICADO se `NewJobPage` tem etapa de revisão. Sem resumo, o usuário confirma às cegas o que digitou 4 telas atrás.
- **Exemplo prático**: Última etapa como 'Revisar e confirmar': todos os campos em leitura, cada bloco com link 'Editar' que volta à etapa correspondente (sem perder dados, etapa 132).
- **Benefícios**: Menos job criado com dado errado — correção antes do envio custa 10x menos que depois.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 5; WCAG 3.3.4 (revisão antes de submeter)
- **Verificação**: E2e: na revisão, clicar 'Editar' no bloco de máquina volta à etapa 2 com os dados intactos.

### 134. Bloquear envio duplicado em fluxo multi-etapas

- **Descrição**: Complemento da etapa 54 no caso mais caro: o envio final do job.
- **Exemplo prático**: Desabilitar o botão no primeiro clique (`isPending`), e usar chave de idempotência no payload para que um retry de rede não crie dois jobs.
- **Benefícios**: Dois jobs iguais na fila significam duas gravações — custo de material direto.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Nielsen 5; idempotência
- **Verificação**: Teste: disparar o submit duas vezes em paralelo e afirmar um único registro criado.

### 135. Salvar parcial explícito com rótulo honesto

- **Descrição**: Relacionado à etapa 118: 'salvar parcial' precisa dizer o que acontece.
- **Exemplo prático**: Rótulo 'Salvar e continuar depois' (nunca 'Salvar'), com toast 'Salvo como pendente — retome em Continuar onde parou' (etapa 130).
- **Benefícios**: O operador não acredita que terminou quando não terminou.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; WCAG 3.3.2
- **Verificação**: E2e: salvar parcial e afirmar que o card 'Continuar onde parou' aparece no Dashboard.

### 136. Timeout de fluxo no kiosk com retomada

- **Descrição**: No kiosk, o operador pode se afastar no meio de um registro. NÃO VERIFICADO se existe timeout.
- **Exemplo prático**: Depois de 3 min sem interação num fluxo aberto no kiosk, mostrar um aviso de 30s ('Continuar?'); sem resposta, salvar parcial e voltar à fila. Nunca descartar dado.
- **Benefícios**: O tablet volta a estar disponível para o próximo operador sem perder o registro do anterior.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: WCAG 2.2.1 Timing Adjustable; Nielsen 1
- **Verificação**: E2e com `clock` avançando 3 min: aviso aparece e, sem ação, o fluxo é salvo como parcial.

### 137. PIN para sair do kiosk — **[DONO]**

- **Descrição**: `KioskPage.tsx:132` permite sair do kiosk com um clique. Em tablet compartilhado na linha, sair do modo kiosk dá acesso à navegação completa com a sessão do operador aberta. É decisão de produto e de segurança.
- **Exemplo prático**: Opção de configuração (por máquina ou global): exigir PIN de 4 dígitos para sair do kiosk, reaproveitando o `ReauthContext` (`src/contexts/ReauthContext.tsx`). Levar a proposta ao dono com o custo (quem gerencia o PIN) antes de implementar.
- **Benefícios**: Impede uso indevido da sessão do operador; mantém a saída disponível para o supervisor.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 3 vs segurança; decisão de produto
- **Verificação**: PR aberta com a proposta e o fluxo desenhado; implementação só após decisão.

### 138. Confirmar troca de contexto que descarta leitura em andamento

- **Descrição**: No scanner (`/scanner`) e no kiosk, navegar no meio de uma leitura descarta o que foi lido. NÃO VERIFICADO se há guard.
- **Exemplo prático**: Registrar o dirty-guard também para 'leitura em andamento' (não só formulário), com texto próprio: 'Há 3 itens lidos e não registrados.'
- **Benefícios**: Leitura de QR em lote deixa de ser perdida por um toque no menu.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 3; WCAG 3.3.4
- **Verificação**: E2e: simular 2 leituras, clicar em outra rota, esperar a confirmação.

### 139. Navegação entre itens dentro do modal (anterior/próximo)

- **Descrição**: Abrir job, fechar, abrir o próximo é um loop de 3 ações por item. Em revisão de fila, isso domina o tempo.
- **Exemplo prático**: No `JobDetailsModal`, setas 'Anterior'/'Próximo' que trocam o `?id=` (etapa 129) mantendo o modal aberto, respeitando a ordem e os filtros da lista (etapas 26-28) e com atalhos `←`/`→`.
- **Benefícios**: Revisão de 20 jobs cai de 60 ações para 22 — ganho direto de tempo do coordenador.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Apple HIG — Modality (navegação dentro do modal); Nielsen 7
- **Verificação**: E2e: abrir o 1º job, apertar `→` 3 vezes e conferir que o `?id=` segue a ordem filtrada.

### 140. Preservar a posição da lista ao fechar o modal

- **Descrição**: `ScrollRestoration.tsx:111-116` já evita mover o scroll quando só a query muda — o que cobre abrir/fechar modal na mesma página. Falta garantir que o item que estava aberto fica visível e destacado ao fechar.
- **Exemplo prático**: Ao fechar o modal, aplicar o destaque de `useDeepLinkFocus` (classe `deeplink-focus-highlight`, `use-deeplink-focus.ts:30`) no item correspondente e devolver o foco ao gatilho.
- **Benefícios**: O usuário retoma a varredura da lista exatamente onde parou.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.4.3; Nielsen 6
- **Verificação**: E2e: abrir o 8º item da lista, fechar e afirmar foco no gatilho e item visível no viewport.

### 141. Fila de ações offline com estado visível por item

- **Descrição**: `src/hooks/useOfflineSync.ts` (27k) e `src/components/offline/*` já existem, com `PendingQueue.tsx` relacionado. NÃO VERIFICADO se cada ação pendente mostra seu estado individual.
- **Exemplo prático**: Garantir, na fila offline, por item: 'aguardando', 'enviando', 'falhou — tentar de novo', com ação por item e contador no indicador global (`OfflineReadyIndicator`).
- **Benefícios**: Operador sabe exatamente o que subiu e o que não — hoje o risco é registrar produção e não saber se foi.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 1; WCAG 4.1.3
- **Verificação**: E2e offline: criar 3 ações, voltar online e conferir a transição de estado de cada item.

### 142. Conflito de edição simultânea com escolha explícita

- **Descrição**: Dois coordenadores editando o mesmo job hoje provavelmente sobrescrevem (last write wins). NÃO VERIFICADO.
- **Exemplo prático**: Ao salvar, comparar `updated_at`; em divergência, mostrar um diálogo com os dois valores e as opções 'Manter o meu' / 'Usar o do servidor' / 'Cancelar'. Sem DDL — usa coluna existente.
- **Benefícios**: Fim da perda silenciosa de alteração entre turnos.
- **Impacto** Alto · **Esforço** Alto · **Prioridade** P2 · **Referência**: Nielsen 9; Material Design 3 — Conflict resolution
- **Verificação**: Teste com dois contextos: B salva depois de A e recebe o diálogo em vez de sobrescrever.

### 143. Onboarding contextual só na primeira visita de cada fluxo

- **Descrição**: `src/components/onboarding/SystemOnboarding.tsx` (react-joyride) é montado globalmente (`MainLayout.tsx:288-290`) e há `OnboardingTour.tsx`. Tour global não ensina o fluxo específico e tende a ser fechado.
- **Exemplo prático**: Trocar por dicas contextuais por fluxo (primeiro job, primeiro checklist, primeira execução de TPM), marcadas por usuário, com 'não mostrar de novo'. Manter o tour geral apenas para o primeiro login.
- **Benefícios**: Treinamento acontece quando é útil; menos interrupção no uso diário.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 10 (ajuda e documentação); Material Design 3 — Onboarding
- **Verificação**: E2e: primeira entrada em `/new-job` mostra a dica; segunda não.

### 144. Atalho para repetir a última criação

- **Descrição**: Criar jobs semelhantes em série é comum. Hoje o fluxo é integral a cada vez.
- **Exemplo prático**: No sucesso da criação, oferecer 'Criar outro igual' que abre `/new-job` com os campos preenchidos (exceto identificadores), usando o mesmo mecanismo de rascunho da etapa 120.
- **Benefícios**: Lote de jobs semelhantes deixa de custar N vezes o fluxo completo.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 7 (flexibilidade e eficiência)
- **Verificação**: E2e: criar job, usar 'Criar outro igual' e conferir campos pré-preenchidos e código vazio.

### 145. Rastro de etapas no breadcrumb de fluxo longo

- **Descrição**: `BreadcrumbContext` (etapa 13) pode representar a etapa atual de um fluxo, em vez de só a rota.
- **Exemplo prático**: Em fluxos multi-etapas, acrescentar o item da etapa ao breadcrumb ('Jobs > Novo Job > Máquina'), com os anteriores clicáveis (etapa 132) e o atual com `aria-current="page"`.
- **Benefícios**: O usuário sabe onde está no fluxo mesmo depois de atender uma interrupção.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: ARIA APG — Breadcrumb; WCAG 2.4.8
- **Verificação**: E2e: na etapa 2, o breadcrumb tem 3 itens e o 2º é clicável.

## Categoria 5 — Testes e validação (etapas 146 a 170)

KPIs, testes automatizados, teste com usuários e iteração.

### 146. Instrumentar o uso do Voltar como métrica, não só breadcrumb

- **Descrição**: `src/lib/navTelemetry.ts:9-16` registra `trackNavBack` como `Sentry.addBreadcrumb` — breadcrumb só aparece anexado a um erro. Sem erro, **nenhum dado de navegação é coletado**. Além disso, `enabled` exige `VITE_SENTRY_DSN` e `PROD` (linha 5), então em homologação não há nada.
- **Exemplo prático**: Trocar `addBreadcrumb` por evento contável: `Sentry.captureMessage` com amostragem (ex.: 10%) ou `Sentry.metrics` se disponível na versão instalada, com tags `via` e `to`. Manter o breadcrumb para contexto de erro.
- **Benefícios**: Primeira métrica real de navegação: quantas voltas por sessão, por qual caminho, e quantas caem no fallback (sinal de deep-link ruim).
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen — medição de usabilidade; processo
- **Verificação**: Após deploy, conferir no Sentry a chegada dos eventos `nav.back` com as tags; registrar a contagem de 24h no PR.

### 147. KPI: retrocessos repetidos como sinal de perda

- **Descrição**: Três voltas seguidas sem nenhuma ação entre elas é o sinal clássico de 'não encontrei o que queria'. Hoje não é medido.
- **Exemplo prático**: Em `src/lib/navHistory.ts`, contar voltas consecutivas sem evento de interação e emitir `nav.back.streak` com o tamanho da sequência e a rota de origem.
- **Benefícios**: Aponta exatamente quais telas fazem o usuário desistir — prioriza as etapas seguintes com dado em vez de palpite.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 3; medição de usabilidade
- **Verificação**: Evento presente com `streak >= 3` num fluxo simulado; relatório semanal de origens.

### 148. KPI: tempo até a primeira ação útil por rota

- **Descrição**: `main.tsx:41-45` coleta web-vitals (carregamento), mas não o tempo até o usuário conseguir agir (abrir job, aplicar filtro, registrar produção).
- **Exemplo prático**: Marcar `performance.mark('route:ready')` quando o `h1` existe e `performance.mark('route:firstAction')` no primeiro clique em controle de conteúdo; emitir a diferença por rota.
- **Benefícios**: Mede o que importa para o chão de fábrica: quanto tempo até conseguir trabalhar.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 1; Core Web Vitals (complemento)
- **Verificação**: Dados por rota por 7 dias; publicar o top 5 pior no `docs/`.

### 149. KPI: 404 por rota de origem

- **Descrição**: `src/pages/NotFound.tsx:57-59` só ajusta o título. Não há registro de de onde veio o 404 — e o atalho `/jobs` do manifest (etapa 45) prova que esses casos existem.
- **Exemplo prático**: No `NotFound`, emitir `nav.404` com `pathname`, `document.referrer` e `location.state`. Painel semanal com as rotas inexistentes mais tentadas.
- **Benefícios**: Link quebrado deixa de depender de alguém reclamar — o sistema avisa.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen 9; processo
- **Verificação**: Evento visível no Sentry após uma visita a uma rota inexistente; `/jobs` deve desaparecer da lista depois da etapa 45.

### 150. KPI: taxa de uso do fallback de deep-link

- **Descrição**: `BackButton.tsx:63` já chama `trackDeepLinkExit(location.pathname)`, que usa `captureMessage` (`navTelemetry.ts:27-33`) — ou seja, esta métrica já existe e é a única contável hoje.
- **Exemplo prático**: Montar o relatório: proporção de voltas em fallback por rota. Alta proporção significa que a rota é acessada por link externo e precisa de rota-pai boa (etapa 5) e de contexto próprio.
- **Benefícios**: Direciona onde a hierarquia de rota-pai mais importa, usando dado já coletado.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: medição de usabilidade
- **Verificação**: Relatório com 7 dias de dados anexado ao PR da etapa 2/5.

### 151. KPI: rage click e toque duplo

- **Descrição**: Três cliques no mesmo elemento em 1s indicam elemento que parece clicável e não é (os `onClick` em `div`, etapa 53) ou resposta lenta (etapa 54).
- **Exemplo prático**: Listener global com amostragem: contar cliques por elemento em janela de 1s e emitir `ux.rage_click` com seletor curto e rota. Amostrar 10% das sessões para não gerar custo.
- **Benefícios**: Encontra os elementos falsamente clicáveis sem auditar 58 páginas à mão.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 1; medição
- **Verificação**: Evento disparado num teste que clica 3x num `div` sem handler; custo de eventos monitorado.

### 152. KPI: abandono por etapa nos fluxos multi-etapas

- **Descrição**: `NewJobPage` tem 4 etapas e rascunho (`NewJobPage.tsx:51,155`); não se sabe em qual etapa as pessoas param.
- **Exemplo prático**: Emitir `flow.step` com `{ flow, step, action: 'enter'|'advance'|'abandon' }` ligado ao `Stepper` (etapa 34) e à limpeza de rascunho (129).
- **Benefícios**: Prioriza as etapas 131-135 pela etapa que de fato perde gente.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: medição de funil; Nielsen 1
- **Verificação**: Funil de 4 etapas reconstruído a partir dos eventos de 7 dias.

### 153. KPI: uso real de cada atalho e gesto

- **Descrição**: `use-navigation-hotkeys.ts` tem 6 atalhos e o swipe existe; a etapa 43 (gesto de avançar) depende de saber se o swipe é usado.
- **Exemplo prático**: `trackNavBack` já carrega `via` ('button' | 'swipe' | 'hotkey' | 'breadcrumb' | 'mobile-header', `navTelemetry.ts:7`) — basta torná-lo contável (etapa 146) e montar a distribuição.
- **Benefícios**: Decide o que manter, melhorar ou remover (ex.: `Alt+R`, que recarrega a página) com dado.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: medição; Nielsen 7
- **Verificação**: Distribuição por `via` publicada; decisão da etapa 43 registrada no `docs/`.

### 154. Painel de navegação no `docs/` atualizado por rotina

- **Descrição**: Os KPIs das etapas 146-153 não servem se ninguém olhar. O dono não é dev e não vai abrir o Sentry.
- **Exemplo prático**: Criar `docs/relatorios/navegacao-<AAMM>.md` gerado manualmente (ou por workflow `workflow_dispatch`, como `visual-baselines.yml`) com: voltas por sessão, top 5 rotas com fallback, top 5 com retrocesso repetido, 404 por origem, abandono por etapa.
- **Benefícios**: O dono vê em uma página se a navegação melhorou depois de cada onda de etapas.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: processo; medição
- **Verificação**: Primeiro relatório publicado com 7 dias de dados reais.

### 155. Teste e2e: Voltar fecha o modal antes de sair da página

- **Descrição**: `tests/e2e/navigation.spec.ts` cobre Voltar, breadcrumb, dirty-guard e `?modal=batch-qr` (linha 141), mas não a sequência 'modal aberto → Voltar fecha → Voltar sai'. É justamente o comportamento mais frágil (sentinela + `urlOwnedDialogCount`).
- **Exemplo prático**: Adicionar ao spec: abrir modal pela UI, `page.goBack()`, afirmar modal fechado e URL da página; `page.goBack()` de novo, afirmar saída da página.
- **Benefícios**: Protege a parte mais complexa do sistema (`DialogHistoryGuard.tsx` + `use-modal-param.ts`) contra regressão silenciosa.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: processo; ARIA APG — Dialog
- **Verificação**: `npx playwright test tests/e2e/navigation.spec.ts` verde com o caso novo.

### 156. Teste e2e: Voltar preserva filtro e aba

- **Descrição**: Depende das etapas 23-28. Sem teste, a primeira refatoração desfaz o ganho.
- **Exemplo prático**: Caso: aplicar filtro em `/kanban`, abrir job, Voltar, afirmar filtro na URL e a mesma contagem de cards. Idem para `?tab=` em `/settings`.
- **Benefícios**: Garante que o ganho mais percebido pelo usuário não regride.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: processo; Nielsen 3
- **Verificação**: Caso novo verde; falha proposital ao remover o `useFilterParams` comprova a cobertura.

### 157. Teste e2e: deep link abre a tela certa, com modal e item

- **Descrição**: Depende das etapas 128-129. `navigation.spec.ts:141` já cobre `?modal=batch-qr` em `/inventory`.
- **Exemplo prático**: Casos: `?modal=job&id=<id>` abre o job; `?focus=<id>` destaca o item; id inválido mostra erro dentro do modal.
- **Benefícios**: Notificação e QR passam a ter contrato testado — é por eles que o operador entra no sistema.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: processo
- **Verificação**: 3 casos novos verdes; `use-deeplink-focus` exercitado.

### 158. Teste e2e: fallback de rota-pai por rota

- **Descrição**: `navigation.spec.ts:24-32` já cobre o fallback para home. Depois da etapa 5 o destino muda por rota, e a cobertura precisa acompanhar.
- **Exemplo prático**: Teste orientado a dados: para cada par (rota, pai esperado) de `routeHierarchy`, abrir a rota direto e afirmar o destino do Voltar. Rodar num subconjunto de 10 rotas no CI e o conjunto completo em `workflow_dispatch`.
- **Benefícios**: O mapa de hierarquia não decai com rota nova.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: processo
- **Verificação**: Suite parametrizada verde; rota nova sem pai declarado falha o teste da etapa 12.

### 159. Teste e2e: dirty-guard em todos os formulários migrados

- **Descrição**: `navigation.spec.ts:79-113` cobre `/new-job`. A etapa 22 estende o guard a vários formulários.
- **Exemplo prático**: Helper `expectDirtyGuard(page, rota, seletorDeCampo)` e um caso por formulário migrado, para o custo marginal ser baixo.
- **Benefícios**: Impede que um formulário perca o guard numa refatoração.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: processo; WCAG 3.3.4
- **Verificação**: Helper criado e 5 casos verdes.

### 160. Teste e2e: swipe-back não dispara durante arraste no Kanban

- **Descrição**: Depende da etapa 44. É o conflito de gesto mais provável e o mais difícil de notar sem teste.
- **Exemplo prático**: Simular `touchstart/move/end` horizontal dentro de um card de `/kanban` e afirmar que a URL não mudou; e um swipe iniciado em `clientX < 24` que volta.
- **Benefícios**: Protege contra a volta do bug mais irritante do mobile.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: processo; WCAG 2.5.7
- **Verificação**: Dois casos verdes em viewport mobile.

### 161. Teste e2e: foco vai para o `h1` depois de navegar

- **Descrição**: `MainLayout.tsx:75-109` implementa o foco com retry; nada testa. Depende das etapas 14-17 (existir `h1`).
- **Exemplo prático**: Caso: navegar pela sidebar e afirmar `document.activeElement.tagName === 'H1'` dentro de 1,5s, em 5 rotas de áreas diferentes.
- **Benefícios**: Garante o anúncio de tela nova para leitor de tela em toda onda de adoção do `PageHeader`.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: WCAG 2.4.3; processo
- **Verificação**: 5 casos verdes; falha proposital removendo o `h1` de uma página comprova a cobertura.

### 162. Teste e2e: títulos únicos por rota

- **Descrição**: Depende da etapa 11. Verificação automática evita que rota nova entre sem título.
- **Exemplo prático**: Percorrer as rotas protegidas, coletar `page.title()` e afirmar (a) diferente do genérico e (b) sem duplicatas entre rotas distintas.
- **Benefícios**: Critério 2.4.2 garantido continuamente, não uma vez.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.4.2; processo
- **Verificação**: Suite verde; conflito de título aparece como falha nomeando as duas rotas.

### 163. Teste e2e: `aria-current` único na navegação

- **Descrição**: Depende da etapa 18.
- **Exemplo prático**: Em 8 rotas, afirmar `page.locator('[aria-current="page"]')` com contagem esperada (1 na sidebar + 1 no breadcrumb) e textos coerentes com a rota.
- **Benefícios**: Impede regressão do indicador de localização, que é invisível para quem não usa leitor.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.4.8; processo
- **Verificação**: Suite verde em 8 rotas.

### 164. Teste de unidade para `routeHierarchy` e `routeLabels`

- **Descrição**: Depende das etapas 2 e 12. Testes de unidade são mais baratos que e2e para mapas.
- **Exemplo prático**: `npx vitest run`: toda rota de `AppRoutes.tsx` tem rótulo e pai; nenhum pai aponta para rota inexistente; exceções cobertas.
- **Benefícios**: Trava a consistência na camada mais barata, antes do CI de e2e.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: processo
- **Verificação**: Dois arquivos de teste verdes, lendo `AppRoutes.tsx` como fonte.

### 165. Testes de unidade para `use-tab-param` e `use-filter-params`

- **Descrição**: Depende das etapas 23 e 26. `use-modal-param.test.tsx` já é o modelo a seguir (inclui o caso de 'Voltar morto', linha 52).
- **Exemplo prático**: Casos: default não escreve na URL; REPLACE não cria entrada; URL inválida cai no default; round-trip de filtros; debounce.
- **Benefícios**: O comportamento de histórico (PUSH vs REPLACE) fica fixado por teste — é onde erros de navegação nascem.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: processo
- **Verificação**: Dois arquivos verdes com os 5 casos cada.

### 166. Baseline visual das telas de navegação

- **Descrição**: `tests/e2e/visual-regression.spec.ts-snapshots/` tem 4 baselines (`dashboard-desktop`, `dashboard-mobile`, `sidebar-collapsed`, `sidebar-expanded`). Nenhuma cobre cabeçalho de página, breadcrumb, estado de erro ou kiosk.
- **Exemplo prático**: Adicionar baselines de: cabeçalho com `PageHeader`, breadcrumb colapsado (`MAX_VISIBLE_ITEMS = 4`, `Breadcrumbs.tsx:27`), estado de erro de rota, `/kiosk` e `/packaging/kiosk`. Regerar pelo `visual-baselines.yml` (`workflow_dispatch`).
- **Benefícios**: As mudanças de contraste e tipografia (etapas 47-49) passam a ser revisáveis visualmente.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: processo
- **Verificação**: Novos snapshots comitados após execução do workflow; diff intencional revisado no PR.

### 167. Teste de axe por rota com orçamento de violações zero nas críticas

- **Descrição**: `tests/e2e/accessibility.spec.ts:7-18` já roda axe por rota. NÃO VERIFICADO quais regras estão habilitadas/desabilitadas e qual o critério de falha.
- **Exemplo prático**: Ler o spec; fixar orçamento: zero violações `critical`/`serious` nas rotas de operação, e lista explícita de exceções temporárias com link para a etapa que resolve.
- **Benefícios**: A acessibilidade deixa de ser 'melhor esforço' e passa a ter porta no CI.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: WCAG 2.2 AA; processo
- **Verificação**: Spec com orçamento ativo; CI verde com as exceções declaradas.

### 168. Roteiro de teste com usuários reais (3 perfis) — **[DONO]**

- **Descrição**: Nenhum dado qualitativo existe. A escolha de quais etapas opcionais fazer (41-45, 196-200) depende de ver o uso real.
- **Exemplo prático**: Roteiro de 20 min por pessoa, com 1 coordenador, 1 operador de tablet e 1 gerente: 6 tarefas (achar job atrasado, registrar produção no kiosk, voltar da análise para a fila, criar job, retomar rascunho, achar tela por busca). Medir sucesso, tempo e número de voltas. Precisa de agenda das pessoas: decisão do dono.
- **Benefícios**: Substitui palpite por observação nas 20 etapas opcionais — e costuma revelar 2 ou 3 problemas que nenhuma auditoria vê.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen — teste de usabilidade com 5 usuários
- **Verificação**: Relatório em `docs/relatorios/teste-usabilidade-<AAMM>.md` com as 6 tarefas e os achados priorizados.

### 169. Teste de carga de navegação no tablet real — **[DONO]**

- **Descrição**: Todas as medições de desempenho deste plano são simuladas no CI. O tablet real da fábrica é o único juiz do kiosk.
- **Exemplo prático**: Roteiro: 30 navegações seguidas em `/kiosk`, `/packaging/kiosk`, `/pending` e `/kanban` no tablet usado em produção, medindo tempo até `h1` e quedas de frame. Precisa de acesso ao equipamento: decisão do dono.
- **Benefícios**: Confirma (ou derruba) as etapas 36-39 e 41 com dado do equipamento que importa.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: processo; Core Web Vitals em dispositivo real
- **Verificação**: Planilha de tempos antes/depois anexada ao `docs/relatorios/`.

### 170. Porta de qualidade: navegação no `Quality Gate` — **[DONO]**

- **Descrição**: O único check obrigatório na `main` é `Quality Gate ✅`, e nele o job `e2e` é **advisory** — ou seja, os testes de navegação das etapas 155-168 podem quebrar sem bloquear merge. Mexer nisso é alterar workflow e branch protection.
- **Exemplo prático**: Proposta ao dono: promover a `e2e` de navegação e acessibilidade (dois specs, não a suite toda) a bloqueante, mantendo o resto advisory, para não travar a `main` com testes instáveis.
- **Benefícios**: O que foi conquistado nas 200 etapas para de regredir sem ninguém perceber.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: processo; item 8 do Fluxo Git
- **Verificação**: PR aberta com o diff do workflow e a justificativa; o dono decide.

## Categoria 6 — Integração com outras funcionalidades (etapas 171 a 200)

Busca, notificações, modais, deep links e multi-aba.

### 171. Busca que volta ao ponto anterior ao fechar sem escolher

- **Descrição**: `src/components/navigation/CommandPaletteAdvanced.tsx` é a paleta ativa (montada globalmente, ver comentário em `MainLayout.tsx:287`). Fechar a paleta sem escolher nada deve devolver o foco ao elemento que estava antes — e hoje a paleta ainda tem `focus:ring-0` na linha 133, o que sugere que o foco não foi tratado com cuidado.
- **Exemplo prático**: Guardar `document.activeElement` ao abrir e restaurá-lo no `onCloseAutoFocus`; remover o `focus:ring-0` (etapa 51). Em paralelo, garantir que `Escape` fecha só a paleta (etapa 76).
- **Benefícios**: Abrir a busca por engano deixa de custar o lugar onde a pessoa estava.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: ARIA APG — Dialog focus return; WCAG 2.4.3
- **Verificação**: E2e: focar um card, abrir com Cmd+K, Escape, afirmar `activeElement` de volta no card. `accessibility.spec.ts:44-77` já cobre abrir/fechar — estender o caso.

### 172. Busca navega preservando o contexto de origem

- **Descrição**: Ao escolher um resultado, a paleta navega. Sem registrar a origem, o Voltar da tela nova depende só do histórico — e se a navegação for `replace`, a origem desaparece.
- **Exemplo prático**: Garantir PUSH (não `replace`) na navegação por resultado e passar `state: { from: pathname }`, que `useBackNavigation` (etapa 3) usa como fallback preferencial antes da rota-pai.
- **Benefícios**: Pular para uma tela pela busca e voltar ao trabalho em um clique.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 3; Material Design 3 — Search navigation
- **Verificação**: E2e: de `/kanban`, buscar 'OEE', abrir, Voltar e afirmar retorno a `/kanban`.

### 173. Resultados de busca com a rota-pai visível

- **Descrição**: A paleta lista destinos. Sem o caminho, 'Produtividade' é ambíguo entre `/operator-productivity` e `/kpis`.
- **Exemplo prático**: Mostrar o caminho ao lado do resultado ('Equipe › Produtividade'), derivado de `routeHierarchy` + `routeLabels` (etapas 2 e 12).
- **Benefícios**: Escolha certa na primeira tentativa; menos navegação-e-volta.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 6; WCAG 2.4.8
- **Verificação**: E2e: buscar um termo ambíguo e afirmar que os dois resultados mostram caminhos diferentes.

### 174. Busca encontra registros, não só telas

- **Descrição**: `src/components/navigation/useCommandEntities.tsx` existe (3,2 KB) e sugere busca de entidades. NÃO VERIFICADO o que ele indexa.
- **Exemplo prático**: Ler o arquivo; garantir que job por código, máquina por nome e operador por nome são encontráveis, e que o resultado navega via deep-link de modal (`?modal=job&id=`, etapa 129) em vez de só abrir a lista.
- **Benefícios**: O caminho mais rápido do app passa a ser a busca — especialmente para quem recebe um código por rádio.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 7; Material Design 3 — Search
- **Verificação**: E2e: buscar o código de um job e afirmar que o modal do job abre direto.

### 175. Histórico e favoritos de busca por usuário

- **Descrição**: A paleta guarda `command_recent` e `command_favorites` em `localStorage` (herdado da auditoria; NÃO VERIFICADO as chaves exatas nesta sessão). Em tablet compartilhado, isso mistura o histórico de dois operadores.
- **Exemplo prático**: Prefixar as chaves com o `userId` (como `NewJobPage.tsx:51` faz com o rascunho) e limpá-las no logout junto com os rascunhos (etapa 122).
- **Benefícios**: Privacidade no tablet compartilhado e sugestões relevantes para cada pessoa.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Privacidade; Nielsen 6
- **Verificação**: Teste: usuário A busca, logout, login B, histórico vazio.

### 176. Atalho de busca descoberto na interface

- **Descrição**: A paleta abre com Cmd/Ctrl+K e `Alt+S` (`use-navigation-hotkeys.ts:56-61`, que simula o Cmd+K). Em tablet não há teclado: se não houver um botão visível, a busca é inacessível.
- **Exemplo prático**: Garantir um botão de busca com ícone + rótulo no cabeçalho (desktop) e no `MobileNavigation`/FAB (tablet), exibindo o atalho no tooltip (padrão já usado em `BackButton.tsx:99-101`).
- **Benefícios**: A via alternativa de navegação deixa de existir só para quem conhece o atalho.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Nielsen 7 e 10; WCAG 2.1.1
- **Verificação**: E2e em tablet: `getByRole('button', { name: /Buscar/ })` visível e abre a paleta.

### 177. `QuickFavoritesBar`: revisar as 500 linhas e o custo

- **Descrição**: `src/components/layout/QuickFavoritesBar.tsx` é carregado em `MainLayout.tsx:156-160` em toda rota desktop, dentro de `SectionErrorBoundary`; `src/hooks/useQuickFavorites.ts` tem 9 KB. É um widget persistente no topo de toda tela. NÃO VERIFICADO o tamanho exato do arquivo nesta sessão.
- **Exemplo prático**: Medir o custo (bundle do chunk e tempo de montagem), simplificar a barra para no máximo 5 favoritos com overflow em menu, e garantir `aria-label` em cada atalho.
- **Benefícios**: O topo de toda tela fica mais leve e legível; o atalho mais usado fica visível em vez de uma fileira de ícones.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 8; Material Design 3 — Top app bar
- **Verificação**: Medir montagem antes/depois; axe na barra; visual regression do topo.

### 178. Favoritar a tela atual com um clique, inclusive com filtro

- **Descrição**: `src/components/navigation/FavoritesManager.tsx` e `useQuickFavorites` existem. Com estado em URL (etapas 23-28), favoritar passa a poder guardar o recorte de trabalho, não só a rota.
- **Exemplo prático**: Fazer o favorito guardar `pathname + search`, e rotular com o nome dado pelo usuário ('Fila da Técnica A'). Botão de estrela no `PageHeader` (`actions`).
- **Benefícios**: Coordenador salva suas 3 visões de trabalho e entra nelas direto — o maior ganho de produtividade do plano com menor esforço.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 7 (aceleradores); Material Design 3 — Bookmarks
- **Verificação**: E2e: filtrar, favoritar, ir para outra tela, abrir o favorito e conferir filtro aplicado.

### 179. Notificação que navega para o contexto exato

- **Descrição**: `src/contexts/NotificationsContext.tsx` não tem nenhuma chamada a `navigate` nem campo de link (grep por `navigate(`/`actionUrl`/`link` sem resultado). `NotificationIntegrator` é montado em `MainLayout.tsx:284-286` e o contador aparece em 177/205 — mas clicar leva para `/notifications`, não para o job do alerta.
- **Exemplo prático**: Adicionar um destino por notificação (`deeplink: '/kanban?modal=job&id=<id>'`) e navegar ao clicar, com `state: { from: '/notifications' }` para o Voltar funcionar (etapa 172). Onde o dado da notificação não tiver id, manter o comportamento atual.
- **Benefícios**: O alerta deixa de ser aviso e passa a ser caminho: um toque leva ao job atrasado.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Material Design 3 — Notifications (deep links); Nielsen 1
- **Verificação**: E2e: criar notificação com id, clicar e afirmar modal do job aberto; Voltar retorna a `/notifications`.

### 180. Notificação push abre o deep link correto

- **Descrição**: `src/App.tsx:16` monta `PushNotificationPrompt`; o push está ativo (há par VAPID configurado, conforme o histórico de commits). NÃO VERIFICADO o que o service worker faz no clique da notificação.
- **Exemplo prático**: Ler o handler de `notificationclick` no service worker e garantir que ele abre o `deeplink` da etapa 179 (ou foca a aba já aberta e navega nela, usando `clients.matchAll`), em vez de abrir sempre a raiz.
- **Benefícios**: Push vira ação imediata, não só aviso — é a razão de existir do push numa fábrica.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Web Push; Material Design 3 — Notification actions
- **Verificação**: Teste manual documentado em tablet + verificação do código do SW no PR.

### 181. Toast de alerta crítico com ação de navegar

- **Descrição**: Com sonner (etapa 33) e `useSmartDelayAlerts`/`useTechniqueCapacityAlerts` existentes, o alerta crítico pode levar direto ao problema.
- **Exemplo prático**: Toast com `action: { label: 'Ver job', onClick: () => navigate(deeplink) }`, sem auto-dismiss para severidade crítica (etapa 97).
- **Benefícios**: Reação ao atraso cai de minutos para segundos.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 1; Material Design 3 — Snackbar with action
- **Verificação**: E2e disparando um alerta simulado: toast permanece e o botão navega.

### 182. Centro de notificações com filtro e estado na URL

- **Descrição**: `/notifications` existe e tem título (`usePageTitle.ts:43`). Com muitos alertas, sem filtro por tipo/lidas a tela vira lista infinita.
- **Exemplo prático**: Aplicar `useFilterParams` (etapa 26) com `?tipo=`/`?lidas=` e `useDeepLinkFocus` para destacar a notificação que veio do clique.
- **Benefícios**: A pessoa volta à lista no mesmo recorte e vê qual item já tratou.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 3; WCAG 2.4.8
- **Verificação**: E2e: filtrar, abrir notificação, Voltar, filtro preservado e item destacado.

### 183. Marcar como lida sem perder o lugar na lista

- **Descrição**: Marcar lida reordena/filtra a lista e o item desaparece sob o cursor — padrão clássico de perda de contexto.
- **Exemplo prático**: Manter o item visível com estilo de 'lida' até a próxima recarga da lista (optimistic update sem refiltrar), e oferecer desfazer (etapa 55).
- **Benefícios**: Varredura de 30 notificações deixa de ser uma caça ao item que saltou.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 1 e 3
- **Verificação**: E2e: marcar o 5º item como lido e afirmar que ele continua na mesma posição.

### 184. `BroadcastChannel`: sincronizar logout entre abas

- **Descrição**: **Nenhum uso de `BroadcastChannel` em `src`.** Hoje, com duas abas abertas (comum no desktop do coordenador), sair numa deixa a outra parecendo autenticada até a próxima chamada falhar — e a outra aba pode estar mostrando dado de uma sessão encerrada.
- **Exemplo prático**: Criar `src/lib/tabSync.ts` com um canal `fg-app` e publicar `{ type: 'auth:logout' }` no logout; cada aba, ao receber, limpa o cache do React Query, limpa rascunhos (etapa 122) e navega para `/auth` com aviso 'Sessão encerrada em outra aba'.
- **Benefícios**: Fecha um risco de segurança real em máquina compartilhada e acaba com o erro confuso de 'não autorizado' numa aba esquecida.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P0 · **Referência**: Segurança de sessão; Nielsen 1
- **Verificação**: Teste com dois contextos/abas do Playwright: logout em A redireciona B em menos de 2s.

### 185. `BroadcastChannel`: sincronizar alertas e contadores

- **Descrição**: O contador de não lidas (`MainLayout.tsx:177,205`) e os alertas (`useAlertCount.ts`) são por aba. Duas abas mostram números diferentes e a pessoa não sabe em qual confiar.
- **Exemplo prático**: Publicar `{ type: 'notifications:changed' }` ao marcar lida e ao receber realtime (`WebSocketContext`), e cada aba invalida a query correspondente — sem refazer a assinatura realtime em todas.
- **Benefícios**: Números iguais em todas as abas, com uma só conexão de realtime fazendo o trabalho.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 1 (consistência de estado)
- **Verificação**: Teste com duas abas: marcar lida em A derruba o contador em B.

### 186. `BroadcastChannel`: evitar duas abas no mesmo kiosk

- **Descrição**: Duas abas de `/kiosk` registrando produção da mesma máquina é risco de registro duplicado.
- **Exemplo prático**: Ao montar o kiosk, publicar `{ type: 'kiosk:claim', machineId }`; se outra aba responder que já está ativa, mostrar 'Este kiosk já está aberto em outra aba' com botão 'Assumir aqui' (que publica `kiosk:release` para a outra).
- **Benefícios**: Impede registro duplicado de produção — erro de dado com custo direto.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 5; integridade de dado
- **Verificação**: Teste com duas abas em `/kiosk` da mesma máquina: a segunda mostra o aviso.

### 187. Sincronizar a fila offline entre abas

- **Descrição**: `src/hooks/useOfflineSync.ts` e `OfflineSyncContext` guardam a fila. Com duas abas, duas instâncias podem tentar enviar o mesmo item.
- **Exemplo prático**: Eleger uma aba 'líder' pelo canal (`tabSync`) para processar a fila, e as outras apenas refletirem o estado. Sem eleição, usar um lock em `localStorage` com timestamp.
- **Benefícios**: Fim do envio duplicado ao voltar a conexão — hoje depende de sorte.
- **Impacto** Alto · **Esforço** Alto · **Prioridade** P2 · **Referência**: Integridade de dado; Nielsen 1
- **Verificação**: Teste com duas abas offline e 3 ações: ao reconectar, 3 requests, não 6.

### 188. Propagar preferências entre abas

- **Descrição**: Tema, idioma, `compactMode` e o novo `fontSize` (etapa 81) vivem em `localStorage` (`useLocalStorage.ts`). O evento `storage` nativo não dispara na aba que escreveu, e pode não ser tratado nas outras.
- **Exemplo prático**: Publicar `{ type: 'prefs:changed', key }` no canal e aplicar nas outras abas, ou tratar o evento `storage` no `useLocalStorage`.
- **Benefícios**: Trocar o tema numa aba deixa de criar duas aparências do mesmo app.
- **Impacto** Baixo · **Esforço** Baixo · **Prioridade** P3 · **Referência**: Nielsen 4
- **Verificação**: Teste com duas abas: mudar tema em A reflete em B.

### 189. Link compartilhável com 'copiar link desta visão'

- **Descrição**: Com estado em URL (etapas 23-28), a URL passa a representar a visão. Mas o usuário não sabe disso.
- **Exemplo prático**: Botão 'Copiar link' no `PageHeader` (`actions`) que copia `location.href` e mostra toast 'Link copiado — abre a mesma visão'. No kiosk, não exibir.
- **Benefícios**: Passagem de turno por link em vez de descrição verbal ('olha a fila da técnica A atrasada').
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 7; Material Design 3 — Share
- **Verificação**: E2e: filtrar, copiar link, abrir numa nova página e conferir a mesma visão.

### 190. Passagem de turno com link de contexto

- **Descrição**: `/shift-handover` existe (`usePageTitle.ts:41`, `src/hooks/shift-handover/`). A passagem de turno é onde o contexto mais se perde entre pessoas.
- **Exemplo prático**: Permitir anexar links de visão (etapa 189) e de job (`?modal=job&id=`) ao registro de passagem, renderizados como itens clicáveis que abrem o contexto exato.
- **Benefícios**: O turno seguinte entra no mesmo lugar em que o anterior parou — o ganho operacional mais direto deste plano.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 6; deep links
- **Verificação**: E2e: criar passagem com link, abrir pelo outro usuário e cair na visão certa.

### 191. QR do scanner abrindo deep link de modal

- **Descrição**: `/scanner` existe e `InventoryPage.tsx:63-86` já usa `?modal=batch-qr&items=`. O QR impresso deve levar ao registro, não à lista.
- **Exemplo prático**: Padronizar o conteúdo do QR como URL com `?modal=` e `?id=`/`?items=`; na leitura, navegar com PUSH para o Voltar funcionar. QR antigo (só código) continua caindo na busca.
- **Benefícios**: Leitura de etiqueta leva direto ao registro, mesmo de fora do app (câmera do sistema).
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Material Design 3 — Deep links; Nielsen 7
- **Verificação**: E2e simulando leitura: modal correto abre e Voltar retorna ao scanner.

### 192. Voltar depois de abrir por QR vai para o scanner, não para a home

- **Descrição**: Entrar por QR é um deep-link: `useSmartBack` cairia na rota-pai (etapa 5), não no scanner.
- **Exemplo prático**: Na navegação pós-leitura, passar `state: { from: '/scanner' }` para o `useBackNavigation` preferir a origem real.
- **Benefícios**: Leitura em série (10 etiquetas) deixa de exigir voltar ao scanner pelo menu a cada item.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P1 · **Referência**: Nielsen 7; Material Design 3 — Up vs Back
- **Verificação**: E2e: QR → registro → Voltar → `/scanner` com a câmera pronta.

### 193. Integração Bitrix24: voltar ao sistema depois de sair

- **Descrição**: `/integrations/bitrix24` existe (`usePageTitle.ts:44`) e `src/components/integrations/IntegrationHub.tsx:61` usa um texto '← Voltar para Integrações' manual. Links que levam para fora precisam avisar.
- **Exemplo prático**: Trocar o texto manual pelo `BackButton`/`Link` padrão (etapa 58) e marcar links externos com ícone de link externo + `target="_blank" rel="noopener"` e `aria-label` indicando 'abre em nova aba'.
- **Benefícios**: O usuário sabe quando vai sair do sistema — e não perde o trabalho aberto.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: WCAG 3.2.5 Change on Request; Nielsen 1
- **Verificação**: Axe + e2e afirmando `target="_blank"` e rótulo nos links externos.

### 194. Assistente técnico abre o contexto citado

- **Descrição**: `/assistant` existe (`usePageTitle.ts:37`) com `src/components/technical-assistant/ChatArea.tsx` e `ChatMessage.tsx`. Se o assistente cita um job ou máquina, deveria dar o caminho.
- **Exemplo prático**: Renderizar menções como links de deep-link (`?modal=job&id=`), com `state: { from: '/assistant' }` para o Voltar devolver a conversa.
- **Benefícios**: A resposta do assistente vira ação em um clique, sem o usuário copiar código à mão.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 7; deep links
- **Verificação**: E2e com resposta simulada contendo menção: clicar abre o modal e Voltar retorna à conversa.

### 195. Relatórios e exportação com link de volta ao recorte

- **Descrição**: `/report-builder` existe (sem título hoje, etapa 11). Relatório gerado a partir de filtros deve registrar de onde veio.
- **Exemplo prático**: Guardar o `search` de origem no relatório e oferecer 'Ver dados na tela' que abre a lista com os mesmos filtros (etapas 26-28).
- **Benefícios**: Quem recebe o relatório confere o dado na tela em um clique, sem reconstruir o filtro.
- **Impacto** Médio · **Esforço** Médio · **Prioridade** P2 · **Referência**: Nielsen 6; rastreabilidade
- **Verificação**: E2e: gerar relatório filtrado e conferir que 'Ver dados' reabre a lista com o mesmo filtro.

### 196. Impressão e exportação sem o chrome de navegação

- **Descrição**: `MainLayout.tsx:225` já marca o cabeçalho global com `no-export`, o que indica que existe uma convenção. NÃO VERIFICADO se há `@media print` consistente.
- **Exemplo prático**: Garantir que `@media print` esconde sidebar, barras fixas, FAB e toasts, e que o título da página aparece impresso (usando o `PATH_TITLES` da etapa 12).
- **Benefícios**: Documento impresso (ordem de produção, relatório) sai legível e identificado.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: WCAG 1.4.10 (reflow); boas práticas de impressão
- **Verificação**: `page.pdf()` no Playwright nas 3 telas mais impressas, com inspeção visual no PR.

### 197. Rota de status e monitoramento acessíveis a partir do erro

- **Descrição**: `/status` e `/admin/monitoring` existem (ambos sem título hoje, etapa 11). Quando algo falha, o usuário não sabe se é ele ou o sistema.
- **Exemplo prático**: Nos estados de erro (etapas 30-31, 66), incluir link 'Ver status do sistema' para `/status`, e no `/status` mostrar o que está degradado em linguagem de negócio.
- **Benefícios**: Reduz chamado de suporte: a pessoa descobre sozinha que é uma indisponibilidade conhecida.
- **Impacto** Médio · **Esforço** Baixo · **Prioridade** P2 · **Referência**: Nielsen 1 e 9
- **Verificação**: E2e: forçar erro de query e afirmar o link para `/status` no estado de erro.

### 198. Deep link respeita papel e explica a negativa

- **Descrição**: `src/components/auth/ProtectedRoute.tsx` controla acesso (com bypass de admin na linha 127 e checagem de AAL/MFA em 97-122, herdado da auditoria). 13 rotas protegidas não declaram `allowedRoles` (`AppRoutes.tsx` linhas 195, 204, 229, 246-248, 251-254, 257, 266, 270 — lista herdada, confirmar antes de mexer). Um deep-link para rota sem permissão deve explicar, não só redirecionar.
- **Exemplo prático**: Quando o papel não permite, mostrar uma tela 'Sem acesso a <nome da tela>' com o motivo e 'Voltar' / 'Pedir acesso', em vez de redirecionar silenciosamente para a home. **[DONO]** apenas se envolver mudar quais papéis podem o quê.
- **Benefícios**: O operador que recebe um link do coordenador entende por que não abre, em vez de achar que o link está quebrado.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 9; WCAG 3.3.1
- **Verificação**: E2e logado como operador abrindo rota de coordenador: tela explicativa com Voltar funcional.

### 199. Multi-aba: avisar quando a versão do app mudou

- **Descrição**: `src/lib/lazyWithRetry.ts:67` lida com falha de chunk (etapa 40). Com aba antiga aberta depois de um deploy, a navegação pode falhar de forma estranha.
- **Exemplo prático**: Publicar a versão do build no canal `tabSync` (ou detectar falha de chunk) e mostrar uma faixa 'Nova versão disponível — Recarregar', preservando a rota atual ao recarregar.
- **Benefícios**: Depois de cada deploy em `main` (que é produção, pela Vercel), a aba antiga se conserta sozinha em vez de dar erro.
- **Impacto** Alto · **Esforço** Médio · **Prioridade** P1 · **Referência**: Nielsen 1; PWA update patterns
- **Verificação**: Teste: simular mudança de versão e afirmar a faixa; recarregar mantém a rota.

### 200. Consolidar as regras de navegação em `docs/agentes/navegacao.md`

- **Descrição**: O AGENTS.md manda detalhar temas em `docs/agentes/<tema>.md`. Hoje não há documento de navegação, e este plano é o único registro — o que o torna histórico, não regra.
- **Exemplo prático**: Criar `docs/agentes/navegacao.md` com as 15 regras da seção 'Princípios' deste plano, cada uma apontando para o arquivo:linha que a implementa (`useBackNavigation`, `routeHierarchy`, `PageHeader`, `useTabParam`, `useFilterParams`, `useModalParam`, `tabSync`), e a lista de etapas pendentes. Citar o arquivo em `AGENTS.md` na seção 'ler quando'.
- **Benefícios**: A próxima sessão (de qualquer agente) não reinvestiga nem reconstrói o que já existe — foi exatamente o que aconteceu no briefing deste plano.
- **Impacto** Alto · **Esforço** Baixo · **Prioridade** P0 · **Referência**: Processo (AGENTS.md); Nielsen 4
- **Verificação**: Arquivo criado, citado em `AGENTS.md`, e cada regra com referência `arquivo:linha` conferida.


## Riscos e dependências

- **Drag-and-drop × swipe-back.** `MainLayout.tsx:112-123` aplica o swipe ao `<main>` inteiro com `threshold: 80`; `/kanban` e `/pending` usam arraste horizontal. A etapa 44 (zona de borda de 24px + desligar em superfície de arraste) é **pré-requisito** de qualquer trabalho de gesto; sem ela, as etapas 43 e 45 pioram o sistema.
- **Pilha de histórico × redirects.** `AppRoutes.tsx` tem dois redirects (`/abc` → `/abc-costing`, `/operators/productivity` → `/operator-productivity`) e o `ProtectedRoute` faz redirect com `replace` — o comentário em `use-smart-back.ts:10-14` registra que `location.key !== 'default'` já falhou por causa disso. Toda etapa que mexe em histórico (3, 5, 23, 26, 128, 129, 138) precisa rodar `tests/e2e/navigation.spec.ts` antes do merge.
- **`AnimatePresence` × `Suspense`.** `AppRoutes.tsx:4` usa `AnimatePresence` e o `ScrollRestoration.tsx:126-131,155-158` já convive com o `<main>` da rota que sai permanecendo montado ~350ms no `mode=\"wait\"`. As etapas 19, 36, 37 e 41 mexem nessa mesma janela de tempo: mudar uma sem rodar o teste de restauração de scroll quebra a outra.
- **`MotionConfig` global (etapa 36) pode anular animações intencionais.** `TransitionConfigContext.tsx:46-58` já tem a decisão de `effectiveConfig`; as duas precisam concordar, ou o usuário com `reduced-motion` verá comportamento inconsistente entre página e componente.
- **Custo de bundle.** `MainLayout.tsx:18-31` já carrega 12 componentes com `lazyWithRetry`. As etapas 34 (stepper), 79 (pull-to-refresh) e 81 (fontSize) adicionam código no caminho crítico; as etapas 78 (remover `GlobalSearch` órfão, ~317 linhas) e 177 (simplificar `QuickFavoritesBar`) devolvem. Medir o bundle em cada onda.
- **Rotas públicas.** `/auth`, `/reset-password`, `/design-system`, `/install` e `/track` não passam pelo `MainLayout`: toda etapa de cabeçalho, skip link, título ou foco (9, 17, 80, 86) precisa tratá-las separadamente, ou passa no CI e falha na realidade.
- **Kiosk sem teclado e sem mouse.** As etapas 7, 8, 52, 89, 90, 102 e 123 dependem de teste em tablet real (etapa 165), que depende de acesso ao equipamento — decisão do dono. Sem isso, as medições são simuladas e podem errar.
- **Multi-aba e integridade de dado.** As etapas 184-187 (`BroadcastChannel`) tocam sessão, fila offline e registro de produção. Um erro aqui duplica registro ou derruba sessão de quem está trabalhando: cada uma precisa de teste com dois contextos do Playwright antes do merge, e a 186 (claim do kiosk) deve ir sozinha numa PR.
- **Nenhuma etapa deste plano exige DDL.** Se a etapa 142 (conflito de edição) precisar de coluna nova, ela cai no item 8 do Fluxo Git (PR aberta para o dono) e no fluxo de `docs/agentes/banco.md`; o padrão proposto usa `updated_at` existente.
- **CI advisory.** Enquanto o job `e2e` do `Quality Gate ✅` for advisory (etapa 170), todos os testes criados nas etapas 155-168 podem quebrar sem bloquear merge — o plano protege menos do que parece até o dono decidir.
- **Dependências novas.** Nenhuma etapa requer dependência nova. `framer-motion`, `@axe-core/playwright`, `zod`, `react-hook-form`, `sonner` e `@sentry/react` já estão no projeto; `BroadcastChannel`, `View Transitions` e `performance.mark` são APIs do navegador.
- **Ordem recomendada.** Etapas 2 → 3 → 4 → 5 (base do Voltar), depois 11/12 → 17 → 14/15/16 (títulos e cabeçalho), depois 23/26 → 27/28 (estado em URL), depois 30/31 (erro), depois 146-149 (medir) e só então as opcionais. Fora dessa ordem, várias etapas precisam ser refeitas.

## Próximos passos

1. **Botão Voltar com destino certo em todas as telas** — hoje, quem entra por link ou notificação e aperta Voltar cai no Dashboard em vez de subir um nível; são as etapas 2 a 5 e envolvem só código de frontend · `Fast_Gravacoes_V2` / `src/lib/routeHierarchy.ts` (novo) + `src/hooks/use-smart-back.ts` + `src/components/navigation/BackButton.tsx`
2. **Erro de carregamento deixar de parecer "não há trabalho"** — nenhuma tela trata falha de rede, e na embalagem isso aparece como "Fila zerada", o que pode fazer o operador parar com trabalho na fila; são as etapas 30 a 32 · `Fast_Gravacoes_V2` / `src/pages/PackagingKioskPage.tsx` + `src/lib/queryConfig.ts` + `src/routes/AppRoutes.tsx`
3. **Atalho do app instalado que abre página de erro** — o atalho de tela inicial do PWA aponta para `/jobs`, que não existe no sistema, então quem instala o app e usa o atalho vê a tela de "não encontrado"; é a etapa 45 e corrige-se em duas linhas · `Fast_Gravacoes_V2` / `public/manifest.json` + `src/routes/AppRoutes.tsx`

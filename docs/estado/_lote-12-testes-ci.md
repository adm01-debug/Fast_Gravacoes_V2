# Lote 12 — Testes, CI/CD e Qualidade

> Auditoria de estado do repositório `fast-grava-es-v2`, domínio **testes, CI/CD, qualidade, build e bundle**.
> Data da auditoria: 2026-08-16. Escopo: **apenas o que está no repositório**, mais os comandos que consegui
> executar localmente. Os `.md` do repo foram tratados como hipótese, não como fonte de verdade.
>
> A pergunta desta auditoria **não** é "existe teste?" — é **"o teste protege alguma coisa?"**.

**Legenda de classificação**

| | Significado |
|---|---|
| ✅ | Protege de verdade: roda em algum pipeline, importa/exercita o alvo real, asserção significativa |
| 🟨 | Roda e protege **parcialmente**: cobertura estreita, asserção frouxa, ou gate frágil/fácil de burlar |
| 🟦 | Existe mas **não protege nada**: espelho da lógica, asserção vácua, ou sem runner algum |
| ⬛ | Quebrado, desligado, ou **impossível de verificar** neste ambiente |

---

## Bateria executada (comandos e resultados REAIS)

Todos os comandos abaixo foram executados nesta máquina, em `/home/user/fast-grava-es-v2`, com
`node_modules` já instalado. Saídas reproduzidas na íntegra nos pontos relevantes.

### 1. `npx vitest run`

```
 Test Files  4 failed | 36 passed (40)
      Tests  8 failed | 489 passed (497)
   Duration  36.70s
EXIT=1
```

**A suíte unitária está VERMELHA.** 8 testes falhando em 4 arquivos:

| Arquivo | Testes falhando | Causa raiz observada na saída |
|---|---|---|
| `src/features/jobs/hooks/useSchedulingData.realtime.test.tsx` | 4 | `Error: No Realtime handler registered for table "jobs"` / `"machines"`; `expected +0 to be 3` |
| `src/features/jobs/hooks/useTechniques.realtime.test.tsx` | 1 | `expected "vi.fn()" to be called 1 times, but got 0 times` |
| `src/features/production/hooks/useMachines.realtime.test.tsx` | 1 | `expected "vi.fn()" to be called 2 times, but got 3 times` |
| `src/features/notifications/hooks/useNotifications.test.ts` | 2 | `TypeError: supabase.auth.onAuthStateChange is not a function` |

> Nota de método: a primeira tentativa usou `--reporter=basic`, que **não existe no Vitest 4**
> (`Error: Failed to load custom Reporter from basic`). Reexecutei com o reporter padrão. Isso é relevante
> porque o CI usa `--reporter=verbose` (`ci.yml:94,139,142,145,148`) — esse **funciona**, verifiquei
> (`npx vitest run src/lib/utils.test.ts --reporter=verbose` → 9 passed).

### 2. `npx vitest run --coverage`

```
 Test Files  4 failed | 36 passed (40)
      Tests  8 failed | 489 passed (497)
EXIT=1
```

**Nenhum relatório de cobertura foi gerado.** Não existe `coverage/`, não existe
`coverage/coverage-summary.json`, e a tabela `All files / % Stmts` **não aparece na saída**. Quando a suíte
falha, o v8 aborta antes de emitir o relatório — ou seja, **o threshold de cobertura nunca chega a ser
avaliado enquanto houver teste vermelho**.

Para obter um número real, reexecutei **excluindo apenas os 4 arquivos que falham** e zerando os thresholds
(medição, não gate):

```
npx vitest run --coverage --coverage.thresholds.{lines,functions,branches,statements}=0 \
  --exclude='**/useSchedulingData.realtime.test.tsx' \
  --exclude='**/useTechniques.realtime.test.tsx' \
  --exclude='**/useMachines.realtime.test.tsx' \
  --exclude='**/useNotifications.test.ts'
EXIT=0
```

| Métrica | Real medido | Threshold `vitest.config.ts:41-44` | Margem |
|---|---:|---:|---:|
| Lines | **22,39 %** (1431/6390) | 20 % | +2,39 pp |
| Statements | **21,00 %** (1534/7304) | 20 % | **+1,00 pp** |
| Functions | **17,81 %** (310/1740) | 17 % | **+0,81 pp** |
| Branches | **15,49 %** (652/4209) | 15 % | **+0,49 pp** |

A cobertura passa, mas por **margens de menos de 1 ponto percentual em 3 das 4 métricas**. Como a medição
excluiu 4 arquivos de teste, o número real com a suíte verde seria ligeiramente **maior** — ainda assim na
casa dos 20 %.

> `CLAUDE.md` afirma "Coverage thresholds are intentionally low (lines/statements 15%, functions/branches
> 10%)". **Falso**: `vitest.config.ts:41-44` diz 20/17/15/20. O `.md` está desatualizado.

### 3. `npx eslint . --max-warnings 99999`

```
✖ 24 problems (9 errors, 15 warnings)
EXIT=1
```

Os **9 erros** (que `--max-warnings` **não** suprime — ele só afeta warnings):

| Arquivo:linha | Regra |
|---|---|
| `src/components/qrcode/ScanHistory.tsx:71,72` | `react-hooks/refs` |
| `src/features/notifications/components/InAppNotificationWatcher.tsx:22,25,25` | `react-hooks/refs` |
| `src/features/notifications/components/NotificationIntegrator.tsx:75,77` | `react-hooks/refs` |
| `src/features/packaging/components/PackagingLeaderboard.tsx:18` | `@typescript-eslint/no-explicit-any` |
| `src/features/packaging/hooks/useSoundFeedback.ts:18` | `@typescript-eslint/no-explicit-any` |

`eslint.config.js:36-42` rebaixa sete regras do React Compiler (`set-state-in-effect`, `purity`,
`immutability`, `static-components`, `preserve-manual-memoization`, `use-memo`, `incompatible-library`) para
`warn` — mas **esqueceu `react-hooks/refs`**, que permanece `error` por herança do `recommended` do plugin v7.
Daí os 7 erros.

### 4. `npx tsc --noEmit -p tsconfig.app.json`

```
EXIT=0   (0 linhas de saída)
```

**Type-check limpo.** Único gate desta bateria que passa integralmente.

> Ressalva: `tsconfig.app.json:20-21` tem `noUnusedLocals: false` e `noUnusedParameters: false`.
> `CLAUDE.md` afirma que ambos estão "on". **Falso para o projeto app**; estão `true` apenas em
> `tsconfig.json:6-7`, que tem `"files": []` e só agrega referências — ou seja, **não checa nenhum arquivo**.

### 5. `node scripts/check-any-baseline.mjs`

```
📊 Ocorrências de 'any' — baseline: 0 | atual: 2
❌ QUALITY GATE FALHOU: 2 novo(s) 'any' introduzido(s).
EXIT=1
```

O ratchet **funciona e está vermelho** — os mesmos 2 `any` que o ESLint acusa
(`PackagingLeaderboard.tsx:18`, `useSoundFeedback.ts:18`).

### 6. `node scripts/bundle-report.mjs` (contra o `dist/` presente)

```
**Total:** 10821.1 KB (3051.22 KB gzip) em 226 arquivos
## ✅ Todos os budgets respeitados
EXIT=0
```

Maiores chunks (gzip): `lib-mermaid` 727,10 KB (budget 900), `lib-charts` 298,90 (320),
`lib-excel` 293,14 (400), `lib-pdf` 133,53 (400), `index` 128,14. Total 3051 KB vs `maxTotalKb` 6000.

### 7. Contagem e executabilidade dos e2e

```
E2E_EMAIL=x E2E_PASSWORD=y npx playwright test --list
→ Total: 142 tests in 17 files        (chromium + mobile-chrome; CI roda só chromium → 71)

npx playwright test --list              (sem env vars)
→ Error: Defina E2E_EMAIL e E2E_PASSWORD ... at helpers/credentials.ts:12
→ Total: 0 tests in 0 files
```

**Poderiam rodar aqui? Não — por três motivos independentes:**

1. **Sem browsers.** `~/.cache/ms-playwright` não existe. Nenhum `playwright install` foi executado.
2. **Sem credenciais.** `tests/e2e/helpers/credentials.ts:11-13` faz `throw` em tempo de import. 10 dos 17
   specs importam esse helper, e o erro **aborta a coleta inteira** — o `--list` retorna **0 testes em 0
   arquivos**, não 44. Os 7 specs que não dependem de credenciais (`accessibility`, `admin`, `logistics`,
   `offline`, `production`, `simulation`, `system-status`, = 44 testes) só ficam listáveis se os outros forem
   filtrados explicitamente.
3. **Sem backend.** O fluxo é login real contra uma instância Supabase viva com usuário semeado
   (`visual-regression.spec.ts:7-12` e similares: `page.fill(input[type=email])` → `expect(page).toHaveURL('/')`).
   Não há Supabase local, seed, nem mock de rede nos specs.

---

## Inventário de suítes e gates

| Item | Classificação | Evidência (arquivo:LINHA) | Protege o quê? |
|---|---|---|---|
| **Suíte unitária — libs puras** (`circuitBreaker`, `rateLimiter`, `retryWithBackoff`, `sanitize`, `validation`, `dateUtils`, `csvSafety`, `utils`, `excel`, `logger`) | ✅ | `src/test/circuitBreaker.test.ts:2`, `src/test/rateLimiter.test.ts:2`, `src/test/retryWithBackoff.test.ts:2`, `src/lib/csvSafety.test.ts:2`, `src/lib/utils.test.ts:2`, `src/lib/excel.test.ts:6` | Importam o módulo real de `@/lib/*`. Resiliência, sanitização e parsing de fato protegidos. |
| **Suíte unitária — lógica de domínio** (`jobStateMachine`, `oeeCalculations`, `useCronP95Daily`, `useCronHealthHistory`) | ✅ | `src/features/jobs/services/jobStateMachine.test.ts:2`, `src/features/production/services/oeeCalculations.test.ts:2`, `src/features/admin/hooks/useCronP95Daily.test.ts:2`, `src/features/admin/hooks/useCronHealthHistory.test.ts:2` | Transições de status, cálculo de OEE, percentis/mediana. Alvo real importado. |
| **Suíte unitária — hooks Realtime** (4 arquivos) | ⬛ | Falhando: `useSchedulingData.realtime.test.tsx`, `useTechniques.realtime.test.tsx`, `useMachines.realtime.test.tsx`, `useNotifications.test.ts` | **Nada, hoje.** 8 testes vermelhos. Enquanto vermelhos, bloqueiam a geração de cobertura de toda a suíte. |
| **Suíte "Simulation & Fuzz"** (`webhookSimulation`, `erpApiContracts`, `webhookFuzz`) | 🟦 | `src/test/webhookSimulation.test.ts:7,12-17,30`; `src/test/erpApiContracts.test.ts:7,10-20`; `src/test/webhookFuzz.test.ts:7,9-14` | **Nada.** Reimplementam schema *e* handler localmente. Detalhe na seção de armadilhas. |
| **`loadStress.test.ts`** | 🟨 | Importa real: `:8` `RateLimiter`, `:9` `CircuitBreaker`, `:10` `sanitize`, `:15` `retryWithBackoff`. Espelha schema: `:19-24` | Metade protege (libs reais sob carga); o bloco de webhook usa schema espelhado (`:21`). |
| **Testes Deno das Edge Functions** (`contracts`, `cronAuth`, `logger`, `rateLimit` — 21 `Deno.test`) | 🟦 | `supabase/functions/_shared/contracts.test.ts:1-6`, `cronAuth.test.ts:1-2`, `logger.test.ts:1-2`, `rateLimit.test.ts:1-2` | **Nada — não há runner.** Excluídos pelo `vitest.config.ts:28`; nenhuma menção a `deno` em `.github/workflows/`; não existe `deno.json`. |
| **Suíte e2e — 17 specs / 142 testes** | ⬛ | `playwright.config.ts:4,16-25`; `tests/e2e/helpers/credentials.ts:11-13` | Não verificável: exige Supabase vivo + usuário semeado + browsers. Nunca executada nesta auditoria. |
| **e2e — a11y (axe-core)** | 🟨 | `tests/e2e/accessibility.spec.ts:4,13-16,33` | Asserção **forte e correta** (`expect(critical).toEqual([])`), mas varre as rotas erradas — ver armadilha 5. |
| **e2e — visual regression** | 🟦 | `tests/e2e/visual-regression.spec.ts:17,26,33`; **zero `.png` em `tests/`** | **Nada.** Sem baseline, `toHaveScreenshot` cria o snapshot e passa. |
| **Gate CI `lint`** | 🟨 | `ci.yml:32-39` | Erros de ESLint + `tsc` + any-ratchet bloqueiam. Mas `--max-warnings 9999` (`:33`) torna warnings decorativos, e `npx tsc --noEmit` (`:36`) usa o `tsconfig.json` raiz com `"files": []`. |
| **Gate CI `security`** | 🟨 | `ci.yml:59-72` | `npm audit --audit-level=high` + TruffleHog pinado em `v3.82.13`. Gate real. Só cobre dependências/segredos, não código. |
| **Gate CI `unit-tests`** | 🟨 | `ci.yml:93-99` | O `vitest` **de fato** aplica thresholds. O passo "Enforce coverage thresholds" (`:96-99`) é um `echo` — ver armadilha 6. |
| **Gate CI `simulation-tests`** | 🟦 | `ci.yml:138-157` | **Nada.** Executa exatamente os 3 espelhos + `loadStress`, e imprime um sumário de números não medidos (`:154-157`). |
| **Gate CI `build` + bundle budget** | ✅ | `ci.yml:186,189`; `scripts/bundle-report.mjs:74-101,135-138` | Build real + budgets aplicados com `process.exit(1)`. Executei: funciona. |
| **Gate CI `bundle-diff`** | 🟨 | `ci.yml:212-254`, `:232-240` `continue-on-error: true` | Informativo (comenta no PR). Se o baseline de `main` não baixar, degrada silenciosamente. Não bloqueia — por design. |
| **Gate CI `e2e`** | 🟦 | `ci.yml:292-310`, `:265` | **Reporta verde sem executar nada** quando os secrets faltam — ver armadilha 6. |
| **Gate CI `quality-gate`** | 🟨 | `ci.yml:334-338,357-361` | Agrega e falha (`exit 1`). Mas trata `skipped` como aprovado (`:359-361`) e depende de jobs que podem ser verdes-vazios. |
| **Pipeline `deploy.yml`** | 🟨 | `deploy.yml:3-6,42-59,97-102,119-124` | Roda `security-scan` + `test` antes de migrations/functions. **Não** roda lint, e2e nem cobertura; **não** aguarda o `ci.yml`. |
| **Husky `pre-commit`** | ✅ | `.husky/pre-commit:1-2`; `package.json:147-151` | `lint-staged` (eslint --fix) + any-ratchet local. `.husky/_/` existe → husky instalado. |
| **Husky `commit-msg` / commitlint** | ✅ | `.husky/commit-msg:1`; `commitlint.config.js:1-3` | Conventional Commits aplicado no commit local. |
| **Any-ratchet** | 🟨 | `scripts/check-any-baseline.mjs:47-49`; `.any-baseline.json:2` | Funciona e está vermelho (2 > 0). Mas falha-para-verde se o `rg` sumir — ver armadilha 6. |

---

## Testes que não protegem (as 6 armadilhas)

### 1. Teste-espelho — 3 suítes inteiras testam a si mesmas

Esta é a maior descoberta do lote.

`src/test/webhookSimulation.test.ts`, `src/test/erpApiContracts.test.ts` e `src/test/webhookFuzz.test.ts`
**não importam nada da aplicação**. O único import não-framework é `zod`:

```
src/test/webhookSimulation.test.ts:7   import { z } from 'zod';
src/test/erpApiContracts.test.ts:7     import { z } from 'zod';
src/test/webhookFuzz.test.ts:7         import { z } from 'zod';
```

Os schemas são **redigitados localmente**, com comentários que admitem a duplicação:

- `src/test/webhookSimulation.test.ts:11` — `// ── Inline schemas matching supabase/functions/_shared/contracts.ts`
- `src/test/erpApiContracts.test.ts:9` — `// ── Schemas (mirror _shared/contracts.ts)`

Pior: o **handler também é reimplementado**:

- `src/test/webhookSimulation.test.ts:21-30` — `// ── Simulated handler logic (mirrors webhook-handler/index.ts behavior)` seguido de `function simulateWebhookHandler(...)`.

Os 273 + 294 + 318 linhas de teste exercitam `simulateWebhookHandler` e cópias de schema — **nunca**
`supabase/functions/_shared/contracts.ts` nem `supabase/functions/webhook-handler/index.ts`.

**Prova de que o espelho já divergiu (drift real, não hipotético):**

| Origem | Definição de `event` |
|---|---|
| **Produção** — `supabase/functions/_shared/contracts.ts:15` | `event: z.string(),` |
| Espelho — `src/test/webhookSimulation.test.ts:14` | `event: z.string().min(1),` |
| Espelho — `src/test/webhookFuzz.test.ts:11` | `event: z.string().trim().min(1),` |
| Espelho — `src/test/loadStress.test.ts:21` | `event: z.string().min(1),` |

Os três espelhos exigem `event` não-vazio; **o contrato real aceita `""`**. Qualquer teste verde sobre
rejeição de evento vazio está atestando um comportamento que a produção não tem. O espelho ficou **mais
rigoroso** que o alvo, então o teste passa e o bug fica invisível.

### 2. Suíte desligada

Praticamente ausente — e isso é positivo. Varredura por
`describe.skip|it.skip|test.skip|.only|xit|xdescribe|test.fixme` em `src/` e `tests/` retornou **uma única
ocorrência**:

- `tests/e2e/jobs.spec.ts:69` — `if (!await addBtn.isVisible()) return test.skip();`

Skip **condicional em runtime**: se o botão não renderizar (por regressão, justamente), o teste se
auto-desliga e reporta *skipped* em vez de *failed*. É o pior caso do skip — silencia exatamente o cenário
que deveria detectar.

Não há `describe.skip`, `.only`, nem blocos de teste comentados.

### 3. Asserção vacuamente verdadeira

**a) Tautologia pura** — `tests/e2e/error-states.spec.ts:71`:

```ts
const count = await inputs.count();
expect(count).toBeGreaterThanOrEqual(0); // settings exists
```

`.count()` nunca retorna negativo. O comentário diz "settings exists", mas a asserção passa com **zero**
inputs — inclusive numa página de erro em branco. Verifica exatamente nada.

**b) Asserções que aceitam sucesso *ou* falha** — o padrão `.or()`:

| Local | Aceita simultaneamente |
|---|---|
| `tests/e2e/system-status.spec.ts:19` | painel renderizado **ou** `"Não foi possível consultar o status agora"` |
| `tests/e2e/system-status.spec.ts:40` | `"Monitoramento do Sistema"` **ou** `"acesso negado"` |
| `tests/e2e/inventory-stability.spec.ts:54` | lista com itens **ou** empty-state |
| `tests/e2e/offline.spec.ts:14` | banner offline **ou** toast offline |

Em `system-status.spec.ts:19` e `:40`, o teste passa tanto se a página funcionar quanto se o backend cair ou
o RBAC negar acesso. Os blocos `if (await estadoGeral.isVisible())` (`:21`) e `if (await heading.isVisible())`
(`:42`) que contêm as asserções reais **só executam no caminho feliz** — no caminho de falha o teste passa
sem asserção alguma. (`offline.spec.ts:14` e `inventory-stability.spec.ts:54` são `.or()` legítimos: as duas
alternativas são estados válidos.)

**c) Guardas `if (isVisible())` que viram no-op**: `jobs.spec.ts:27,34,45,76`, `error-states.spec.ts:79`,
`visual-regression.spec.ts:31`. Se o elemento não existir, o corpo com as asserções é pulado e o teste passa.

**d) Não encontrado**: nenhum `expect(undefined).toBe(undefined)` nem asserção dependente de env var
indefinida — `credentials.ts:11-13` faz `throw` explícito em vez de degradar para `undefined`. Isso é um
acerto de projeto.

### 4. Sem runner — 21 testes Deno órfãos

`supabase/functions/_shared/` contém **4 arquivos de teste com 21 `Deno.test`**:

| Arquivo | `Deno.test` | Importa o alvo real? |
|---|---:|---|
| `contracts.test.ts` | 5 | Sim — `:2-6` `from "./contracts.ts"` |
| `cronAuth.test.ts` | 6 | Sim — `:2` `from "./cronAuth.ts"` |
| `logger.test.ts` | 6 | Sim — `:2` `from "./logger.ts"` |
| `rateLimit.test.ts` | 4 | Sim — `:2` `from "./rateLimit.ts"` |

São testes **bons** — importam o módulo real, sem espelho. E **nada os executa**:

1. `vitest.config.ts:28` — `exclude: [..., '**/supabase/functions/**']`.
2. `playwright.config.ts:4` — `testDir: './tests/e2e'`.
3. `grep -rin "deno" .github/workflows/` → **nenhuma ocorrência**.
4. Não existe `deno.json` / `supabase/functions/deno.json`.

**A ironia central deste lote:** os únicos testes que validam o contrato real das Edge Functions
(`contracts.test.ts` → `contracts.ts`) são os que ninguém roda; os espelhos que duplicam esse mesmo contrato
(`erpApiContracts.test.ts`, `webhookSimulation.test.ts`) são os que o CI roda e celebra em
`ci.yml:150-157`.

Inversamente, **todo arquivo `*.test.ts(x)` dentro de `src/`** é coberto pelo `include` padrão do Vitest —
conferi a lista real (40 arquivos coletados) contra os 43 encontrados no disco: os 3 de diferença são
`src/test/setup.ts`, `src/test/realtimeMock.ts` e `src/test/assertNonNull.ts`, que são helpers, não suítes.
Nenhum teste de `src/` está órfão.

### 5. Alvo inexistente

`tests/e2e/accessibility.spec.ts:4`:

```ts
const ROUTES = ['/', '/operator', '/kpi', '/oee'];
```

**A rota `/kpi` não existe.** `grep -cE 'path="/kpi"' src/routes/AppRoutes.tsx` → **0**. A rota real é
`/kpis` (`src/routes/AppRoutes.tsx:193`). O que o axe varre em `/kpi` é o catch-all
`<Route path="*" element={<PublicPage ...><NotFound /></PublicPage>}` (`AppRoutes.tsx:254`) — ou seja, a
página 404, que trivialmente não tem violações.

Agravante que atinge **as 4 rotas**: nenhuma delas é pública, e o `describe` de a11y
(`accessibility.spec.ts:6-36`) **não faz login**. As 4 são `ProtectedPage`:

- `/` → `AppRoutes.tsx` (raiz protegida) · `/operator` → `:211` · `/oee` → `:195` · `/kpis` → `:193`

E `src/components/auth/ProtectedRoute.tsx:75` redireciona sem sessão:
`return <Navigate to="/auth" state={{ from: location }} replace />`.

**Resultado líquido:** o "sweep axe-core WCAG 2.2 AA" varre a tela de login 3 vezes e a página 404 uma vez.
A asserção em `:33` (`expect(critical).toEqual([])`) é tecnicamente impecável — está apenas apontada para o
lugar errado. Nenhuma das 4 telas que o teste diz auditar é efetivamente auditada.

### 6. CI que mente

Seis casos concretos, do mais grave ao menos:

**a) O gate `e2e` reporta ✅ sem executar um único teste.**
`ci.yml:292-307` checa se os 4 secrets existem; `ci.yml:309-310` condiciona a execução a
`steps.e2e-prereq.outputs.enabled == 'true'`. Se os secrets faltam, o passo é pulado — mas **o job termina
com `success`**. O `quality-gate` (`ci.yml:337`) lê `needs.e2e.result` e, em `:357-358`, imprime
`✅ e2e: success`. O comentário em `ci.yml:286-291` é honesto sobre a intenção ("surface a loud notice ...
so the skip is a conscious, visible state"), e há `::notice` + step-summary — mas o **status do gate** não
distingue "142 testes passaram" de "0 testes rodaram". Não consigo verificar quais secrets estão
configurados (**NAO_VERIFICADO** — sem acesso a runtime/CI).

**b) O passo "Enforce coverage thresholds" não aplica nada e cita números errados.**
`ci.yml:96-99`:

```yaml
- name: Enforce coverage thresholds
  run: |
    echo "Coverage thresholds enforced: lines≥15%, functions≥10%, branches≥10%, statements≥15%"
    echo "vitest enforces thresholds — if this step ran, thresholds passed."
```

São dois `echo`. A segunda frase é **verdadeira por acidente** (o Vitest realmente aplica, e falharia o passo
anterior), mas os números impressos — 15/10/10/15 — **não são os configurados**, que são 20/17/15/20
(`vitest.config.ts:41-44`). Um leitor do log de CI recebe um relatório de conformidade com os limites
errados. Some-se a isso o que medi na bateria 2: **com a suíte vermelha, nenhuma cobertura é sequer gerada**.

**c) O gate `simulation-tests` publica métricas que ninguém mediu.**
`ci.yml:150-157` imprime no step-summary:

```
- Webhook scenarios: 500+ valid + negative + fuzz
- ERP contract cases: 400+
- Fuzz payloads: 1000+ random malformed
- Load scenarios: 10k–50k concurrent ops
```

São **literais hard-coded** num `echo`, com `if: always()` — impressos mesmo se as 4 suítes falharem. E os
números descrevem espelhos (armadilha 1), não o sistema. Um gate inteiro cuja saída visível é propaganda
fixa.

**d) `deploy.yml` não espera o `ci.yml`.**
Ambos disparam em push para `main` (`ci.yml:4-5` `branches: ['**']`; `deploy.yml:3-5` `branches: [main]`).
São workflows **independentes** — não há `workflow_run` nem qualquer dependência entre eles. `deploy.yml`
tem sua própria porteira, mais fraca:

| | `ci.yml` | `deploy.yml` |
|---|---|---|
| Lint / tsc / any-ratchet | sim (`:32-39`) | **não** |
| Testes unitários | com cobertura (`:94`) | sem cobertura (`:59`) |
| Simulação/fuzz | sim (`:138-148`) | **não** |
| e2e | condicional (`:309`) | **não** |
| Bundle budget | sim (`:189`) | **não** |

`apply-migrations` (`deploy.yml:97-102`) e `deploy-edge-functions` (`:119-124`) dependem apenas de
`[security-scan, test]`. Consequência: um commit que quebre lint, cobertura ou e2e ainda **aplica migrations
com `supabase db push` e faz deploy das Edge Functions**, enquanto o `ci.yml` fica vermelho em paralelo.
(Hoje isso é contido por acaso: `npm run test` está vermelho, então o job `test` bloquearia.)

**e) O workflow chamado "Deploy" não faz deploy do front-end.**
`deploy.yml:61-91` roda `npm run build` e faz `upload-artifact` (`:86-91`) — e para aí. Não há nenhum passo
de publicação do `dist/`. O que o workflow realmente entrega é **migrations + Edge Functions**. O rótulo
sugere um escopo maior do que o comportamento.

**f) O any-ratchet falha para verde se o `rg` sumir.**
`scripts/check-any-baseline.mjs:47-49`:

```js
  } catch {
    return 0;
  }
```

Qualquer erro do `execSync` — `rg` ausente, glob inválido, exit code inesperado — retorna **0**. Como
`.any-baseline.json:2` tem `"baseline": 0`, a condição `current > baseline` fica `0 > 0` = falso e o gate
**passa**. Reproduzi injetando um `rg` que sai com 127:

```
📊 Ocorrências de 'any' — baseline: 0 | atual: 0
EXIT_rg_quebrado=0        # com 2 `any` reais no código
```

Contra o `rg` real, o mesmo script acusa corretamente `atual: 2` e sai com 1. `ripgrep` vem pré-instalado no
`ubuntu-latest`, então na prática o gate funciona hoje — mas não é dependência declarada em `package.json`, e
o modo de falha é **silencioso e verde**.

**g) Não encontrado**: nenhum `continue-on-error` em job de teste e nenhum `|| true` mascarando exit code.
O único `continue-on-error: true` está em `ci.yml:233`, no download do baseline de bundle — apropriado, pois
é um passo informativo. Há um `|| true` em `ci.yml:116` (`npx lcov-summary ... || true`), também num passo
puramente de sumário. **Ambos legítimos.**

---

## CI/CD — o que o YAML realmente garante

### Grafo real do `ci.yml`

```
lint ──┬── unit-tests ──┐
       └── simulation-tests ──┤
security ──────────────────────┼── build ──┬── bundle-diff (só PR, não bloqueia)
                                           └── e2e (só main/PR; verde-vazio sem secrets)
                                                    │
             lint,security,unit-tests,simulation-tests,build,e2e ──> quality-gate (if: always)
```

**O que o CI de fato garante hoje** (assumindo os secrets configurados):

| Garantia | Real? |
|---|---|
| Não compila TypeScript quebrado | ✅ (`ci.yml:36`, com a ressalva do tsconfig raiz vazio) |
| Não introduz erro de ESLint | ✅ (erros bloqueiam; warnings não — `:33`) |
| Não introduz `any` novo em `src/` | ✅ (`:39`, frágil se `rg` sumir) |
| Não introduz dependência com CVE ≥ high | ✅ (`:62`) |
| Não commita segredo | ✅ (`:64-72`, TruffleHog pinado) |
| Testes unitários passam | ✅ (`:94`) |
| Cobertura ≥ 20/17/15/20 | ✅ pelo Vitest — **não** pelo passo que diz aplicá-la (`:96-99`) |
| Contratos das Edge Functions validados | ❌ espelhos (armadilha 1) |
| Bundle dentro do budget | ✅ (`:189`, verificado localmente) |
| Fluxos de usuário funcionam | ❌ verde-vazio sem secrets (armadilha 6a) |
| Acessibilidade WCAG das telas principais | ❌ varre `/auth` e 404 (armadilha 5) |
| Sem regressão visual | ❌ sem baselines commitados |

### Estado atual do pipeline (inferido, não observado)

Com o código como está no HEAD, o job `lint` **falharia** em `ci.yml:33` (9 erros de ESLint) — e por ser
`needs` de `unit-tests` e `simulation-tests` (`:81`, `:126`), estes seriam pulados; `build` (`:166`) também;
`quality-gate` marcaria `lint: failure` → `exit 1`.

> ⚠️ **NAO_VERIFICADO** — Isto é inferência a partir do YAML e dos comandos que rodei localmente. **Não
> tenho acesso a runtime nem ao GitHub Actions**, e portanto **não posso afirmar a conclusão real de nenhum
> run**. Diferenças de ambiente (versão de Node, `npm ci` vs `npm install`, secrets, cache) podem alterar o
> resultado.

### `deploy.yml`

Dispara em push para `main` e `workflow_dispatch` (`:3-6`), com `cancel-in-progress: false` (`:10`) — correto
para deploy. Ordena migrations **antes** de functions (`:123`), com justificativa explícita no comentário
(`:93-96`); é um acerto de design real. As fragilidades estão em (d) e (e) acima.

---

## Achados relevantes

Ordenados por impacto.

1. **A suíte unitária está vermelha** — 8 testes, 4 arquivos, todos em hooks Realtime/notificações. Efeito
   colateral: **nenhum relatório de cobertura é gerado**, então o gate de cobertura não chega a ser avaliado.

2. **Três suítes inteiras (885 linhas) testam cópias locais da lógica**, e o espelho já divergiu do contrato
   real (`event: z.string()` vs `.min(1)`). São exatamente as suítes que o `ci.yml` promove como "mais
   compreensivas" (`:120`).

3. **21 testes Deno que validam os contratos reais não têm runner algum** — excluídos pelo Vitest, ignorados
   pelo Playwright, sem passo de CI, sem `deno.json`.

4. **O gate de e2e reporta sucesso sem executar testes** quando faltam secrets, e o `quality-gate` conta isso
   como aprovação.

5. **O sweep de acessibilidade aponta para as rotas erradas** — 1 rota inexistente (`/kpi`) e 4 rotas
   protegidas sem login, resultando na auditoria da tela de login e da 404.

6. **Regressão visual sem baseline** — nenhum `.png` versionado; a primeira execução gera os snapshots e
   passa. Como o CI roda só `--project=chromium` (`ci.yml:319`), os baselines de `mobile-chrome` jamais
   existiriam.

7. **Dois pipelines concorrentes em `main`, com porteiras assimétricas** — `deploy.yml` aplica migrations e
   publica Edge Functions sem esperar o `ci.yml` e sem rodar lint, e2e, simulação ou cobertura.

8. **Divergências `CLAUDE.md` ↔ realidade** (o `.md` é hipótese, e falhou em 4 pontos):

   | `CLAUDE.md` afirma | Realidade verificada |
   |---|---|
   | thresholds "lines/statements 15%, functions/branches 10%" | 20/17/15/20 — `vitest.config.ts:41-44` |
   | `noUnusedLocals/Parameters` "on" | `false` em `tsconfig.app.json:20-21` |
   | `npm run ci` = "build + e2e" | `quality:any && build && test:e2e` — `package.json:23`; **sem lint e sem testes unitários** |
   | e2e baseURL `http://localhost:8080` | `http://127.0.0.1:8080` — `playwright.config.ts:11` |

9. **`package.json:18` define `quality:gate`** (`lint && quality:any && test`) — o gate composto mais
   sensato do repo — e **nenhum workflow o utiliza**.

10. **`eslint.config.js:9` ignora `scripts`** — os 3 scripts que implementam os gates de qualidade
    (`bundle-report`, `bundle-diff`, `check-any-baseline`) nunca são lintados.

11. **`eslint.config.js:36-42` rebaixou 7 regras do React Compiler mas esqueceu `react-hooks/refs`**, que
    responde por 7 dos 9 erros atuais. Provavelmente não intencional, dado o comentário em `:30-35`.

12. **Budgets de entrypoint passam silenciosamente quando nada casa** —
    `scripts/bundle-report.mjs:98` usa `if (matched.length && sum > limit)`. Verifiquei contra o `dist/`
    atual: todas as 5 rotas do `bundle-budget.json` casam pelo menos 1 chunk (`kiosk` 2, `track` 1, `auth` 1,
    `operator` 11, `index` 6), então hoje o gate opera. Uma renomeação de chunk o desligaria sem aviso.

13. **`src/test/webhookFuzz.test.ts` contém 2 bytes NUL** (arquivo de 11 229 bytes), o que faz `grep`/`rg`
    tratá-lo como binário e pulá-lo por padrão. Consequência prática: **o any-ratchet e qualquer varredura
    baseada em `rg` não enxergam esse arquivo** (é `*.test.*`, já ignorado, então sem impacto no gate — mas
    é um ponto cego para auditorias futuras).

14. **Ponto positivo real**: `tests/e2e/helpers/credentials.ts:11-13` falha rápido em vez de degradar para
    `undefined`, e `src/test/assertNonNull.ts` existe para evitar `!` silencioso nos testes. Husky +
    commitlint estão instalados e funcionais (`.husky/_/` populado). O `scripts/bundle-report.mjs` é um gate
    honesto, com `process.exit(1)` real. `tsc` está limpo.

---

## Limitações

1. **Sem acesso a runtime ou CI ao vivo.** Não consigo ver a conclusão real de nenhum run do GitHub Actions,
   nem quais secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`,
   `SUPABASE_ACCESS_TOKEN`, ...) estão configurados. Todo o julgamento sobre o comportamento do CI é
   **inferência a partir do YAML** — marcado **NAO_VERIFICADO** onde aplicável.

2. **Nenhum teste e2e foi executado.** Sem browsers do Playwright, sem credenciais e sem backend Supabase.
   As classificações de e2e derivam de leitura de código e de `--list`, não de execução. Não posso afirmar
   se os 142 testes passariam, falhariam ou travariam.

3. **A cobertura de 22,39 % / 21 % / 17,81 % / 15,49 % foi medida com 4 arquivos de teste excluídos**
   (os que falham) e thresholds zerados. Não é o número que o CI produziria com a suíte verde — seria
   ligeiramente maior. É a melhor aproximação honesta disponível hoje.

4. **`npm ci` não foi executado** (está quebrado neste ambiente, conforme instrução). As dependências vieram
   de `npm install`. O CI usa `npm ci --legacy-peer-deps`, que pode resolver a árvore de forma diferente —
   inclusive alterando o resultado de lint e testes.

5. **Não auditei o conteúdo das ~30 Edge Functions** nem das migrations — fora do escopo deste lote
   (coberto pelos lotes 07 e 11). Limitei-me a `supabase/functions/_shared/` por ser o alvo dos testes.

6. **Não avaliei a qualidade interna das asserções dos 489 testes que passam**, um a um. A varredura de
   asserções vácuas foi feita por padrão (`toBeGreaterThanOrEqual(0)`, `toBeTruthy`, `.or(`, `if (isVisible`,
   `expect(true)`) sobre `src/` e `tests/` — pode haver tautologias com formatos que o padrão não capturou.

7. **A afirmação de drift do schema `event`** é uma comparação estática entre `contracts.ts:15` e os
   espelhos. Não executei o handler real de produção para confirmar que um `event: ""` é de fato aceito
   ponta a ponta — outras validações a montante poderiam rejeitá-lo.

# Meta-auditoria — teste e validação da auditoria de estado

**Data:** 2026-08-16
**Objeto auditado:** `ESTADO_ATUAL.md` + os 14 lotes em `docs/estado/`
**Objetivo:** encontrar falhas e lacunas no próprio trabalho de auditoria, assumindo-o defeituoso
até prova em contrário.

---

## Veredito

A auditoria **se sustenta na evidência e falha na régua**.

Nenhuma citação fabricada, nenhuma contradição entre lotes, e todos os achados graves testados
sobreviveram à tentativa de refutação — inclusive o achado principal, que saiu **mais forte**.
Mas a classificação ✅ foi aplicada com critério frouxo: **17 de 55 itens ✅ amostrados (31%)
foram derrubados** por verificação adversarial, e a contagem total publicada está inflada.

O erro é sistemático e tem uma causa única identificável: em vários casos a coluna de observação
**já descrevia o defeito** e o selo ✅ foi mantido assim mesmo.

---

## 1. Testes executados e resultados

| # | Teste | Método | Resultado |
|---|---|---|---|
| 1 | Evidência fabricada | Amostra de 22 citações `arquivo:linha`, impressão do conteúdo real | ✅ **22/22 reais** |
| 2 | Cobertura declarada | 575 arquivos citados × árvore real (`git ls-files`) | ✅ **0 inexistentes** |
| 3 | Falso positivo em código morto | Refutação de 31 símbolos ⬛ + verificação manual de 4 | ✅ **4/4 sobrevivem** |
| 4 | Tabelas sem consumidor | 17 tabelas testadas com aspas simples **e** duplas | ✅ **0 falsos positivos** |
| 5 | Achado principal (tabelas fantasma) | `CREATE TABLE` × `from()` × `types.ts` | ✅ **confirmado e reforçado** |
| 6 | Páginas órfãs | 57 arquivos × `AppRoutes.tsx` | ✅ **confirmado** (as 2 "órfãs" são `*.test.tsx`) |
| 7 | Contradição entre lotes | Itens homônimos classificados por ≥2 lotes | ✅ **nenhuma** |
| 8 | RLS 100% | 135 tabelas × 135 `ENABLE ROW LEVEL SECURITY` | ✅ **confirmado** |
| 9 | Correções ao `CLAUDE.md` | thresholds e `vite-plugin-pwa` reconferidos | ✅ **ambas corretas** |
| 10 | **Contagem total** | Análise das linhas contadas por seção | ❌ **inflada** |
| 11 | **Refutação adversarial dos ✅** | 55 itens atacados em 2 frentes independentes | ❌ **17 derrubados (31%)** |

---

## 2. Falhas encontradas na auditoria

### 2.1 🔴 A régua do ✅ foi aplicada com folga — 31% da amostra derrubada

Duas refutações independentes atacaram 55 itens ✅, deliberadamente escolhendo os mais
ambiciosos. **17 caíram.**

| Frente | Lotes atacados | Derrubados |
|---|---|---:|
| meta-01 | 01, 02, 03, 04 | 8 de 25 (32%) |
| meta-02 | 05, 06, 07, 09, 10 | 9 de 30 (30%) |

**Distribuição do erro — não é uniforme:**

- **Lote 10 (UX transversal): 67% de erro.** Concentra o padrão "montado ≠ funciona".
- **Lote 07 (Admin/Integrações): 33%.** Padrão "grava mas ninguém lê".
- **Lotes 05, 06 e 09: zero derrubadas em 18 ataques.** As afirmações de segurança
  (MFA/AAL, lockout, RLS anti-escalada, CORS, rate limit, reset de senha) foram verificadas até
  a migration e conferem.

**Os cinco piores ✅ indevidos:**

1. **`/code-quality`** — painel de saúde do código 100% fabricado.
   `useCodeQualityMetrics.ts:159-189` devolve literais: `totalPages: 30` (reais **55**),
   `edgeFunctions: 18` (reais **33**), `lighthouseScore: 85`, `anyUsageCount: 0` — enquanto o
   gate `any-ratchet` do repositório está **vermelho**. Deveria ser 🟦.
2. **Par QR Code gerador↔leitor quebrado.** `JobQRCode.tsx:23` gera a URL `/track?q=<n>`;
   `QRScanner.tsx:91-95` faz `JSON.parse` e exige `type==="job"`. Nenhum dos 10 geradores do
   repo emite esse JSON. Derruba 2 itens e deixa `qr_scan_history` sem produtor alcançável.
3. **`/master-api`** — `MasterAPIPage.tsx` tem **zero** referências a `supabase` em 234 linhas,
   com chave de API falsa hardcoded (`:29`, `sk_live_fast_9283749123847`). Deveria ser 🟦.
4. **Notificações TPM (2 itens)** — `tpm-notifications/index.ts:69` traz `// Simular envio` e
   grava `status:'success'` sem enviar; a function é órfã; e o trigger que chamaria
   `send-tpm-email` está **comentado** (`20260508115941…sql:50-53`). Tela de configuração e tela
   de logs marcadas ✅ sobre um pipeline inexistente.
5. **`FeatureFlagsContext`** — erro factual do lote 10: os "2 consumidores" citados são um hook
   **homônimo e distinto** (`features/admin/hooks/useFeatureFlags.ts`). O contexto tem zero
   consumidores, e o homônimo também. Sistema de feature flags duplicado e morto nas duas versões.

**Causa raiz.** Em 5 dos 8 casos de meta-01, a coluna de observação da própria linha já
descrevia o defeito — o selo ✅ foi mantido apesar da evidência contrária estar escrita ao lado.
Não foi falta de investigação; foi aplicação frouxa do critério.

**Efeito na contagem.** Extrapolar 31% seria desonesto: a amostra foi enviesada de propósito
para os itens mais ambiciosos, e os lotes de segurança tiveram 0%. A faixa defensável é
**10–20% dos 492 ✅ (~50 a 100 itens)** que deveriam ser 🟨 ou 🟦. Piso duro comprovado com
`arquivo:linha`: **17**.

### 2.2 🟠 A contagem de 938 tem precisão falsa e está inflada

Três defeitos somados:

| Defeito | Efeito |
|---|---|
| Somei por emoji, e 3 linhas contêm mais de um | +3 |
| 8 linhas de **legenda** de tabela foram contadas como itens de inventário | +8 |
| Duplicação semântica entre tabelas do mesmo lote | não quantificado |

A duplicação semântica está **provada**, não inferida: `erp-api` é classificado 🟨 na tabela
"Integrações" **e** 🟨 de novo no "Mapa das 34 Edge Functions" do mesmo lote 07. O mapa tem 33
linhas e é uma segunda visão de objetos já classificados. O lote 10 tem o mesmo problema entre
"Mapa de rotas" (57 linhas) e "Funcionalidades transversais" (133).

Casamento por nome exato acha só 9 duplicatas — mas é um teste fraco, porque o mesmo objeto
aparece com nomes diferentes ("ERP externo (API pública própria)" = `erp-api`).

**Número honesto:** ~926 classificações emitidas. O total de **funcionalidades distintas** é
menor e **não foi determinado** — fica entre ~845 (removendo os dois mapas por inteiro) e 926.

### 2.3 🟡 Três erros numéricos meus no documento executivo

Não vieram dos lotes; foram introduzidos por mim na consolidação.

| Publicado | Correto | Causa |
|---|---|---|
| 136 tabelas | **135** | regex de `CREATE TABLE` sem dígitos no character class |
| 57 páginas | **55** (+2 `*.test.tsx`) | contei arquivos de teste colocados em `src/pages/` |
| 938 itens | **~926** | ver 2.2 |

### 2.4 🟡 A rotulagem ⬛ mistura dois conceitos

A lista de 134 itens ⬛ **sobreviveu** ao teste (4/4 na amostra, incluindo casos em que o lote foi
mais cuidadoso que meu próprio teste de refutação). Mas 22 das 134 linhas descrevem
**providers montados sem leitor** — `FeedbackProvider`, `SearchContext`, `BreadcrumbContext`,
`ReauthProvider` e outros.

Isso é ⬛ no sentido de "a funcionalidade é inalcançável", **não** no sentido de "o arquivo pode
ser apagado sem consequência": o provider é renderizado na árvore, e removê-lo sem também
removê-lo de `AppProviders.tsx` quebra o build. Quem for limpar código morto precisa dessa
distinção.

---

## 3. O que resistiu — e ficou mais forte

**O achado principal (tabelas fantasma) foi confirmado e ampliado.** As 7 tabelas seguem sem
`CREATE TABLE` em nenhuma das 216 migrations. E a verificação acrescentou algo que o relatório
original não dizia: **as 4 verdadeiramente fantasma são escritas justamente por edge functions
órfãs** —

| Tabela | Escrita por | Situação da function |
|---|---|---|
| `archived_jobs` | `cron-cleanup/index.ts:48` | órfã |
| `backups` | `backup-scheduler/index.ts:61` | órfã |
| `backup_logs` | `backup-scheduler/index.ts:74` | órfã |
| `system_metrics` | `metrics-collector/index.ts:60` | órfã |

E as 3 `geo_blocking_*` são **alteradas** por migrations (policies em
`20260317221345…sql:76-77`, índices em `20260619153319…sql:13`) que nunca as criam — prova
positiva de criação fora do versionamento, mais forte que a mera ausência.

**Também sobreviveram intactos:** 18/33 edge functions órfãs · 8 falhas de teste · 9 erros de
ESLint · Twilio com zero linhas · 17 tabelas sem consumidor · fachada de thresholds ·
peso fabricado no packaging · teste-espelho com drift provado · 100% de RLS · zero páginas órfãs.

---

## 4. Falsos alarmes que eu mesmo produzi

Registro porque ilustram o modo de falha desta classe de trabalho — **regex frouxo gera achado
falso**, e foi assim que quase acusei os lotes injustamente:

1. **`ActivityLog` como falso positivo.** Meu grep viu `Index.tsx:22,192,462` importando e
   renderizando. Parecia código vivo classificado como morto. **Errado:** `useActivityLog`
   inicializa `entries: []` sem fetch, `addActivityEntry` nunca é chamado, e a renderização é
   travada por `activityEntries.length > 0`. O lote estava certo, e sua evidência já dizia isso.
2. **`AlertCard`.** Meu teste achou 2 consumidores; eram dois componentes **homônimos locais**. O
   lote já havia antecipado a objeção no próprio texto.
3. **"5 tabelas sem RLS".** Artefato do meu regex — `for`, `to`, `used` não são tabelas, e
   `bitrix`/`cron_p` eram nomes truncados por falta de dígitos no character class.
4. **"4 tabelas fantasma não têm consumidor".** Meu segundo grep só procurou aspas simples; o
   código usa `from("archived_jobs")` com aspas duplas.

Em 4 de 4 confrontos, os lotes estavam certos e meus testes rápidos é que estavam errados.

---

## 5. Limitações desta meta-auditoria

- **Amostragem, não censo.** 55 de 492 ✅ (11%) e 4 de 134 ⬛ (3%) foram testados. As categorias
  🟨 (212) e 🟦 (100) **não foram testadas** — e 🟨 é justamente onde os ✅ derrubados vão parar.
- **A taxa de 10–20% é estimativa**, com denominador declarado, não medição do universo.
- **Runtime continua `NAO_VERIFICADO`.** Nada aqui altera isso: sem banco vivo, nenhum ✅ pode ser
  promovido a "em uso real".
- **A duplicação semântica não foi quantificada** — exigiria reconciliar manualmente as ~926
  linhas.

---

## 6. Correções aplicadas

`ESTADO_ATUAL.md` recebeu um bloco de correção (§0) apontando para este documento. O texto
original foi **preservado**, conforme o método: quem leu a primeira versão precisa saber que
houve revisão e o que mudou.

Documentos desta meta-auditoria:

- `_meta-00-consolidado.md` (este)
- `_meta-01-refutacao-verdes.md` — 25 itens dos lotes 01–04
- `_meta-02-refutacao-verdes.md` — 30 itens dos lotes 05–10

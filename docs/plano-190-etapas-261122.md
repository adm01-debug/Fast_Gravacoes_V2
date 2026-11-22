# Plano de melhorias e correções em 190 etapas — Fast Gravações V2

**Data:** 2026-11-22 · **Base:** `main` @ `75dc924` · **Contexto gerado:** branch `contexto` @ `38615b6`
**Origem:** auditoria exaustiva de front-end (Desenvolvedor Front-End Sênior) com 5 varreduras paralelas
(contratos de Edge Functions, UI/UX/a11y/SEO, performance/arquitetura, segurança/CI/testes, consolidação
de pendências já documentadas), seguida de **verificação adversarial**: 50 achados-chave receberam um
refutador independente que releu as linhas citadas, e 5 buscadores cobriram dimensões não varridas
(mutations com erro engolido, CRUD incompleto, data/fuso/números, uso frágil do supabase-js, limites de
payload nas Edge Functions).

## Como este documento foi validado

| Resultado da refutação | Qtd | Tratamento neste plano |
|---|---|---|
| Confirmado | 35 | virou etapa com a evidência original |
| Parcial | 13 | virou etapa com o **texto corrigido** (a parte falsa foi removida) |
| Refutado | 2 | **descartado** (ver "Achados descartados") |
| Achados novos (5 buscadores) | 124 | priorizados e distribuídos nos blocos B, C, F |

**Achados descartados pela refutação — não replaneje:**
- `NotificationsList` **trata** todos os prefixos em `markAsRead` (`src/features/notifications/hooks/useNotifications.ts:101-131`); só a exclusão é restrita a `push-`, por decisão de negócio documentada em comentário (`:166-167`). O item do BALANCO está desatualizado.
- `ExecutionDetailsModal` **gera PDF real** com jsPDF (`src/features/maintenance/components/ExecutionDetailsModal.tsx:149-194`), não texto com extensão `.pdf`. O único `Blob` do arquivo é o CSV (`:230`).

## Como usar

- **Uma etapa = uma branch = uma PR.** Nome: `claude/<fix|feat|chore|ci>-<slug>-<AAMMDD-HHMM>`.
- Tipos de commit conforme commitlint: `fix:`, `feat:`, `chore:`, `ci:`, `refactor:`, `test:`, `docs:`. **Não existe `infra:`**.
- Etapas marcadas **[DONO]** caem no item 8 do Fluxo Git (DDL em produção, CI/workflows, segredos, custo, arquitetura): a PR fica aberta aguardando decisão.
- Toda etapa traz **Verificação**: sem ela a etapa não está pronta. "Pronto" = PR mergeada + deploy confirmado + comportamento verificado.
- Antes de cada etapa, reler `docs/contexto/00-INDEX.md` na branch `contexto` (estado real de código, banco e regras, regerado a cada 10 min).
- Ordem recomendada: Bloco B (P0/P1 de dado errado) → Bloco A (contratos) → Bloco C (segurança) → D/E/F/G.

## Diagnóstico em uma tela

**O sistema é grande e real** (1.120 arquivos de código, 189k linhas, 58 rotas, 133 tabelas, 33 Edge
Functions, 1.572 casos de teste). Os 13 de 16 dossiês `F-0xx` resolvidos nas últimas semanas provam que
o núcleo operacional funciona. Os problemas que sobram se concentram em cinco frentes:

1. **Contrato de API inexistente como disciplina.** Só 9 das 33 Edge Functions validam o body com Zod
   (`_shared/validate.ts:51`, `_shared/contracts.ts:81`); **sete formatos de erro diferentes** convivem;
   `bitrix24-sync` responde **200 em caso de erro** em 8 caminhos (`index.ts:1094,1113,1136,1144,1163,1232,1249,1268`);
   JSON inválido vira **500** em `erp-api`, `external-db-bridge` e `bitrix24-sync`; **31 de 33 funções
   aceitam qualquer método HTTP**; nenhuma tem versionamento; e os dois únicos testes de contrato de
   função **não rodam no CI** (`ci.yml:218-220` roda só `_shared/*.test.ts`).
2. **Dado errado apresentado como verdade.** Quiosque com números fixos sem rótulo
   (`src/components/kiosk/KioskMode.tsx:189,194,199,204`); `confidence` multiplicado por 100 sobre valor
   já percentual, exibindo 6000% (`PredictiveHealthCard.tsx:88`); 11 pontos onde "hoje" é calculado em
   UTC e erra 3 horas por dia em America/Sao_Paulo; resumo diário e previsão de falha mostrando D-1
   (`NotificationsPage.tsx:99,100`); custo de perdas com preço fixo hardcoded (`LossesTable.tsx:186,190`).
3. **Falha silenciosa.** Dezenas de escritas no Supabase sem checar `error` antes do toast de sucesso —
   perda de produção que não soma no job (`useProductionLosses.ts:106-122`), alerta de manutenção que não
   grava mas informa "nenhum risco" (`useTPMAlertMutations.ts:101-117`), estoque conferido como
   "disponível" quando a query falha (`useJobInventoryCheck.ts:14-29`). Nenhuma página usa `isError`; o
   QueryClient não tem `onError` global (`src/lib/queryConfig.ts:147-160`), então falha de rede vira
   tela vazia ("Fila zerada" no quiosque de embalagem, `PackagingKioskPage.tsx:67-70`).
4. **Autorização apoiada só em RLS.** `anon` tem DELETE/INSERT/UPDATE/TRUNCATE em ~130 tabelas e os
   *default privileges* dão `anon=arwdDxtm` para tabelas novas; 5 funções SECURITY DEFINER sem
   `search_path`; 13 RPCs SECURITY DEFINER executáveis por `anon`; CSP em enforce mas com `unsafe-eval`;
   `deploy.yml` sobe migrations em produção **sem depender do CI**.
5. **Fluxos pela metade.** Máquinas não têm cadastro na UI (só ativar/desativar); SPC cria parâmetro e
   medição sem editar nem excluir; `jobsService.getAll()` baixa a tabela `jobs` inteira e silenciosamente
   corta em 1000 linhas para 14+ consumidores; 14 botões sem handler; 30 componentes órfãos no disco.

---

# BLOCO A — Contratos, validação de schema e testes de contrato (etapas 1-50)

> Atende integralmente o pedido: schemas Zod para **todos** os webhooks e Edge Functions, formato único
> de erro 422 com código/mensagem/lista de campos, casos de contrato para payload ausente/tipo
> errado/valor vazio, e versionamento v1/v2 com compatibilidade retroativa.

## A.1 Envelope único de erro (1-9)

### 1. Criar o envelope canônico de erro em `_shared/httpError.ts`
- **Problema**: sete formatos de erro distintos nas Edge Functions — `{error}` (maioria), `{error,details,requestId}` (`_shared/validate.ts:39`), `{error,message,details}` (`erp-api/index.ts:187`), `{ok:false,error:{code,message}}` (`_shared/auth.ts:70-73`), `{error,message,requestId}` (`_shared/rateLimit.ts:83-86`), `{ok:false,error}` (`health-monitor/index.ts:83`), `{error,status,hint}` (`image-optimizer/index.ts:14-22`). Cliente não pode tratar erro de forma genérica.
- **Correção**: novo módulo exportando `errorResponse(code, message, {fields?, status?, requestId})` que serializa sempre `{ok:false, error:{code, message, fields}, meta:{requestId, timestamp}}`, com `Content-Type: application/json`, headers CORS e `x-request-id`. `fields` é `Array<{path:string, code:string, message:string}>`, vazio quando não há erro de campo.
- **Verificação**: `supabase/functions/_shared/httpError.test.ts` cobrindo forma do JSON, presença de `x-request-id` e CORS; `deno test` verde.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 2. Definir o catálogo de códigos de erro
- **Problema**: mensagens livres e em dois idiomas impedem tratamento programático. Hoje coexistem "Validation failed" (`_shared/validate.ts:69`) e "Contract validation failed" (`_shared/contracts.ts:91`) para o mesmo caso.
- **Correção**: enum em `_shared/httpError.ts`: `VALIDATION_FAILED` (422), `INVALID_JSON` (400), `UNSUPPORTED_MEDIA_TYPE` (415), `METHOD_NOT_ALLOWED` (405), `PAYLOAD_TOO_LARGE` (413), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500), `NOT_IMPLEMENTED` (501). Mensagem padrão em PT-BR por código, sobreponível.
- **Verificação**: teste que percorre o enum e confere o status HTTP associado a cada código.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 3. Migrar `parseOrError` para 422 com lista de campos
- **Problema**: `_shared/validate.ts:41` devolve **400** para falha de schema e empacota o erro como `details: error.format()`, um objeto aninhado que o cliente não consegue percorrer.
- **Correção**: trocar status para 422, converter `ZodError.issues` em `fields:[{path:"quantity",code:"too_small",message:"..."}]` e manter 400 só para `INVALID_JSON` (`:61`). Preservar o header `x-request-id` existente (`:39-45`).
- **Verificação**: teste com payload de 3 campos inválidos conferindo `status===422` e `fields.length===3` com `path` correto.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 4. Unificar `validateContract` com o mesmo envelope
- **Problema**: `_shared/contracts.ts:81-94` é `async` sem nenhum `await`, devolve `{success:false,error:"Contract validation failed",details}` em vez de `Response`, e cada chamador monta o JSON do seu jeito (`erp-api/index.ts:187,204,253`).
- **Correção**: reescrever como função síncrona que devolve `{ok:true,data}` ou `{ok:false,response:Response}` usando `errorResponse(VALIDATION_FAILED,…)`. Remover o `async` morto.
- **Verificação**: `_shared/contracts.test.ts` atualizado; `erp-api` devolve 422 com `fields` para body inválido.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 5. Alinhar `_shared/auth.ts` ao envelope
- **Problema**: `auth.ts:70-73,91,182-229` já usa `{ok:false,error:{code,message}}` — perto do alvo, mas sem `fields` nem `meta`, e só cobre 401/403/500.
- **Correção**: fazer `auth.ts` consumir `errorResponse` em vez de montar o objeto, mantendo os códigos atuais mapeados para o catálogo da etapa 2.
- **Verificação**: os 40 testes congelados de `_shared/auth.test.ts` continuam verdes após ajuste das asserções de forma.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 6. Alinhar `_shared/rateLimit.ts` (429) ao envelope
- **Problema**: `rateLimit.ts:83-86` devolve `{error:"Too Many Requests",message,requestId}`, formato próprio.
- **Correção**: usar `errorResponse(RATE_LIMITED,…)` preservando `Retry-After`.
- **Verificação**: `_shared/rateLimit.test.ts` confere envelope e `Retry-After`.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 7. Padronizar o preflight CORS e o 204
- **Problema**: `tpm-notifications/index.ts:9` responde `'ok'` em texto no OPTIONS; `cron-alert-email`, `daily-maintenance-summary` e `security-alert` respondem 200 com corpo `null`; `_shared/cors.ts:60` usa 204. Três comportamentos para a mesma requisição.
- **Correção**: todas as funções passam a usar `handleCorsPreflight` de `_shared/cors.ts`.
- **Verificação**: script `scripts/ci/edge-contract-coverage.mjs` (etapa 45) falha se alguma função tratar OPTIONS sem o helper.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 8. Incluir CORS nas 4 funções que respondem sem headers
- **Problema**: `backup-scheduler/index.ts:44-55,104`, `metrics-collector/index.ts:70` (sem preflight), `send-tpm-email/index.ts:46,65,82,103` e `send-loss-risk-alert/index.ts:58,92,102,127` respondem sem headers CORS; `backup-scheduler:37` e `metrics-collector:5-6` nem olham o método — vão direto para `requireCronSecret`. São as 2 únicas funções que não importam `_shared/cors`.
- **Correção**: importar `_shared/cors`, tratar preflight e anexar headers em todas as respostas, inclusive erro.
- **Verificação**: teste Deno que faz OPTIONS e um POST inválido em cada uma das 4 e confere `Access-Control-Allow-Origin`.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 9. Documentar o envelope no OpenAPI
- **Problema**: `docs/operacoes/openapi-edge-functions.yaml:40-44` descreve `Error` como `{error}` e diz "34 funções" (`:6`) quando há 33; afirma `verify_jwt=true` "exceto csp-report" (`:21`) ignorando que `bitrix24-sync` também é `false` (`supabase/config.toml:39`); e descreve 400 como "schema zod" quando a maioria valida manualmente.
- **Correção**: atualizar `components.schemas.Error` para o envelope, corrigir contagem, listar as duas funções sem JWT e marcar 422 como status de validação.
- **Verificação**: `npx @redocly/cli lint docs/operacoes/openapi-edge-functions.yaml` sem erro novo; contagem conferida por `ls -d supabase/functions/*/ | wc -l`.
- **Impacto** Médio · **Esforço** Baixo · **P2**

## A.2 Fundação técnica da validação (10-16)

### 10. Fixar a versão do Zod nos imports Deno
- **Problema**: `npm:zod` sem versão em `_shared/validate.ts:12`, `validation.ts:1`, `contracts.ts:1`, `test-utils.ts:2` e `csp-report/index.ts:8`. A resolução depende do `node_modules` instalado pelo `npm ci` do CI (`ci.yml:196-197`), então um bump de `zod` no front muda o comportamento das Edge Functions sem nenhuma alteração nelas.
- **Correção**: trocar todos por `npm:zod@4.6.7` (versão do `package.json:147`).
- **Verificação**: `grep -rn 'npm:zod"' supabase/functions` vazio; `deno check --frozen` verde.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 11. Criar `deno.json` e ligar o import map
- **Problema**: `supabase/functions/import_map.json` define o alias `zod` (`:6`) mas nenhum código o usa e `config.toml` não aponta para o arquivo; não existe `deno.json`. O import map é código morto que dá falsa sensação de pin.
- **Correção**: criar `supabase/functions/deno.json` com `imports` (zod, std@0.224.0, supabase-js com versão) e referenciá-lo; migrar os imports para os aliases; remover `import_map.json`.
- **Verificação**: `deno check --frozen` verde; `deno test` verde; deploy de uma função em staging.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 12. Helper `readJsonBody` com limite, content-type e JSON inválido
- **Problema**: 18 pontos de leitura de body em 15 funções e **nenhum limite de tamanho** fora de `csp-report` (`csp-report/index.ts:51,175-176`); **nenhuma das 18** verifica `Content-Type` antes de parsear. `pdf-generator/index.ts:54` ainda ecoa o payload inteiro na resposta (`:106`), amplificando o abuso.
- **Correção**: `_shared/readJsonBody.ts` com `maxBytes` (default 256 KB, parametrizável), checagem de `content-type: application/json` → 415, corpo vazio → `{}`, JSON inválido → 400 `INVALID_JSON`, excedente → 413 `PAYLOAD_TOO_LARGE`. Ler por stream, como `csp-report` já faz.
- **Verificação**: testes para os 4 caminhos (ok, vazio, inválido, grande) e um para `content-type` errado.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 13. Helper `assertMethod` e aplicar nas 31 funções
- **Problema**: só `csp-report` (405 em `:155`) e `erp-api` rejeitam método; 29 funções tratam apenas OPTIONS e 2 (`backup-scheduler`, `metrics-collector`) não olham o método — todas aceitam GET/PUT/DELETE em handler escrito para POST.
- **Correção**: `_shared/assertMethod.ts` devolvendo 405 com `Allow:` e aplicar no topo de cada `index.ts`.
- **Verificação**: teste de contrato (etapa 43) faz GET em cada função e exige 405.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 14. Comparação de segredos em tempo constante
- **Problema**: 11 pontos comparam segredo com `===`/`!==`: `_shared/cronAuth.ts:49` (protege ~15 funções destrutivas), `bitrix24-sync/index.ts:875-876` e `:1000-1001`, `send-push-notification/index.ts:197` (service_role), `send-tpm-email/index.ts:27-28`, `send-loss-risk-alert/index.ts:39-40`, `cleanup-security-logs/index.ts:25`, `validate-login-ip/index.ts:57`, `backup-scheduler/index.ts:50`, `calculate-rankings/index.ts:27`, `auto-promote-jobs/index.ts:28`. `timingSafeEqual` está disponível na std e não é usado.
- **Correção**: `_shared/secretEquals.ts` com `timingSafeEqual` sobre bytes UTF-8 (com comparação de tamanho protegida) e migrar os 11 pontos.
- **Verificação**: teste do helper; `grep -rn "=== *\(expected\|apiKey\|cronSecret\|supabaseKey\|webhookToken\)" supabase/functions` vazio.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 15. Tirar o segredo do Bitrix da query string
- **Problema**: `bitrix24-sync/index.ts:875-876` e `:1000-1001` aceitam o segredo via `?token=`, que vai para logs do gateway e do Supabase.
- **Correção**: aceitar só os headers `x-bitrix-webhook-secret`/`x-webhook-secret`, com um período de aceitação dupla registrado em log de depreciação, e adicionar os dois headers à allowlist de `_shared/cors.ts:34-35` (hoje ausentes).
- **Verificação**: teste de contrato rejeitando `?token=` e aceitando o header; log de uma chamada real do Bitrix após a mudança. **[DONO]** (exige reconfigurar o webhook no painel do Bitrix).
- **Impacto** Alto · **Esforço** Médio · **P1**

### 16. Harness de teste de contrato reutilizável
- **Problema**: `_shared/test-utils.ts:14-40` tem `testContract(handler,payload,expectedStatus)` usado por **um** arquivo (`webhook-handler/index.test.ts:3`), declara `ContractTestResultSchema` (`:5-9`) sem uso, e não cobre método, content-type nem forma do erro.
- **Correção**: reescrever como `runContractSuite({handler, validPayload, requiredFields, enums, auth})` que gera automaticamente os casos: válido, campo ausente (um por campo obrigatório), tipo errado, string vazia, enum inválido, extra em schema `.strict()`, body vazio, JSON inválido, método errado, content-type errado, payload grande. Cada caso assere status **e** envelope.
- **Verificação**: o próprio harness tem teste; usado por ≥2 funções antes de seguir.
- **Impacto** Alto · **Esforço** Médio · **P0**

## A.3 Schema Zod por função (17-40)

> Regra para todas as etapas desta seção: schema em `<funcao>/schema.ts` (ou `_shared/validation.ts` quando
> compartilhado), toda string com `.max()`, todo número com `.min()/.max()`, todo array com `.max()`,
> objeto `.strict()` quando o payload é fechado, e resposta de falha pelo `errorResponse` (422).

### 17. `webhook-handler`: unificar o schema de webhook e remover a duplicata
- **Problema**: dois schemas divergentes para o mesmo payload — `_shared/validation.ts:3-7` (`source` string livre, `data` opcional) e `_shared/contracts.ts:13-18` (`source` enum, `data` obrigatório). O primeiro, mais `bitrix24DataSchema` e `stripeDataSchema`, **não é importado por ninguém**. `event` sem `.max()` e `data: z.record(z.any())` ilimitado são gravados em `webhook_logs` (`webhook-handler/index.ts:109`).
- **Correção**: manter só o de `contracts.ts`, adicionar `.max(120)` em `event`, limitar `data` por tamanho serializado, apagar os três schemas órfãos de `validation.ts`.
- **Verificação**: `runContractSuite` em `webhook-handler`; `grep -rn "webhookPayloadSchema\|bitrix24DataSchema\|stripeDataSchema" supabase/functions` vazio.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 18. `bitrix24-sync`: parar de responder 200 em erro
- **Problema**: 8 caminhos devolvem `{error}` com **status 200** — `index.ts:1094` (save-mapping), `:1113`, `:1136` (delete-mapping), `:1144` (list-mappings), `:1163`, `:1232` e `:1249` (oauth-callback), `:1268` (ação inválida) — porque a resposta final em `:1274` não passa `status`. O webhook também responde 200 com `{error:'No deal ID…'}` (`:729,735`).
- **Correção**: cada caminho de erro devolve `errorResponse` com o status correto (400/404/422/502). Para o webhook do Bitrix, manter 200 **só** quando o evento é deliberadamente ignorado, com corpo `{ok:true,ignored:true,reason}` — nunca `{error}` com 200.
- **Verificação**: teste de contrato por ação conferindo status; log de uma chamada real do Bitrix sem regressão.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 19. `bitrix24-sync`: schema por ação
- **Problema**: 13 ações em `?action=` (`index.ts:1270`) com validação manual esparsa: push valida UUID/status (`:957-971`), save/delete-mapping usam `if(!x)` (`:1093,1130-1137`), webhook não valida nada (`:1008`). `save-mapping` aceita `mapping_type` arbitrário e strings ilimitadas (`:1091-1105`), `priority` sem range; `delete-mapping` passa `mappingId` sem checar tipo para o `.eq('id')` (`:1129-1134`); `history` passa `limit` de query sem clamp (`:1033-1038`).
- **Correção**: `z.discriminatedUnion('action', […])` com um schema por ação; `mapping_type` como enum; `priority` em `[0,100]`; `limit` em `[1,200]`; `mappingId` como UUID.
- **Verificação**: `runContractSuite` por ação, incluindo ação inexistente → 400.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 20. `bitrix24-sync`: schema do payload de webhook do Bitrix
- **Problema**: `index.ts:1008` faz `req.json()` sem schema e sem catch (JSON inválido cai no 500 de `:1297`); usa `payload.event` e `payload.data.FIELDS.ID` (`:724-741`) sem validar — `dealId` objeto gera `"BTX-[object Object]"` e cria job inválido.
- **Correção**: schema com `event` em enum (`ONCRMDEALUPDATE`, `ONCRMDEALADD`), `data.FIELDS.ID` como string/number coagida e validada, e `readJsonBody`.
- **Verificação**: teste com payload real do Bitrix, com `FIELDS.ID` objeto (→422) e sem `event` (→422).
- **Impacto** Alto · **Esforço** Médio · **P0**

### 21. `erp-api`: JSON inválido deixa de ser 500
- **Problema**: `req.json()` sem catch em `index.ts:184,201,250` → JSON malformado cai no catch geral (`:141`) e responde **500**.
- **Correção**: usar `readJsonBody` nos três pontos.
- **Verificação**: teste enviando `{"a":` e exigindo 400 `INVALID_JSON`.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 22. `erp-api`: limites de tamanho nos schemas de job e lote
- **Problema**: `_shared/contracts.ts:32-40,57,64-70` não tem `.max()` em `order_number`, `client`, `product`, `notes`, `lot_number` — a integração ERP pode gravar textos de megabytes em `jobs`.
- **Correção**: `.max()` coerente com o schema do banco em cada campo; `quantity` com teto; `ERPLotRequestSchema` idem.
- **Verificação**: teste com string de 1 MB → 422 com `fields[0].path==="order_number"`.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 23. `erp-api`: validar query params e path
- **Problema**: `index.ts:175-176` passa `status` e `date` da query direto para `.eq()` sem allowlist — valor fora do enum gera 500 do PostgREST em vez de 400; `jobId` do path vai ao `.eq('id')` sem checagem de UUID (`:155,210`).
- **Correção**: schema Zod para a query (`status` enum, `date` regex ISO, `limit` em `[1,200]` — já existe em `:161-167` —, `offset` ≥ 0) e UUID obrigatório no path.
- **Verificação**: teste com `?status=foo` → 422 e `/jobs/abc` → 422.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 24. `erp-api`: `.single()` → `maybeSingle()` com 404 real
- **Problema**: `GET /jobs/:id` inexistente responde **500** porque `.single()` lança PGRST116 (`index.ts:157`).
- **Correção**: `maybeSingle()` e, com `data` nulo, `errorResponse(NOT_FOUND)`.
- **Verificação**: teste com UUID válido inexistente → 404 com envelope.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 25. `erp-api`: remover o schema importado e não usado
- **Problema**: `ERPListResponseSchema` é importado em `index.ts:6` e não aparece mais no arquivo; `ErrorResponseSchema` e `ERPJobResponseSchema` de `contracts.ts` não são importados por ninguém.
- **Correção**: usar `ERPListResponseSchema` para validar a resposta de listagem em modo de teste (ou remover o import) e remover os dois schemas órfãos, ou passá-los a usar na validação de saída da etapa 44.
- **Verificação**: lint do Deno sem import não utilizado; `deno check --frozen` verde.
- **Impacto** Baixo · **Esforço** Baixo · **P3**

### 26. `external-db-bridge`: Zod no lugar da validação manual
- **Problema**: `validateBridgeRequest` manual (`index.ts:131-175`), `req.json()` sem catch (`:211`, 500 em `:346`), e o teste do diretório **reimplementa a lógica localmente** (`index.test.ts:21-24`) em vez de importar do `index.ts` — testa uma cópia, não o código.
- **Correção**: schema Zod com `action` enum, `table` na allowlist existente (`:100-118`), `rpc` na allowlist (`:120-128`) e `params` por ação; exportar o handler para o teste importar.
- **Verificação**: teste importando o handler real; `runContractSuite` com tabela fora da allowlist → 422.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 27. `external-db-bridge`: allowlist de colunas em `match`
- **Problema**: as chaves de `params.match` vão direto para `.match()` com service-role (`index.ts:276,283`) — admin/manager filtra UPDATE/DELETE por qualquer coluna, sem validação de nome ou tipo. Só o nome da tabela é verificado.
- **Correção**: allowlist de colunas filtráveis por tabela e validação de tipo do valor; rejeitar chave desconhecida com 422.
- **Verificação**: teste com `match:{"__proto__":1}` e com coluna não listada → 422.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 28. `external-db-bridge`: range em `limit`/`offset` e teto em `data`
- **Problema**: `index.ts:260-261` passa `limit`/`offset` sem tipo nem range (valor negativo, string ou 1e9 chega ao PostgREST); `:269` aceita array ilimitado em insert/upsert, permitindo bulk insert de milhares de linhas com service-role.
- **Correção**: `limit` em `[1,500]`, `offset` ≥ 0, `data` com `.max(200)` itens e teto de bytes.
- **Verificação**: teste com `limit:-1`, `limit:1e9` e array de 201 itens → 422.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 29. `create-operator`: Zod com tipo e tamanho
- **Problema**: validação manual em `index.ts:66-98` não checa `typeof` nem tamanho — `full_name` de megabytes vai para `user_metadata` e `profiles` (`:108`), `phone` de qualquer tipo é gravado (`:123`), `password` não-string quebra em `password.length` (500). Além disso, falha do Auth responde **400** (`:113`) em vez de 502/500.
- **Correção**: schema com `email` (`z.string().email().max(254)`), `password` (`.min(12).max(128)`), `full_name` (`.max(120)`), `phone` (`.max(32)` regex), e separar erro do provedor (502) de erro de entrada (422). Manter `requireElevatedAal2`.
- **Verificação**: `runContractSuite`; teste com `password:123` (número) → 422, não 500.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 30. `update-operator`: Zod com UUID
- **Problema**: `index.ts:50-66` usa `if(!x)`; `operator_id` vai ao `.eq('id')` sem checar UUID (`:78-82`); `full_name`/`phone` não-string disparam TypeError (500); falha de update responde 400 (`:86`).
- **Correção**: schema com `operator_id` UUID, strings com `.max()`, e separação de erro de servidor.
- **Verificação**: teste com `operator_id` objeto → 422.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 31. `send-email-report`: teto em `recipients`
- **Problema**: `index.ts:83` valida formato de cada e-mail mas **não limita a quantidade** — um coordinator (ou quem tenha o cron secret) dispara o relatório para milhares de endereços arbitrários numa chamada, com custo Resend e risco de reputação do domínio (`:338`).
- **Correção**: `.max(25)` em `recipients`, `report_type` enum, datas com regex, UUIDs validados; mensagens de erro em PT-BR (hoje só EN, `:64-114`).
- **Verificação**: teste com 26 destinatários → 422.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 32. `send-push-notification`: Zod no payload
- **Problema**: `index.ts:224` desestrutura `{user_id,title,body,icon,data,broadcast}` sem tipo nem limite; grava em `push_notifications` sem teto e o Web Push rejeita payload acima de 4 KB (falha silenciosa); `icon` não validado é entregue ao navegador do destinatário; `user_id` vai ao `.eq()` sem UUID (`:286`).
- **Correção**: schema com `title.max(80)`, `body.max(300)`, `icon` como URL `https` da própria origem/allowlist, `data` com teto serializado, `user_id` UUID, `broadcast` boolean; validar o tamanho final do payload antes de enviar.
- **Verificação**: teste com payload de 5 KB → 422 e `icon:"javascript:…"` → 422.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 33. `new-device-alert`: Zod em `deviceInfo`
- **Problema**: `index.ts:55-57` valida só "é objeto"; `device_fingerprint` é usado em `.eq()` (`:80`) sem checagem de tipo, e `user_agent`/`browser_name`/`os_name`/`device_type` são gravados em `user_devices`/`new_device_alerts` e enviados no e-mail sem teto (`:101,121-124`). `:250` loga o `emailResponse` completo.
- **Correção**: schema com todos os campos como string com `.max()`, `device_fingerprint` com regex e `.max(128)`; reduzir o log para id e status.
- **Verificação**: teste com fingerprint objeto → 422 e string de 1 MB → 422.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 34. `security-alert`: não aceitar identidade forjada no payload
- **Problema**: `index.ts:86-91` usa `payload.user_id`/`payload.user_email` quando não há JWT — quem tiver o `CRON_SECRET` forja evento de auditoria para qualquer usuário, e `details` é JSON ilimitado.
- **Correção**: aceitar `user_id`/`user_email` do payload **só** com um papel de serviço dedicado e registrar a origem (`actor_source:"cron"|"jwt"`); `details` com teto; `event_type`/`severity` continuam em allowlist (`:45-67`).
- **Verificação**: teste provando que chamada só com cron secret não grava `user_id` arbitrário.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 35. `excel-export`: allowlist de colunas por tabela
- **Problema**: `index.ts:93,105` monta `select(columns.join(","))` e `.eq(key,value)` onde a chave passa só por regex de identificador (qualquer coluna da tabela, inclusive internas), o valor pode ser objeto/array, e `columns` não tem `.max()`.
- **Correção**: mapa `tabela → colunas exportáveis` e `tabela → colunas filtráveis`; `columns.max(50)`; valor de filtro restrito a string/número/boolean.
- **Verificação**: teste com coluna fora do mapa → 422; export de uma tabela permitida continua funcionando.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 36. `pdf-generator`: Zod e parar de ecoar o payload
- **Problema**: valida só "body não nulo" e allowlist de `type` (`index.ts:55-67`), com mensagens misturando EN e PT; `:106` devolve `JSON.stringify(data)` inteiro na resposta.
- **Correção**: schema por `type` com `.max()` nos campos usados; remover o eco do payload; mensagens em PT-BR.
- **Verificação**: `runContractSuite`; teste conferindo que a resposta não contém o payload bruto.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 37. `technical-assistant`: fechar o schema de `messages`
- **Problema**: `index.ts:453-454` só limita tamanho quando `content` é string — `content` array/objeto de megabytes passa; `role` não é restrito, então `role:"system"` do cliente é repassado ao gateway LLM (`:511`), permitindo injeção de prompt de sistema; mensagens misturam EN (`:443-464`) e PT (`:519-543`).
- **Correção**: `z.array(z.object({role:z.enum(["user","assistant"]), content:z.string().min(1).max(MAX)}).strict()).max(40)`; descartar campos extras; mensagens em PT-BR.
- **Verificação**: teste com `role:"system"` → 422 e `content` array → 422.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 38. `csp-report`: alinhar ao envelope mantendo o 204
- **Problema**: já tem Zod local (`index.ts:20-35,222`) e limite de 16 KB (`:51,168`), mas devolve `{error:"Invalid CSP report"}` sem `details` (`:224`) e `{error:"Invalid JSON"}` (`:216`), fora do envelope.
- **Correção**: usar `errorResponse`; manter 204 no sucesso, 413 no excesso e o throttle existente (`:182-187`).
- **Verificação**: teste dos 4 caminhos; nenhuma regressão no rate limit.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 39. `check-login-lockout`: remover a validação dupla e o código inalcançável
- **Problema**: tem Zod (`index.ts:115`) **mais** regex manual de e-mail (`:315`) **mais** `"Invalid action"` (`:581`) que nunca é alcançado porque o enum do Zod já barra; mensagens misturam EN (`:316`) e PT (`:335`).
- **Correção**: deixar a validação só no schema, remover o ramo morto, padronizar as mensagens em PT-BR.
- **Verificação**: cobertura mostrando `:581` removido; testes de lockout existentes verdes.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 40. Schema mínimo nas 11 funções que hoje não validam nada
- **Problema**: `auto-promote-jobs` valida só `techniqueId` (`:70-84`); `calculate-inventory-intelligence`, `cleanup-security-logs`, `cron-alert-email`, `cron-cleanup`, `daily-maintenance-summary`, `health-check`, `health-monitor`, `metrics-collector`, `tpm-notifications` e `backup-scheduler` **não validam body nenhum**. Sem schema, qualquer payload é aceito e o contrato não existe.
- **Correção**: para cada uma, schema explícito — `z.object({}).strict()` quando não há body, ou os campos reais (ex.: `auto-promote-jobs` com `techniqueId` UUID opcional e `dryRun` boolean). Documentar a ausência de body no OpenAPI.
- **Verificação**: `runContractSuite` em cada uma, com caso "campo extra" → 422.
- **Impacto** Médio · **Esforço** Médio · **P2**

## A.4 Testes de contrato de verdade (41-47)

### 41. Rodar no CI os testes Deno das funções
- **Problema**: `ci.yml:220` executa `deno test ... supabase/functions/_shared/*.test.ts` — **só `_shared`**. Os dois testes de função existentes (`webhook-handler/index.test.ts`, `external-db-bridge/index.test.ts`) nunca rodam em nenhum workflow, e o job `deno-tests` é gate obrigatório (`ci.yml:269,521`), então a falsa sensação de cobertura é dupla.
- **Correção**: ampliar o glob para `supabase/functions/**/*.test.ts`, ajustando `--allow-read` para as pastas necessárias.
- **Verificação**: run do CI mostrando a contagem de testes subir; os dois arquivos aparecem na saída.
- **Impacto** Alto · **Esforço** Baixo · **P0** · **[DONO]** (altera workflow)

### 42. Corrigir o teste de `webhook-handler` que contradiz o código
- **Problema**: `webhook-handler/index.test.ts:5-15` espera **200** para payload sem assinatura, enquanto `index.ts:69-104` exige HMAC-SHA256 em `x-webhook-signature` e devolve 401 — o teste "passa" hoje só porque não roda.
- **Correção**: reescrever para exigir 401 sem assinatura, 401 com assinatura inválida e 200 com HMAC válido calculado no teste a partir de um `WEBHOOK_SECRET_*` de teste.
- **Verificação**: o teste falha se a verificação de HMAC for removida (prova por mutação manual).
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 43. Suite de contrato obrigatória por função
- **Problema**: 31 das 33 funções não têm nenhum teste (`testes.json`: `sem_teste` lista 31 Edge Functions).
- **Correção**: para cada função, `index.test.ts` chamando `runContractSuite` (etapa 16) com: payload válido → 2xx; **cada** campo obrigatório ausente → 422 apontando o campo; tipo errado por campo → 422; string vazia onde há `.min(1)` → 422; enum inválido → 422; body vazio → 422 (ou 2xx quando a função não tem body); JSON inválido → 400; método errado → 405; `content-type` errado → 415; payload acima do limite → 413. Toda asserção confere **status e envelope**.
- **Verificação**: `deno test` com ≥10 casos por função; contagem total registrada na PR.
- **Impacto** Alto · **Esforço** Alto · **P0**

### 44. Validar também a **resposta** contra o schema
- **Problema**: `contracts.ts` tem `ERPJobResponseSchema`, `ERPListResponseSchema` e `WebhookResponseSchema` (`:20-25,43-51,73-78`) sem nenhum uso — o contrato de saída não é verificado em lugar algum, então uma mudança de coluna muda a resposta da API sem quebrar teste.
- **Correção**: nos testes de contrato, validar o corpo de sucesso contra o schema de resposta; em runtime, validar só em `DENO_ENV=test` para não custar em produção.
- **Verificação**: teste que remove um campo da resposta e vê o schema reprovar.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 45. Gate de cobertura de contrato no CI
- **Problema**: nada impede uma função nova entrar sem schema nem teste — foi assim que 24 funções chegaram sem validação.
- **Correção**: `scripts/ci/edge-contract-coverage.mjs` que falha se alguma pasta em `supabase/functions/` (exceto `_shared`) não tiver `index.test.ts` com `runContractSuite`, ou se o `index.ts` chamar `req.json()` sem passar por `readJsonBody`. Plugar no job `deno-tests`.
- **Verificação**: criar uma função de teste sem schema e ver o CI vermelho; depois remover.
- **Impacto** Alto · **Esforço** Médio · **P1** · **[DONO]** (altera workflow)

### 46. Testes de contrato dos webhooks com assinatura e replay
- **Problema**: as 5 entradas externas (`webhook-handler`, `bitrix24-sync`, `erp-api`, `csp-report`, `external-db-bridge`) não têm teste de autenticação; `external-db-bridge` processa webhook **sem idempotência** (registrado no glossário de lacunas).
- **Correção**: casos por webhook: assinatura ausente, assinatura de outro segredo, corpo alterado após assinar (HMAC não bate), replay do mesmo payload duas vezes (deve ser idempotente ou recusar), timestamp fora da janela.
- **Verificação**: `deno test` cobrindo os 5 casos por webhook; o replay prova a idempotência.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 47. Espelhar os contratos no cliente
- **Problema**: os testes Vitest de contrato do front (`ci.yml:241-248`: `src/test/webhookSimulation`, `webhookFuzz`, `erpApiContracts`) usam schemas próprios, podendo divergir do Deno sem ninguém notar.
- **Correção**: extrair os schemas para `src/contracts/` (TS puro, sem import de Deno) e importar nos dois lados — Edge via `npm:`/alias, front via `@/contracts`. Um teste compara o JSON Schema gerado pelos dois.
- **Verificação**: teste que falha ao alterar um schema em um lado só.
- **Impacto** Médio · **Esforço** Alto · **P2**

## A.5 Versionamento de contratos (48-50)

### 48. ADR de versionamento e política de depreciação
- **Problema**: nenhuma função tem versionamento (nem path, nem header `x-api-version`); só existe `version:"1.0.0"` decorativo em `erp-api/index.ts:66` e `"2.0.0"` em `health-check/index.ts:137`. Qualquer mudança de contrato quebra o ERP e o Bitrix sem aviso.
- **Correção**: ADR definindo: versão no path (`/erp-api/v1/jobs`) para APIs de terceiros, header `x-api-version` com default na menor versão suportada para webhooks, headers `Deprecation` e `Sunset` (RFC 8594) na versão antiga, e janela mínima de 90 dias.
- **Verificação**: ADR em `docs/adr/` revisado; registrado em `AGENTS.md` como regra. **[DONO]** (decisão de arquitetura).
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 49. Implementar v1/v2 em `erp-api` e `webhook-handler`
- **Problema**: hoje o roteamento é `/erp-api/<endpoint>` (`erp-api/index.ts:90-95`) sem versão, e `webhook-handler` tem um único formato de payload.
- **Correção**: roteador que aceita `/v1/...` e `/v2/...` com fallback de `/...` para v1 (compatibilidade); schemas por versão em `contracts.v1.ts`/`contracts.v2.ts`; adaptador que converte v1→v2 internamente, para um só caminho de negócio. No v2, aplicar o envelope de erro e os limites das etapas 22-24.
- **Verificação**: suíte de contrato roda **duas vezes**, uma por versão; `/erp-api/jobs` sem versão continua respondendo como v1.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 50. Testes de compatibilidade retroativa e de depreciação
- **Problema**: sem teste, "descontinuar v1" é uma decisão que quebra o cliente na próxima terça.
- **Correção**: suíte "golden" com payloads e respostas v1 **congelados** em fixtures, que falha se a resposta v1 mudar de forma; teste conferindo `Deprecation`/`Sunset` nas respostas v1 após a marcação; teste de que v2 aceita todo payload válido de v1 (superconjunto).
- **Verificação**: alterar um campo da resposta v1 e ver a suíte golden vermelha.
- **Impacto** Alto · **Esforço** Médio · **P1**

---

# BLOCO B — Dado errado e falha silenciosa (etapas 51-85)

## B.1 Números fabricados apresentados como reais (51-57)

### 51. Quiosque com indicadores fixos sem rótulo
- **Problema**: `src/components/kiosk/KioskMode.tsx:189,194,199,204` renderiza os literais `94.2%` (OEE Estimado), `1.2` (Consumo kWh), `42s` (Tempo Médio) e `16:45` (Previsão Fim). Não há nenhuma marca de demonstração no arquivo (busca por `demo|simul|mock|fake|placeholder` = 0). O painel fica num tablet de fábrica, onde o operador toma decisão olhando esses números.
- **Correção**: ligar os quatro aos hooks reais (`useOEE`, `useEnergy`, média de `jobs.actual_*`, previsão do job em produção) com estado de carregando/vazio; onde não houver fonte, remover o card em vez de exibir número inventado.
- **Verificação**: teste de componente com mock vazio provando que nenhum número literal aparece; print do quiosque com dado real.
- **Impacto** Alto · **Esforço** Médio · **P0**

### 52. Confiança da predição exibida como 6000%
- **Problema**: `src/features/maintenance/components/PredictiveHealthCard.tsx:88` multiplica `confidence` por 100, mas a coluna `machine_predictions.confidence` é `NUMERIC(5,2)` na faixa 0-100 (migration `20251214173607:7`) e a Edge `ml-predictions` grava 0-100 (fallback 60 em `index.ts:208`, clamp em `:243`). Resultado: 60 vira "6000%".
- **Correção**: remover o `* 100` e formatar com uma casa decimal.
- **Verificação**: teste com `confidence: 60` exibindo "60,0%". **Observação**: `KPIOverviewTab.tsx:353-355` **não** tem o mesmo bug — ali a origem é fração (`useKPIs.ts:338`), o `*100` está correto.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 53. Receita e custo de perdas com preço hardcoded
- **Problema**: `src/features/analytics/components/bi/BINormalView.tsx:114` calcula receita como `peças × 2,5` fixo; `LossesTable.tsx:186,190` usa custo `× 10` e `× 5,5` por peça — enquanto `:174` do mesmo arquivo usa `averageUnitCost` real. KPI financeiro do BI é ficção apresentada como número de negócio.
- **Correção**: puxar preço/custo de `business_config` (ou da tabela ABC de taxas) com fallback explícito "sem preço cadastrado"; unificar com o cálculo de `:174`.
- **Verificação**: teste comparando o valor exibido com o configurado; card mostra aviso quando não há preço.
- **Impacto** Alto · **Esforço** Médio · **P0**

### 54. Painéis com `Math.random()` em tela de produção
- **Problema**: `src/features/maintenance/components/VirtualSensorPanel.tsx:33-42` gera leitura de sensor aleatória e é usado no `TPMDashboard` **sem rótulo**. Os outros três casos têm rótulo e são aceitáveis como demonstração: `FactoryFloorMap.tsx:91-93` ("DEMONSTRAÇÃO" em `:123`), `TechnicalTelemetryPanel.tsx:11-33` ("DADOS SIMULADOS" em `:50`), `AutonomousEventLog.tsx:41` (`DemoDataBadge`).
- **Correção**: no `VirtualSensorPanel`, ou ligar a uma fonte real, ou aplicar o mesmo `DemoDataBadge` dos outros três, ou retirar do dashboard.
- **Verificação**: inspeção do `TPMDashboard` renderizado; teste de presença do selo.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 55. Status de infraestrutura com texto fixo
- **Problema**: `src/components/settings/SettingsGeneralTab.tsx:136` exibe "Lovable Cloud / Conectado" e `:144` "Autenticação / Ativa e segura" — ambos literais, sem consultar nada. O backend oficial é Supabase Cloud (ADR 0005), então o card informa **o provedor errado** como conectado.
- **Correção**: substituir por consulta real (`health-check` ou um ping ao Supabase) com os três estados, ou remover os cards.
- **Verificação**: desligar a rede e ver o card indicar falha.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 56. Thresholds "salvos" que não persistem
- **Problema**: `SettingsGeneralTab.tsx:25-28` dispara toast de sucesso ao salvar thresholds; o valor é gravado apenas em variáveis de módulo (`useBottleneckPrediction.ts:28-31`), lidas em `:116,133,150`. Some no reload e o próprio formulário reabre em 75/90 (`useState` fixo, `:22-23`) na mesma sessão. A mensagem "atualizados" é enganosa.
- **Correção**: persistir em `business_config` (ou tabela própria com RLS) e carregar no formulário; toast só após confirmação de escrita.
- **Verificação**: salvar, recarregar a página e ver o valor mantido; query no banco.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 57. Taxas de sucesso e utilização exibindo NaN/undefined
- **Problema**: `src/pages/SimulationDashboard.tsx:115` calcula `passed/total*100` sem guarda (mostra "NaN%" antes de rodar a simulação); `AIFinancialAdvisor.tsx:105` divide por `totalBudget` sem guarda (`:21,33,53` idem); `TPMReports.tsx:326` concatena `undefined + '%'`, que é truthy, então o fallback `|| '100%'` nunca aplica e a tela mostra "undefined%".
- **Correção**: helper `formatPercent(num, den, {fallback:'—'})` com guarda de zero/NaN e usar nos três pontos.
- **Verificação**: teste com denominador 0 e com valor ausente exibindo "—".
- **Impacto** Médio · **Esforço** Baixo · **P1**

## B.2 Data, fuso e "hoje" (58-66)

### 58. Resumo diário e previsão de falha exibindo o dia anterior
- **Problema**: `src/pages/NotificationsPage.tsx:100` faz `new Date(s.date)` sobre `daily_summaries.date`, coluna **DATE** (migration `20251220133349:4`), e `:99` o mesmo sobre `machine_predictions.predicted_failure_date` (migration `20251214173607:8`). String `YYYY-MM-DD` é interpretada como UTC, então em America/Sao_Paulo todo resumo e toda previsão aparecem com **um dia a menos**. O repo já tem `parseDateOnly` em `src/lib/dateUtils.ts`, usado em ~20 pontos.
- **Correção**: usar `parseDateOnly` nos dois.
- **Verificação**: teste com `TZ=America/Sao_Paulo` e data `2026-11-22` exibindo 22/11.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 59. Escalonamento de prioridade marcando jobs de hoje como atrasados
- **Problema**: `src/features/jobs/hooks/usePriorityEscalation.ts:45` define `today` com `new Date().toISOString().split('T')[0]` (UTC) e compara `job.scheduled_date < today`. Entre 21h e 24h (BRT) os jobs de **hoje** passam a ser tratados como vencidos, escalonados e notificados — com efeito **persistente no banco**.
- **Correção**: `formatDateOnly(new Date())` de `dateUtils` (data local) em todas as comparações.
- **Verificação**: teste com fake timer às 22h BRT provando que job de hoje não é escalonado.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 60. Contador de alertas e capacidade zerando às 21h
- **Problema**: `src/hooks/useAlertCount.ts:10` usa data UTC e compara com `scheduled_date` (`:28`) enquanto `currentTime` é local — mistura de fusos; `src/hooks/useTechniqueCapacityAlerts.ts:32,64` idem, então das 21h às 24h a ocupação do dia cai a zero e os alertas críticos desaparecem.
- **Correção**: data local em ambos; chave de dedupe (`:64`) também local.
- **Verificação**: teste às 22h BRT com job de hoje mantendo o badge e o alerta.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 61. Estatísticas e tendência do painel de agendamento deslocadas
- **Problema**: `src/features/jobs/hooks/useSchedulingData.ts:156` calcula `todayScheduled`/`todayCompleted` com data UTC; `:222` e `:265` geram as chaves do gráfico de tendência com `setDate` local seguido de `toISOString()`, então entre 21h e 24h todas as barras deslocam um dia e a última fica vazia. Esse hook alimenta Kanban, calendários, KPIs e quiosque.
- **Correção**: `formatDateOnly` em todos os pontos.
- **Verificação**: teste do gráfico às 22h BRT com 7 barras e a de hoje preenchida.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 62. "Concluídos hoje" da embalagem e do turno
- **Problema**: `src/pages/PackagingDashboard.tsx:70,80` compara `completed_at` com dia UTC (tarefas finalizadas após 21h somem de "hoje"); `src/components/operator/ShiftSummaryCard.tsx:14` filtra jobs de hoje por data UTC, então o turno noturno vê progresso 0% e peças zeradas.
- **Correção**: comparar em data local; para `completed_at` (timestamp), usar intervalo `[início do dia local, fim do dia local)`.
- **Verificação**: teste às 22h BRT com tarefa concluída aparecendo em "hoje".
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 63. Heatmap e sugestão de máquina com "hoje" em UTC
- **Problema**: `src/components/machines/FactoryHeatmap.tsx:20,32` marca "agendada hoje" por data UTC (cor e contagem erradas nas últimas 3h do dia); `src/hooks/useMachineSuggestion.ts:32` idem, fazendo toda máquina parecer livre após 21h e corrompendo o ranking de sugestão.
- **Correção**: data local nos dois.
- **Verificação**: teste do ranking às 22h BRT com carga correta.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 64. Taxa ABC e mês corrente escolhidos pela data UTC
- **Problema**: `src/hooks/abc/useABCMutations.ts:29` escolhe a taxa vigente comparando `period_start/period_end` com data UTC — no último dia do período, após 21h, o custo do job usa a tarifa do período seguinte (ou nenhuma); `src/components/abc/ABCActivityRatesCard.tsx:42` calcula `currentMonth` em UTC e `periodEnd` em local, produzindo `start > end` na virada do mês e nenhuma tarifa encontrada.
- **Correção**: data local nos dois, com teste de virada de mês.
- **Verificação**: teste em 30/11 às 22h BRT encontrando a tarifa de novembro.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 65. Default de data no formulário de manutenção e período do PDF
- **Problema**: `src/features/maintenance/components/CreateScheduleModal.tsx:53,76` pré-preenche `next_due_at` com data UTC (após 21h já vem amanhã); `src/lib/productivityReport.ts:182` faz `new Date()` sobre `period_start`/`period_end` (colunas DATE), imprimindo início e fim um dia antes no PDF de produtividade.
- **Correção**: `formatDateOnly` no default e `parseDateOnly` no relatório.
- **Verificação**: abrir o modal às 22h BRT com a data de hoje; conferir o PDF gerado.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 66. Datas e moeda sem locale pt-BR
- **Problema**: `toLocaleDateString()` sem locale em `MachineReliabilityTab.tsx:174` e `BatchApprovalPreviewModal.tsx:97,151` (vai para o CSV exportado) — em navegador en-US sai MM/DD. Moeda: `BIAIInsights.tsx:90` usa `toLocaleString()` sem locale ("R$ 1,250.5"); `ExecutionRecordView.tsx:150,360`, `EnergyChartTabs.tsx:59,102`, `pdfExport.ts:395`, `MachineTPMTimeline.tsx:91` e `EnergyDashboard` formatam moeda com `toFixed(2)`, sem separador de milhar nem vírgula decimal.
- **Correção**: helpers `formatDate`/`formatCurrency` em `src/lib/format.ts` com `pt-BR` e `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})`; substituir nos pontos citados; regra de ESLint proibindo `toLocaleDateString()`/`toLocaleString()` sem argumento.
- **Verificação**: teste com `LANG=en-US` exibindo formato brasileiro; lint pegando um caso novo.
- **Impacto** Médio · **Esforço** Médio · **P2**

## B.3 Escritas que falham em silêncio (67-78)

### 67. Perda de produção que não soma no job
- **Problema**: `src/features/production/hooks/useProductionLosses.ts:106-122` lê `lost_pieces` com `.single()` ignorando o erro e faz `update` sem checar o resultado; o toast de sucesso dispara de todo jeito. Se o `select` falhar, `job` é null e o acumulado de perdas é **substituído** pela perda atual (perda de dado de produção); se o `update` falhar, a perda fica em `production_losses` mas não no job, e o dashboard de OEE mostra número menor.
- **Correção**: trocar o read-modify-write por RPC atômica (`increment_job_lost_pieces`, que o glossário aponta como **chamada mas inexistente** no banco) ou por `update` com expressão SQL; checar `error` antes do toast.
- **Verificação**: teste com erro simulado no select provando que nada é sobrescrito e que o toast é de erro. **[DONO]** (precisa de DDL da função).
- **Impacto** Alto · **Esforço** Médio · **P0**

### 68. Alerta de manutenção que não grava mas informa "nenhum risco"
- **Problema**: `src/features/maintenance/hooks/useTPMAlertMutations.ts:101-117` faz `insert` em `maintenance_alerts` e, em erro, retorna `null`; o fluxo segue com `toast.success('Diagnóstico…')`. Falha de RLS ou rede vira contagem 0 e mensagem tranquilizadora — máquina com risco real fica sem alerta e ninguém é avisado.
- **Correção**: propagar o erro, mostrar toast de falha e registrar no logger.
- **Verificação**: teste com insert rejeitado exibindo erro.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 69. Estoque reportado como disponível quando a consulta falha
- **Problema**: `src/features/jobs/hooks/useJobInventoryCheck.ts:14-29` lê `technical_sheets` e `technical_sheet_materials` sem checar erro; qualquer falha vira lista vazia e `isAvailable = true`. O job pode ser agendado sem material em estoque, sem aviso.
- **Correção**: checar `error` e devolver estado `indeterminado`, bloqueando a afirmação de disponibilidade.
- **Verificação**: teste com erro de query mostrando "não foi possível verificar".
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 70. Job marcado como atrasado fora do serviço de jobs
- **Problema**: `src/hooks/useSmartDelayAlerts.ts:64-67` faz `update({status:'delayed'})` direto, sem checar erro, sem `invalidateQueries(['jobs'])` e **pulando** `jobsService.updateStatus` — que concentra validação de transição e sincronização. Além disso `:32` divide por `job.estimated_duration` sem guarda: duração 0/null gera `Infinity`, que satisfaz `>= 1.0` e dispara notificação de atraso no instante em que o job começa.
- **Correção**: usar `jobsService.updateStatus`, checar erro, invalidar as queries e guardar a divisão (`estimated_duration > 0`).
- **Verificação**: teste com `estimated_duration: 0` provando que nenhum alerta sai; teste de transição inválida sendo recusada.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 71. Alerta de SPC fora de controle sem gravação garantida
- **Problema**: `src/features/analytics/hooks/useSPC.ts:242-256` insere `spc_alerts` sem checar erro e segue com "Medição registrada"; `:197-205` lê os limites de controle sem checar erro, então falha de leitura grava a medição como `is_in_control: true` **sem avaliação** (falso negativo de qualidade); `:217-226` calcula `sample_number` com `count` sem checar erro, gravando `1` em medição que não é a primeira e corrompendo a sequência da carta.
- **Correção**: checar `error` nos três pontos; sem os limites, recusar o registro em vez de assumir "em controle"; `sample_number` por sequência no banco.
- **Verificação**: teste com erro em cada ponto; nenhuma medição gravada como em controle sem limites.
- **Impacto** Alto · **Esforço** Médio · **P0**

### 72. Saldo de pontos que permite resgate acima do disponível
- **Problema**: `src/hooks/useGamification.ts:217-232` lê `operator_achievements` e `existingRedemptions` sem checar erro: falha na primeira vira saldo 0 e "Saldo insuficiente" falso; falha na segunda vira `spent = 0` e **permite resgatar além do saldo real**.
- **Correção**: checar erro e abortar o cálculo; mover a validação de saldo para RPC no banco.
- **Verificação**: teste com erro em redemptions provando que o resgate é bloqueado. **[DONO]** se envolver RPC nova.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 73. Lista de notificações que esconde a falha
- **Problema**: `src/features/notifications/hooks/useNotifications.ts:38-44,73-75` tem `catch` que devolve `EMPTY_NOTIFICATIONS`. Falha de RLS ou rede aparece como "nenhuma notificação" — o operador perde alertas de produção e manutenção sem perceber.
- **Correção**: propagar o erro para o `useQuery` e exibir estado de erro com "tentar de novo".
- **Verificação**: teste com erro mostrando o estado de erro, não a lista vazia.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 74. Transferência de estoque que deixa a tela mentindo
- **Problema**: `src/features/inventory/hooks/useInventory.ts:150-167` altera `location` e insere o movimento; se o insert falhar, a localização já mudou no banco mas o `onError` (`:176-178`) não invalida as queries, então a UI segue mostrando o local antigo e sem histórico — o usuário tende a repetir a transferência.
- **Correção**: fazer as duas escritas numa RPC transacional ou, no mínimo, invalidar as queries no `onError` e avisar que o movimento não foi registrado.
- **Verificação**: teste com erro no insert mostrando o local novo e o aviso. **[DONO]** se virar RPC.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 75. Remoção de operador parcialmente aplicada
- **Problema**: `src/features/production/hooks/useOperators.ts:76-86` apaga `operator_machines` e `user_roles` em `Promise.all`; se o segundo falhar, o operador continua ativo **sem máquinas** e a tela de atribuições fica desatualizada (`onError` em `:115-118` só mostra toast).
- **Correção**: RPC que remove em transação, ou ordem definida com rollback explícito e invalidação das duas queries.
- **Verificação**: teste com erro no segundo delete provando o estado consistente. **[DONO]** se virar RPC.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 76. Push "desativado" que continua recebendo
- **Problema**: `src/features/notifications/hooks/useWebPushNotifications.ts:168-176` e `usePushNotifications.ts:207-213` apagam a assinatura sem checar erro e mostram sucesso; a assinatura pode permanecer no banco e o servidor continua enviando push para um aparelho que o usuário acredita ter desligado.
- **Correção**: checar `error` com `.select('id')` para detectar bloqueio silencioso de RLS, só então atualizar o estado local e o toast.
- **Verificação**: teste com delete rejeitado mantendo o estado "ativo" e mostrando erro.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 77. RPC e edge function com resposta de falha ignorada
- **Problema**: `src/features/production/hooks/useOEEAlerts.ts:70-78` chama `supabase.rpc('check_and_notify_kpi_alert')` sem checar erro — `rpc` não lança, então o `catch` nunca dispara: o alerta de OEE não persiste nem notifica, mas o cooldown é marcado e não há nova tentativa. `src/features/jobs/hooks/useAutoBufferPromotion.ts:33-47` ignora `{success:false}` com HTTP 200 — o buffer de produção não é reabastecido e ninguém é avisado.
- **Correção**: checar `error` da RPC e `data.success` da função; em falha, não marcar cooldown e avisar.
- **Verificação**: teste com `{success:false}` exibindo erro e permitindo nova tentativa.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 78. Causa real do erro descartada em drag-and-drop e presença
- **Problema**: `src/features/jobs/hooks/useKanbanDragDrop.ts:96-98` (idem `useDailyDragDrop.ts:70-73`, `useWeeklyDragDrop.ts:87-89`) tem `catch` que mostra "Erro ao reordenar" e **descarta** o erro, sem log — suporte não consegue diagnosticar falha de agendamento; `useOperatorPresence.ts:82-84` cria o erro e o joga fora; `src/hooks/useBulkActions.ts:58-62` transforma o erro em contagem, deixando o `onError` do hook como código morto; `useMLPredictions.ts:129-137` grava em `error_logs` sem checar erro.
- **Correção**: passar o erro ao `logger` em todos os pontos, com contexto (job, coluna de origem/destino), e exibir a mensagem tratada ao usuário.
- **Verificação**: provocar falha e encontrar o registro em `error_logs` com contexto.
- **Impacto** Médio · **Esforço** Baixo · **P2**

## B.4 Uso frágil do supabase-js (79-85)

### 79. `jobsService.getAll()` truncando silenciosamente em 1000 jobs
- **Problema**: `src/features/jobs/services/jobsService.ts:26-36` monta `select('*, machines(…), techniques(…)')` **sem limit nem range** e `useJobs.ts:31` o chama sem filtro para 14+ consumidores (Traceability, Logística, Load Balancing, Sequencing, Conflicts, KPIs, quiosque). Passando de 1000 linhas o PostgREST corta o resto **sem erro**, então listas e indicadores ficam errados sem nenhum sintoma — e isso contraria o ADR 0003 (`fetchAllRows` para selects sem limite).
- **Correção**: paginar com `fetchAllRows` do ADR, ou exigir filtro obrigatório (período/status) na assinatura de `getAll`, e aplicar `select` de colunas em vez de `*` com joins.
- **Verificação**: teste com 1.500 jobs provando contagem completa; medir o tempo de carga antes/depois.
- **Impacto** Alto · **Esforço** Médio · **P0**

### 80. Publicação de template TPM que sempre falha
- **Problema**: `src/features/maintenance/components/TPMNotificationTemplates.tsx:66-75` faz `upsert(..., {onConflict:'template_id'})`, mas `tpm_notification_templates_published` só tem PK em `id` e um índice **não único** em `template_id` (contexto do banco) — o Postgres devolve 42P10 e a publicação **nunca funciona**. O glossário também aponta que falta policy de INSERT nessa tabela.
- **Correção**: criar UNIQUE em `template_id` por migration **ou** trocar o upsert por update-then-insert; adicionar a policy de INSERT.
- **Verificação**: publicar um template e conferir a linha no banco. **[DONO]** (DDL em produção).
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 81. Realtime inscrito com filtro vazio
- **Problema**: `src/features/notifications/components/InAppNotificationWatcher.tsx:32` monta o filtro `assigned_operator_id=eq.${user?.id ?? ''}` e é montado em `AppProviders.tsx:124` **antes** do auth resolver; `useRealtimeChannel` só reinscreve quando o `name` muda (`realtimeChannel.ts:95`, deps `[name]`), então o filtro vazio é capturado para sempre e o operador nunca recebe a notificação do próprio job.
- **Correção**: incluir o `user.id` no `name` do canal (ou nas deps) e não inscrever enquanto `user` for indefinido.
- **Verificação**: logar o filtro efetivo após login e confirmar o recebimento de uma notificação real.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 82. Realtime sem filtro amplificando carga
- **Problema**: `src/features/jobs/hooks/useJobs.ts:43-45` assina a tabela `jobs` inteira e, a cada UPDATE de qualquer job, **todos** os clientes refazem o `getAll` sem limite (etapa 79); `useSecurityEvents.ts:12-13` assina `security_events` para qualquer usuário logado e só checa papel no callback; `NotificationIntegrator.tsx:84` assina `jobs` inteira e roda handler async (áudio/notificação) para todo evento; `AdminTelemetriaPage.tsx:84-93` assina `error_logs` e `query_telemetry` sem filtro, com toast e refetch por evento; `ActivityFeedWidget.tsx:52-94` cria canal próprio fora do registry; `useRealtimeConnection.ts:40-49` cria canal com nome aleatório (`Math.random()`) a cada remontagem.
- **Correção**: filtro server-side por operador/severidade onde aplicável; usar sempre `useRealtimeChannel`; debounce na invalidação; nome de canal estável.
- **Verificação**: contar canais abertos e eventos recebidos por sessão antes/depois.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 83. `.single()` onde zero linha é normal
- **Problema**: 59 usos de `.single()` contra 24 de `.maybeSingle()`. Casos que viram erro técnico na cara do usuário ou decisão errada: `jobsService.ts:54,74` (job excluído → "JSON object requested, multiple (or no) rows returned"); `useBusinessConfig.ts:44-49` (chave inexistente ou UPDATE barrado por RLS → PGRST116 genérico em vez de "nada atualizado"); `useNotificationSettings.ts:58-63` (settings criadas lazily em `:38-46`, então a mutação lança); `useGeoBlocking.ts:138-142,183-187` (erro de RLS vira `existing=null` e o insert cria **segunda linha de settings**); `useTPMNotifications.ts:239-243` e `useMLPredictionNotifications.ts:200-204` (máquina removida → notificação sem nome).
- **Correção**: `maybeSingle()` com checagem explícita de `error` e de `data` nulo, e mensagem de negócio em cada ponto.
- **Verificação**: testes por ponto com 0 linhas e com erro de RLS.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 84. Autoria nula em tabelas de configuração sensível
- **Problema**: `src/components/settings/IPAllowlist.tsx:70-76` grava `created_by: user?.id` (coluna nullable, policy só checa papel), idem `useRateLimitLogs.ts:241` e `useOperatorGoals.ts:98` — com `user` indefinido o registro entra **sem autor** e some a rastreabilidade de quem liberou um IP ou mudou uma meta. `ReauthContext.tsx:118-125` insere em `security_events` com `user_id` possivelmente indefinido e erro ignorado; `useSecurityEvents.ts:54-59` insere sem `user_id` (policy exige `auth.uid()`, falha para operador); `error-boundary.tsx:60-73` grava `error_logs` com `user?.id`, então justamente os crashes de autenticação nunca chegam ao banco.
- **Correção**: exigir `user` antes de escrever (abortar com mensagem), preencher `user_id` sempre, e tornar `created_by` NOT NULL onde fizer sentido.
- **Verificação**: teste sem sessão provando que a escrita é recusada com mensagem clara. **[DONO]** para o NOT NULL.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 85. Consultas sem teto em tabelas que só crescem
- **Problema**: além do `getAll` (etapa 79): `useInventoryMovements` sem `itemId` lê `inventory_movements` inteira com dois joins (`useInventory.ts:200-209`); `useOperatorEvolution.ts:59-63` busca jobs por período escolhido pelo usuário sem limite (truncando a evolução); `jobsService.getByDateRange` (`:125-130`) sem limite faz o fim do mês desaparecer do calendário; `maintenanceService.ts:13-15`, `packagingService.ts:60-64`, `useProductionLosses.ts:31-33`, `useOperatorAudit.ts:19`, `useTechnicalConversations.ts:157-159` e `useSchedulingData.ts:82` no mesmo padrão.
- **Correção**: `fetchAllRows` (ADR 0003) ou paginação por cursor; filtro obrigatório de período nos hooks de histórico; `select` de colunas em vez de `*`.
- **Verificação**: teste com volume acima de 1000 linhas por consulta; medir payload antes/depois.
- **Impacto** Alto · **Esforço** Alto · **P1**

---

# BLOCO C — Segurança (etapas 86-110)

## C.1 Banco: privilégios e funções (86-93)

### 86. Revogar os grants amplos de `anon` nas tabelas públicas
- **Problema**: no banco real, `anon` tem DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE em ~130 tabelas do schema `public` — incluindo `audit_log`, `bitrix24_oauth_tokens`, `bitrix24_oauth_states`, `blocked_ips`, `business_config` e `chat_messages`. `authenticated` tem o mesmo conjunto. A RLS é a **única** barreira: um erro de policy expõe a tabela inteira.
- **Correção**: migration revogando de `anon` tudo que não é necessário (manter SELECT apenas onde há fluxo anônimo real, hoje só o tracking público via RPC) e restringindo `authenticated` ao necessário por tabela. Aplicar em etapas por domínio, com a suíte `rls-regression` como rede.
- **Verificação**: `scripts/rls-regression.mjs` verde; smoke test do tracking público e do login; comparação de `grants.md` na branch `contexto` antes/depois. **[DONO]** (DDL em produção, risco de quebrar fluxo anônimo).
- **Impacto** Alto · **Esforço** Alto · **P0**

### 87. Corrigir os default privileges que dão `anon=arwdDxtm`
- **Problema**: os *default privileges* de `public|postgres|tables` concedem `anon=arwdDxtm` e funções dão `anon=X` — **toda tabela ou função nova nasce aberta para `anon`**, e a proteção depende de alguém lembrar de criar a RLS. É a causa raiz da etapa 86 se repetir.
- **Correção**: `ALTER DEFAULT PRIVILEGES ... REVOKE ALL ON TABLES FROM anon` (e para funções) na migration, documentando em `docs/agentes/banco.md` que grant é explícito.
- **Verificação**: criar tabela de teste em staging e conferir que `anon` não recebe nada; remover depois. **[DONO]** (DDL em produção).
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 88. `SET search_path` nas 5 funções SECURITY DEFINER
- **Problema**: lint de severidade **ALTA** (`secdef_mutable_search_path`) em `app_private.runtime_config_get(p_key text)`, `public.auto_reassign_stale_packaging_tasks()`, `public.notify_loss_risk()`, `public.trigger_auto_promotion()` e `public.trigger_send_tpm_email()`. Sem `search_path` fixo, quem puder criar objeto num schema do caminho pode sequestrar a execução com privilégio do dono.
- **Correção**: migration com `ALTER FUNCTION ... SET search_path = pg_catalog, public` nas cinco.
- **Verificação**: `lints.md` na branch `contexto` sem nenhum `secdef_mutable_search_path`; os triggers continuam funcionando (teste de promoção e de alerta de perda). **[DONO]** (DDL em produção).
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 89. Revisar as 13 RPCs SECURITY DEFINER executáveis por `anon`
- **Problema**: `assign_packaging_task`, `check_and_notify_kpi_alert`, `get_public_tracking`, `get_user_role`, `has_any_active_role`, `has_role`, `increment_sheet_view_count`, `is_staff`, `record_packaging_defect`, `rollup_cron_p95_daily`, `snapshot_cron_health`, `verify_audit_chain()` e `verify_audit_chain(_limit)` podem ser chamadas por `anon`. Nada no front indica que `assign_packaging_task`, `record_packaging_defect`, `rollup_cron_p95_daily`, `snapshot_cron_health` ou `verify_audit_chain` sejam usadas sem login.
- **Correção**: `REVOKE EXECUTE ... FROM anon` em todas exceto `get_public_tracking` (usada pelo `/track`), mantendo `authenticated` onde o front chama.
- **Verificação**: `/track` funcionando; chamadas autenticadas de embalagem e auditoria funcionando; `lints.md` com `rpc_anon_executable` reduzido a 1. **[DONO]** (DDL em produção).
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 90. Fechar a policy `USING (true)` de `packaging_defects`
- **Problema**: `public.packaging_defects` tem SELECT "Anyone can see defects" com `USING (true)` para `authenticated` — qualquer usuário logado lê todos os defeitos de embalagem. É a única policy `true` literal do schema (as outras duas ocorrências são condicionais legítimas).
- **Correção**: restringir a `has_any_active_role()` ou ao time de embalagem/qualidade.
- **Verificação**: `rls-regression` cobrindo leitura por operador sem papel. **[DONO]** (DDL em produção).
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 91. Remover policies duplicadas e sobrepostas
- **Problema**: `profiles` tem **4** policies SELECT e **2** UPDATE equivalentes ("Users can update own profile" e "Users can update their own profile"); `user_roles` tem 4 SELECT e 4 ALL/UPDATE. Policy duplicada custa avaliação por linha e esconde qual regra está valendo.
- **Correção**: consolidar em uma policy por operação, preservando o efeito combinado (PERMISSIVE é OR), e manter as RESTRICTIVE de AAL2 em `user_roles` intactas.
- **Verificação**: `rls-regression` verde; `policies.md` na `contexto` mostrando a consolidação. **[DONO]** (DDL em produção).
- **Impacto** Médio · **Esforço** Médio · **P1**

### 92. Trocar `roles = public` por `authenticated` nas policies
- **Problema**: várias policies usam `roles = public` em vez de `authenticated` — `jobs` DELETE/INSERT/UPDATE, `profiles` INSERT/UPDATE, `user_roles` "Coordinators can view all roles". Com grant de `anon` ainda ativo (etapa 86), `public` inclui o anônimo.
- **Correção**: migration trocando o `TO` das policies citadas.
- **Verificação**: `rls-regression` + teste anônimo recebendo 401/403. **[DONO]** (DDL em produção).
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 93. Índices em FK e `auth.uid()` embrulhado nas policies
- **Problema**: 3 FKs sem índice (`packaging_defects.reported_by`, `packaging_task_checklist.checked_by`, `packaging_task_checklist.item_id`) e **71** policies chamando `auth.uid()` sem `(select auth.uid())` — o Postgres reavalia a função por linha, incluindo 5 policies de `user_roles`, `profiles."Staff can view all profiles"` e 6 de `storage.objects`. A extensão `pg_net` está no schema `public` e 2 tabelas de embalagem estão sem `replica identity` adequada para realtime.
- **Correção**: migration criando os 3 índices, reescrevendo as policies com `(select auth.uid())`, movendo `pg_net` para `extensions` e ajustando a replica identity.
- **Verificação**: `lints.md` sem `fk_without_index` nem `policy_auth_fn_not_wrapped`; `EXPLAIN` de uma query em `jobs` antes/depois. **[DONO]** (DDL em produção).
- **Impacto** Médio · **Esforço** Médio · **P1**

## C.2 Front: exposição e cabeçalhos (94-101)

### 94. Tirar a chave de API e a URL de webhook do bundle
- **Problema**: `src/pages/MasterAPIPage.tsx:27` lê `VITE_MASTER_API_DISPLAY_KEY` e `src/lib/logger.ts:341` lê `VITE_ALERT_WEBHOOK_URL` (injetada no build por `deploy.yml:92`). Toda variável `VITE_*` vai **em texto claro** no JavaScript público.
- **Correção**: mover a exibição da chave para uma Edge Function autenticada que devolve a chave mascarada sob papel admin; mover o envio de alerta do logger para uma Edge Function (o webhook deixa de ser público).
- **Verificação**: `grep -o "VITE_MASTER_API_DISPLAY_KEY\|VITE_ALERT_WEBHOOK_URL" dist/assets/*.js` vazio após o build. **[DONO]** (envolve segredo e rotação).
- **Impacto** Alto · **Esforço** Médio · **P0**

### 95. Promover a CSP de `unsafe-eval` para política restrita
- **Problema**: `vercel.json` aplica CSP em **modo enforce**, mas com `script-src 'self' 'unsafe-eval'`, `style-src 'unsafe-inline'`, `img-src https:` e `connect-src` com wildcard `*.supabase.co`/`*.supabase.in`, além de `api.ipify.org` e `api.pwnedpasswords.com`. `unsafe-eval` anula boa parte da proteção contra XSS.
- **Correção**: identificar quem exige `eval` (provável mermaid/charts) e isolar ou substituir; trocar o wildcard pelo host exato do projeto (`uoujzvpecohinketylud.supabase.co`); migrar estilos inline para nonce/hash onde viável. Usar os relatórios já coletados por `csp-report` para medir impacto antes de apertar.
- **Verificação**: zero violação nova em `csp_violation_reports` por 48h após o deploy; navegação completa sem erro de console. **[DONO]** (altera headers de produção).
- **Impacto** Alto · **Esforço** Alto · **P1**

### 96. Adicionar COOP/COEP/CORP e revisar `Permissions-Policy`
- **Problema**: `vercel.json:20-50` traz HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`, mas **não** `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` nem `Cross-Origin-Resource-Policy`.
- **Correção**: `COOP: same-origin`, `CORP: same-origin` e avaliar `COEP: credentialless` (pode quebrar embeds de terceiros — medir antes).
- **Verificação**: scan de headers (securityheaders.com ou `curl -I`) e navegação sem regressão. **[DONO]** (altera headers).
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 97. Resolver a divergência `.gitignore` × índice do git nos arquivos `.env`
- **Problema**: `.env.production` e `.env.staging` estão **rastreados** no git (adicionados em `f07be16`, 17/11/2026) apesar de constarem no `.gitignore:29-30` — um arquivo já rastreado ignora o `.gitignore`. Os valores atuais são placeholders ("your…", sem o ref oficial, `PUBLISHABLE_KEY` sem prefixo de chave real) e `VITE_*` é público por design, então **não há segredo exposto hoje**; o risco é alguém preencher valores reais e commitar acreditando que o ignore protege. O `.gitignore:27-28` ainda cita `.env.production.example`/`.env.staging.example`, que não existem.
- **Correção**: `git rm --cached` nos dois, criar `.env.production.example`/`.env.staging.example` com placeholders e corrigir o `.gitignore`.
- **Verificação**: `git ls-files | grep "^\.env"` listando só os `.example`; TruffleHog do CI verde.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 98. Remover a origem de preview Lovable do CORS
- **Problema**: `supabase/functions/_shared/cors.ts:20-24` mantém `https://xxroejpvloldkmqdydar.lovableproject.com` na lista de origens permitidas — um preview que não é mais o ambiente oficial (ADR 0005 define Supabase Cloud e o deploy é Vercel).
- **Correção**: remover a origem; manter `APP_URL`, o domínio de produção e o `vercel.app`; usar `EXTRA_ALLOWED_ORIGINS` (`:26-29`) para previews temporários.
- **Verificação**: `_shared/cors.test.ts` atualizado; chamada do preview antigo recebendo a origem de fallback.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 99. Corrigir as metatags apontando para o preview antigo
- **Problema**: `index.html:53` (`canonical`), `:57` (`og:url`) e `:65` (`twitter:url`) apontam para a URL de preview Lovable, e `:60`/`:68` (`og:image`, `twitter:image`) para um bucket `r2.dev` de preview. Link compartilhado do sistema leva ao ambiente errado. **Nota**: a meta CSP de `:26` **não** é duplicação acidental — é fallback documentado (`:7-19`) para dev/preview/E2E, onde o header não se aplica; manter.
- **Correção**: apontar para o domínio de produção e hospedar a imagem em `public/`.
- **Verificação**: validador de Open Graph lendo o domínio correto.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 100. `rel="noopener"` nos 15 `window.open`
- **Problema**: 15 chamadas `window.open(..., '_blank')` sem `noopener` — a página aberta recebe `window.opener` e pode manipular a aba de origem. As URLs externas passam por `sanitizeUrl` (ex.: `JobInstructionsTab.tsx:201`, `Bitrix24SyncPanel.tsx:47`, `ToastWithUndo.tsx:246`), o que reduz mas não elimina o risco.
- **Correção**: helper `openExternal(url)` que aplica `sanitizeUrl` + `'noopener,noreferrer'` e substituir as 15 chamadas; regra de lint proibindo `window.open` direto.
- **Verificação**: `grep -rn "window.open(" src` só no helper; lint pegando um caso novo.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 101. Sanitizar o SVG do mermaid
- **Problema**: `src/components/technical-assistant/TechnicalArtifacts.tsx:66` injeta o SVG gerado pelo mermaid com `dangerouslySetInnerHTML`. Há `securityLevel:'strict'` (`:21`), mas **DOMPurify não existe no repo** (ausente do `package.json`), então a única defesa é a configuração da própria lib, sobre conteúdo que pode vir do assistente de IA.
- **Correção**: sanitizar o SVG antes de injetar (DOMPurify com perfil SVG — dependência nova, justificar na PR) ou renderizar em `<iframe sandbox>`.
- **Verificação**: teste com diagrama contendo `<script>`/`onload` provando que não executa.
- **Impacto** Médio · **Esforço** Médio · **P1**

## C.3 Autorização e autenticação (102-110)

### 102. Rate limit server-side no pedido de reset de senha
- **Problema**: `src/pages/AuthPage.tsx:140` faz INSERT direto em `password_reset_requests` pelo cliente anônimo; a policy "Anyone can request password reset" permite INSERT para `anon` com `WITH CHECK (status='pending')`. As únicas mitigações são o índice único parcial (1 pendente por e-mail) e um cooldown de 60s **no cliente** — nada impede enumerar e-mails ou inundar a tabela de outro IP.
- **Correção**: mover o pedido para Edge Function com `_shared/rateLimit` por IP e por e-mail, revogando o INSERT anônimo direto.
- **Verificação**: 20 pedidos seguidos recebendo 429; fluxo de reset íntegro ponta a ponta. **[DONO]** (DDL de policy em produção).
- **Impacto** Alto · **Esforço** Médio · **P1**

### 103. Papel de serviço nas funções que usam service-role sem checar papel
- **Problema**: funções com `SUPABASE_SERVICE_ROLE_KEY` e autorização fraca: `technical-assistant` só chama `authenticate` (comentário "sem role gate" perto de `:425`), `new-device-alert:36` idem, `health-check` **não checa nada** e lê `profiles` com service role (`:49,57`), e `bitrix24-sync` exige papel só nas ações de configuração — o push de status vale para qualquer usuário autenticado (`:819-850`).
- **Correção**: `requireRole` adequado em cada uma; `health-check` deixa de ler `profiles` (ou passa a exigir cron secret).
- **Verificação**: teste com JWT de operador recebendo 403 onde cabe.
- **Impacto Alto** · **Esforço** Médio · **P1**

### 104. Rate limit nas funções sensíveis que não têm
- **Problema**: `_shared/rateLimit` é usado por **6** funções (`approve-password-reset`, `csp-report`, `validate-login-ip`, `create-operator`, `check-login-lockout`, `webhook-handler`). Ficam sem limite, entre outras: `update-operator`, `excel-export`, `pdf-generator`, `ml-predictions` (custo de IA), `external-db-bridge`, `erp-api`, `technical-assistant` (custo de LLM) e `send-push-notification`.
- **Correção**: aplicar `rateLimit` com janela por função, por usuário e por IP, priorizando as que custam dinheiro (`ml-predictions`, `technical-assistant`) e as que escrevem com service-role.
- **Verificação**: teste estourando o limite e recebendo 429 com `Retry-After`.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 105. Convite de usuário que nunca funciona
- **Problema**: `src/components/settings/UserManagement.tsx:207` chama a API admin de convite usando o client com chave publishable — operação que **exige service-role** e portanto falha sempre. Além disso, o tipo `AppRole` local (`:32`) não inclui `'admin'`, divergindo de `src/features/auth/types/auth.types.ts:4` e do enum do banco.
- **Correção**: mover o convite para Edge Function com service-role e `requireElevatedAal2` (como `create-operator`), e importar o tipo canônico em vez de redeclarar.
- **Verificação**: convidar um usuário de teste e ver o e-mail chegar; `tsc` sem divergência de tipo.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 106. `user_mfa_settings` desatualizada ao ativar/desativar MFA
- **Problema**: `src/features/auth/hooks/useMFA.ts` **tem** challenge TOTP no `unenroll` (`:129-150`: `mfa.challenge` → código via prompt → `mfa.verify` → `mfa.unenroll`) — a parte do dossiê sobre challenge ausente está errada. O que falta: nem `unenroll` nem `verifyEnrollment` (`:96-114`) tocam `user_mfa_settings`; só `TwoFactorSetup.tsx:116,166` faz o upsert. Quem usa `MFASettings`/`MFAEnroll` deixa a tabela dessincronizada. Hoje nada lê `totp_enabled`, então o impacto é de dado inconsistente, não de bypass.
- **Correção**: centralizar a escrita em `useMFA` (ou remover a tabela, se a fonte de verdade é `auth.mfa.listFactors`), e trocar o `window.prompt` (`:136`) por diálogo da aplicação.
- **Verificação**: ativar e desativar por ambos os caminhos e conferir a tabela.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 107. Nome aleatório em arquivo de evidência de manutenção
- **Problema**: `src/features/maintenance/components/MaintenanceExecutionModal.tsx:271` e `:289` nomeiam o upload com `${Math.random()}.${ext}` nos buckets `tpm-evidences` e `execution-evidence` — sem prefixo `uid/`, o padrão que o F-013 estabeleceu em `src/lib/storage.ts` (`uploadOwnedFile`) para a RLS de storage funcionar, e com risco de colisão.
- **Correção**: usar `uploadOwnedFile` com `crypto.randomUUID()` e prefixo do usuário.
- **Verificação**: upload por dois usuários provando isolamento; nome determinístico no bucket.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 108. Fechar `/design-system` ao público
- **Problema**: `src/routes/AppRoutes.tsx:190` deixa `/design-system` como rota pública, e a página renderiza o `MainLayout` completo (`src/pages/DesignSystemPage.tsx:6`), incluindo `AppSidebar` com `useAuth` (`AppSidebar.tsx:46`) e o mapa de navegação — expõe a estrutura interna do sistema a anônimos. Não há chamada real de dados ali, só strings de código.
- **Correção**: mover para dentro de `ProtectedRoute`, ou renderizar sem `MainLayout` e atrás de flag só em ambiente de desenvolvimento.
- **Verificação**: acesso anônimo recebendo redirecionamento para `/auth`; teste E2E.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 109. Papéis exigidos nas rotas que hoje aceitam qualquer autenticado
- **Problema**: 13 rotas protegidas estão **sem `allowedRoles`** — `/` (`AppRoutes.tsx:195`), `/alerts` (`:204`), `/operator` (`:229`), `/assistant` (`:246`), `/knowledge` (`:247`), `/documents` (`:248`), `/scanner`, `/shift-handover`, `/gamification`, `/notifications` (`:251-254`), `/mfa-enrollment` (`:257`), `/status` (`:266`) e `/kiosk` (`:270`), então qualquer usuário logado entra. `admin` nunca aparece em `allowedRoles` porque há bypass explícito em `ProtectedRoute.tsx:127`. Importante: a checagem é **client-side** (papel vindo de `AuthProvider.tsx:124,151`), então é gate de UI — a barreira real é RLS (blocos C.1).
- **Correção**: definir `allowedRoles` por rota conforme a matriz de `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md`, e manter o bypass de admin documentado.
- **Verificação**: teste E2E com usuário operador recebendo bloqueio nas rotas administrativas.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 110. Reduzir log de dados sensíveis nas Edge Functions
- **Problema**: `bitrix24-sync/index.ts:123` loga o corpo cru da resposta de refresh de token (`console.error('Invalid JSON response from token refresh:', responseText)`) e `:50` loga a expiração; `new-device-alert/index.ts:250` loga o `emailResponse` completo. Nenhuma loga e-mail ou CPF diretamente, mas corpo de resposta de token é material sensível em log compartilhado.
- **Correção**: logar só status, tamanho e um identificador de correlação; usar `_shared/logger` com redação.
- **Verificação**: provocar o erro e conferir que o log não traz corpo nem token.
- **Impacto** Médio · **Esforço** Baixo · **P1**

---

# BLOCO D — Experiência do usuário, acessibilidade e SEO (etapas 111-145)

## D.1 Estados de erro e recuperação (111-117)

### 111. `onError` global no QueryClient
- **Problema**: `src/lib/queryConfig.ts:147-160` cria o QueryClient só com `defaultOptions` (retry, `staleTime` 45s, `gcTime` 10min) — **sem** `QueryCache`/`MutationCache` com `onError`. Nenhuma página usa `isError` (grep literal = 0); só 3 tratam a falha pelo campo `error` (`SystemStatusPage.tsx:62,82`, `AuditTrailPage.tsx:19,76`, `ExecutiveDashboard.tsx:60,127`). Em todas as outras, falha de rede ou RLS vira **tela vazia**.
- **Correção**: `new QueryClient({queryCache: new QueryCache({onError}), mutationCache: new MutationCache({onError})})` com toast padronizado e envio ao logger, ignorando erros já tratados localmente (flag em `meta`).
- **Verificação**: desligar a rede e ver toast de erro em qualquer tela; teste do handler.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 112. Quiosque de embalagem mostrando "Fila zerada" em falha
- **Problema**: `src/pages/PackagingKioskPage.tsx:18` descarta `isError`/`error` e usa `data = []` como default, então `:67-70` renderiza "Fila zerada" quando a query falha. No quiosque, o operador conclui que não há trabalho. Mesmo padrão em `KioskPage.tsx:121-126` (spinner → lista vazia, erro só por toast no refresh em `:32-33`).
- **Correção**: tratar `isError` com tela de falha explícita ("não foi possível carregar a fila — tentar de novo"), distinta de fila vazia, nas duas telas de quiosque.
- **Verificação**: teste com query rejeitada mostrando o estado de erro; print do quiosque.
- **Impacto** Alto · **Esforço** Baixo · **P0**

### 113. Estado de erro nas 10 páginas mais usadas
- **Problema**: amostra de 10 páginas — `KPIDashboard.tsx:52-54`, `BIDashboard.tsx:51-53`, `ABCCostingDashboard.tsx:43`, `MLPredictionsDashboard.tsx:31`, `OperatorsPage.tsx:40`, `LogisticsPage.tsx:63,231`, `PackagingDashboard.tsx:36`, `OperatorProductivityPage.tsx:31,43`, `SystemMonitoringPage.tsx:82,230`, `EfficiencyDashboard` (`:32`, com 3 hooks sem loading em `:29-31`) — **todas** tratam carregamento e **nenhuma** trata erro. Outras 8 não tratam nem loading (`AlertsDashboard`, `CodeQualityDashboard`, `DigitalTwin`, `DocumentsPage`, `MasterAPIPage`, `QRScannerPage`, `MachineComparisonPage`, `OperatorHistoryPage`).
- **Correção**: componente `QueryState` (`loading | error | empty | success`) com `retry`, aplicado nas 18 páginas.
- **Verificação**: teste por página com query rejeitada; `EmptyState` (hoje em 13 arquivos) passa a ser o padrão de vazio.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 114. ErrorBoundary por rota
- **Problema**: `ProtectedPage`/`PublicPage` (`AppRoutes.tsx:108-150`) envolvem a página só em `Suspense`, sem boundary. Há isolamento por seção dentro das páginas (`SectionErrorBoundary` em `MainLayout.tsx:156,161,185,265,272,279`, `Index.tsx:180,267,385,399,478,520`, `OEEDashboard.tsx:411,414`, calendários, `InventoryPage`) e `AuthErrorBoundary` em `AuthPage.tsx:175` — mas um erro de render fora dessas seções sobe até `AppProviders.tsx:136` e derruba o app inteiro, inclusive sidebar e navegação.
- **Correção**: envolver o conteúdo de cada rota num boundary com fallback que preserve o layout e ofereça "tentar de novo" e "voltar".
- **Verificação**: componente que lança erro propositalmente numa rota mantendo a sidebar utilizável.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 115. Consolidar as 4 classes de ErrorBoundary
- **Problema**: coexistem `src/components/ui/error-boundary.tsx`, `src/components/error/GlobalErrorBoundary.tsx` (`:17`), `src/components/ui/section-error-boundary.tsx` (`:26`) e `src/components/auth/AuthErrorBoundary.tsx`. As duas primeiras estão aninhadas de forma redundante (`App.tsx:10` + `AppProviders.tsx:136`) e cada uma tem o seu caminho de recuperação.
- **Correção**: uma implementação parametrizada por escopo (`app | route | section | auth`), com um só caminho de telemetria.
- **Verificação**: `tsc` + testes dos boundaries; só um arquivo de implementação.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 116. Recuperação sem recarregar a página
- **Problema**: `src/components/ui/error-boundary.tsx:80` chama `window.location.reload()` e `:84` `href='/'`; `GlobalErrorBoundary.tsx:40,45` idem. Existe "Tentar novamente" (`:87-89`, usado em `:127`) que apenas reseta o estado, mas o `handleReload` (`:79-81`) segue disponível e o botão "Página inicial" (`:131`) descarta todo o estado da aplicação (rascunhos, filtros, fila offline).
- **Correção**: priorizar reset de estado + `queryClient.resetQueries()`; reload só como último recurso, avisando que mudanças não salvas serão perdidas.
- **Verificação**: teste provando que o reset recupera a tela sem recarregar.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 117. Mensagens de erro com causa
- **Problema**: toasts genéricos sem causa em `MachinesPage.tsx:116`, `TechnicalAssistantPage.tsx:68,77`, `AuthPage.tsx:125,152`; e, no extremo oposto, cerca de 9 pontos exibem `error.message` cru (texto do PostgREST) ao usuário.
- **Correção**: mapa `código → mensagem de negócio` em `src/lib/errorHandling.ts` (PGRST116 → "registro não encontrado", 23505 → "já existe", 42501 → "sem permissão"), com fallback genérico e detalhe técnico só no logger.
- **Verificação**: teste cobrindo os 5 códigos mais frequentes em `error_logs`.
- **Impacto** Médio · **Esforço** Médio · **P1**

## D.2 Botões inertes e confirmações (118-122)

### 118. Ligar ou remover os 14 botões sem handler
- **Problema**: confirmados sem `onClick`, `asChild`, `type="submit"` nem `Trigger` pai: `LogisticsPage.tsx:222` (Filtro), `MasterAPIPage.tsx:157` ("Abrir no OpenAPI"), `DigitalTwin.tsx:53,57,132`, `ShiftHandoverPage.tsx:377` ("Ver detalhes"), `EfficiencyDashboard.tsx:65` ("Histórico"), `PredictiveAlerts.tsx:65,68` ("Agendar Manutenção", "Ignorar"), `OEERecommendations.tsx:100` ("Agendar Intervenção"), `BalancingTab.tsx:71` ("Aplicar"), `SequencingTab.tsx:54` ("Aplicar Sequenciamento"), `StuckJobsPanel.tsx:72` ("Investigar"), `PredictiveAnalyticsWidget.tsx:95`, `OptimizationAssistant.tsx:120`, `BIAIInsights.tsx:212`, `KPIOverviewTab.tsx:43,83`. `WeeklyCalendar.tsx:347-348` passa `onExportPdf={() => {}}` e `onExportICal={() => {}}` literalmente vazios.
- **Correção**: por botão, decidir entre implementar (vários já têm serviço pronto: agendar manutenção, aplicar sequenciamento) ou remover. Nenhum fica na tela sem ação.
- **Verificação**: teste E2E clicando em cada botão restante e observando efeito; lint custom proibindo `<Button>` sem handler/`asChild`/`type`.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 119. Substituir os 4 `window.confirm` por diálogo da aplicação
- **Problema**: exclusão com `window.confirm` nativo em `PendingQueue.tsx:481` ("Excluir permanentemente estes jobs?"), `KanbanBoard.tsx:447`, `TechniqueManagement.tsx:244` e `PackagingSlaOverridesManager.tsx:120` — bloqueia a aba, não é estilizável, não é acessível por leitor de tela do mesmo jeito e, em quiosque, pode nem aparecer.
- **Correção**: usar o `ConfirmationProvider`/`useConfirm` já existente (`JobDetailsModal.tsx:131` é o exemplo), com texto do item e ação destrutiva destacada.
- **Verificação**: `grep -rn "window.confirm\|[^.]confirm(" src` vazio; teste E2E de cancelar e confirmar.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 120. Padronizar as 3 formas de confirmar exclusão
- **Problema**: convivem `window.confirm` (4 locais), `AlertDialog` direto (15 arquivos) e `ConfirmationContext`/`useConfirm` (`OperatorConfirmDialogs.tsx`, `JobDetailsModal.tsx:131`). Mesma ação destrutiva tem três aparências e três comportamentos de foco.
- **Correção**: `useConfirm` como caminho único, com variantes (`destructive`, `warning`) e exigência de digitar o nome para exclusão em massa.
- **Verificação**: inventário mostrando só o caminho único; teste de foco inicial no botão seguro.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 121. Unificar as duas bibliotecas de toast
- **Problema**: `src/App.tsx:12-13` monta **dois** Toasters (shadcn `use-toast` e `sonner`); `sonner` é usado em ~143 arquivos e `use-toast` em ~10. Dois sistemas significam duas posições, dois tempos, duas regiões `aria-live` e notificação duplicada quando os dois disparam.
- **Correção**: padronizar em `sonner`, migrar os ~10 arquivos, remover o Toaster do shadcn e o hook `use-toast`.
- **Verificação**: um só Toaster montado; `grep -rn "use-toast" src` vazio; teste de leitor de tela anunciando uma vez.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 122. Atalho de teclado sem ação e feed sem histórico
- **Problema**: `src/components/shortcuts/KeyboardShortcuts.tsx:60` registra Escape sem nenhuma ação, e o `KeyboardShortcutsProvider` expõe uma API de contexto sem consumidor; `src/components/dashboard/ActivityFeedWidget.tsx:45` inicia um feed "em tempo real" sem carregar histórico, então a tela nasce vazia até alguém mexer em um job.
- **Correção**: Escape fecha o modal/palette aberto (ou é removido); feed faz um fetch inicial dos últimos 50 eventos antes de assinar o realtime.
- **Verificação**: teste do Escape; feed exibindo itens no primeiro render.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

## D.3 Acessibilidade (123-133)

### 123. Corrigir o contraste dos tokens de tema
- **Problema**: cálculo WCAG sobre `src/index.css` — `--muted-foreground` (`:60`, hsl 20 10% 50% → rgb 140,123,115) sobre `--background` (`:37`, 30 20% 97%) dá **3,78:1**, abaixo do mínimo 4,5:1 para texto normal; branco sobre `--primary` (`:50-51`, 24 95% 53% → rgb 249,112,21) dá **2,85:1**, abaixo até do 3:1 de texto grande. `--muted-foreground` é o token de texto secundário de todo o sistema, e `--primary` é a cor de todos os botões primários.
- **Correção**: escurecer `--muted-foreground` para ≥4,5:1 e usar texto escuro (ou primário mais escuro) sobre `--primary`; replicar no dark (`:217-218`).
- **Verificação**: script de contraste em CI sobre os pares de token; axe sem violação de contraste nas 10 telas principais.
- **Impacto** Alto · **Esforço** Médio · **P0**

### 124. Eliminar os textos de 8-10px
- **Problema**: **969** usos de `text-[8px]`, `text-[9px]` e `text-[10px]` (`rg -o 'text-\[(8|9|10)px\]'`), inclusive nos rótulos do quiosque (`KioskMode.tsx:188-203`), que é lido de longe num tablet de fábrica.
- **Correção**: piso de 12px no corpo e 14px em quiosque; escala tipográfica no `tailwind.config.ts` e substituição em lote por `text-xs`/`text-sm`; lint proibindo `text-[N px]` abaixo de 12.
- **Verificação**: `rg` com contagem zero abaixo de 12px; revisão visual do quiosque.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 125. Nome acessível nos 113 botões de ícone
- **Problema**: 113 de 569 `<Button size="icon">` sem `aria-label` nem `title`. Confirmados: `AuthPage.tsx:235` (alternar tema), `MasterAPIPage.tsx:79,82` (mostrar e copiar chave), `KioskMode.tsx:144,147` (atualizar e tela cheia), `DocumentsList.tsx:222,229,235`, além de `LogisticsPage.tsx:222,299`, `TPMDashboard.tsx:141`, `MLPredictionsDashboard.tsx:72`, `ShiftHandoverPage.tsx:153`, `TraceabilityPage.tsx:481`. Para leitor de tela, são botões sem nome.
- **Correção**: usar o `AccessibleIconButton` que já existe e está órfão (`src/components/accessibility/`), ou exigir `aria-label` por tipagem: variante `icon` com prop obrigatória.
- **Verificação**: axe sem "buttons must have discernible text"; `tsc` falhando se faltar o rótulo.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 126. Elementos clicáveis que não são botões
- **Problema**: 20 `onClick` em `div`/`span`/`Card` sem `role` nem `tabIndex` — `ShiftHandoverPage.tsx:316`, `OperatorView.tsx:149`, `CalendarTimeline.tsx:52`, `AgendaView.tsx:61`, `OperatorProductionCard.tsx:27`, `OperatorReadyJobCard.tsx:23`, `PendingJobsView.tsx:201`, `BINormalView.tsx:50,147,163`, `BIStatCard.tsx:27`, `ExecutiveChartsRow1.tsx:12,71`, `ExecutiveNorthStar.tsx:15`. Nada disso é alcançável por teclado.
- **Correção**: trocar por `<button>` (ou `role="button"` + `tabIndex={0}` + handler de Enter/Espaço); nos cards de operador, o card inteiro vira botão.
- **Verificação**: navegação só por Tab alcançando todos os cards; axe limpo.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 127. Rótulos associados aos campos de formulário
- **Problema**: 236 de 406 `<Label>` sem `htmlFor` e 164 de 277 campos sem `id` nem `aria-label` (fora de `ui/`). Exemplos: formulário de lote em `TraceabilityPage.tsx:345-361` (`Label` solto, `Input` sem id) e `PublicTrackingPage.tsx:163`, que tem só placeholder e ainda remove o anel de foco (`:165`).
- **Correção**: usar o componente `Form` do shadcn (que associa automaticamente) nos formulários novos e corrigir os existentes por feature; `useId()` onde não houver RHF.
- **Verificação**: axe "form elements must have labels" zerado; teste de leitor de tela em 3 formulários.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 128. Restaurar o anel de foco onde foi removido
- **Problema**: há regra global `*:focus-visible` (`src/index.css:443,528`), mas três pontos a anulam: `PublicTrackingPage.tsx:165`, `CommandPaletteAdvanced.tsx:133` e `TechnicalSheetMaterialCalculator.tsx:44`.
- **Correção**: remover os `ring-0` e, onde o anel atrapalhar o desenho, usar um estilo alternativo visível (WCAG 2.4.7/2.4.13).
- **Verificação**: navegação por Tab com foco visível nos três; axe limpo.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 129. Ligar a infraestrutura de acessibilidade já existente
- **Problema**: `AccessibilityProvider` é montado (`src/main.tsx:80`) com uma live region, mas `useLiveAnnounce` **não é chamado em nenhum lugar**; `AccessibleIconButton`, `VisuallyHidden`, `FocusTrap.tsx` e `LiveRegion` têm **zero imports**; `useKeyboardNavigation` e `useAnnounce` (`accessibility/hooks.ts`) também; `usePrefersReducedMotion` só é usado por `hooks/use-device.tsx`. Existe ainda um `useFocusTrap` paralelo em `src/hooks/use-focus-trap.tsx`, usado pelo sidebar mobile (`AppSidebar.tsx:100`).
- **Correção**: anunciar mudanças importantes (resultado de busca, conclusão de ação longa, troca de rota) com `useLiveAnnounce`; adotar `AccessibleIconButton` na etapa 125; remover a duplicata de FocusTrap.
- **Verificação**: teste de leitor de tela anunciando a troca de rota; componentes órfãos passam a ter importador ou são removidos.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 130. Skip-link nas telas fora do MainLayout
- **Problema**: `SkipLinks`/`MainContent` existem só em `MainLayout.tsx:132,215`. `KioskPage`, `PackagingKioskPage`, `AuthPage` e `PublicTrackingPage` ficam sem pular para o conteúdo (WCAG 2.4.1).
- **Correção**: extrair um `PageShell` mínimo com skip-link e `<main id>` e usar nas 4 telas.
- **Verificação**: Tab inicial oferecendo "pular para o conteúdo" nas 4; axe "bypass blocks" limpo.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 131. `lang` do documento acompanhando o idioma escolhido
- **Problema**: `index.html:2` fixa `lang="pt-BR"` e **nenhum código** atualiza `document.documentElement.lang` (`rg "documentElement\.(lang|dir)"` = 0), enquanto `LanguageSwitcher.tsx:22` troca o idioma do i18next. Leitor de tela continua pronunciando em português o conteúdo traduzido.
- **Correção**: listener do i18next atualizando `lang` (e `dir` quando aplicável).
- **Verificação**: trocar para es-ES e inspecionar o atributo; axe limpo.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 132. Respeitar `prefers-reduced-motion` no framer-motion
- **Problema**: há media query global em `src/index.css:464-475`, mas **não** há `MotionConfig reducedMotion` do framer-motion, e `useReducedMotion` aparece em só 3 arquivos (micro-interactions, celebration, AgendaView) — as transições de rota (`AnimatePresence` em `AppRoutes.tsx:4`) e as animações de componentes ignoram a preferência do sistema.
- **Correção**: `<MotionConfig reducedMotion="user">` no topo da árvore.
- **Verificação**: com "reduzir movimento" ligado no sistema operacional, as transições ficam instantâneas.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 133. Alvos de toque adequados em tablet
- **Problema**: 114 botões com `h-5/6/7 w-5/6/7` e 7 com `size="icon-xs|icon-sm"` (variantes de 24px e 32px em `src/components/ui/button.tsx:122-123`) — abaixo dos 44px recomendados para uso com luva em fábrica; exemplo em `KPIOverviewTab.tsx:43,83` (`h-6 w-6`). O `manifest.json:9` ainda força `orientation: portrait-primary`, limitando tablet em paisagem. No quiosque de embalagem o padrão é bom (`h-14` em `PackagingKioskPage.tsx:54`), mas o botão "Sair do Kiosk" é `size="sm"` com `opacity-50` (`KioskPage.tsx:132`).
- **Correção**: mínimo de 44px nas telas de operador e quiosque (área de toque, mesmo mantendo o ícone pequeno); remover a trava de orientação; dar destaque adequado ao "Sair do Kiosk".
- **Verificação**: auditoria de tamanho de alvo (axe/Lighthouse) nas telas de operador; teste em tablet real.
- **Impacto** Alto · **Esforço** Médio · **P1**

## D.4 Responsividade (134-137)

### 134. Grids que não quebram em telas pequenas
- **Problema**: 47 grids com 3+ colunas sem prefixo de breakpoint; os piores são `SettingsPage.tsx:108` (`TabsList grid-cols-9`), `SecurityDashboard.tsx:158` (`grid-cols-10`), `SPCDashboard.tsx:344` (`grid-cols-5`), `KanbanBoard.tsx:310` (`grid-cols-6`), `MLPredictionsDashboard.tsx:36` (`grid-cols-4`), `PackagingTaskDetail.tsx:78` (`grid-cols-5`), `NotificationsPage.tsx:158`, `LotDetailsModal.tsx:75`.
- **Correção**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`; para as abas, lista com rolagem horizontal ou `Select` em telas estreitas.
- **Verificação**: teste Playwright em 375px sem rolagem horizontal; print das 8 telas.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 135. Larguras fixas que forçam rolagem horizontal
- **Problema**: `CalendarTimeline.tsx:296,334` (`min-w-[1200px]`), `WeeklyCalendar.tsx:385` (`min-w-[1000px]`), `RecentJobsTable.tsx:128` (`min-w-[700px]`) e `FactoryHeatmap.tsx:64` (`min-w-[800px]` com `overflow-hidden` no próprio elemento, que **corta** o conteúdo em vez de permitir rolar).
- **Correção**: contêiner com `overflow-x-auto` e indicador de rolagem; no heatmap, trocar o `overflow-hidden`; em mobile, visão alternativa (lista) para a timeline.
- **Verificação**: teste em 375px e 768px com todo o conteúdo alcançável.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 136. Tabelas cruas sem contêiner de rolagem
- **Problema**: `SystemMonitoringPage.tsx:270,308,346,384` (pai `p-0`/`ScrollArea h-96`) e `AdminTelemetriaPage.tsx:375` (`ScrollArea h-[400px]`) usam `<table>` sem `overflow-x`. As demais (`EnergyDashboard.tsx:152`, `BINormalView.tsx:334`, `KPIMachinesTab.tsx:74`, `BIComparisonView.tsx:124`) já têm, e o `Table` do shadcn embrulha com `overflow-auto` (`ui/table.tsx:7`).
- **Correção**: migrar as 5 tabelas cruas para o componente `Table`.
- **Verificação**: teste em 375px; nenhuma tabela cortada.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 137. Data do quiosque que nunca atualiza
- **Problema**: `PackagingKioskPage.tsx:48` formata `new Date()` no render, sem timer — num quiosque que fica dias ligado, o cabeçalho mostra a data em que a página foi aberta.
- **Correção**: timer de 60s (com cleanup) atualizando data e hora.
- **Verificação**: teste com fake timers avançando o dia.
- **Impacto** Médio · **Esforço** Baixo · **P1**

## D.5 Títulos, SEO e PWA (138-141)

### 138. Unificar os três mecanismos de título de página
- **Problema**: `usePageTitle` é chamado só no `MainLayout.tsx:63` e o mapa em `src/hooks/usePageTitle.ts` **não cobre** 14 rotas (`/calendar/monthly`, `/packaging`, `/packaging/kiosk`, `/report-builder`, `/digital-twin`, `/inventory`, `/logistics`, `/mfa-enrollment`, `/master-api`, `/admin/monitoring`, `/status`, `/simulation`, `/audit`, `/track`); além dele, `react-helmet-async` aparece em 15 arquivos (`Index.tsx:200`, `OEEDashboard.tsx:206`) e há `document.title` manual (`AuditTrailPage.tsx:22`, `NotFound.tsx:58`) — três formatos diferentes de título (WCAG 2.4.2).
- **Correção**: um mecanismo (Helmet, já instalado) alimentado por um mapa único derivado da configuração de navegação, cobrindo as 58 rotas.
- **Verificação**: teste E2E percorrendo as rotas e conferindo título único e descritivo.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 139. Corrigir manifest e ícones do PWA
- **Problema**: `public/manifest.json:71` tem atalho para `/jobs`, **rota que não existe** (cai no 404); `:9` força `portrait-primary`; todos os ícones usam `purpose: "maskable any"` (combinação desaconselhada, deforma o ícone); `theme-color` é `#FF5A1F` (`:8`) contra `#f97316` no `index.html:38`; e o `apple-touch-icon` declarado como 180x180 aponta para o arquivo de 192 (`index.html:50`).
- **Correção**: atalho para `/pending` ou `/kanban`; remover a trava de orientação; separar ícones `any` e `maskable`; alinhar `theme-color`; gerar o 180x180.
- **Verificação**: Lighthouse PWA sem avisos de manifest; instalar no Android e conferir ícone e atalhos.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 140. `robots.txt` adequado a sistema interno
- **Problema**: `public/robots.txt` tem `Allow: /` para todos os bots, sem bloquear `/auth` nem `/track`, sem sitemap e sem `noindex` em nenhuma página — é uma aplicação industrial interna, não um site público.
- **Correção**: `Disallow: /` com exceção explícita para `/track` (se o rastreio público deve ser indexável) e `<meta name="robots" content="noindex">` nas telas internas, incluindo o 404 (`NotFound.tsx`).
- **Verificação**: `curl /robots.txt`; teste de presença da meta.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 141. Service worker com versão e aviso de atualização
- **Problema**: `public/sw.js:1` usa `CACHE_NAME` fixo (`'fast-grava-v2'`) sem hash de build, e nada reescreve o nome no build (não há plugin PWA/workbox); `:62-78` faz cache-first com `cache.put` sem limite de entradas nem expiração, para toda resposta 200 `basic`; `skipWaiting` (`:19`) + `clients.claim` (`:33`) ativam a versão nova sem avisar, e o registro em `src/main.tsx:69-76` não escuta `updatefound`/`controllerchange`. Navegação é network-first com fallback para `offline.html` (`:47-54`) e cross-origin sai fora (`:43-45`), então o efeito prático do cache eterno recai sobre os arquivos **não hasheados** de `public/` (manifest, offline.html, ícones, logo) e o `/index.html` pré-cacheado (`:4-9`).
- **Correção**: injetar o hash do build no `CACHE_NAME`, limitar entradas por rota, e avisar o usuário quando houver versão nova em vez de trocar por baixo ("atualizar agora").
- **Verificação**: dois deploys seguidos com o cache antigo limpo; aviso aparecendo; `console.log` de `sw.js:15` removido.
- **Impacto** Médio · **Esforço** Médio · **P2**

## D.6 Formulários e i18n (142-145)

### 142. Levar react-hook-form + Zod aos 15 formulários manuais
- **Problema**: `useForm` existe em só 8 arquivos e `zodResolver` em 7 (NewJobPage, QuickJobDrawer, JobDetailsModal, CreateHandoverModal, DefectTriageForm, DelayReasonDialog, PackagingRegisterForm, DirtyFormContext). Dos 22 arquivos com `<form>`, **15** usam `useState` manual — incluindo os de autenticação (`AuthLoginForm`, `AuthSignupForm`, `MFALoginVerification`), logística (`CreateShipmentModal`, `EditShipmentModal`), operadores (`CreateOperatorModal`, `EditOperatorModal`) e `ResetPasswordPage`. Alguns nem usam `<form>` (lote em `TraceabilityPage.tsx:345-378`, submit por `onClick`).
- **Correção**: migrar por feature para RHF + Zod, com `<form onSubmit>` real (Enter envia) e erro por campo.
- **Verificação**: teste por formulário cobrindo campo obrigatório vazio e Enter; `isSubmitting` bloqueando duplo envio (hoje em 10 arquivos).
- **Impacto** Médio · **Esforço** Alto · **P2**

### 143. Mensagens de validação em português
- **Problema**: não existe `z.setErrorMap`/`errorMap` no projeto, então toda validação sem mensagem customizada cai no texto **em inglês** do Zod — por exemplo `packaging.schema.ts:42,53,67` (`.max(...)`) e `settingsSchema.ts:11`.
- **Correção**: `z.setErrorMap` global em PT-BR (um arquivo, carregado no boot) com mensagens por tipo de issue.
- **Verificação**: teste disparando `too_big`, `invalid_type` e `too_small` e conferindo o texto em PT-BR.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 144. Fechar as lacunas de chave do i18n
- **Problema**: das 243 chaves usadas via `t('…')`, **45 não existem nem em pt-BR** (`bi.delayList`, `bi.loss`, `common.export`, `common.machine`, `common.last60Days`…) e funcionam só pelo texto default em português passado como segundo argumento (`DelaysAnalysis.tsx:51`, `OEEDashboard.tsx:283,346`) — usuário em en/es vê português. `en-US` tem 389 chaves contra 390 de pt-BR (falta `logistics.freightCost`) e `es-ES` tem 331 (faltam 59, entre elas `tracking.*`, `logistics.*`). `src/i18n/index.ts:42` fixa `lng:'pt-BR'` apesar de haver detecção configurada (`:53`).
- **Correção**: adicionar as 45 chaves ausentes em pt-BR, completar en/es (ou declarar oficialmente que são stubs, como diz o ADR 0004, e esconder o seletor), e decidir sobre a detecção de idioma.
- **Verificação**: script de CI comparando as chaves usadas × existentes por locale, falhando em divergência.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 145. Decidir o escopo do i18n
- **Problema**: `useTranslation` está em 31 de 582 `.tsx` e em 7 de 56 páginas — cerca de **5%** da interface. O resto é português no código. Manter 95% hardcoded com infraestrutura de tradução montada é custo sem benefício; o ADR 0004 já diz que pt-BR é o idioma e en/es são stubs.
- **Correção**: duas opções, uma PR cada — (a) assumir pt-BR como único idioma, remover o seletor e manter o i18next só para formatação; (b) planejar a tradução por feature com meta de cobertura. Registrar a decisão no ADR 0004.
- **Verificação**: ADR atualizado; seletor coerente com a decisão. **[DONO]** (decisão de produto).
- **Impacto** Médio · **Esforço** Baixo · **P2**

---

# BLOCO E — Performance e arquitetura (etapas 146-162)

### 146. Tirar jspdf e html2canvas da home
- **Problema**: `src/pages/Index.tsx:45` importa `DashboardExport` estaticamente (renderizado em `:232`) e `DashboardExport.tsx:4-5` importa `html2canvas` e `jspdf` também estaticamente — a rota `/` carrega dois chunks pesados (`lib-pdf` e `lib-html2canvas`, orçados em 400 KB cada no `bundle-budget.json`) para um botão que a maioria não clica.
- **Correção**: `lazy()` no `DashboardExport` e `import()` dinâmico das libs dentro do handler de exportação; mesmo tratamento nos 5 outros imports estáticos de jspdf (`TPMReports.tsx:11`, `oeeReportExport.ts:1`, `spcExport.ts:1`, `productivityReport.ts:1`, `oeeExport.ts:1`).
- **Verificação**: `npm run bundle:report` mostrando a rota `/` abaixo do orçamento de 800 KB e sem `lib-pdf`.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 147. Reduzir framer-motion no shell
- **Problema**: o chunk `vendor-motion` está no caminho crítico porque o **shell** importa framer-motion diretamente: `AppRoutes.tsx:4` (`AnimatePresence` envolvendo todas as rotas), `PageTransition` (importado em `AppRoutes.tsx:7`) e `PushNotificationPrompt.tsx:2` (montado em `App.tsx:3`). `src/components/ui/button.tsx:4` também importa `motion` e é usado por 303 arquivos, mas as páginas são lazy, então o peso decisivo é o do shell, não o do botão.
- **Correção**: trocar a animação de rota por CSS (ou `View Transitions` com fallback), tornar `PushNotificationPrompt` lazy e avaliar remover `motion` do `button` (ganho secundário).
- **Verificação**: `bundle:report` provando que `vendor-motion` saiu do carregamento inicial; navegação sem regressão visual.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 148. Fontes sem bloquear a primeira pintura
- **Problema**: `index.html:76` carrega Google Fonts por `<link rel="stylesheet">` com Inter em **7 pesos**, JetBrains Mono em 3 e Outfit variável 100..900 — CSS bloqueante no caminho crítico. Há `preconnect` (`:74-75`) mas nenhum `preload`, e não existe self-host (`public/fonts` não existe).
- **Correção**: reduzir para 3 pesos de Inter + 1 mono, self-hospedar com `font-display: swap` e `preload` do peso principal.
- **Verificação**: Lighthouse mostrando queda no LCP e zero requisição a `fonts.googleapis.com`.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 149. Enxugar a árvore de providers
- **Problema**: `src/providers/AppProviders.tsx:75-95` tem **21** providers em `APP_PROVIDERS`, mais `HelmetProvider`, `ErrorBoundary`, `QueryClientProvider`, `BrowserRouter`, `DirtyGuardProvider` e o `ThemeProvider` do next-themes (`:100,135-139`) — cerca de 28 níveis. `ThemeContextProvider` (`:75`, mero wrapper de `useTheme`) coexiste com o `ThemeProvider` do next-themes (`:100`), e `NotificationsProvider`/`SearchProvider` ficam **acima** do `AuthProvider`. Há ainda 3 watchers globais (`:25-27`).
- **Correção**: remover o `ThemeContextProvider` redundante, mover para dentro de rotas protegidas os providers que só servem a elas, e mover os watchers para um componente único montado após o auth resolver.
- **Verificação**: contagem de providers na PR; React DevTools Profiler com menos re-renders no boot.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 150. Remover os 43 `TooltipProvider` redundantes
- **Problema**: há `TooltipProvider` global (`AppProviders.tsx:77`) e **43 montagens JSX** locais em 27 arquivos fora de `components/ui` — cada uma cria contexto próprio sem necessidade.
- **Correção**: remover as montagens locais, mantendo só o global.
- **Verificação**: tooltips funcionando nas telas afetadas; `grep -c "<TooltipProvider"` só no provider global e em `ui/`.
- **Impacto** Baixo · **Esforço** Baixo · **P3**

### 151. `SystemMonitoringPage` contornando o wrapper do recharts
- **Problema**: `src/pages/SystemMonitoringPage.tsx:35` importa de `"recharts"` (ESM) direto, enquanto os outros 42 importadores usam o wrapper `src/lib/recharts.ts` (que importa `recharts/lib`, CJS) — a página puxa uma segunda cópia da biblioteca para o bundle.
- **Correção**: usar o wrapper; lint proibindo import direto de `recharts`.
- **Verificação**: `bundle:report` sem duplicação de recharts.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 152. Carregar sob demanda react-joyride, confetti e exceljs
- **Problema**: `SettingsGeneralTab.tsx:8` importa `SystemOnboarding` (react-joyride) estaticamente, embora `MainLayout.tsx:27` já o carregue com lazy; `ProductDesignProvider.tsx:2` → `OnboardingTour` → `canvas-confetti` entra na árvore de **todo** o app; `TPMReports.tsx:18` e `ReportBuilderPage.tsx:51` importam `@/lib/excel` (exceljs, orçado em 400 KB) estaticamente.
- **Correção**: `lazy()`/`import()` nos quatro pontos.
- **Verificação**: `bundle:report` com `lib-excel`, `lib-joyride` e `lib-confetti` fora do carregamento inicial.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 153. Alinhar o orçamento de bundle com os chunks reais
- **Problema**: `bundle-budget.json` orça chunks que **não existem** no `manualChunks` (`vendor-forms`, `vendor-i18n`, `lib-confetti`, `lib-carousel`) e não orça três que existem (`vendor-utils`, `vendor-dnd`, `vendor-sentry`), que caem no default de 350 KB. `lib-mermaid` tem teto de 1400 KB, confirmando os ~3 MB crus conhecidos. `vite.config.ts:117-126` ainda junta date-fns, zod, react-hook-form, clsx e tailwind-merge num único `vendor-utils`, e `optimizeDeps` (`:131-146`) inclui `dayjs`, que tem **zero** imports em `src`.
- **Correção**: sincronizar o orçamento com os chunks, separar `vendor-utils`, remover `dayjs` do `optimizeDeps`.
- **Verificação**: `npm run bundle:report` sem chunk órfão nem chunk sem orçamento.
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 154. Virtualizar as listas grandes restantes
- **Problema**: `@tanstack/react-virtual` só é usado em 4 arquivos (`PendingJobsView`, `CalendarTimeline`, `PendingQueue`, `TraceabilityPage`), mas 45 arquivos renderizam `<TableBody>`/`<tbody>` com `.map` sobre dados de query — incluindo `AdminTelemetriaPage.tsx` (589 linhas, com `.limit(500)` em `:134,160`), `ExecutionRecordView.tsx` (441), `BINormalView.tsx` (434), `SystemMonitoringPage.tsx` (421), `SPCDashboard.tsx` (361) e `OEEMachineTable.tsx` (340).
- **Correção**: virtualizar as 6 maiores, começando pelas que já trazem 200-500 linhas.
- **Verificação**: medir tempo de render e memória com 500 linhas antes/depois.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 155. Trocar fetch manual em `useEffect` por TanStack Query
- **Problema**: 8 arquivos buscam no Supabase dentro de `useEffect` em vez de `useQuery` — `useDashboardLayout.ts:49,57`, `useQuickFavorites.ts:90,109`, `PreProductionChecklist.tsx:47,50`, `QuickChat.tsx:38,41`, `useRBAC.tsx:139,147`, `useWebPushNotifications.ts:41`, `usePerformanceMetrics.ts:28`, `FactoryFloorMap.tsx` — sem cache, sem retry, sem dedupe e sem estado de erro. Em `src/pages` e `src/components` há 22 arquivos com 35 chamadas diretas a `supabase.from(`, 7 deles sem nenhum `useQuery`/`useMutation` (SettingsPage com 3, TwoFactorSetup com 2, NewJobPage, AuthPage, QRScanner, QuickChat, QuickJobDrawer).
- **Correção**: migrar para `useQuery`/`useMutation` com chave estável; `useRBAC` é prioridade por estar no caminho de autorização.
- **Verificação**: nenhuma chamada a `supabase.from(` dentro de `useEffect` (lint custom); teste de cache evitando refetch.
- **Impacto** Médio · **Esforço** Alto · **P2**

### 156. Fábrica de chaves de query
- **Problema**: 336 `queryKey` com array literal e **nenhuma** fábrica (`export const xKeys =` não existe), o que leva a invalidação por string solta e chaves divergentes entre hooks. `useQuery` aparece 160 vezes e `select:` só 7, então listas grandes são repassadas inteiras aos componentes. Três chaves usam `toISOString()` (`AdminTelemetriaPage.tsx:125,151,172`) — `useExecutiveDashboard.ts:65` e `useEnergy.ts:71,88` derivam de `startOfMonth`, logo ficam estáveis dentro do mês.
- **Correção**: `src/lib/queryKeys.ts` com fábricas por domínio; usar `select` nas listas grandes; chaves de telemetria baseadas em período arredondado.
- **Verificação**: `grep` de `queryKey: ['` apenas nas fábricas; teste de invalidação cruzada.
- **Impacto** Médio · **Esforço** Alto · **P2**

### 157. Quebrar os ciclos de import
- **Problema**: 9 ciclos no grafo — o maior com **34** arquivos passando pelos barrels `features/admin/index.ts`, `features/analytics/types/index.ts` e `features/jobs/*`; um de 26 (`AppSidebar` → `MainLayout` → `sidebarNavConfig` → `lib/prefetch.ts` → pages); um de 6 no barrel `features/auth/index.ts`; um de 3 em `features/inventory`; e cinco de 2, entre eles `jobStateMachine ↔ jobsService` e `supabase/client.ts ↔ lib/logger.ts` (via `import()` dinâmico em `logger.ts:63` e `client.ts:36`).
- **Correção**: importar do arquivo-fonte em vez do barrel nos pontos do ciclo; extrair tipos para módulo sem dependência; no par logger/client, injetar o logger em vez de importar.
- **Verificação**: `npm run graph:build` com zero ciclo nos pares de 2 e redução nos grandes; lint de fronteiras (etapa 189).
- **Impacto** Médio · **Esforço** Alto · **P2**

### 158. Quebrar os god components
- **Problema**: 15 arquivos acima de 500 linhas fora de testes e gerados — `useOfflineSync.ts` (662), `ui/sidebar.tsx` (638, **órfão**), `AdminTelemetriaPage.tsx` (589), `OEEDashboard.tsx` (580), `KanbanBoard.tsx` (561), `Index.tsx` (541), `useOEE.ts` (539), `SkeletonLibrary.tsx` (523), `UserManagement.tsx` (520), `EditorBasicInfo.tsx` (520), `TraceabilityPage.tsx` (519), `PendingQueue.tsx` (514), `NewJobPage.tsx` (513), `JobDetailsModal.tsx` (511), `ShiftHandoverPage`/`QuickFavoritesBar` (500). Nenhum deles tem teste.
- **Correção**: extrair seções em componentes por responsabilidade (uma PR por arquivo), escrevendo o teste da parte extraída.
- **Verificação**: nenhum arquivo acima de 400 linhas nos tocados; cobertura subindo nos extraídos.
- **Impacto** Médio · **Esforço** Alto · **P2**

### 159. Unificar os dois sistemas de offline
- **Problema**: coexistem dois armazenamentos de fila — `useOfflineSync.ts:27,37,47` em `localStorage` (PENDING_ACTIONS, CACHED_DATA, FAILED_ACTIONS) e `src/lib/offlineStorage.ts:6-7,35` em IndexedDB (`fastgravacoes_offline` v1) — e dois providers (`OfflineProvider` e `OfflineSyncProvider`), com o fio quebrado entre `src/hooks/useLocalStorage.ts:57` e `src/contexts/OfflineSyncContext.tsx`. O background sync do SW (`sw.js:84-99`) só faz `postMessage` para as janelas.
- **Correção**: eleger IndexedDB como único armazenamento, migrar o que estiver em `localStorage` no primeiro boot, consolidar num provider e fazer o SW disparar a sincronização de verdade.
- **Verificação**: teste offline → online com ação pendente sendo aplicada uma única vez.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 160. Sentry sem captura de exceção
- **Problema**: `@sentry/react` é inicializado em `src/main.tsx:5,18-29` (com `tracesSampleRate: 0.1`), mas **não existe nenhum `captureException` em `src`** — `GlobalErrorBoundary.tsx:27-31` manda o erro só para o logger. Também faltam `browserTracingIntegration` e a integração de replay no init, apesar de `replaysOnErrorSampleRate` estar configurado. Só 3 arquivos tocam Sentry (`main.tsx`, `navTelemetry.ts`, `NavigationListener.tsx`).
- **Correção**: `captureException` nos boundaries e no `onError` global do QueryClient (etapa 111), com `user.id` e rota no escopo; adicionar as integrações declaradas.
- **Verificação**: provocar um erro e encontrá-lo no Sentry com rota e usuário. **[DONO]** (envolve DSN/custo).
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 161. `onFID` descontinuado em web-vitals 4
- **Problema**: `src/main.tsx:41-45` registra `onCLS`, **`onFID`**, `onLCP`, `onTTFB` e `onINP`; `onFID` foi descontinuado em favor de INP na v4 (o projeto usa `web-vitals ^4.2`), e cada métrica virar `Sentry.captureMessage` (`:34`) gera ruído e custo de eventos.
- **Correção**: remover `onFID`, manter INP, e enviar as métricas como medição (ou para o próprio `error_logs`/telemetria) em vez de mensagem.
- **Verificação**: console sem aviso de descontinuado; volume de eventos no Sentry caindo.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 162. Remover o código morto confirmado
- **Problema**: 30 componentes órfãos ainda no disco, entre eles `ui/sidebar.tsx` (638 linhas), `navigation/GlobalSearch.tsx` (317), `traceability/LotLabelPrint.tsx` (293), `layout/ResponsiveContainer.tsx` (262), `machines/MachineDetailsModal.tsx` (236), `traceability/CreateLotModal.tsx` (duplicado pelo formulário inline de `TraceabilityPage.tsx:345`), `mobile/PullToRefresh.tsx`, `auth/AuthSignupForm.tsx`, `ui/responsive-table.tsx`, `ui/drawer.tsx`, `carousel`, `stepper`, `accordion`, `input-otp`, `resizable`, `toggle-group`, `accessibility/AccessibleIconButton.tsx` e `FocusTrap.tsx`; mais o barril morto `design-system/sections/animations/index.ts` e `useSessionManager` exportando arquivo vazio. Há também 6 pares de nomes duplicados (`AdjustmentParameters`, `DashboardSkeleton`, `JobQuickActions`, `SidebarProvider`, `StaggeredList`, `Toaster`).
- **Correção**: remover em lotes por pasta (uma PR por lote), **exceto** os que as etapas 125 e 129 vão adotar (`AccessibleIconButton`, `VisuallyHidden`) e `stepper` (usado na etapa de progresso do plano de UX); renomear os duplicados.
- **Verificação**: `npm run graph:build` com menos órfãos; `tsc` e build verdes; `bundle:report` registrando a redução.
- **Impacto** Médio · **Esforço** Médio · **P2**

---

# BLOCO F — Fluxos pela metade e paginação (etapas 163-175)

### 163. Cadastro de máquinas inexistente na interface
- **Problema**: não há **nenhum** `insert` nem `delete` em `machines` em todo o `src`; `MachinesPage.tsx:104-107` só faz `update({is_active})` em massa. Criar máquina nova ou corrigir nome/código exige mexer direto no banco.
- **Correção**: CRUD completo de máquina (criar, editar, desativar) com formulário validado e policy conferida.
- **Verificação**: criar, editar e desativar uma máquina de teste pela interface.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 164. SPC sem corrigir parâmetro nem medição
- **Problema**: `useSPC.ts:168-169` cria `spc_control_parameters` e `:223-224` insere `spc_measurements`; não existe nenhum `.update`/`.delete` nessas tabelas no repo, e `SPCDashboard.tsx:35` só expõe criar e reconhecer alerta. Parâmetro com limite errado não pode ser corrigido e medição digitada errada permanece gerando alerta falso.
- **Correção**: editar e inativar parâmetro; corrigir/anular medição com trilha de auditoria (quem alterou e por quê).
- **Verificação**: corrigir uma medição e ver a carta de controle recalculada.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 165. Rastreabilidade só insere
- **Problema**: `useTraceability.ts:254-306` insere `lot_components`, `lot_movements` e `lot_quality_inspections`, e as abas correspondentes têm apenas "Adicionar"/"Registrar"; `:209-228` cria `production_lots` e só muda status — lote duplicado ou de teste fica para sempre na lista e nos filtros.
- **Correção**: editar e excluir lançamento recente (com janela e trilha); exclusão lógica para lote.
- **Verificação**: corrigir um componente de lote e conferir o histórico.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 166. Energia: leitura e metas sem gestão
- **Problema**: `useEnergy.ts:243-244` insere `energy_consumption` sem editar nem excluir — leitura de kWh digitada errada distorce custo e metas permanentemente (o único `update` do hook é em `energy_alerts`, `:259`); `:276-277` tem `createTarget` que **nenhuma tela chama** (`EnergyDashboard.tsx:30` só usa `addConsumption`), então a gestão de metas é código morto.
- **Correção**: editar/excluir leitura com trilha; interface de metas (criar, editar, excluir) ou remoção do `createTarget`.
- **Verificação**: corrigir uma leitura e ver o custo recalculado.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 167. TPM: agendamento sem editar nem excluir
- **Problema**: `useTPMLifecycleMutations.ts:32` insere `maintenance_schedules`; o único `update` é o status ao iniciar (`:52`). Data, frequência ou máquina erradas não podem ser corrigidas pela interface. `maintenance_records` não tem nenhum `.delete`.
- **Correção**: editar agendamento (data, frequência, responsável) e cancelar com motivo.
- **Verificação**: reagendar uma manutenção pela interface e conferir a próxima data.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 168. Perdas de produção sem entrada na interface
- **Problema**: `useProductionLosses.ts:68` tem `recordLoss` que **nenhuma tela chama**; `OEEDashboard`, `OEELossesChart` e `OEELossDrilldown` só leem. Além disso a consulta (`:31-33`) baixa todas as perdas sem filtro. Mesmo padrão em `useMachineDowntime.ts:26,37-75`: hook completo de parada de máquina (insert + update) sem nenhuma tela, então o operador não tem como registrar parada.
- **Correção**: formulário de registro de perda e de parada de máquina nas telas de operador e OEE, ou remoção dos hooks com registro em "Próximos passos".
- **Verificação**: registrar uma perda e vê-la no OEE; registrar uma parada e vê-la no histórico.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 169. Templates de relatório e presets sem gestão
- **Problema**: `ReportBuilderPage.tsx:115-116` salva `report_templates` sem editar nem excluir (o ícone `Trash2` está importado e não usado), e `ReportSourcePanel.tsx:198-208` só aplica; `useDashboardPresets.ts:33-40,63` salva e exclui mas não renomeia nem atualiza — alterar filtros exige excluir e recriar, e os nomes duplicam.
- **Correção**: excluir/renomear template; atualizar preset existente (upsert por nome).
- **Verificação**: editar um template e um preset pela interface.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 170. Chat que para de mostrar mensagens após 100
- **Problema**: `src/components/chat/QuickChat.tsx:40-45` busca com `order('created_at', {ascending: true}).limit(100)` — traz as **100 mais antigas**, então um canal com mais de 100 mensagens nunca exibe as recentes ao abrir.
- **Correção**: buscar as 50 mais recentes (`ascending:false` + `limit`), inverter na exibição, e paginar para trás ao rolar.
- **Verificação**: canal com 200 mensagens exibindo as últimas.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 171. Trilha de auditoria limitada a 100 eventos
- **Problema**: `AuditTrailPage.tsx:18` fixa `limit: 100` sem paginação nem "carregar mais" — eventos além dos 100 mais recentes são **inacessíveis pela interface**. Mesmo padrão em `SecurityEventsLog.tsx:61` (`useSecurityEvents(200)`).
- **Correção**: paginação por cursor (`created_at`) com filtros de período, usuário e ação.
- **Verificação**: navegar até eventos de 30 dias atrás pela interface.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 172. Histórico de estoque e de manutenção sem paginação
- **Problema**: `useInventory.ts:200-212` lê `inventory_movements` inteira com dois joins a cada abertura; `maintenanceService.ts:13-15` baixa todo o histórico de manutenção; `useOperatorAudit.ts:19` baixa todo o log de status de operador quando aberto sem `operatorId`; `useTechnicalConversations.ts:157-159` baixa toda a conversa do assistente.
- **Correção**: paginação por cursor nos quatro, com filtro de período obrigatório no histórico geral.
- **Verificação**: medir payload e tempo de abertura antes/depois.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 173. Fila de embalagem e agendamento sem teto
- **Problema**: `packagingService.ts:60-64` lista todas as tarefas históricas quando não há filtro de status (quiosque e dashboard degradam com o volume); `useSchedulingData.ts:82` chama `jobsService.getAll({recentOnly:true})` — funciona hoje, mas cresce mês a mês e alimenta ~30 telas.
- **Correção**: `listTasks` com status obrigatório ou paginação; teto explícito e documentado no `recentOnly`.
- **Verificação**: teste com volume 10× e tempo de resposta dentro do aceitável.
- **Impacto** Médio · **Esforço** Médio · **P1**

### 174. Fichas técnicas sem editar materiais e dicas
- **Problema**: `useTechnicalSheetMutations.ts:157,199` insere `technical_sheet_materials` e `technical_sheet_tips`; só `technical_sheet_steps` tem `update` (`:123`). Corrigir quantidade ou texto exige excluir e recriar.
- **Correção**: `update` para materiais e dicas, com edição inline na ficha.
- **Verificação**: corrigir a quantidade de um material e conferir o cálculo.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

### 175. Logística e turno sem exclusão
- **Problema**: `useLogistics.ts:56-58` lista `shipments` sem limite e o menu de `LogisticsPage.tsx:304-310` só edita, copia link e marca entregue — remessa duplicada não pode ser removida; `useShiftHandoverMutations.ts:83,105` insere `shift_pending_tasks` e `shift_occurrences` com apenas `update` (resolver), então item criado por engano fica no painel até ser "resolvido" artificialmente. `ChecklistManager.tsx:203` só desativa checklist (soft-delete aceitável, mas sem remoção).
- **Correção**: exclusão (lógica) com motivo em remessa e em item de turno; paginação na lista de remessas.
- **Verificação**: excluir uma remessa de teste e um item de turno.
- **Impacto** Baixo · **Esforço** Baixo · **P2**

---

# BLOCO G — CI, testes e qualidade (etapas 176-190)

### 176. `deploy.yml` passa a depender do Quality Gate
- **Problema**: `.github/workflows/deploy.yml` dispara em `push` para `main` **independente** do `ci.yml` (sem `workflow_run` nem `needs`), sem `environment:` protegido, e seu job `test` roda só `npm run test -- --run` (`:68`) — sem lint, sem `tsc`, sem E2E, sem RLS. Em seguida aplica `supabase db push --yes` (`:171`) em **produção** e deploya as Edge Functions (`:228`). Ou seja: migration em produção sem o gate que a `main` exige para merge.
- **Correção**: `workflow_run` condicionado ao sucesso do `Quality Gate ✅`, ou `needs` com os mesmos jobs; `environment: production` com reviewer.
- **Verificação**: PR com teste quebrado não chega a disparar deploy. **[DONO]** (workflow + proteção de ambiente).
- **Impacto** Alto · **Esforço** Médio · **P0**

### 177. Tirar o E2E da quarentena
- **Problema**: no `quality-gate`, o E2E é **advisory** — a falha não bloqueia (comentário "suíte em quarentena", `ci.yml:552-558`) e `skipped`/`cancelled` contam como não-falha (`:547`). O job tem checagem de pré-requisitos que falha fechado se faltarem secrets (`:405-427`) e as credenciais já existem na `main`, então a quarentena perdeu o motivo.
- **Correção**: medir 5 execuções seguidas; se não houver instabilidade, tornar o E2E bloqueante (começando por um subconjunto crítico: login, criar job, mover no kanban, embalagem).
- **Verificação**: 5 runs verdes registrados na PR; gate exigindo o job. **[DONO]** (workflow).
- **Impacto** Alto · **Esforço** Médio · **P1**

### 178. "Enforce coverage" que não exige nada
- **Problema**: o passo de cobertura no `ci.yml:154` é um `echo` — não falha. Os thresholds de `vitest.config.ts:47-66` (lines 34, functions 27, branches 26, statements 32) ficam declarados mas não aplicados, e a cobertura real ronda 35%.
- **Correção**: fazer o job falhar abaixo do threshold e subir a meta em degraus (+3 pontos por sprint), com catraca para não regredir.
- **Verificação**: baixar um threshold propositalmente e ver o CI vermelho. **[DONO]** (workflow).
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 179. Testes para as 15 telas maiores sem nenhum teste
- **Problema**: `testes.json` lista 54 telas, 173 hooks/componentes e 31 Edge Functions **sem teste**. As 15 maiores telas descobertas são `ui/sidebar.tsx` (638, órfã — será removida na etapa 162), `OEEDashboard` (580), `KanbanBoard` (561), `Index` (541), `useOEE` (539), `TraceabilityPage` (519), `PendingQueue` (514), `NewJobPage` (513), `ShiftHandoverPage` (500), `WeeklyCalendar` (484), `LogisticsPage` (434), `GamificationPage` (428), `SystemMonitoringPage` (421), `KPIDashboard` (410) e `VoiceCommands` (394). `AuthPage` também está sem teste.
- **Correção**: teste de render + caminho principal + estado de erro por tela, priorizando `AuthPage`, `KanbanBoard`, `NewJobPage` e `PendingQueue`.
- **Verificação**: cobertura por arquivo registrada na PR; cada teste falha se o caminho principal quebrar.
- **Impacto** Alto · **Esforço** Alto · **P1**

### 180. Testes de regressão para os bugs de fuso horário
- **Problema**: os 11 pontos do bloco B.2 não têm nenhum teste com fuso fixo, então o bug volta no próximo hook que usar `toISOString().split('T')[0]`.
- **Correção**: suíte com `TZ=America/Sao_Paulo` e fake timers às 22h/23h59 cobrindo os pontos corrigidos; lint custom proibindo `toISOString().split('T')[0]` e `toISOString().slice(0,10)` fora de `dateUtils`.
- **Verificação**: reverter uma correção e ver o teste vermelho; lint pegando um caso novo.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 181. Ampliar a varredura de acessibilidade do E2E
- **Problema**: `tests/e2e/accessibility.spec.ts` roda axe em `/auth` e no 404 — justamente as telas mais simples — e deixa de fora todas as telas operacionais.
- **Correção**: axe nas 12 telas principais (home, kanban, jobs, produção, embalagem, manutenção, estoque, operador, quiosque, calendários, relatórios, configurações), falhando em violação séria/crítica.
- **Verificação**: relatório axe por tela anexado ao run.
- **Impacto** Alto · **Esforço** Médio · **P1**

### 182. Regressão visual com cobertura real
- **Problema**: `tests/e2e/visual-regression.spec.ts-snapshots/` tem apenas **2** baselines, então mudança de layout passa sem ser notada; o workflow `visual-baselines.yml` é `workflow_dispatch`.
- **Correção**: baseline das 12 telas principais em desktop e mobile, com tolerância definida e atualização por dispatch documentada.
- **Verificação**: alterar um padding e ver o teste reprovar.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 183. Remover o `test.skip` que esconde falha
- **Problema**: `tests/e2e/jobs.spec.ts:64` tem `test.skip` **condicionado à visibilidade do botão** — se a interface quebrar e o botão desaparecer, o teste é pulado e o CI fica verde. `tests/e2e/auth.spec.ts:71` pula quando faltam credenciais de operador (aceitável, mas as credenciais já existem).
- **Correção**: trocar o skip condicional por asserção de presença do botão; usar as credenciais existentes em `auth.spec.ts`.
- **Verificação**: esconder o botão propositalmente e ver o teste falhar.
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 184. Reativar o projeto `mobile-chrome` no CI
- **Problema**: `playwright.config.ts` define `chromium` e `mobile-chrome`, mas o CI roda **só** chromium — nenhuma verificação automatizada em viewport de celular, apesar de o sistema ter telas de operador e quiosque em tablet.
- **Correção**: incluir `mobile-chrome` em um subconjunto de testes (navegação, operador, quiosque, embalagem).
- **Verificação**: run do CI com os dois projetos. **[DONO]** (workflow, custo de minutos).
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 185. Resolver os três lockfiles e fixar a versão do Node
- **Problema**: existem `bun.lock`, `bun.lockb` **e** `package-lock.json`, enquanto o CI usa npm (`npm ci --legacy-peer-deps`); `package.json` não tem `engines` nem `packageManager`, e não há `.nvmrc`/`.node-version` — o CI fixa `node-version: 24` (`deploy.yml:61`), mas qualquer máquina local roda outra versão.
- **Correção**: remover os dois lockfiles do bun, adicionar `engines.node` e `packageManager`, criar `.nvmrc` com a versão do CI, e documentar em `AGENTS.md` que o gerenciador é npm.
- **Verificação**: `npm ci` em container limpo; CI verde.
- **Impacto** Médio · **Esforço** Baixo · **P1**

### 186. Pin completo das actions e permissões por job
- **Problema**: as actions já são fixadas por SHA, mas `denoland/setup-deno` e `supabase/setup-cli` têm comentário só com a major (`# v2`, `# v1`), o que esconde qual versão está valendo. `ci.yml:19` declara `permissions: contents: read` global e **só** `bundle-diff` declara permissões próprias (`:327`); `deploy.yml` usa `contents: read, packages: read` sem concurrency com cancelamento.
- **Correção**: comentário com a versão exata ao lado do SHA; `permissions` explícito por job (princípio do menor privilégio).
- **Verificação**: `actionlint` verde; revisão do diff do workflow. **[DONO]** (workflow).
- **Impacto** Médio · **Esforço** Baixo · **P2**

### 187. Endurecer o scan de segredos e de dependências
- **Problema**: o job `security` usa `scripts/audit-gate.mjs` com allowlist e roda TruffleHog **sem** `--only-verified` (gera ruído e tende a ser ignorado); `dependency-review.yml` roda só em PR com `fail-on-severity: high` e é pulado para dependabot e forks. `npm audit` hoje retorna **zero** vulnerabilidade em todas as severidades (o problema conhecido de `react-router` foi resolvido na atualização para `^7.18.5`).
- **Correção**: TruffleHog com `--only-verified` mais um job separado de varredura histórica; `dependency-review` também em `merge_group`; revisar a allowlist do audit-gate e documentar cada exceção com data de validade.
- **Verificação**: introduzir um segredo falso verificável em branch de teste e ver o CI reprovar. **[DONO]** (workflow).
- **Impacto** Médio · **Esforço** Médio · **P2**

### 188. Exigir revisão e checagens na proteção da `main`
- **Problema**: a proteção da `main` tem **um** único check obrigatório (`Quality Gate ✅`, com `strict: true`), **nenhuma revisão exigida**, `enforce_admins: false`, e os três métodos de merge habilitados com `allow_auto_merge: true`. Como o Fluxo Git autoriza o agente a mergear a própria PR, o gate é a única barreira — e o E2E dentro dele é advisory (etapa 177).
- **Correção**: avaliar com o dono exigir revisão (ou manter o automerge, documentando a decisão), ligar `enforce_admins`, deixar só squash e incluir os checks de deploy depois da etapa 176.
- **Verificação**: `npm run settings:guard` refletindo a configuração nova. **[DONO]** (proteção de branch).
- **Impacto** Alto · **Esforço** Baixo · **P1**

### 189. Ligar `noUnusedLocals` e lint de fronteiras entre módulos
- **Problema**: `tsconfig.app.json:18` tem `noUnusedLocals: false`, então import e variável sem uso passam — foi assim que 30 componentes órfãos e imports mortos (`ERPListResponseSchema`, `Trash2` em `ReportBuilderPage`) acumularam. Não há regra de fronteira entre módulos, o que permitiu os 9 ciclos da etapa 157.
- **Correção**: ligar `noUnusedLocals`/`noUnusedParameters` (limpando o que aparecer) e adicionar `eslint-plugin-boundaries` (ou `import/no-cycle` + `no-restricted-imports`) proibindo ciclo e import cruzado entre features.
- **Verificação**: `tsc` verde com as flags; lint reprovando um ciclo introduzido de propósito.
- **Impacto** Médio · **Esforço** Médio · **P2**

### 190. Catraca para o que este plano corrigiu
- **Problema**: sem catraca, os padrões corrigidos voltam — foi o que aconteceu com `any` (que **tem** catraca e está em 0 no código de produção, `.any-baseline.json: 2`, contra 59 ocorrências só em testes) comparado a tudo que não tem.
- **Correção**: `scripts/ci/plano-190-ratchet.mjs` com contadores que só podem cair: `window.confirm`, `Button size="icon"` sem rótulo, `toISOString().split('T')[0]` fora de `dateUtils`, `supabase.from(` dentro de `useEffect`, `.single()` sem checagem de erro, `text-[Npx]` abaixo de 12, `await supabase` sem `error`, função em `supabase/functions` sem `index.test.ts`, `TooltipProvider` local, import direto de `recharts`/`framer-motion` em `ui/`. Cada etapa concluída atualiza o número de referência.
- **Verificação**: o script roda no job `lint` e reprova um aumento proposital em branch de teste. **[DONO]** (workflow).
- **Impacto** Alto · **Esforço** Médio · **P1**

---

# Priorização: impacto × esforço

| Quadrante | Etapas | Quando fazer |
|---|---|---|
| **Ganho rápido** (alto impacto, baixo esforço) | 1-6, 8, 10, 14, 21-25, 29-33, 38-39, 41-42, 52, 55, 57-66, 68-70, 73, 76-78, 81, 87-90, 92, 97-100, 107-108, 111-112, 116, 119, 122, 128, 131-132, 137, 139-140, 143, 146, 150-153, 160-161, 170, 178, 183, 185-186, 188 | primeiras duas semanas |
| **Estruturante** (alto impacto, esforço médio/alto) | 7, 9, 11-13, 15-20, 26-28, 34-37, 40, 43-47, 49-51, 53-54, 56, 67, 71-72, 74-75, 79-80, 82-86, 91, 93-96, 101-106, 109-110, 113-115, 117-118, 120-121, 123-127, 133-136, 138, 141, 147-149, 154, 159, 163-165, 167-168, 171-173, 176-177, 179-182, 184, 187, 189-190 | sprints seguintes, uma frente por vez |
| **Incremental** (impacto médio/baixo, esforço baixo) | 48, 98-99, 122, 128, 142, 144, 166, 169, 174-175 | encaixar entre entregas |
| **Opcional** (baixo impacto) | 25, 145, 150, 155-158, 162 | só com folga, ou junto de outra mudança no mesmo arquivo |

## Ordem sugerida de execução

1. **Semana 1-2 — parar de mostrar dado errado**: 51-53, 57-66, 68-70, 73, 81, 111-112, 123, 170.
2. **Semana 3-4 — fundação de contrato**: 1-6, 8, 10, 12-14, 16, 21-25, 41-43.
3. **Semana 5-6 — schemas e testes por função**: 17-20, 26-40, 44-47.
4. **Semana 7-8 — segurança de banco (com o dono)**: 86-93, 102-104.
5. **Semana 9-10 — acessibilidade e responsividade**: 118-121, 124-127, 133-137.
6. **Contínuo** — CI e catraca (176-190) acompanham cada frente, não ficam para o fim.

# Riscos e dependências

- **Revogar grants de `anon` (86-87) pode quebrar o tracking público e o login** se alguma policy dependia do grant amplo. Fazer por domínio, com `rls-regression` antes e depois, e janela de rollback.
- **Apertar a CSP (95)** pode quebrar mermaid e gráficos. Medir com os relatórios já coletados por `csp-report` antes de mudar.
- **Tornar o E2E bloqueante (177)** sem medir instabilidade primeiro para a entrega inteira. As 5 execuções são pré-requisito, não formalidade.
- **Mudar `jobsService.getAll` (79)** afeta 14+ consumidores de uma vez. Introduzir a versão paginada em paralelo e migrar consumidor por consumidor.
- **Unificar offline (159)** mexe em dado que já está no aparelho do operador. A migração do `localStorage` para IndexedDB tem de ser idempotente e preservar a fila pendente.
- **Remover código morto (162)** depois das etapas 125 e 129, que vão adotar três dos componentes hoje órfãos.
- **Versionamento (48-50)** precisa de aviso ao integrador do ERP e ao administrador do Bitrix antes de qualquer corte de v1.
- **DDL em produção** (67, 74-75, 80, 84, 86-93, 102) vai pelo fluxo de `docs/agentes/banco.md`: arquivo → PR → merge → `deploy.yml`. Nunca do painel, nunca de branch aberta.
- **Etapas que exigem decisão do dono** estão marcadas **[DONO]**: 15, 41, 45, 48, 67, 72, 74-75, 76 (quando virar RPC), 80, 84, 86-95, 102, 105, 145, 160, 176-178, 184, 186-188, 190.

# Observação de método

Cada etapa deste plano cita arquivo e linha lidos nesta auditoria, sobre a `main` em `75dc924`. Onde a
refutação derrubou parte de uma afirmação, o texto já está corrigido e a parte falsa não aparece. Nenhuma
etapa afirma que algo "foi testado": a coluna **Verificação** descreve o que precisa ser executado para
a etapa poder ser declarada pronta.

# Simulação de Cenários & Hardening — FAST GRAVAÇÕES ES v2

**Data:** 2026-06-14
**Objetivo:** simular exaustivamente cenários do dia a dia, prever falhas/gaps e
executar as melhorias até o sistema ficar robusto. Cada correção foi **verificada
contra o schema real** (migrações/`types.ts`) antes de ser aplicada.

**Estado final:** `tsc` 0 erros · `eslint` 0 erros (726 warnings pré-existentes)
· **388/388** testes · `build` OK.

> Observação de método: como não há um ambiente Supabase implantado nesta sessão,
> a "simulação de centenas de cenários" foi conduzida como análise sistemática de
> caminhos de execução (entradas válidas/ inválidas/ nulas/ concorrentes/ de
> borda) por função, cruzando o código com o schema. Os caminhos do frontend
> permanecem cobertos por `tsc`/`vitest`/`build`.

---

## 1. Matriz de cenários → gaps prevenidos (corrigidos)

### `send-push-notification`
| Cenário | Antes | Depois |
|---|---|---|
| VAPID key com formato inválido | `importKey` lança → `false` → **todas** as subs deletadas | mantém subs (`failed`) |
| Push service 500/429 (transitório) | sub deletada | mantida |
| Endpoint retorna 404/410 (expirada) | deletada | deletada (correto) |
| Operador tenta broadcast | bloqueado (403) | bloqueado (403) |

### `external-db-bridge`
| Cenário | Antes | Depois |
|---|---|---|
| Operador autenticado: `delete profiles match {}` | apaga a tabela | 403 (não-admin) + 400 (match vazio) |
| Auto-promoção: `update user_roles set role=admin` | sucesso | 403 |
| Admin executa telemetria legítima | ok | ok |

### `excel-export`
| Cenário | Antes | Depois |
|---|---|---|
| Admin exporta | **403** (admin fora da lista) | ok |
| `columns: ["*, user_roles(role)"]` (exfiltração via embed) | dados vazam | 400 |
| Usuário com 2 roles | `.single()` erra → 403 | ok |
| `operator` tenta exportar | 403 | 403 |

### `send-loss-risk-alert`
| Cenário | Antes | Depois |
|---|---|---|
| 60 assinantes (>1 página de `listUsers`) | quem está na pág. 2+ não recebe | todos recebem |

### `cron-cleanup` (arquivamento)
| Cenário | Antes | Depois |
|---|---|---|
| Jobs `finished` antigos | nunca arquivava (status/coluna errados) | seleciona certo |
| Insert em `archived_jobs` falha | deletava mesmo assim (perda) | não deleta |
| Chamada sem `CRON_SECRET` (quando configurado) | executa | 401 |

### `metrics-collector`
| Cenário | Antes | Depois |
|---|---|---|
| Contar máquinas "running" | `machines.status` não existe → erro → null | máquinas com job em `production` |
| Contar operadores "active" | `profiles.status` não existe → erro → null | operadores com scan de QR hoje |
| `completedToday` | mutava `now` compartilhado | data local sem mutação |

### `webhook-handler` (Bitrix24)
| Cenário | Antes | Depois |
|---|---|---|
| Webhook recebido | insert em colunas inexistentes + status fora do CHECK → **falha 100%** | grava em `bitrix24_sync_history` (schema real) |

### `calculate-rankings`
| Cenário | Antes | Depois |
|---|---|---|
| Job sem operador mapeado | usa UUID da máquina como "operador" fantasma | ignora o job |
| Conquista já existente (0/1/duplicada) | `.single()` erra → cria duplicada | `maybeSingle()` |

### `bitrix24-sync`
| Cenário | Antes | Depois |
|---|---|---|
| Data Bitrix não parseável | `RangeError` aborta o deal | `toDateOnly` → null |
| `order_number` nulo no push | `TypeError` | `?.startsWith` |

### `tpm-notifications` / `send-tpm-email` / `auto-promote-jobs`
| Cenário | Antes | Depois |
|---|---|---|
| `schedules`/`queueItems`/`techniques` nulos | `for…of` lança | `|| []` |
| `notification_types`/`machine_filters` NULL | `TypeError` (todos os e-mails caem) | `?? []` |
| `schedule.machine` órfão | `.code` lança | `?.code` |

### `new-device-alert`
| Cenário | Antes | Depois |
|---|---|---|
| POST com `user_id`/`email` de terceiros | grava registro e dispara e-mail forjado | 401 sem JWT; identidade vem do token |

### `create-operator` / `update-operator` / `rate-limit-check`
| Cenário | Antes | Depois |
|---|---|---|
| Solicitante com 2 roles | `.single()` erra → 403 indevido | checa todas as roles |
| IP não bloqueado (0 linhas) | `.single()` gera erro | `maybeSingle()` |
| IP com linhas de bloqueio duplicadas | erro → IP liberado | `limit(1)` bloqueia |

### Hooks React (frontend)
| Hook | Cenário | Antes | Depois |
|---|---|---|---|
| `useSessionTimeout` | aviso de inatividade dispara | effect reconstrói timers → aviso some e **sessão nunca expira** | aviso persiste, logout ocorre |
| `useSessionTimeout` | logout após unmount/navegação | setState/navigate em closure stale | refs `latest` + guarda `isMounted` |
| `use-swipe-gesture` | gesto em andamento | re-vincula listeners a cada `touchmove`; direção defasada | ref vivo, sem re-bind |
| `usePushSubscription` | 1ª checagem de inscrição | no-op (lê state `isSupported` ainda false) | recalcula suporte local |
| `useEfficiencyNotifications` | dados chegam durante loading | baseline vazio → spam de alertas falsos | baseline semeado no fim do init |
| `useRealtimeConnection` | reconexão por erro de canal | vaza `RealtimeChannel` | rastreia/dispoe via ref |
| `useOperatorPresence` | unmount | `unsubscribe()` vaza registro | `removeChannel` |
| `useThrottle` | unmount com timer pendente | callback dispara pós-unmount | cleanup limpa timer |

---

## 2. Itens deixados como decisão de produto (documentados, NÃO alterados)

- **`check-login-lockout` / `validate-login-ip`** — chamados **antes** do login
  (sem JWT possível). Mitigar abuso de bloqueio de conta exige rate-limit/captcha
  no fluxo de login — decisão de produto, não corrigível sem quebrar o login.
- **`bitrix24-sync` estado global de módulo** (`needsReauthorization`,
  `mappingCache`) — compartilhado entre invocações concorrentes; corrigir exige
  refator para estado por-requisição (risco), recomendado em PR dedicado.
- **`webhook-handler` assinatura fail-open** quando não há `WEBHOOK_SECRET_*` e
  `ENFORCE_WEBHOOK_SIGNATURES !== 'true'` — mudar para fail-closed pode quebrar
  emissores existentes; requer coordenação de deploy.
- **`image-optimizer`** (retorna bytes originais) e **`pdf-generator`**
  (Content-Type `application/pdf` com texto) — stubs; requerem implementação real.

## 3. Configuração recomendada para ativar o hardening

- Definir a env **`CRON_SECRET`** no projeto e enviá-la via header
  `x-cron-secret` nos agendamentos de `metrics-collector`, `cron-cleanup`,
  `backup-scheduler` e `security-alert`. Sem ela, as funções continuam
  operando (compatível), mas sem a proteção.
- Garantir role **`admin`** para quem usa `external-db-bridge`/`excel-export`.

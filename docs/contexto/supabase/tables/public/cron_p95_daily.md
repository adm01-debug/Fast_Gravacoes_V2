# public.cron_p95_daily

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `day` | `date` | não |  |  |  |
| 3 | `jobid` | `bigint` | não |  |  |  |
| 4 | `jobname` | `text` | sim |  |  |  |
| 5 | `samples` | `integer` | não | `0` |  |  |
| 6 | `p95_ms` | `integer` | sim |  |  |  |
| 7 | `avg_ms` | `integer` | sim |  |  |  |
| 8 | `max_ms` | `integer` | sim |  |  |  |
| 9 | `failure_rate_pct` | `numeric(5,2)` | não | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_p95_daily_jobid_day_key | UNIQUE | `UNIQUE (jobid, day)` |  |  | sim |
| cron_p95_daily_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_p95_daily_jobid_day_key | btree | jobid, day | sim | sim |  | `CREATE UNIQUE INDEX cron_p95_daily_jobid_day_key ON public.cron_p95_daily USING btree (jobid, day)` |
| cron_p95_daily_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cron_p95_daily_pkey ON public.cron_p95_daily USING btree (id)` |
| idx_cron_p95_daily_day | btree | day | não | sim |  | `CREATE INDEX idx_cron_p95_daily_day ON public.cron_p95_daily USING btree (day DESC)` |


## Policies (RLS)

### `Coordenadores e gestores leem tendencia p95`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_cron_p95_daily_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_

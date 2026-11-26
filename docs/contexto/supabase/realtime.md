# Realtime

## Publications

| publication | all tables | insert | update | delete | truncate |
|---|---|---|---|---|---|
| supabase_realtime | não | sim | sim | sim | sim |
| supabase_realtime_messages_publication | não | sim | sim | sim | sim |

## Tabelas publicadas (Postgres Changes)

| publication | tabela | replica identity |
|---|---|---|
| supabase_realtime | public.blocked_ips | default |
| supabase_realtime | public.packaging_defects | default |
| supabase_realtime | public.packaging_tasks | default |
| supabase_realtime | public.push_notifications | full |
| supabase_realtime | public.security_events | default |

## Broadcast / Presence (policies em realtime.messages)

_nenhum_

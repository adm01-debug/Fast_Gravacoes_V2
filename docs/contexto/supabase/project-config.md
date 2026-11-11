# Configuração do projeto (Management API, segredos redigidos)

| campo | valor |
|---|---|
| projeto | Fast_Gravacoes_V2 |
| região | ca-central-1 |
| URL | https://uoujzvpecohinketylud.supabase.co |
| schemas expostos (PostgREST) | public,graphql_public |
| max_rows (PostgREST) | 1000 |
| extra_search_path | public, extensions |
| PITR | não |
| branches | 1 |

```json
{
  "backups_config": {
    "pitr_enabled": false,
    "region": "ca-central-1",
    "walg_enabled": true
  },
  "branches": [
    {
      "git_branch": "main",
      "id": "3aca952e-8da7-4573-ba07-1d22e00b0772",
      "is_default": true,
      "name": "main",
      "persistent": false,
      "status": "FUNCTIONS_DEPLOYED"
    }
  ],
  "custom_hostname": null,
  "network_restrictions": {
    "config": {
      "dbAllowedCidrs": [
        "0.0.0.0/0"
      ],
      "dbAllowedCidrsV6": [
        "::/0"
      ]
    },
    "entitlement": "allowed",
    "status": "applied"
  },
  "pooler_config": [
    {
      "connectionString": "postgresql://postgres.uoujzvpecohinketylud:[REDACTED]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres",
      "connection_string": "[REDACTED]",
      "database_type": "PRIMARY",
      "db_host": "aws-0-ca-central-1.pooler.supabase.com",
      "db_name": "postgres",
      "db_port": 6543,
      "db_user": "postgres.uoujzvpecohinketylud",
      "default_pool_size": null,
      "identifier": "uoujzvpecohinketylud",
      "is_using_scram_auth": true,
      "max_client_conn": null,
      "pool_mode": "transaction"
    }
  ],
  "postgres_config": {},
  "postgrest_config": {
    "db_extra_search_path": "public, extensions",
    "db_pool": null,
    "db_pool_acquisition_timeout": 10,
    "db_pool_max_idletime": 30,
    "db_pool_max_lifetime": 1800,
    "db_schema": "public,graphql_public",
    "jwt_secret": "[REDACTED]",
    "max_rows": 1000
  },
  "project": {
    "created_at": "2026-08-01T06:46:48.336957Z",
    "id": "uoujzvpecohinketylud",
    "name": "Fast_Gravacoes_V2",
    "organization_id": "ociubxjrvookukkejdfm",
    "region": "ca-central-1",
    "status": "ACTIVE_HEALTHY"
  },
  "ssl_enforcement": null,
  "url": "https://uoujzvpecohinketylud.supabase.co"
}
```

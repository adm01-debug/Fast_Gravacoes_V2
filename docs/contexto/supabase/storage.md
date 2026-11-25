# Storage

Policies de `storage.objects`/`storage.buckets` em `policies.md`. Contagens em `stats.md`.

| bucket | público | limite por arquivo | mime permitidos | criado em |
|---|---|---|---|---|
| execution-evidence | não |  |  | 2026-11-21 17:38:11.086452+00:00 |
| production-photos | não |  |  | 2026-11-21 17:38:10.093416+00:00 |
| technical-documents | não |  |  | 2026-11-21 17:38:10.474777+00:00 |
| tpm-evidences | não |  |  | 2026-11-21 17:38:10.777930+00:00 |

## Configuração (Management API)

```json
{
  "capabilities": {
    "iceberg_catalog": true,
    "list_v2": true,
    "object_versioning": false
  },
  "external": {
    "upstreamTarget": "canary"
  },
  "features": {
    "icebergCatalog": {
      "enabled": false,
      "maxCatalogs": 2,
      "maxNamespaces": 10,
      "maxTables": 10
    },
    "imageTransformation": {
      "enabled": false
    },
    "purgeCache": {
      "enabled": false
    },
    "s3Protocol": {
      "enabled": true
    },
    "vectorBuckets": {
      "enabled": false,
      "maxBuckets": 10,
      "maxIndexes": 5
    }
  },
  "fileSizeLimit": 52428800,
  "migrationVersion": "s3-multipart-uploads-parts-index"
}
```

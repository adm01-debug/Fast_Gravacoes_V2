# Storage

Policies de `storage.objects`/`storage.buckets` em `policies.md`. Contagens em `stats.md`.

_nenhum_

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
  "migrationVersion": "revoke-extra-lifecycle-postgres-grants"
}
```

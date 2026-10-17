---
source: src/modules/api-keys/response-schemas.ts
sha256: f1542f43dde6db1733fda04648c71b6ccea09df4fb8a775f1f78f335d2b6a9d8
generated_at: 2026-10-17T00:31:43.848299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/response-schemas.ts

## Purpose

Defines the response-envelope schema contract for all `api-keys` module endpoints. It produces a typed list of `ResponseSchemaRoute` rows that, once registered via the module manifest, turn on HTTP response validation for this domain.

## Key elements

- **`apiKeysResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — Built by calling `routesForModules(schemas, ['api-keys'])`. This is the sole export; it supplies the contract-validation rows that the generated route table (`contracts/rest/routes.ts`, derived from `openapi.yaml` `x-module` stamps) attributes to the `api-keys` backend module.

## Notes

- The file is a thin adapter: it contains no logic beyond the single `routesForModules` call. All schema definitions live in `@api/schemas`; all routing/mapping logic lives in `@/infrastructure/http/response-schema-map`.
- Enabling or disabling this domain is handled by the module manifest (registering / removing this file's export), not by any conditional inside the file itself.
- Deleting the `src/modules/api-keys/` folder removes this contract from validation with no other code changes required.

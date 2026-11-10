---
source: src/modules/products/response-schemas.ts
sha256: 534b95ee0ba74db94dec4b65f230cfc7ac7fcb5c4c4045050855c21c1ee2ba3d
signature: 2e3fc844c81052bb385b8ed904a109a3896125eb664c1b779e82354aa19238a9
generated_at: 2026-11-10T05:21:33.050827+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every REST endpoint attributed to the `products` module. These rows feed the central response-schema map so that, when the products domain is enabled, contract validation is applied to its endpoints automatically.

## Key elements

- **`productsResponseSchemas`** (exported const, typed `ResponseSchemaRoute[]`) — Built by calling `routesForModules(schemas, ['products'])`. Filters the shared `@api/schemas` registry down to only the routes stamped with the `products` module tag (via `openapi.yaml` `x-module`). This is the sole export of the file.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — The helper that selects schema rows for a given list of module names.
- **`ResponseSchemaRoute`** (imported type from the same module) — Describes a single route's expected response envelope (status codes, content-type, schema reference).

## Relationships

No direct graph neighbors are recorded for this file. It is a leaf consumer: it imports from `@/infrastructure/http/response-schema-map` and `@api/schemas` but nothing else imports it. Its effect is indirect — it is picked up by the module-manifest mechanism, which registers the array with the global response-schema map.

## Notes

- **Enable/disable by presence:** The file is wired through the module manifest. Deleting the `src/modules/products/` folder (or disabling the domain) removes these rows from the schema map without touching the map code itself.
- **Generation upstream:** The route list ultimately originates from `contracts/rest/routes.ts`, which is generated from `openapi.yaml` `x-module` annotations. If a new products endpoint appears in the OpenAPI spec, a regeneration of that contract file is what brings the row into scope here — no manual list edit in this file is expected.
- **Single-responsibility file:** This module intentionally contains no logic beyond the one-line `routesForModules` call. Validation rules live in `@api/schemas` and the map infrastructure; editing this file only changes *which* module's rows are included.

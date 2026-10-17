---
source: src/modules/account/response-schemas.ts
sha256: 558cce952fbc8dd434dc15960d32060c1dbca1f23be5fc736ebd8b1e3a745853
generated_at: 2026-10-17T00:18:07.178823+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/response-schemas.ts

## Purpose

Declares the response-envelope schema rows for every REST endpoint the **account** and **addresses** domains call. It registers those rows so that enabling the account domain in the module manifest activates OpenAPI contract validation for those responses, and deleting the folder disables it. The `addresses` module has no frontend of its own; its address-book screens live in this account module.

## Key elements

- **`accountResponseSchemas: ResponseSchemaRoute[]`** — The single export. Built by calling `routesForModules(schemas, ['account', 'addresses'])`, which filters the full OpenAPI-derived schema table (generated into `contracts/rest/routes.ts` from `openapi.yaml` `x-module` stamps) down to the two modules this file covers.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — The function that performs the module-filtering; lives in the shared infrastructure layer, not here.
- **`@api/schemas`** — The generated schema definitions passed as the first argument to `routesForModules`.

## Relationships

- Consumed by the module manifest (referenced in the docblock), which is the toggle that turns contract validation on/off for these endpoints.
- Depends on `@/infrastructure/http/response-schema-map` for `routesForModules` and the `ResponseSchemaRoute` type.
- The session/boot-path calls intentionally excluded from this file are tracked separately in `response-schema-map.ts` under `SESSION_AND_BOOT_SCHEMA_NAMES`.

## Notes

- Session and boot-path schema rows are **not** included here; they live in `infrastructure/session.ts` and are explicitly excluded via `SESSION_AND_BOOT_SCHEMA_NAMES` in the map module. Don't add them to this array.
- The `addresses` module has no standalone frontend module; its UI screens are co-located under account. Any new address-book endpoint will need its `x-module` stamp set to `addresses` in `openapi.yaml` to appear in this file automatically.

---
source: src/modules/returns/response-schemas.ts
sha256: 5942844a80fe15f6aca4e13b4ad516932a86d195e47c408546a0b3f47f650371
generated_at: 2026-10-17T01:37:37.434060+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every REST endpoint attributed to the `returns` domain. It exists as a thin registration point: by exposing a `ResponseSchemaRoute[]` constant, it lets the module-manifest mechanism enable or disable contract validation for all `returns` routes simply by including or removing this file.

## Key elements

- **`returnsResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['returns'])`, which filters the shared schema map (`@api/schemas`) down to rows whose `x-module` stamp matches `'returns'`. The resulting array is consumed by the module manifest to register per-route response validation.

## Relationships

No graph neighbors are recorded for this file. It is a leaf export: it imports from `@/infrastructure/http/response-schema-map` (for the `routesForModules` helper and the `ResponseSchemaRoute` type) and from `@api/schemas` (the generated schema registry), but no other module in the graph is listed as depending on it directly.

## Notes

- The docblock references `contracts/rest/routes.ts` (generated from `openapi.yaml`) and the two rules every `ResponseSchemaRoute` row must obey, but those rules are defined on the type's own docblock in `response-schema-map`, not here.
- Enabling/disabling the domain is purely file-presence based: add the folder → validation on; delete it → validation off. There is no runtime toggle.
- The `['returns']` string literal is the coupling point to `openapi.yaml`'s `x-module` stamps; renaming the module in the OpenAPI spec without updating this literal will silently produce an empty array.

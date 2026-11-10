---
source: src/modules/cart/response-schemas.ts
sha256: 72deb221bf45ec7b1c369e565334299bc107ae96d610255acb4dc972089cde57
signature: 083ed4a5cb2f55fbebf6523bfa4f6466cdd9e9174827e320e9090c055823b9d3
generated_at: 2026-11-10T03:59:28.394165+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/response-schemas.ts

## Purpose

Exports the response-envelope schemas for every REST endpoint the `cart` domain calls. The list is generated declaratively from a shared schema registry filtered to the `'cart'` module, so the file itself contains no hand-written route definitions. It plugs into the module-manifest system: creating the folder enables contract validation for cart responses; deleting it disables it.

## Key elements

- **`cartResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['cart'])`, which selects only the schema rows tagged with the `cart` module (stamped via `x-module` in `openapi.yaml`).

## Relationships

No graph neighbors are recorded for this file. It depends on `@api/schemas` and `@/infrastructure/http/response-schema-map` at import time, but neither appears in the dependency-graph index.

## Notes

- The file is a pure data export with no runtime logic; all behavior lives in `routesForModules` and the schema definitions in `@api/schemas`.
- The two rules every row must obey are documented in the `ResponseSchemaRoute` type's own docblock (in `@/infrastructure/http/response-schema-map`), not here.
- The generated operations table (`contracts/rest/routes.ts`) is the source of truth for which operations belong to `cart`; this file merely projects that table into typed schema rows.

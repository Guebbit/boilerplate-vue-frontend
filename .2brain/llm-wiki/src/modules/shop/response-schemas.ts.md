---
source: src/modules/shop/response-schemas.ts
sha256: d4a43b637165243416fbe7597115696f9e76d5fed4457af9f77fa368167780f4
signature: 3413a54f6a4cfb293274f15c5ce2c630427584255cae5f8d22523f5c7cc8ece6
generated_at: 2026-11-10T05:44:49.588719+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop/response-schemas.ts

## Purpose

Registers the response-envelope schema for the shop module's single endpoint (`GET /shop`). It plugs the shop's response validation into the global response-schema map so that responses are validated against the OpenAPI-derived schemas, with the module tag `"shop"` as the selector.

## Key elements

- **`shopResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['shop'])`, which filters the full API schema set down to routes stamped with `x-module: shop`. Consumed by the module-manifest registration layer to activate response validation for the shop backend.

## Relationships

No graph neighbors are recorded for this file. It imports `@api/schemas` (the schema collection) and `@/infrastructure/http/response-schema-map` (the `routesForModules` helper and the `ResponseSchemaRoute` type), but those files do not list this file as a neighbor in the dependency graph.

## Notes

- The module docblock states that **deleting this folder disables shop response validation entirely** — registration is purely by presence, not by an explicit toggle elsewhere.
- The module is intentionally minimal: exactly one operation (`GET /shop`) is attributed to the `shop` backend tag in `openapi.yaml` via `x-module` stamps (referenced in `contracts/rest/routes.ts`).
- This file contains no logic of its own; it is a one-line binding between the shared schema registry and the shop module tag.

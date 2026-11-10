---
source: src/modules/shop-tasks/response-schemas.ts
sha256: 0a8f8b3c6e491b53f1b946e02ae2c32cc8018c4595c13c686de9f42f125b644f
signature: 883e36d3c4b062245dcb27e4cc77a0227d6188fda3e5d340a0ead619d9215e4b
generated_at: 2026-11-10T05:43:11.115828+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/response-schemas.ts

## Purpose

Exports the complete list of response-envelope schema routes for every `shop-tasks` backend endpoint. It is a thin, generated-consumption wrapper: the actual rows are produced by `routesForModules` filtering the shared `@api/schemas` catalog by the `x-module` stamp, so this file only selects the subset that belongs to the `shop-tasks` module.

## Key elements

- **`shopTasksResponseSchemas`** (exported, `ResponseSchemaRoute[]`) — The sole export. Built by calling `routesForModules(schemas, ['shop-tasks'])`; contains one row per endpoint attributed to the `shop-tasks` module.

## Relationships

No graph neighbors are tracked for this file. Its direct imports are:

- `@api/schemas` — the shared schema catalog passed into `routesForModules`.
- `@/infrastructure/http/response-schema-map` — provides the `routesForModules` filtering helper and the `ResponseSchemaRoute` row type.

## Notes

- The module docblock points to `ResponseSchemaRoute`'s own docblock as the authority for "the two rules every row obeys" — check that type before assuming row shape.
- This file is intentionally inert: no business logic lives here. If a `shop-tasks` endpoint is missing from `shopTasksResponseSchemas`, the gap is upstream in the schema catalog or the generation step, not in this file.

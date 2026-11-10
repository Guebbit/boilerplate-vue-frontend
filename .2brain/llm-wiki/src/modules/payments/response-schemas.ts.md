---
source: src/modules/payments/response-schemas.ts
sha256: 8b0d92b480cd4ffe67676694b463e87d63d4db2a11f7caebb3d6f44f5d8dec95
signature: f8e9613348887b097b3f5586367e551dd97a7739b1f9c5c0cb32d17785f7abf8
generated_at: 2026-11-10T05:12:36.932942+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every backend `payments` endpoint so the module manifest can register (or unregister) contract validation for the payments domain. The rows are derived from `openapi.yaml` `x-module` stamps and surfaced through the generated table in `contracts/rest/routes.ts`.

## Key elements

- **`paymentsResponseSchemas`** (`ResponseSchemaRoute[]`) — the single export. Built by calling `routesForModules(schemas, ['payments'])`; it yields the set of response-envelope route rows that the payments module owns.

## Relationships

No graph neighbors are recorded for this file. It does import `@api/schemas` (the schema definitions) and `@/infrastructure/http/response-schema-map` (the `routesForModules` helper and `ResponseSchemaRoute` type), but neither appears in the dependency-graph neighbor list.

## Notes

- The file is intentionally minimal: deleting the folder (or the module manifest entry) turns off contract validation for payments without touching any other module. Enabling the domain flips it back on.
- The "two rules every row obeys" are documented in `ResponseSchemaRoute`'s own docblock, not here—consult that type if row-shape questions arise.
- Route rows are *generated* from `openapi.yaml`; editing this file by hand is not the intended workflow.

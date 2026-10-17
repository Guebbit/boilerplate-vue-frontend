---
source: src/modules/notifications/response-schemas.ts
sha256: a810cc16fc49aa1c0d9640afdefcb10f7e31f592e7b05180d4b0f7270b2991db
generated_at: 2026-10-17T01:08:59.852622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/response-schemas.ts

## Purpose

Provides the response-schema route definitions for every `notifications` endpoint, enabling per-module contract validation. The rows are derived from the OpenAPI-generated table in `contracts/rest/routes.ts` (sourced from `openapi.yaml` `x-module` stamps) and filtered to the `notifications` module.

## Key elements

- **`notificationsResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['notifications'])`, producing an array of response-envelope schemas for all endpoints this module calls. Registered via the module manifest: enabling the domain turns contract validation on; deleting the folder turns it off.

## Relationships

No graph-neighbor files are recorded. The module imports `routesForModules` and the `ResponseSchemaRoute` type from `@/infrastructure/http/response-schema-map`, and the shared `schemas` namespace from `@api/schemas`.

## Notes

- `ResponseSchemaRoute`'s own docblock defines two invariants every row must satisfy (referenced but not restated here).
- This file is intentionally thin — all schema content lives in `@api/schemas`; the only logic here is the module filter (`['notifications']`).

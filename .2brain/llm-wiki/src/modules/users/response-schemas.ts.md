---
source: src/modules/users/response-schemas.ts
sha256: c62cad0ef725b7bcebd097eff08a44302e9fddcf7ce4055ca82c21fb2fc95f0e
signature: 478b17c45342bcb5956c84269d88808fc9c93413fcb200cb2b8863d93eb6d4d8
generated_at: 2026-11-10T06:04:37.898174+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/response-schemas.ts

## Purpose

Exposes the response-envelope schemas for every HTTP endpoint attributed to the `users` backend domain. It exists so that contract validation can be toggled on/off per domain by simply including or removing this module folder.

## Key elements

- **`usersResponseSchemas`** (exported constant, type `ResponseSchemaRoute[]`) — The full list of response-schema route rows for the `users` domain. Built by calling `routesForModules(schemas, ['users'])`, which filters the shared `@api/schemas` registry down to routes stamped with the `users` module.

## Relationships

No graph neighbors are recorded for this file. It is a leaf: it only imports (`@api/schemas`, `@/infrastructure/http/response-schema-map`) and is expected to be consumed by the module-manifest registration path described in its docblock.

## Notes

- The set of routes is **generated**, not hand-maintained. It derives from `openapi.yaml` `x-module` stamps processed into `contracts/rest/routes.ts`; editing the YAML (or the `users` stamp on an operation) is what changes what appears here.
- Domain activation is file-presence-driven: deleting `src/modules/users/` removes these schemas from validation, and restoring the folder re-enables them. There is no runtime flag.
- `ResponseSchemaRoute`'s own docblock (in `response-schema-map.ts`) defines the invariants every row must satisfy; this file does not repeat them.

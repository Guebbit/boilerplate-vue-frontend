---
source: src/modules/users/response-schemas.ts
sha256: c62cad0ef725b7bcebd097eff08a44302e9fddcf7ce4055ca82c21fb2fc95f0e
generated_at: 2026-10-17T01:46:20.750815+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/response-schemas.ts

## Purpose

Declares the response-envelope schema list for the `users` domain. It plugs into the module-manifest pattern so that contract validation for users endpoints activates when the domain folder is present and is removed when it is deleted—no manual registration elsewhere.

## Key elements

- **`usersResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — The single export. Built by calling `routesForModules(schemas, ['users'])`, which selects every schema row in the central registry that is stamped to the `users` module.

## Relationships

No graph neighbors were detected. The file imports two external modules:

- `@api/schemas` — the central schema registry whose rows are filtered to produce this list.
- `@/infrastructure/http/response-schema-map` — provides the `routesForModules` helper and the `ResponseSchemaRoute` type.

## Notes

- The module docblock references a **generated table** in `contracts/rest/routes.ts`, derived from `openapi.yaml`'s `x-module` stamps. The rows here should stay consistent with that generated output; discrepancies indicate a stale generation.
- The two rules every row must obey are documented in `ResponseSchemaRoute`'s own docblock (not repeated here).
- Because activation is purely folder-presence, there is no feature-flag or config toggle to search for when debugging why users validation is (or isn't) running.

---
source: src/modules/payments/response-schemas.ts
sha256: 8b0d92b480cd4ffe67676694b463e87d63d4db2a11f7caebb3d6f44f5d8dec95
generated_at: 2026-10-17T01:23:39.022636+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/response-schemas.ts

## Purpose
Declares the response-envelope schema rows for every `payments`-tagged REST endpoint (as stamped via `x-module` in `openapi.yaml`). Registering these rows through the module manifest activates contract validation for the payments domain; removing the folder disables it.

## Key elements
- **`paymentsResponseSchemas`** (`ResponseSchemaRoute[]`) — The single export. Built by calling `routesForModules(schemas, ['payments'])`, which pulls the matching route definitions from the shared `@api/schemas` namespace and wraps them in the `ResponseSchemaRoute` structure.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — The helper that filters/reshapes the generic schema table into per-module route entries.
- **`schemas`** (imported from `@api/schemas`) — The OpenAPI-derived schema definitions consumed by `routesForModules`.

## Relationships
No graph neighbors are recorded for this file. It is a leaf consumer: it imports from `@/infrastructure/http/response-schema-map` and `@api/schemas` but nothing in the tracked graph imports from it (registration is presumably wired through a module-manifest mechanism outside this dependency edge).

## Notes
- The file itself contains no logic beyond a single `const` assignment; all behavior lives in `routesForModules` and the upstream schema definitions.
- The module docblock references two rules every `ResponseSchemaRoute` row must obey, but those rules are defined in the `ResponseSchemaRoute` type's own docblock (in `response-schema-map`), not here.
- Enabling/disabling the payments contract validation is a file-presence concern: the folder's existence (or its absence) is the toggle, not a config flag.

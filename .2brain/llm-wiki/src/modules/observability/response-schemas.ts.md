---
source: src/modules/observability/response-schemas.ts
sha256: f1868061573557d2d88e4164a8fa5527a87fe41743f3b6ae0596c783a4d36808
generated_at: 2026-10-17T01:11:33.459300+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every admin endpoint the **observability** module calls. It is the module-specific row set that the generated table in `contracts/rest/routes.ts` (derived from `openapi.yaml` `x-module` stamps) attributes to this domain.

## Key elements

- **`adminResponseSchemas`** (exported, type `ResponseSchemaRoute[]`) — Built by calling `routesForModules(schemas, ['observability'])`. Returns the full list of response-schema routes that belong to the observability module. Registered through the module manifest so that enabling the domain activates contract validation and deleting the folder deactivates it.

## Relationships

No direct graph neighbors are recorded for this file. It consumes two upstream modules (`@api/schemas` and `@/infrastructure/http/response-schema-map`) and is itself consumed by the generated route table in `contracts/rest/routes.ts`.

## Notes

- The two rules every row must obey are documented in the `ResponseSchemaRoute` type's own docblock (in `response-schema-map`), not here.
- Because registration is purely file-presence-driven (module manifest), there is no central registry to update when adding or removing observability endpoints—just edit or delete this file.

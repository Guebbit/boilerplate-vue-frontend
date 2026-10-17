---
source: src/modules/inventory/response-schemas.ts
sha256: 16dd0e37d7675832c8280afed5f3507f0a778f7ba1af1b9669cfadadaab2790e
generated_at: 2026-10-17T00:59:11.991430+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every REST endpoint attributed to the `inventory` backend module. It is the per-module slice of the global response-schema table that `contracts/rest/routes.ts` (generated from `openapi.yaml`'s `x-module` stamps) assembles across all domains.

## Key elements

- **`inventoryResponseSchemas: ResponseSchemaRoute[]`** — The single export. Built by calling `routesForModules(schemas, ['inventory'])`, which filters the shared `@api/schemas` catalog down to the routes stamped with the `inventory` module tag and returns them as `ResponseSchemaRoute` entries.

## Relationships

No graph neighbors are recorded for this file. Its runtime dependencies (`@api/schemas`, `@/infrastructure/http/response-schema-map`) are pulled in but do not appear in the dependency graph. The generated table in `contracts/rest/routes.ts` is the *consumer* of this export; this file is the *producer*.

## Notes

- The export is registered through the module manifest, so contract validation for inventory routes is toggled by the folder's presence or absence in the module registry — there is no separate flag or config entry.
- The file is intentionally thin: all schema definitions live in `@api/schemas`; this file only selects the `inventory`-tagged subset. Adding or removing an endpoint requires no change here.

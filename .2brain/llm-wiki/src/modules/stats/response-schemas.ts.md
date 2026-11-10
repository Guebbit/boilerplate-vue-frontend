---
source: src/modules/stats/response-schemas.ts
sha256: 50c693d1f57f7949aa731a16b96d789d250c7708b925dbe025204e8f8a7caa1f
signature: 04ec843c443f2c940220437cc6d24a9e038ec89a5c20821d4ccef8177cd0100d
generated_at: 2026-11-10T05:49:22.284741+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/response-schemas.ts

## Purpose

Declares the response-schema validation rows for every REST endpoint the backend `stats` domain is responsible for. It plugs into the module-manifest system so that enabling or removing the `stats` folder automatically toggles contract validation for those routes.

## Key elements

- **`statsResponseSchemas: ResponseSchemaRoute[]`** — The single export. Produced by calling `routesForModules(schemas, ['stats'])`, which filters the shared API schema registry to only the routes stamped with the `stats` module tag (originating from `openapi.yaml`'s `x-module` metadata).

## Relationships

No graph neighbors are recorded for this file. It is a leaf consumer: it imports `routesForModules` / `ResponseSchemaRoute` from `@/infrastructure/http/response-schema-map` and the schema definitions from `@api/schemas`, but no other file in the dependency graph is listed as depending on it directly.

## Notes

- The file exports exactly one value; there are no functions or classes. All logic lives in the `routesForModules` helper.
- Validation is toggled by file-system presence (folder enable/disable), not by a feature-flag or config entry. Deleting the folder removes the stats contract checks entirely.
- The two rules every `ResponseSchemaRoute` row must satisfy are documented in the `ResponseSchemaRoute` type's docblock (in `response-schema-map`), not here.

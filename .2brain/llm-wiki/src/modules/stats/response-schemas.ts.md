---
source: src/modules/stats/response-schemas.ts
sha256: 50c693d1f57f7949aa731a16b96d789d250c7708b925dbe025204e8f8a7caa1f
generated_at: 2026-10-17T01:42:27.986708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/response-schemas.ts

## Purpose

Declares the response-schema rows for every stats-domain REST endpoint. It exists so that enabling the `stats` module (via the module manifest) automatically turns on contract validation for its routes, and deleting the folder disables it—no manual wiring in a central registry required.

## Key elements

- **`statsResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Built by calling `routesForModules(schemas, ['stats'])`, which filters the shared `@api/schemas` catalogue down to routes stamped `x-module: stats` in the generated `contracts/rest/routes.ts` (derived from `openapi.yaml`). The resulting array is registered through the module manifest for runtime contract validation.

## Relationships

No graph neighbors are recorded for this file. Its two imports (`@api/schemas`, `@/infrastructure/http/response-schema-map`) are its only upstream dependencies; it is consumed downstream by whatever manifest or bootstrap code imports the `statsResponseSchemas` constant.

## Notes

- The file is intentionally one-liner logic. Any schema changes belong in `openapi.yaml` / `@api/schemas`, not here.
- The two rules every `ResponseSchemaRoute` row must obey are documented in the `ResponseSchemaRoute` type's own docblock in `response-schema-map.ts`, not in this file.
- Enabling/disabling is purely folder-presence: the manifest scans for this file. There is no feature-flag or env-var gate.

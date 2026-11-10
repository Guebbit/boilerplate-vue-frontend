---
source: src/modules/observability/response-schemas.ts
sha256: f1868061573557d2d88e4164a8fa5527a87fe41743f3b6ae0596c783a4d36808
signature: 61efb6f083d3b24699470a776ada5444afe9c78ebcc87110fa851d120a5a8b7d
generated_at: 2026-11-10T04:52:19.665943+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every admin endpoint attributed to the **observability** module. It is the per-module glue that registers those schemas into the global response-schema map, so contract validation for observability endpoints can be toggled by simply enabling or deleting this module folder.

## Key elements

- **`adminResponseSchemas: ResponseSchemaRoute[]`** — The single export. Built by calling `routesForModules(schemas, ['observability'])`, which filters the shared `@api/schemas` namespace down to only the routes stamped with the `observability` `x-module` tag (defined in `openapi.yaml`). The resulting array is registered through the module manifest.

## Relationships

No graph neighbors are recorded. The file imports from two infrastructure locations (`@api/schemas` and `@/infrastructure/http/response-schema-map`) but neither appears as a tracked neighbor in the dependency graph.

## Notes

- The set of rows is **derived, not hand-written**: it is whatever `routesForModules` returns for the `'observability'` module stamp. Adding or removing a route means changing the `x-module` tag in `openapi.yaml`, not editing this file.
- Enabling the domain (module manifest) turns contract validation on; deleting this folder turns it off. There is no runtime flag or feature-flag in this file itself.
- The generated table that consumes these rows lives in `contracts/rest/routes.ts` (generated from `openapi.yaml`); this file is the *registration* side, not the *definition* side.

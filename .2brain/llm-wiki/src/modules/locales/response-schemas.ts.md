---
source: src/modules/locales/response-schemas.ts
sha256: 7adefecd255c0629435a92365aff9aebec8a9cd6cec26d2e5710d7911a890283
signature: 24149c9225d60ba0267ba4b4c31e0744de30f194675ac34b556c96277676980e
generated_at: 2026-11-10T04:40:55.009706+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/response-schemas.ts

## Purpose

Declares the response-envelope schema registry for every HTTP endpoint the `locales` module consumes. It plugs the module into the shared response-schema-map system so that contract validation activates (or deactivates) automatically with the domain's manifest entry.

## Key elements

- **`localesResponseSchemas: ResponseSchemaRoute[]`** — the sole export. Built by calling `routesForModules(schemas, ['locales'])`, which filters the full schema catalogue down to the routes stamped with `x-module: locales` in `openapi.yaml` and pairs each with its response-envelope shape from `@api/schemas`.

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf node: it imports `routesForModules` and the `ResponseSchemaRoute` type from `@/infrastructure/http/response-schema-map` and the schema namespace from `@api/schemas`, but no other tracked file depends on it by name.

## Notes

- **Boot-path reads are excluded.** Four schema reads used during i18n bootstrap are intentionally *not* in this list; they are carved out upstream via `SESSION_AND_BOOT_SCHEMA_NAMES` in `response-schema-map.ts`. Do not add them here.
- **Manifest-driven.** Because the array is registered through the module manifest, simply deleting this file (or the folder) disables locales contract validation without touching any central config.
- **Source of truth is `openapi.yaml`.** The set of routes this array covers is generated from the `x-module` tags; if a route is missing, check the OpenAPI spec rather than this file.

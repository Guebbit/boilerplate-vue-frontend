---
source: src/modules/example/response-schemas.ts
sha256: d734186ca9bf2eb5e3064febfeaa112fd38e731817832fe89964c87417a6a87c
generated_at: 2026-10-17T00:51:19.446296+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every endpoint the `example` backend module calls. The rows are derived from the generated route table in `contracts/rest/routes.ts` (sourced from `openapi.yaml`'s `x-module` stamps) and registered via the module manifest so that contract validation activates automatically when the `example` domain is enabled.

## Key elements

- **`exampleResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Produced by calling `routesForModules(schemas, ['example'])`, which filters the shared schema set (`@api/schemas`) down to routes stamped for the `example` module.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — Builds the typed `ResponseSchemaRoute[]` from a namespace of schemas and a list of module names.
- **`ResponseSchemaRoute`** (type, same module) — The row shape every entry in the array conforms to.

## Relationships

No graph-neighbor files are recorded. The only interactions visible in this file are the two imports listed above (`@api/schemas` and `@/infrastructure/http/response-schema-map`), which feed the single export.

## Notes

- The file is intentionally tiny: adding or removing a row here is not done manually. Rows are generated upstream from `openapi.yaml` and the module-manifest registration. Editing the array directly would be overwritten.
- Deleting the `example` folder (and thus this file) turns contract validation off for that domain; no further cleanup is required.
- The two rules every `ResponseSchemaRoute` row obeys are documented in `ResponseSchemaRoute`'s own docblock in `response-schema-map`, not here.

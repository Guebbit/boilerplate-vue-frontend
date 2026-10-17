---
source: src/modules/webhooks/response-schemas.ts
sha256: 030a15d0e82118425010ab5b4c99cf37e1d668b04d3a70f2534ee9c76c970f47
generated_at: 2026-10-17T01:50:40.786593+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/response-schemas.ts

## Purpose

Declares the response-envelope schema rows for every HTTP endpoint attributed to the `webhooks` module. It plugs into a manifest-based registration pattern so that contract validation for webhooks routes is enabled simply by this file existing and disabled by deleting the folder.

## Key elements

- **`webhooksResponseSchemas`** (exported `ResponseSchemaRoute[]`) — The single export. Built by calling `routesForModules(schemas, ['webhooks'])`, which selects every schema in `@api/schemas` whose OpenAPI `x-module` stamp is `"webhooks"` and wraps each as a `ResponseSchemaRoute`. The resulting array is consumed by downstream response-validation infrastructure.
- **`schemas`** (import from `@api/schemas`) — The shared, generated schema registry that `routesForModules` filters.
- **`routesForModules`** (import from `@/infrastructure/http/response-schema-map`) — Helper that turns a list of module tags into `ResponseSchemaRoute[]`.
- **`ResponseSchemaRoute`** (type import) — Describes one route's expected response envelope; its docblock defines the two invariants every row in this array must satisfy.

## Relationships

No graph-neighbor files are recorded. At runtime the array is consumed wherever the module-manifest system collects all `ResponseSchemaRoute[]` exports, and the schemas it references originate from the `@api/schemas` package (itself generated from `openapi.yaml`).

## Notes

- The file is intentionally one-liner: all logic lives in `routesForModules`. Editing this file is almost always a no-op unless the module tag changes.
- Enabling/disabling webhooks contract validation is a *filesystem* operation (create or delete `src/modules/webhooks/`), not a config flag.
- The generated route table (`contracts/rest/routes.ts`) is derived from `openapi.yaml` `x-module` stamps; if a new webhooks endpoint appears there but the schema is missing from `@api/schemas`, this array will simply omit it.

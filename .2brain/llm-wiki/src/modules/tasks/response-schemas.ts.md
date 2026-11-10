---
source: src/modules/tasks/response-schemas.ts
sha256: b3a67e8611c927f30e15a3e293188b926b8edb67b9ba01581fb334816388e59d
signature: 3f8b3c4e9ae9ba47ae7333422938a47cc513bd5a13dc82d151d2a7a126a66bdf
generated_at: 2026-11-10T05:56:45.597688+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every REST endpoint attributed to the `tasks` backend domain. The rows are consumed by the generated route table (`contracts/rest/routes.ts`, derived from `openapi.yaml` `x-module` stamps) and enable contract validation on the wire whenever the `tasks` module is active.

## Key elements

- **`tasksResponseSchemas: ResponseSchemaRoute[]`** – The single export. Built by calling `routesForModules(schemas, ['tasks'])`, which selects from the shared schema registry only the routes stamped for the `tasks` module. No individual route objects are defined here; all shape knowledge lives in `@api/schemas`.

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf module: it imports from `@api/schemas` and `@/infrastructure/http/response-schema-map` and is imported (per the docblock) by the module-manifest registration system, but no other file in the graph is currently linked.

## Notes

- **Toggle-by-folder**: Enabling or disabling contract validation for `tasks` is a matter of including or deleting this module's folder from the manifest—there is no flag to flip.
- **No local route definitions**: This file never constructs a `ResponseSchemaRoute` by hand; every row is resolved from the shared `@api/schemas` registry. If a route appears missing, the gap is in the schema package or the `openapi.yaml` stamping, not here.
- **`ResponseSchemaRoute` contract**: The two rules every row must obey are documented in `ResponseSchemaRoute`'s own docblock (in `response-schema-map`), not in this file.

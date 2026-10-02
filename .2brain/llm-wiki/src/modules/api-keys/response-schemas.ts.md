---
source: src/modules/api-keys/response-schemas.ts
sha256: 6bc8a0f2a335bf908f903b44403799ce7fb2ef72a1cabd46a6d3dc74d96ad112
generated_at: 2026-10-02T12:40:44.354579+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/response-schemas.ts

## Purpose

Declares the response-envelope schema registrations for every `api-keys` endpoint. It feeds the shared response-schema validation pipeline so that, when the `api-keys` domain is enabled, all calls made by that module are contract-checked against the schemas defined in `@api/schemas`.

## Key elements

- **`apiKeysResponseSchemas: ResponseSchemaRoute[]`** – The sole export. Built by calling `routesForModules(schemas, ['api-keys'])`, which selects from the full schema table every route stamped with the `api-keys` module (per `openapi.yaml`'s `x-module` attribute in `contracts/rest/routes.ts`). Each row in the array follows the two rules documented on `ResponseSchemaRoute`.

## Relationships

No graph neighbors are recorded for this file. It consumes `@api/schemas` (the schema catalog) and `@/infrastructure/http/response-schema-map` (the routing/selection helper + `ResponseSchemaRoute` type), and is in turn consumed by the module-manifest registration system that activates or deactivates contract validation for the `api-keys` domain.

## Notes

- **Enable/disable is structural:** registering through the module manifest means that turning the domain on activates validation and deleting the `src/modules/api-keys/` folder removes it—no separate config flag is needed.
- **Generated provenance:** the rows ultimately originate from `openapi.yaml`; this file is a thin per-module slice of a larger generated table, not a hand-maintained list of routes.

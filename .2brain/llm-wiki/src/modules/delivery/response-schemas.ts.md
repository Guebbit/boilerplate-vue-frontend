---
source: src/modules/delivery/response-schemas.ts
sha256: 6a8cefe20eeda9ea5ef2f7a8327f8af41a63c5aaecd60b3fb447ff37655fd218
generated_at: 2026-10-17T00:48:14.911249+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/response-schemas.ts

## Purpose

Declares the response-envelope schema rows for every backend `delivery` endpoint. The rows are generated from `openapi.yaml` (via `x-module` stamps surfaced in `contracts/rest/routes.ts`) and registered through the module manifest so that contract validation is enabled when the delivery domain is active and disabled when the folder is removed.

## Key elements

- **`deliveryResponseSchemas: ResponseSchemaRoute[]`** – The single export. Built by calling `routesForModules(schemas, ['delivery'])` against the shared `@api/schemas` namespace. Each entry describes the response envelope for one delivery route.

## Relationships

No graph neighbors are listed. The file pulls in two imports that are visible in code:

- `@api/schemas` – the shared schema definitions passed into the route-map builder.
- `@/infrastructure/http/response-schema-map` – provides the `routesForModules` helper and the `ResponseSchemaRoute` type that shapes the export.

## Notes

- The docblock for `ResponseSchemaRoute` (defined in `response-schema-map`) states two rules every row must satisfy; those rules are not repeated here.
- Registration is entirely declarative: there is no imperative setup call. Adding or removing the `'delivery'` module folder is the only toggle.
- The `@module` JSDoc tag marks this file as a side-effect-free namespace; consumers import `deliveryResponseSchemas` rather than calling functions.

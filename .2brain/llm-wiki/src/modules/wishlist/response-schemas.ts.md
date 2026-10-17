---
source: src/modules/wishlist/response-schemas.ts
sha256: ec0906acbf8642806b57d3a24798e140b07054c38c4832bbb638f6cf1f971cc3
generated_at: 2026-10-17T01:54:24.022038+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/response-schemas.ts

## Purpose

Defines the response-envelope schemas for every wishlist REST endpoint that the backend module calls. It exists so the wishlist domain can register its OpenAPI-derived contract-validation rows through the shared module-manifest mechanism, turning validation on or off simply by the presence or absence of the `wishlist` folder.

## Key elements

- **`wishlistResponseSchemas`** (`ResponseSchemaRoute[]`) — The sole export. Built by calling `routesForModules(schemas, ['wishlist'])`, which selects every route row in the generated table (`contracts/rest/routes.ts`) whose OpenAPI `x-module` stamp is `wishlist`. Each row describes the expected response envelope for one endpoint.

## Notes

- Routes are **not** hand-written here; they are filtered from the OpenAPI-generated table by the `x-module` stamp. Adding a new wishlist endpoint means updating `openapi.yaml`, not this file.
- The file is a **manifest registration point**: the infrastructure layer (`@/infrastructure/http/response-schema-map`) discovers modules by folder presence. Deleting `src/modules/wishlist/` silently disables all wishlist contract checks.
- `@api/schemas` is imported as a namespace (`* as schemas`) and passed through to `routesForModules` unchanged; this file performs no transformation beyond the module-name filter.

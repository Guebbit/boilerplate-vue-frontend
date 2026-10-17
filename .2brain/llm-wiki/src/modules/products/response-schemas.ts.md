---
source: src/modules/products/response-schemas.ts
sha256: 534b95ee0ba74db94dec4b65f230cfc7ac7fcb5c4c4045050855c21c1ee2ba3d
generated_at: 2026-10-17T01:28:37.423717+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/response-schemas.ts

## Purpose

Declares the response-envelope schema routes for every REST endpoint attributed to the `products` domain. It feeds the shared response-schema map so that, when the products module is active, API responses are validated against the schemas derived from `openapi.yaml` (via `x-module` stamps).

## Key elements

- **`productsResponseSchemas`** (`ResponseSchemaRoute[]`) — the sole export. Produced by calling `routesForModules(schemas, ['products'])`, which selects all routes stamped with the `products` module from the OpenAPI contract and pairs each with its response envelope schema from `@api/schemas`.

## Relationships

No graph neighbors are recorded in the dependency graph. The file imports from two upstream modules:

- `@/infrastructure/http/response-schema-map` — provides the `routesForModules` helper and the `ResponseSchemaRoute` type.
- `@api/schemas` — the generated schema registry that supplies the actual envelope definitions.

## Notes

- **Module-manifest coupling.** Registration is tied to the folder's presence: creating the `products/` directory enables contract validation for these routes; deleting it disables validation. There is no separate feature flag.
- **Row rules.** Every entry in `productsResponseSchemas` obeys two invariants documented in `ResponseSchemaRoute`'s own docblock (see `@/infrastructure/http/response-schema-map`); they are not restated here.
- **Generated upstream.** The set of routes is determined entirely by the `x-module: products` stamps in `openapi.yaml` and the table in `contracts/rest/routes.ts`; this file does not enumerate endpoints manually.

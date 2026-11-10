---
source: src/modules/wishlist/response-schemas.ts
sha256: ec0906acbf8642806b57d3a24798e140b07054c38c4832bbb638f6cf1f971cc3
signature: 62f93d14eec02baaa7f52d03aa9a964249a3882a65870ea9043065c5c8060855
generated_at: 2026-11-10T06:18:59.686514+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every HTTP endpoint attributed to the `wishlist` backend module. It plugs the wishlist domain into the shared contract-validation pipeline so that generated route tables (derived from `openapi.yaml` `x-module` stamps via `contracts/rest/routes.ts`) are enforced at runtime.

## Key elements

- **`wishlistResponseSchemas: ResponseSchemaRoute[]`** — the sole export. Built by calling `routesForModules(schemas, ['wishlist'])`, which filters the full API schema registry (`@api/schemas`) down to the routes stamped with the `wishlist` module and wraps them in the `ResponseSchemaRoute` shape expected by the validation layer.

## Relationships

No graph neighbors are registered for this file. It imports from two upstream modules (`@api/schemas` for the raw schema definitions and `@/infrastructure/http/response-schema-map` for the `routesForModules` helper and the `ResponseSchemaRoute` type), but neither is tracked as a graph edge in the dependency index.

## Notes

- **Enable/disable by folder presence:** The docblock states that registering through the "module manifest" means simply creating or deleting this folder toggles contract validation for the wishlist domain on or off. There is no additional config file to update.
- **`x-module` stamps are the source of truth:** Which endpoints land in this array is determined entirely by the `x-module` annotation in `openapi.yaml`, not by any explicit route list in this file. Adding a new wishlist endpoint requires stamping the OpenAPI spec, not editing this file.

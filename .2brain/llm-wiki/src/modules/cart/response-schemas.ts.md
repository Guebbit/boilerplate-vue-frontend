---
source: src/modules/cart/response-schemas.ts
sha256: 72deb221bf45ec7b1c369e565334299bc107ae96d610255acb4dc972089cde57
generated_at: 2026-10-17T00:36:39.499187+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/response-schemas.ts

## Purpose

Thin registration file that builds the response-schema route table for the `cart` domain. It exists so that contract validation for cart endpoints can be toggled simply by adding or removing this file (via the module manifest), without touching shared infrastructure.

## Key elements

- **`cartResponseSchemas`** (`ResponseSchemaRoute[]`) — the sole export. Constructed by calling `routesForModules(schemas, ['cart'])`, which filters the API schema set down to routes stamped with the `cart` module in `openapi.yaml`. Each row describes the response envelope for one cart endpoint.

## Relationships

- **`@/infrastructure/http/response-schema-map`** — provides both the `ResponseSchemaRoute` type and the `routesForModules` factory that assembles the array.
- **`@api/schemas`** — imported as a namespace and passed into `routesForModules`; supplies the actual OpenAPI-derived schema objects.
- **`contracts/rest/routes.ts`** (referenced in the module docblock) — the generated route table that this file's rows are expected to mirror; it is derived from `openapi.yaml` `x-module` stamps.

No other graph neighbors are recorded.

## Notes

- The file is intentionally a one-liner of logic. All schema shape and validation rules live in `response-schema-map` and `@api/schemas`; do not add endpoint-specific logic here.
- "Registered through the module manifest" means this file is picked up (or ignored) by whatever mechanism assembles active domains. Deleting the folder is the supported way to disable cart contract validation—there is no runtime toggle.

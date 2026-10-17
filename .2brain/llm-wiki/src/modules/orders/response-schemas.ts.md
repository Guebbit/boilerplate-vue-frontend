---
source: src/modules/orders/response-schemas.ts
sha256: aa3f69c33d0f602fecb926c83b99068b5b60d46c88bb31386a76808649742a5c
generated_at: 2026-10-17T01:15:57.059237+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/response-schemas.ts

## Purpose

Registers response-envelope schemas for every REST endpoint attributed to the `orders` or `invoicing` backend modules. It exists so that, once the orders domain is enabled via the module manifest, contract validation for those endpoints is automatically active (and removed if the folder is deleted).

## Key elements

- **`ordersResponseSchemas`** (export, type `ResponseSchemaRoute[]`) — The single public export. Built by calling `routesForModules(schemas, ['orders', 'invoicing'])`, which derives a list of route-to-schema mappings from the OpenAPI-generated `@api/schemas` module, filtered to the two backend domains this frontend module owns.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — Helper that takes the full schema map and a list of module names and returns only the rows stamped with those `x-module` values.
- **`ResponseSchemaRoute`** (imported type, same infrastructure module) — The per-row shape (route path, expected envelope schema, etc.) that every element of `ordersResponseSchemas` conforms to.

## Relationships

No external graph neighbors are recorded for this file. It is a leaf consumer: it reads from `@api/schemas` and `@/infrastructure/http/response-schema-map`, and is itself consumed via the module manifest registration (the manifest import is not shown in this file's body).

## Notes

- The `invoicing` module is included alongside `orders` because it owns no separate frontend module of its own; invoice and credit-note download endpoints live under this file's coverage.
- The two governing rules for every row (path matching, envelope shape) are documented in the `ResponseSchemaRoute` docblock in the infrastructure module, not here.
- Enabling/disabling is purely structural: adding or removing this file (and its manifest entry) toggles validation. There is no runtime feature flag inside this file.

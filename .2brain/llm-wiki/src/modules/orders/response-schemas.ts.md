---
source: src/modules/orders/response-schemas.ts
sha256: aa3f69c33d0f602fecb926c83b99068b5b60d46c88bb31386a76808649742a5c
signature: 3e222c82a85448005171f20dc3b37b09cb0dae1d12f7bc397186ea1cf5a2c873
generated_at: 2026-11-10T04:59:53.995756+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/response-schemas.ts

## Purpose

Exports the response-envelope schema registry for every backend endpoint owned by the `orders` domain (including `invoicing`, which has no dedicated frontend module). The list is consumed by the module-manifest system so that contract validation for these routes activates or deactivates with the module folder.

## Key elements

- **`ordersResponseSchemas: ResponseSchemaRoute[]`** — The single public export. Built by calling `routesForModules(schemas, ['orders', 'invoicing'])`, which filters the full schema catalog (`@api/schemas`) down to routes stamped with the `orders` or `invoicing` `x-module` value in `openapi.yaml`.
- **`routesForModules`** (imported from `@/infrastructure/http/response-schema-map`) — The helper that performs the per-module filtering; this file does no filtering logic itself.
- **`ResponseSchemaRoute`** (type, same origin) — Describes one route's expected response envelope; the file's docblock references the two rules each row must satisfy (defined on that type's docblock).

## Relationships

No graph neighbors are recorded. The file's only runtime dependency is `routesForModules` and the `@api/schemas` catalog; it is consumed *by* the module-manifest/registration layer (not shown in this file).

## Notes

- `invoicing` is co-located here because it has no standalone frontend module; invoice and credit-note download endpoints are mixed into the same array as `orders` routes.
- Enabling/disabling contract validation for these endpoints is purely folder-presence based: delete `src/modules/orders/` and the schemas stop being registered—no config flag to update.
- The actual route definitions live in `contracts/rest/routes.ts` (generated from `openapi.yaml`); this file only *selects* a subset of already-defined schemas.
